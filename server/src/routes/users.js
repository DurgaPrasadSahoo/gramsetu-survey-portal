const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getVisibleUserIds, getAncestorChain, getDescendantIds } = require('../utils/hierarchy');
const { MANAGER_ROLES, REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES } = require('../constants/roles');
const { STATUS_REQUEST_STATUS } = require('../constants/userStatus');

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
        sql: `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.parent_id, u.district,
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
        sql: `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.parent_id, u.district,
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

module.exports = router;
