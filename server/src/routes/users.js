const express = require('express');
const db = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const { getVisibleUserIds, getAncestorChain } = require('../utils/hierarchy');
const { MANAGER_ROLES, REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES } = require('../constants/roles');

const router = express.Router();
router.use(authenticate);

// Team directory: every role above field agent can see the users beneath them
// in the hierarchy (and only those users) with how many surveys each has
// submitted. Admin/developer see everyone.
router.get('/', requireRole(...MANAGER_ROLES), (req, res) => {
  const visibleIds = getVisibleUserIds(req.user);
  const params = {};
  let where;

  if (visibleIds) {
    const subordinateIds = visibleIds.filter((id) => id !== req.user.id);
    if (subordinateIds.length === 0) {
      return res.json({ data: [] });
    }
    const placeholders = subordinateIds.map((id, i) => {
      params[`id${i}`] = id;
      return `@id${i}`;
    });
    where = `WHERE u.id IN (${placeholders.join(', ')})`;
  } else {
    params.selfId = req.user.id;
    where = 'WHERE u.id != @selfId';
  }

  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.parent_id, p.name AS parent_name,
              COUNT(s.id) AS surveyCount
       FROM users u
       LEFT JOIN users p ON p.id = u.parent_id
       LEFT JOIN surveys s ON s.created_by = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all(params);
  res.json({ data: users });
});

// Eligible "reports to" options for a given role, for the developer's registration form.
router.get('/parents', requireRole('developer'), (req, res) => {
  const { role } = req.query;
  const parentRoles = REQUIRED_PARENT_ROLES[role] || OPTIONAL_PARENT_ROLES[role];
  if (!parentRoles) return res.json({ data: [] });

  const params = {};
  const placeholders = parentRoles.map((r, i) => {
    params[`r${i}`] = r;
    return `@r${i}`;
  });
  const rows = db
    .prepare(`SELECT id, name, role FROM users WHERE role IN (${placeholders.join(', ')}) AND status = 'active' ORDER BY name`)
    .all(params);
  res.json({ data: rows });
});

// The requester's own reporting chain, top ancestor first, themselves last —
// shown on the Profile screen.
router.get('/hierarchy', (req, res) => {
  res.json({ data: getAncestorChain(req.user.id) });
});

router.patch('/:id/status', requireRole(...MANAGER_ROLES), (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be active or inactive.' });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(403).json({ message: 'You cannot change your own status.' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found.' });

  const visibleIds = getVisibleUserIds(req.user);
  if (visibleIds && !visibleIds.includes(target.id)) {
    return res.status(403).json({ message: 'You do not have permission to manage this user.' });
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'User status updated.' });
});

module.exports = router;
