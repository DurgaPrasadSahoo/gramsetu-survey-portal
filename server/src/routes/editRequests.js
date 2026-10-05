const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { SURVEY_STATUS, EDIT_REQUEST_STATUS } = require('../constants/surveyStatus');

const router = express.Router();
router.use(authenticate, requireRole('developer'));

// Developer's ticket queue: who owns the record, and which entry they want to edit.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status = EDIT_REQUEST_STATUS.PENDING } = req.query;
    const where = status === 'all' ? '' : 'WHERE er.status = @status';

    const rows = (
      await db.execute({
        sql: `SELECT er.id, er.status, er.created_at, er.decided_at,
                     s.id AS survey_id, s.full_name AS survey_full_name, s.status AS survey_status,
                     u.id AS requester_id, u.name AS requester_name, u.email AS requester_email, u.role AS requester_role,
                     d.name AS decided_by_name
              FROM edit_requests er
              JOIN surveys s ON s.id = er.survey_id
              JOIN users u ON u.id = er.requested_by
              LEFT JOIN users d ON d.id = er.decided_by
              ${where}
              ORDER BY er.created_at DESC`,
        args: { status },
      })
    ).rows;

    res.json({ data: rows });
  })
);

async function decide(req, res, { nextRequestStatus, nextSurveyStatus }) {
  const ticket = (
    await db.execute({ sql: 'SELECT * FROM edit_requests WHERE id = @id', args: { id: req.params.id } })
  ).rows[0];
  if (!ticket) return res.status(404).json({ message: 'Edit request not found.' });
  if (ticket.status !== EDIT_REQUEST_STATUS.PENDING) {
    return res.status(400).json({ message: 'This edit request has already been decided.' });
  }

  await db.execute({
    sql: "UPDATE edit_requests SET status = @status, decided_by = @decidedBy, decided_at = datetime('now') WHERE id = @id",
    args: { status: nextRequestStatus, decidedBy: req.user.id, id: ticket.id },
  });
  await db.execute({
    sql: 'UPDATE surveys SET status = @status WHERE id = @id',
    args: { status: nextSurveyStatus, id: ticket.survey_id },
  });
  res.json({ message: `Edit request ${nextRequestStatus}.` });
}

router.post(
  '/:id/approve',
  asyncHandler((req, res) =>
    decide(req, res, { nextRequestStatus: EDIT_REQUEST_STATUS.APPROVED, nextSurveyStatus: SURVEY_STATUS.REQUEST_APPROVED })
  )
);

router.post(
  '/:id/decline',
  asyncHandler((req, res) =>
    decide(req, res, { nextRequestStatus: EDIT_REQUEST_STATUS.DECLINED, nextSurveyStatus: SURVEY_STATUS.FINAL })
  )
);

module.exports = router;
