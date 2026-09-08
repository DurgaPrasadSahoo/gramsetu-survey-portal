const express = require('express');
const db = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// Admin screen: list all field agents with how many households each has surveyed.
router.get('/', (req, res) => {
  const agents = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COUNT(s.id) AS surveyCount
       FROM users u
       LEFT JOIN surveys s ON s.created_by = u.id
       WHERE u.role = 'agent'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ data: agents });
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be active or inactive.' });
  }
  const user = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'agent'`).get(req.params.id);
  if (!user) return res.status(404).json({ message: 'Agent not found.' });

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Agent status updated.' });
});

module.exports = router;
