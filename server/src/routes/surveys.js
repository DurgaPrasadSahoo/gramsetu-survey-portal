const express = require('express');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { getVisibleUserIds } = require('../utils/hierarchy');
const { SURVEY_STATUS, EDIT_REQUEST_STATUS } = require('../constants/surveyStatus');

const router = express.Router();
router.use(authenticate);

// Appends a `created_by IN (...)` clause scoping results to what `user` may see,
// per the reporting hierarchy. Returns null when there is no restriction (admin/developer).
function addVisibilityClause(clauses, params, user) {
  const visibleIds = getVisibleUserIds(user);
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
  return data;
}

function validate(data) {
  const errors = {};
  if (!data.full_name) errors.full_name = 'Full name is required.';
  if (!data.mobile_number) errors.mobile_number = 'Mobile number is required.';
  else if (!/^\d{10}$/.test(data.mobile_number)) errors.mobile_number = 'Mobile number must be 10 digits.';

  if (!data.aadhaar_number) errors.aadhaar_number = 'Aadhaar number is required.';
  else if (!/^\d{12}$/.test(data.aadhaar_number)) errors.aadhaar_number = 'Aadhaar number must be 12 digits.';

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
router.get('/', (req, res) => {
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

  addVisibilityClause(clauses, params, req.user);

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM surveys ${where}`).get(params).count;

  const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const rows = db
    .prepare(`SELECT * FROM surveys ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  res.json({ data: rows, total, page: currentPage, pageSize: limit, totalPages: Math.ceil(total / limit) || 1 });
});

router.get('/stats/summary', (req, res) => {
  const clauses = [];
  const params = {};
  addVisibilityClause(clauses, params, req.user);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM surveys ${where}`).get(params).c;
  const byCategory = db.prepare(`SELECT category, COUNT(*) AS c FROM surveys ${where} GROUP BY category`).all(params);
  const byRationCard = db
    .prepare(`SELECT ration_card_type, COUNT(*) AS c FROM surveys ${where} GROUP BY ration_card_type`)
    .all(params);
  const assetCols = BOOL_FIELDS.map((f) => `SUM(${f}) AS ${f}`).join(', ');
  const assetOwnership = db.prepare(`SELECT ${assetCols} FROM surveys ${where}`).get(params);
  const myCount =
    req.user.role !== 'admin' && req.user.role !== 'developer'
      ? db.prepare('SELECT COUNT(*) AS c FROM surveys WHERE created_by = ?').get(req.user.id).c
      : null;

  res.json({ total, byCategory, byRationCard, assetOwnership, myCount });
});

router.get('/:id', (req, res) => {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!survey) return res.status(404).json({ message: 'Survey record not found.' });

  const visibleIds = getVisibleUserIds(req.user);
  if (visibleIds && !visibleIds.includes(survey.created_by)) {
    return res.status(403).json({ message: 'You do not have permission to view this record.' });
  }

  res.json({ data: survey });
});

// Anyone authenticated can add new household records.
router.post('/', (req, res) => {
  const data = normalizePayload(req.body);
  const errors = validate(data);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
  const placeholders = columns.map((c) => `@${c}`).join(', ');
  const info = db
    .prepare(
      `INSERT INTO surveys (${columns.join(', ')}, created_by, created_by_name, status)
       VALUES (${placeholders}, @created_by, @created_by_name, @status)`
    )
    .run({ ...data, created_by: req.user.id, created_by_name: req.user.name, status: SURVEY_STATUS.FINAL });

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ data: survey });
});

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
router.post('/:id/edit-request', (req, res) => {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!survey) return res.status(404).json({ message: 'Survey record not found.' });
  if (survey.created_by !== req.user.id) {
    return res.status(403).json({ message: 'Only the record owner can request an edit.' });
  }
  if (survey.status !== SURVEY_STATUS.FINAL) {
    return res.status(400).json({ message: 'An edit request is already in progress for this record.' });
  }

  db.prepare('INSERT INTO edit_requests (survey_id, requested_by, status) VALUES (?, ?, ?)').run(
    survey.id,
    req.user.id,
    EDIT_REQUEST_STATUS.PENDING
  );
  db.prepare('UPDATE surveys SET status = ? WHERE id = ?').run(SURVEY_STATUS.EDIT_REQUESTED, survey.id);
  res.status(201).json({ message: 'Edit request submitted for developer approval.' });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Survey record not found.' });

  const denial = assertCanModify(existing, req.user);
  if (denial) return res.status(denial.status).json({ message: denial.message });

  const data = normalizePayload(req.body);
  const errors = validate(data);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
  const setClause = columns.map((c) => `${c} = @${c}`).join(', ');
  // A non-developer editing their own Request Approved record completes the
  // ticket cycle: the record locks again until another edit request is raised.
  const nextStatus = req.user.role === 'developer' ? existing.status : SURVEY_STATUS.FINAL;
  db.prepare(
    `UPDATE surveys SET ${setClause}, updated_by = @updated_by, updated_at = datetime('now'), status = @status WHERE id = @id`
  ).run({ ...data, updated_by: req.user.id, status: nextStatus, id: req.params.id });

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  res.json({ data: survey });
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Survey record not found.' });

  const denial = assertCanModify(existing, req.user);
  if (denial) return res.status(denial.status).json({ message: denial.message });

  db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
  res.json({ message: 'Survey record deleted.' });
});

module.exports = router;
