const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { USER_STATUS, PROFILE_REQUEST_STATUS } = require('../constants/userStatus');

const router = express.Router();
router.use(authenticate, requireRole('developer'));

// Developer's queue of newly-registered accounts awaiting a password (and
// any corrections) before they can go live.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status = PROFILE_REQUEST_STATUS.PENDING } = req.query;
    const where = status === 'all' ? '' : 'WHERE pr.status = @status';

    const rows = (
      await db.execute({
        sql: `SELECT pr.id, pr.status, pr.created_at, pr.decided_at,
                     u.id AS user_id, u.name, u.email, u.role, u.district, u.mobile_number, u.unique_id,
                     p.name AS parent_name,
                     req.id AS requested_by_id, req.name AS requested_by_name, req.email AS requested_by_email,
                     req.role AS requested_by_role
              FROM profile_requests pr
              JOIN users u ON u.id = pr.user_id
              LEFT JOIN users p ON p.id = u.parent_id
              JOIN users req ON req.id = pr.requested_by
              ${where}
              ORDER BY pr.created_at DESC`,
        args: { status },
      })
    ).rows;

    res.json({ data: rows });
  })
);

// Approve: set the password the developer chose (and any corrected name/
// district/mobile), then flip the account to active.
router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const { password, name, district, mobileNumber } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'A password of at least 6 characters is required to activate this account.' });
    }

    const ticket = (
      await db.execute({ sql: 'SELECT * FROM profile_requests WHERE id = @id', args: { id: req.params.id } })
    ).rows[0];
    if (!ticket) return res.status(404).json({ message: 'Profile request not found.' });
    if (ticket.status !== PROFILE_REQUEST_STATUS.PENDING) {
      return res.status(400).json({ message: 'This profile request has already been decided.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    await db.execute({
      sql: `UPDATE users
            SET password_hash = @hash, status = @status,
                name = COALESCE(NULLIF(@name, ''), name),
                district = COALESCE(NULLIF(@district, ''), district),
                mobile_number = COALESCE(NULLIF(@mobileNumber, ''), mobile_number)
            WHERE id = @userId`,
      args: {
        hash,
        status: USER_STATUS.ACTIVE,
        name: name || '',
        district: district || '',
        mobileNumber: mobileNumber || '',
        userId: ticket.user_id,
      },
    });
    await db.execute({
      sql: "UPDATE profile_requests SET status = @status, decided_by = @decidedBy, decided_at = datetime('now') WHERE id = @id",
      args: { status: PROFILE_REQUEST_STATUS.APPROVED, decidedBy: req.user.id, id: ticket.id },
    });

    res.json({ message: 'Account approved and activated.' });
  })
);

// Decline: the proposed account never existed as far as the portal is
// concerned — remove it entirely.
router.post(
  '/:id/decline',
  asyncHandler(async (req, res) => {
    const ticket = (
      await db.execute({ sql: 'SELECT * FROM profile_requests WHERE id = @id', args: { id: req.params.id } })
    ).rows[0];
    if (!ticket) return res.status(404).json({ message: 'Profile request not found.' });
    if (ticket.status !== PROFILE_REQUEST_STATUS.PENDING) {
      return res.status(400).json({ message: 'This profile request has already been decided.' });
    }

    // The ticket itself references the user row via a foreign key, so it has
    // to go first — the declined account is removed entirely, not kept.
    await db.execute({ sql: 'DELETE FROM profile_requests WHERE id = @id', args: { id: ticket.id } });
    await db.execute({ sql: 'DELETE FROM users WHERE id = @id', args: { id: ticket.user_id } });

    res.json({ message: 'Profile request declined and removed.' });
  })
);

module.exports = router;
