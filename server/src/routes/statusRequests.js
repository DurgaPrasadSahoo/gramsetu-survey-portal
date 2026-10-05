const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { STATUS_REQUEST_STATUS } = require('../constants/userStatus');

const router = express.Router();
router.use(authenticate, requireRole('developer'));

// Developer's queue of activate/deactivate tickets raised by managers for
// people in their own downline.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status = STATUS_REQUEST_STATUS.PENDING } = req.query;
    const where = status === 'all' ? '' : 'WHERE sr.status = @status';

    const rows = (
      await db.execute({
        sql: `SELECT sr.id, sr.action, sr.status, sr.created_at, sr.decided_at,
                     u.id AS user_id, u.name, u.email, u.role, u.status AS current_status, u.unique_id,
                     req.id AS requested_by_id, req.name AS requested_by_name, req.role AS requested_by_role
              FROM status_requests sr
              JOIN users u ON u.id = sr.user_id
              JOIN users req ON req.id = sr.requested_by
              ${where}
              ORDER BY sr.created_at DESC`,
        args: { status },
      })
    ).rows;

    res.json({ data: rows });
  })
);

async function decide(req, res, nextTicketStatus) {
  const ticket = (
    await db.execute({ sql: 'SELECT * FROM status_requests WHERE id = @id', args: { id: req.params.id } })
  ).rows[0];
  if (!ticket) return res.status(404).json({ message: 'Status request not found.' });
  if (ticket.status !== STATUS_REQUEST_STATUS.PENDING) {
    return res.status(400).json({ message: 'This request has already been decided.' });
  }

  await db.execute({
    sql: "UPDATE status_requests SET status = @status, decided_by = @decidedBy, decided_at = datetime('now') WHERE id = @id",
    args: { status: nextTicketStatus, decidedBy: req.user.id, id: ticket.id },
  });

  if (nextTicketStatus === STATUS_REQUEST_STATUS.APPROVED) {
    const nextUserStatus = ticket.action === 'activate' ? 'active' : 'inactive';
    await db.execute({
      sql: 'UPDATE users SET status = @status WHERE id = @id',
      args: { status: nextUserStatus, id: ticket.user_id },
    });
  }

  res.json({ message: `Request ${nextTicketStatus}.` });
}

router.post('/:id/approve', asyncHandler((req, res) => decide(req, res, STATUS_REQUEST_STATUS.APPROVED)));
router.post('/:id/decline', asyncHandler((req, res) => decide(req, res, STATUS_REQUEST_STATUS.DECLINED)));

module.exports = router;
