const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getVisibleUserIds, getAncestorChain, getDescendantIds } = require('../utils/hierarchy');
const { MANAGER_ROLES, REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES } = require('../constants/roles');
const { USER_STATUS, STATUS_REQUEST_STATUS } = require('../constants/userStatus');

const router = express.Router();
router.use(authenticate);

// A pending activate/deactivate ticket, if any, for each of the given user
// ids — joined onto listings so the UI can show "Under Verification" without
// touching the user's real (still fully-functional) status column.
const PENDING_STATUS_SUBQUERY = `(
  SELECT sr.action FROM status_requests sr
  WHERE sr.user_id = u.id AND sr.status = '${STATUS_REQUEST_STATUS.PENDING}'
  ORDER BY sr.created_at DESC LIMIT 1
) AS pending_status_action`;

// Developer sits outside the org chart entirely — never anyone's "team member".
const EXCLUDE_DEVELOPER = `u.role != 'developer'`;

// Team directory: every role above field agent can see the users beneath them
// in the hierarchy (and only those users) with how many surveys each has
// submitted. Admin/developer see everyone. Optionally filtered to one role.
router.get(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const visibleIds = await getVisibleUserIds(req.user);
    const params = {};
    const clauses = [EXCLUDE_DEVELOPER];

    if (visibleIds) {
      const subordinateIds = visibleIds.filter((id) => id !== req.user.id);
      if (subordinateIds.length === 0) {
        return res.json({ data: [] });
      }
      const placeholders = subordinateIds.map((id, i) => {
        params[`id${i}`] = id;
        return `@id${i}`;
      });
      clauses.push(`u.id IN (${placeholders.join(', ')})`);
    } else {
      params.selfId = req.user.id;
      clauses.push('u.id != @selfId');
    }

    if (req.query.role) {
      params.role = req.query.role;
      clauses.push('u.role = @role');
    }

    const users = (
      await db.execute({
        sql: `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.parent_id, u.district, u.panchayat,
                     u.mobile_number, u.unique_id, p.name AS parent_name,
                     COUNT(s.id) AS surveyCount, ${PENDING_STATUS_SUBQUERY}
              FROM users u
              LEFT JOIN users p ON p.id = u.parent_id
              LEFT JOIN surveys s ON s.created_by = u.id
              WHERE ${clauses.join(' AND ')}
              GROUP BY u.id
              ORDER BY u.created_at DESC`,
        args: params,
      })
    ).rows;
    res.json({ data: users });
  })
);

// Eligible "reports to" options for a given role, for the registration form —
// scoped to the requester's own downline (admin/developer see everyone).
router.get(
  '/parents',
  asyncHandler(async (req, res) => {
    const { role } = req.query;
    const parentRoles = REQUIRED_PARENT_ROLES[role] || OPTIONAL_PARENT_ROLES[role];
    if (!parentRoles) return res.json({ data: [] });

    const params = {};
    const clauses = ["status = 'active'"];
    const placeholders = parentRoles.map((r, i) => {
      params[`r${i}`] = r;
      return `@r${i}`;
    });
    clauses.push(`role IN (${placeholders.join(', ')})`);

    const visibleIds = await getVisibleUserIds(req.user);
    if (visibleIds) {
      const idPlaceholders = visibleIds.map((id, i) => {
        params[`id${i}`] = id;
        return `@id${i}`;
      });
      clauses.push(`id IN (${idPlaceholders.join(', ')})`);
    }

    const rows = (
      await db.execute({
        sql: `SELECT id, name, role FROM users WHERE ${clauses.join(' AND ')} ORDER BY name`,
        args: params,
      })
    ).rows;
    res.json({ data: rows });
  })
);

// The requester's own reporting chain, top ancestor first, themselves last —
// shown on the Profile screen.
router.get(
  '/hierarchy',
  asyncHandler(async (req, res) => {
    res.json({ data: await getAncestorChain(req.user.id) });
  })
);

// A single user's profile, their own reporting chain, plus everyone who
// reports to them (directly or indirectly) — the Team Directory's "View"
// action. The requester must themselves be allowed to see the target (self,
// or within their downline).
router.get(
  '/:id',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const visibleIds = await getVisibleUserIds(req.user);
    if (visibleIds && !visibleIds.includes(targetId)) {
      return res.status(403).json({ message: 'You do not have permission to view this user.' });
    }

    const target = (
      await db.execute({
        sql: `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.parent_id, u.district, u.panchayat,
                     u.mobile_number, u.unique_id, p.name AS parent_name,
                     COUNT(s.id) AS surveyCount, ${PENDING_STATUS_SUBQUERY}
              FROM users u
              LEFT JOIN users p ON p.id = u.parent_id
              LEFT JOIN surveys s ON s.created_by = u.id
              WHERE u.id = @id AND ${EXCLUDE_DEVELOPER}
              GROUP BY u.id`,
        args: { id: targetId },
      })
    ).rows[0];
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const subordinateIds = (await getDescendantIds(targetId)).filter((id) => id !== targetId);
    const subordinates = subordinateIds.length
      ? (
          await db.execute({
            sql: `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.mobile_number, u.unique_id,
                         COUNT(s.id) AS surveyCount, ${PENDING_STATUS_SUBQUERY}
                  FROM users u
                  LEFT JOIN surveys s ON s.created_by = u.id
                  WHERE u.id IN (${subordinateIds.map(() => '?').join(', ')})
                  GROUP BY u.id
                  ORDER BY u.created_at DESC`,
            args: subordinateIds,
          })
        ).rows
      : [];

    // Surveys this person submitted, and work tasks they initiated — shown as
    // two more sections on their profile (alongside "Working Under" above).
    const surveys = (
      await db.execute({
        sql: `SELECT id, unique_id, full_name, status, created_at
              FROM surveys WHERE created_by = @id ORDER BY created_at DESC`,
        args: { id: targetId },
      })
    ).rows;

    const tasks = (
      await db.execute({
        sql: `SELECT t.id, t.unique_id, t.scheme_label, t.status, t.created_at,
                     s.id AS survey_id, s.unique_id AS survey_unique_id, s.full_name AS survey_full_name
              FROM survey_tasks t JOIN surveys s ON s.id = t.survey_id
              WHERE t.initiated_by = @id ORDER BY t.created_at DESC`,
        args: { id: targetId },
      })
    ).rows;

    res.json({ data: { ...target, subordinates, surveys, tasks, hierarchy: await getAncestorChain(targetId) } });
  })
);

// Developer bypasses straight to the real status. Everyone else (except
// field agents, who can't reach this route at all) raises a ticket instead —
// the target's real status/login is untouched until a developer decides.
router.patch(
  '/:id/status',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or inactive.' });
    }
    if (Number(req.params.id) === req.user.id) {
      return res.status(403).json({ message: 'You cannot change your own status.' });
    }

    const target = (
      await db.execute({ sql: 'SELECT * FROM users WHERE id = @id', args: { id: req.params.id } })
    ).rows[0];
    if (!target || target.role === 'developer') return res.status(404).json({ message: 'User not found.' });

    const visibleIds = await getVisibleUserIds(req.user);
    if (visibleIds && !visibleIds.includes(target.id)) {
      return res.status(403).json({ message: 'You do not have permission to manage this user.' });
    }

    // A still-pending registration has no developer-reviewed password yet —
    // only the profile_requests approve/decline flow may bring it to active,
    // never a manager's activate/deactivate ticket (and the developer
    // bypass below would otherwise flip it active with no password at all).
    if (target.status === USER_STATUS.UNDER_AUTHENTICATION) {
      return res.status(400).json({ message: 'This profile is still awaiting developer approval and cannot be activated or deactivated yet.' });
    }

    if (req.user.role === 'developer') {
      await db.execute({ sql: 'UPDATE users SET status = @status WHERE id = @id', args: { status, id: target.id } });
      return res.json({ message: 'User status updated.' });
    }

    const existingTicket = (
      await db.execute({
        sql: "SELECT 1 FROM status_requests WHERE user_id = @id AND status = 'pending'",
        args: { id: target.id },
      })
    ).rows[0];
    if (existingTicket) {
      return res.status(400).json({ message: 'A status change for this user is already awaiting developer approval.' });
    }

    const action = status === 'active' ? 'activate' : 'deactivate';
    await db.execute({
      sql: `INSERT INTO status_requests (user_id, requested_by, action, status)
            VALUES (@userId, @requestedBy, @action, @status)`,
      args: { userId: target.id, requestedBy: req.user.id, action, status: STATUS_REQUEST_STATUS.PENDING },
    });
    res.status(201).json({ message: 'Request submitted for developer approval. The account keeps working as normal until then.' });
  })
);

// Roles whose survey-location data locks their own district/panchayat once
// they've actually surveyed somewhere — editing past that would orphan the
// meaning of their existing records' location fields.
const AREA_LOCKED_ROLES = ['head_of_district', 'head_of_panchayat', 'field_agent'];

// Developer-only: edit a profile's basic info. Blocked (with reasons) when the
// change would conflict with the profile's own existing survey records.
router.patch(
  '/:id',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const target = (await db.execute({ sql: 'SELECT * FROM users WHERE id = @id', args: { id: req.params.id } })).rows[0];
    if (!target || target.role === 'developer') return res.status(404).json({ message: 'User not found.' });

    const { name, mobileNumber, district, panchayat } = req.body;
    if (!name || !mobileNumber || !district) {
      return res.status(400).json({ message: 'Name, mobile number and district are required.' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Mobile number must be 10 digits.' });
    }

    const conflicts = [];

    if (mobileNumber !== target.mobile_number) {
      const mobileTaken = (
        await db.execute({ sql: 'SELECT 1 FROM users WHERE mobile_number = @mobileNumber AND id != @id', args: { mobileNumber, id: target.id } })
      ).rows[0];
      if (mobileTaken) conflicts.push(`Mobile number ${mobileNumber} is already assigned to another profile.`);
    }

    if (AREA_LOCKED_ROLES.includes(target.role)) {
      const surveys = (
        await db.execute({ sql: 'SELECT DISTINCT district, panchayat FROM surveys WHERE created_by = @id', args: { id: target.id } })
      ).rows;
      if (surveys.length > 0) {
        if (district !== target.district) {
          const existingDistricts = [...new Set(surveys.map((s) => s.district))];
          if (!existingDistricts.every((d) => d === district)) {
            conflicts.push(`Cannot change district — this profile already has survey(s) recorded under: ${existingDistricts.join(', ')}.`);
          }
        }
        if (target.role !== 'head_of_district' && panchayat !== undefined && panchayat !== target.panchayat) {
          const existingPanchayats = [...new Set(surveys.map((s) => s.panchayat).filter(Boolean))];
          if (existingPanchayats.length && !existingPanchayats.every((p) => p === panchayat)) {
            conflicts.push(`Cannot change panchayat — this profile already has survey(s) recorded under: ${existingPanchayats.join(', ')}.`);
          }
        }
      }
    }

    if (conflicts.length) {
      return res.status(409).json({ message: 'This change conflicts with existing records.', conflicts });
    }

    await db.execute({
      sql: 'UPDATE users SET name = @name, mobile_number = @mobileNumber, district = @district, panchayat = @panchayat WHERE id = @id',
      args: {
        name: name.trim(),
        mobileNumber,
        district,
        panchayat: panchayat !== undefined ? panchayat || null : target.panchayat,
        id: target.id,
      },
    });

    res.json({ message: 'Profile updated.' });
  })
);

// Developer-only: set a new password for any profile directly — no ticket,
// matching the developer's unconditional rights over every account.
router.post(
  '/:id/reset-password',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const target = (await db.execute({ sql: 'SELECT id FROM users WHERE id = @id', args: { id: req.params.id } })).rows[0];
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const hash = bcrypt.hashSync(password, 10);
    await db.execute({ sql: 'UPDATE users SET password_hash = @hash WHERE id = @id', args: { hash, id: target.id } });
    res.json({ message: 'Password reset.' });
  })
);

// Developer-only: permanently remove a profile (moved to Trash first, so it
// can be restored later). Blocked while the profile still has survey/task
// history or team members reporting to it — that data would be orphaned.
router.delete(
  '/:id',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const target = (await db.execute({ sql: 'SELECT * FROM users WHERE id = @id', args: { id: req.params.id } })).rows[0];
    if (!target || target.role === 'developer') return res.status(404).json({ message: 'User not found.' });
    if (target.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account.' });

    const blockers = [];
    const surveyCount = (
      await db.execute({ sql: 'SELECT COUNT(*) AS c FROM surveys WHERE created_by = @id', args: { id: target.id } })
    ).rows[0].c;
    if (surveyCount > 0) blockers.push(`${surveyCount} survey(s) they submitted`);
    const taskCount = (
      await db.execute({ sql: 'SELECT COUNT(*) AS c FROM survey_tasks WHERE initiated_by = @id', args: { id: target.id } })
    ).rows[0].c;
    if (taskCount > 0) blockers.push(`${taskCount} work task(s) they initiated`);
    const reportCount = (
      await db.execute({ sql: 'SELECT COUNT(*) AS c FROM users WHERE parent_id = @id', args: { id: target.id } })
    ).rows[0].c;
    if (reportCount > 0) blockers.push(`${reportCount} team member(s) reporting to them`);

    if (blockers.length) {
      return res.status(409).json({ message: `Cannot delete — this profile still has ${blockers.join(', ')}. Reassign or remove that first.` });
    }

    await db.execute({
      sql: `INSERT INTO trash (record_type, original_id, payload, deleted_by, deleted_by_name)
            VALUES ('profile', @id, @payload, @deletedBy, @deletedByName)`,
      args: { id: target.id, payload: JSON.stringify(target), deletedBy: req.user.id, deletedByName: req.user.name },
    });
    // Tickets this profile ever raised (on its own account, or on someone
    // else's task/survey) reference it too — gone either way, the profile
    // itself is the thing being removed.
    await db.execute({ sql: 'DELETE FROM profile_requests WHERE user_id = @id OR requested_by = @id', args: { id: target.id } });
    await db.execute({ sql: 'DELETE FROM status_requests WHERE user_id = @id OR requested_by = @id', args: { id: target.id } });
    await db.execute({ sql: 'DELETE FROM task_requests WHERE requested_by = @id', args: { id: target.id } });
    await db.execute({ sql: 'DELETE FROM edit_requests WHERE requested_by = @id', args: { id: target.id } });
    await db.execute({ sql: 'DELETE FROM users WHERE id = @id', args: { id: target.id } });

    res.json({ message: 'Profile deleted.' });
  })
);

module.exports = router;
