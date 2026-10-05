const express = require('express');
const { db } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getVisibleUserIds } = require('../utils/hierarchy');
const { SURVEY_STATUS, EDIT_REQUEST_STATUS } = require('../constants/surveyStatus');
const { TASK_STATUS } = require('../constants/taskStatus');
const { SCHEME_BY_KEY, markedSchemeLabels, unmarkedSchemes } = require('../constants/schemes');
const { buildSurveyId, buildTaskId, generateUniqueId } = require('../utils/uniqueId');

const router = express.Router();
router.use(authenticate);

// Appends a `created_by IN (...)` clause scoping results to what `user` may see,
// per the reporting hierarchy. Returns null when there is no restriction (admin/developer).
async function addVisibilityClause(clauses, params, user) {
  const visibleIds = await getVisibleUserIds(user);
  if (!visibleIds) return null;
  const placeholders = visibleIds.map((id, i) => {
    params[`visible${i}`] = id;
    return `@visible${i}`;
  });
  clauses.push(`created_by IN (${placeholders.join(', ')})`);
  return visibleIds;
}

const BOOL_FIELDS = [
  'has_two_wheeler',
  'has_four_wheeler',
  'has_fridge',
  'has_tv',
  'has_ac',
  'has_gas_connection',
  'has_washing_machine',
  'has_computer',
  'has_smartphone',
  'has_bank_account',
  'has_water_pump',
];

const TEXT_FIELDS = [
  'full_name',
  'guardian_name',
  'gender',
  'dob',
  'aadhaar_number',
  'mobile_number',
  'email',
  'state',
  'district',
  'panchayat',
  'village_town',
  'address',
  'pincode',
  'category',
  'religion',
  'ration_card_type',
  'house_type',
  'house_ownership',
  'occupation',
  'bank_name',
  'bank_account_number',
  'govt_scheme_availed',
  'remarks',
];

const NUMERIC_FIELDS = ['family_members_count', 'monthly_income', 'land_owned_acres'];

// Canonical on-screen and in-database representation is always xxxx-xxxx-xxxx,
// regardless of how the client sent it (with dashes, without, with spaces, ...).
function formatAadhaar(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
}

function normalizePayload(body) {
  const data = {};
  for (const field of TEXT_FIELDS) {
    data[field] = body[field] !== undefined && body[field] !== null ? String(body[field]).trim() : null;
  }
  for (const field of NUMERIC_FIELDS) {
    const val = body[field];
    data[field] = val === '' || val === undefined || val === null ? null : Number(val);
  }
  for (const field of BOOL_FIELDS) {
    data[field] = body[field] ? 1 : 0;
  }
  if (data.aadhaar_number) data.aadhaar_number = formatAadhaar(data.aadhaar_number);
  return data;
}

// Any other survey record already using this mobile/Aadhaar number. `excludeId`
// leaves the record itself out of the check when updating.
async function findDuplicateErrors(data, excludeId) {
  const errors = {};
  const selfId = excludeId ?? -1;

  const mobileDupe = await db.execute({
    sql: 'SELECT id FROM surveys WHERE mobile_number = @mobile AND id != @selfId',
    args: { mobile: data.mobile_number, selfId },
  });
  if (mobileDupe.rows[0]) errors.mobile_number = 'Another household record already uses this mobile number.';

  if (data.aadhaar_number) {
    const aadhaarDupe = await db.execute({
      sql: 'SELECT id FROM surveys WHERE aadhaar_number = @aadhaar AND id != @selfId',
      args: { aadhaar: data.aadhaar_number, selfId },
    });
    if (aadhaarDupe.rows[0]) errors.aadhaar_number = 'Another household record already uses this Aadhaar number.';
  }

  return errors;
}

function validate(data) {
  const errors = {};
  if (!data.full_name) errors.full_name = 'Full name is required.';
  if (!data.mobile_number) errors.mobile_number = 'Mobile number is required.';
  else if (!/^\d{10}$/.test(data.mobile_number)) errors.mobile_number = 'Mobile number must be 10 digits.';

  if (!data.aadhaar_number) errors.aadhaar_number = 'Aadhaar number is required.';
  else if (!/^\d{4}-\d{4}-\d{4}$/.test(data.aadhaar_number)) errors.aadhaar_number = 'Aadhaar number must be in xxxx-xxxx-xxxx format.';

  if (!data.gender) errors.gender = 'Gender is required.';
  if (!data.dob) errors.dob = 'Date of birth is required.';
  if (!data.district) errors.district = 'District is required.';
  if (!data.panchayat) errors.panchayat = 'Panchayat is required.';
  if (!data.village_town) errors.village_town = 'Village is required.';

  if (!data.pincode) errors.pincode = 'Pincode is required.';
  else if (!/^\d{6}$/.test(data.pincode)) errors.pincode = 'Pincode must be 6 digits.';

  if (!data.category) errors.category = 'Category is required.';
  if (!data.religion) errors.religion = 'Religion is required.';
  if (!data.house_type) errors.house_type = 'House type is required.';
  if (!data.house_ownership) errors.house_ownership = 'House ownership is required.';
  if (!data.occupation) errors.occupation = 'Occupation is required.';
  if (data.family_members_count === null) errors.family_members_count = 'Number of family members is required.';

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  return errors;
}

// List + search + filter + pagination. Scoped to what the requester's hierarchy allows.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '', category, rationCardType, district, page = 1, pageSize = 10 } = req.query;

    const clauses = [];
    const params = {};

    if (search) {
      clauses.push('(full_name LIKE @search OR mobile_number LIKE @search OR aadhaar_number LIKE @search)');
      params.search = `%${search}%`;
    }
    if (category) {
      clauses.push('category = @category');
      params.category = category;
    }
    if (rationCardType) {
      clauses.push('ration_card_type = @rationCardType');
      params.rationCardType = rationCardType;
    }
    if (district) {
      clauses.push('district = @district');
      params.district = district;
    }

    await addVisibilityClause(clauses, params, req.user);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = (await db.execute({ sql: `SELECT COUNT(*) AS count FROM surveys ${where}`, args: params })).rows[0].count;

    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const offset = (currentPage - 1) * limit;

    const rows = (
      await db.execute({
        sql: `SELECT * FROM surveys ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`,
        args: { ...params, limit, offset },
      })
    ).rows;

    res.json({ data: rows, total, page: currentPage, pageSize: limit, totalPages: Math.ceil(total / limit) || 1 });
  })
);

router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const clauses = [];
    const params = {};
    await addVisibilityClause(clauses, params, req.user);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const total = (await db.execute({ sql: `SELECT COUNT(*) AS c FROM surveys ${where}`, args: params })).rows[0].c;
    const byCategory = (
      await db.execute({ sql: `SELECT category, COUNT(*) AS c FROM surveys ${where} GROUP BY category`, args: params })
    ).rows;
    const byRationCard = (
      await db.execute({
        sql: `SELECT ration_card_type, COUNT(*) AS c FROM surveys ${where} GROUP BY ration_card_type`,
        args: params,
      })
    ).rows;
    const assetCols = BOOL_FIELDS.map((f) => `SUM(${f}) AS ${f}`).join(', ');
    const assetOwnership = (await db.execute({ sql: `SELECT ${assetCols} FROM surveys ${where}`, args: params })).rows[0];
    const myCount =
      req.user.role !== 'admin' && req.user.role !== 'developer'
        ? (
            await db.execute({
              sql: 'SELECT COUNT(*) AS c FROM surveys WHERE created_by = @id',
              args: { id: req.user.id },
            })
          ).rows[0].c
        : null;

    res.json({ total, byCategory, byRationCard, assetOwnership, myCount });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: req.params.id } });
    const survey = result.rows[0];
    if (!survey) return res.status(404).json({ message: 'Survey record not found.' });

    const visibleIds = await getVisibleUserIds(req.user);
    if (visibleIds && !visibleIds.includes(survey.created_by)) {
      return res.status(403).json({ message: 'You do not have permission to view this record.' });
    }

    res.json({ data: survey });
  })
);

// Anyone authenticated can add new household records.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = normalizePayload(req.body);
    const errors = { ...validate(data), ...(await findDuplicateErrors(data)) };
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const uniqueId = await generateUniqueId(
      () => buildSurveyId(data.district, data.panchayat, data.village_town),
      async (candidate) => {
        const result = await db.execute({ sql: 'SELECT 1 FROM surveys WHERE unique_id = @id', args: { id: candidate } });
        return !!result.rows[0];
      }
    );

    const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
    const placeholders = columns.map((c) => `@${c}`).join(', ');
    const info = await db.execute({
      sql: `INSERT INTO surveys (${columns.join(', ')}, created_by, created_by_name, status, unique_id)
            VALUES (${placeholders}, @created_by, @created_by_name, @status, @unique_id)`,
      args: { ...data, created_by: req.user.id, created_by_name: req.user.name, status: SURVEY_STATUS.FINAL, unique_id: uniqueId },
    });

    const survey = (
      await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: Number(info.lastInsertRowid) } })
    ).rows[0];
    res.status(201).json({ data: survey });
  })
);

// Developer can always edit/delete. Everyone else may only touch their own
// record, and only once a Request Approved edit request has unlocked it.
function assertCanModify(survey, user) {
  if (user.role === 'developer') return null;
  if (survey.created_by !== user.id) {
    return { status: 403, message: 'You can only modify household records you added yourself.' };
  }
  if (survey.status !== SURVEY_STATUS.REQUEST_APPROVED) {
    return { status: 403, message: 'This record is locked. Submit an edit request and wait for developer approval.' };
  }
  return null;
}

// A record's owner may ask the developer to unlock it for editing.
router.post(
  '/:id/edit-request',
  asyncHandler(async (req, res) => {
    const result = await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: req.params.id } });
    const survey = result.rows[0];
    if (!survey) return res.status(404).json({ message: 'Survey record not found.' });
    if (survey.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Only the record owner can request an edit.' });
    }
    if (survey.status !== SURVEY_STATUS.FINAL) {
      return res.status(400).json({ message: 'An edit request is already in progress for this record.' });
    }

    await db.execute({
      sql: 'INSERT INTO edit_requests (survey_id, requested_by, status) VALUES (@surveyId, @requestedBy, @status)',
      args: { surveyId: survey.id, requestedBy: req.user.id, status: EDIT_REQUEST_STATUS.PENDING },
    });
    await db.execute({
      sql: 'UPDATE surveys SET status = @status WHERE id = @id',
      args: { status: SURVEY_STATUS.EDIT_REQUESTED, id: survey.id },
    });
    res.status(201).json({ message: 'Edit request submitted for developer approval.' });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existingResult = await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: req.params.id } });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ message: 'Survey record not found.' });

    const denial = assertCanModify(existing, req.user);
    if (denial) return res.status(denial.status).json({ message: denial.message });

    const data = normalizePayload(req.body);
    const errors = { ...validate(data), ...(await findDuplicateErrors(data, existing.id)) };
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
    const setClause = columns.map((c) => `${c} = @${c}`).join(', ');
    // A non-developer editing their own Request Approved record completes the
    // ticket cycle: the record locks again until another edit request is raised.
    const nextStatus = req.user.role === 'developer' ? existing.status : SURVEY_STATUS.FINAL;
    await db.execute({
      sql: `UPDATE surveys SET ${setClause}, updated_by = @updated_by, updated_at = datetime('now'), status = @status WHERE id = @id`,
      args: { ...data, updated_by: req.user.id, status: nextStatus, id: req.params.id },
    });

    // Any open task for a scheme the edit just marked as availed is moot now — remove it.
    const nowMarked = new Set(markedSchemeLabels(data.govt_scheme_availed));
    const openTasks = (
      await db.execute({ sql: 'SELECT id, scheme_label FROM survey_tasks WHERE survey_id = @id', args: { id: req.params.id } })
    ).rows;
    for (const task of openTasks) {
      if (nowMarked.has(task.scheme_label)) {
        await db.execute({ sql: 'DELETE FROM task_requests WHERE task_id = @id', args: { id: task.id } });
        await db.execute({ sql: 'DELETE FROM survey_tasks WHERE id = @id', args: { id: task.id } });
      }
    }

    const survey = (await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: req.params.id } })).rows[0];
    res.json({ data: survey });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existingResult = await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: req.params.id } });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ message: 'Survey record not found.' });

    const denial = assertCanModify(existing, req.user);
    if (denial) return res.status(denial.status).json({ message: denial.message });

    // A survey can have edit_requests/survey_tasks (and their own task_requests)
    // pointing at it; delete those first or the FK constraints reject deleting
    // the survey itself.
    const taskIds = (
      await db.execute({ sql: 'SELECT id FROM survey_tasks WHERE survey_id = @id', args: { id: req.params.id } })
    ).rows.map((t) => t.id);
    for (const taskId of taskIds) {
      await db.execute({ sql: 'DELETE FROM task_requests WHERE task_id = @id', args: { id: taskId } });
    }
    await db.execute({ sql: 'DELETE FROM survey_tasks WHERE survey_id = @id', args: { id: req.params.id } });
    await db.execute({ sql: 'DELETE FROM edit_requests WHERE survey_id = @id', args: { id: req.params.id } });
    await db.execute({ sql: 'DELETE FROM surveys WHERE id = @id', args: { id: req.params.id } });
    res.json({ message: 'Survey record deleted.' });
  })
);

// A viewer's visibility into one survey record — shared by the task routes
// below, which anyone who can see the survey may use.
async function assertCanView(req, res, surveyId) {
  const survey = (await db.execute({ sql: 'SELECT * FROM surveys WHERE id = @id', args: { id: surveyId } })).rows[0];
  if (!survey) {
    res.status(404).json({ message: 'Survey record not found.' });
    return null;
  }
  const visibleIds = await getVisibleUserIds(req.user);
  if (visibleIds && !visibleIds.includes(survey.created_by)) {
    res.status(403).json({ message: 'You do not have permission to view this record.' });
    return null;
  }
  return survey;
}

// Work tasks: one per scheme the household hasn't been enrolled in yet.
// Anyone who can view the survey can see/add them, but only once it's Final —
// not while an edit is in progress.
router.get(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const survey = await assertCanView(req, res, req.params.id);
    if (!survey) return;

    const tasks = (
      await db.execute({
        sql: `SELECT t.id, t.unique_id, t.scheme_key, t.scheme_label, t.status, t.created_at,
                     u.id AS initiated_by_id, u.name AS initiated_by_name,
                     (SELECT tr.action FROM task_requests tr WHERE tr.task_id = t.id AND tr.status = 'pending'
                      ORDER BY tr.created_at DESC LIMIT 1) AS pending_action,
                     (SELECT tr.proposed_status FROM task_requests tr WHERE tr.task_id = t.id AND tr.status = 'pending'
                      ORDER BY tr.created_at DESC LIMIT 1) AS pending_proposed_status
              FROM survey_tasks t
              JOIN users u ON u.id = t.initiated_by
              WHERE t.survey_id = @id
              ORDER BY t.created_at DESC`,
        args: { id: req.params.id },
      })
    ).rows;

    res.json({
      data: tasks,
      unmarkedSchemes: unmarkedSchemes(survey.govt_scheme_availed),
      canAdd: survey.status === SURVEY_STATUS.FINAL,
    });
  })
);

router.post(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    const survey = await assertCanView(req, res, req.params.id);
    if (!survey) return;

    if (survey.status !== SURVEY_STATUS.FINAL) {
      return res.status(400).json({ message: 'Work tasks can only be added once the survey record is Final.' });
    }

    const scheme = SCHEME_BY_KEY[req.body.schemeKey];
    if (!scheme) return res.status(400).json({ message: 'Invalid scheme.' });

    const available = unmarkedSchemes(survey.govt_scheme_availed).some((s) => s.key === scheme.key);
    if (!available) {
      return res.status(400).json({ message: 'This scheme is already marked as availed on this survey, or no longer needs a task.' });
    }

    const existingTask = (
      await db.execute({
        sql: 'SELECT 1 FROM survey_tasks WHERE survey_id = @surveyId AND scheme_key = @schemeKey',
        args: { surveyId: survey.id, schemeKey: scheme.key },
      })
    ).rows[0];
    if (existingTask) {
      return res.status(409).json({ message: 'A work task for this scheme already exists on this survey.' });
    }

    const uniqueId = await generateUniqueId(
      () => buildTaskId(scheme.key),
      async (candidate) => {
        const result = await db.execute({ sql: 'SELECT 1 FROM survey_tasks WHERE unique_id = @id', args: { id: candidate } });
        return !!result.rows[0];
      }
    );

    await db.execute({
      sql: `INSERT INTO survey_tasks (unique_id, survey_id, scheme_key, scheme_label, status, initiated_by)
            VALUES (@uniqueId, @surveyId, @schemeKey, @schemeLabel, @status, @initiatedBy)`,
      args: {
        uniqueId,
        surveyId: survey.id,
        schemeKey: scheme.key,
        schemeLabel: scheme.label,
        status: TASK_STATUS.ADDED,
        initiatedBy: req.user.id,
      },
    });

    res.status(201).json({ message: 'Work task added.' });
  })
);

module.exports = router;
