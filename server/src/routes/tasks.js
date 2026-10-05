const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getVisibleUserIds } = require('../utils/hierarchy');
const { TASK_STATUS, TASK_REQUEST_ACTION, TASK_REQUEST_STATUS } = require('../constants/taskStatus');

const router = express.Router();
router.use(authenticate);

async function findTaskWithSurvey(taskId) {
  const result = await db.execute({
    sql: `SELECT t.*, s.id AS survey_id, s.full_name AS survey_full_name, s.created_by AS survey_created_by
          FROM survey_tasks t JOIN surveys s ON s.id = t.survey_id
          WHERE t.id = @id`,
    args: { id: taskId },
  });
  return result.rows[0];
}

// A task is locked immediately after creation — changing its status or
// deleting it needs a developer's approval. Anyone who can view the parent
// survey may raise the request (not just the task's own initiator).
router.post(
  '/:id/request',
  asyncHandler(async (req, res) => {
    const { action, proposedStatus } = req.body;
    if (!Object.values(TASK_REQUEST_ACTION).includes(action)) {
      return res.status(400).json({ message: 'Invalid request action.' });
    }
    if (action === TASK_REQUEST_ACTION.STATUS_CHANGE && !Object.values(TASK_STATUS).includes(proposedStatus)) {
      return res.status(400).json({ message: 'Invalid proposed status.' });
    }

    const task = await findTaskWithSurvey(req.params.id);
    if (!task) return res.status(404).json({ message: 'Work task not found.' });

    const visibleIds = await getVisibleUserIds(req.user);
    if (visibleIds && !visibleIds.includes(task.survey_created_by)) {
      return res.status(403).json({ message: 'You do not have permission to view this record.' });
    }

    const existingTicket = (
      await db.execute({
        sql: "SELECT 1 FROM task_requests WHERE task_id = @id AND status = 'pending'",
        args: { id: task.id },
      })
    ).rows[0];
    if (existingTicket) {
      return res.status(400).json({ message: 'A request for this task is already awaiting developer approval.' });
    }

    await db.execute({
      sql: `INSERT INTO task_requests (task_id, requested_by, action, proposed_status, status)
            VALUES (@taskId, @requestedBy, @action, @proposedStatus, @status)`,
      args: {
        taskId: task.id,
        requestedBy: req.user.id,
        action,
        proposedStatus: action === TASK_REQUEST_ACTION.STATUS_CHANGE ? proposedStatus : null,
        status: TASK_REQUEST_STATUS.PENDING,
      },
    });
    res.status(201).json({ message: 'Request submitted for developer approval.' });
  })
);

router.get(
  '/requests',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const { status = TASK_REQUEST_STATUS.PENDING } = req.query;
    const where = status === 'all' ? '' : 'WHERE tr.status = @status';

    const rows = (
      await db.execute({
        sql: `SELECT tr.id, tr.action, tr.proposed_status, tr.status, tr.created_at, tr.decided_at,
                     t.id AS task_id, t.unique_id AS task_unique_id, t.scheme_label, t.status AS current_status,
                     s.id AS survey_id, s.unique_id AS survey_unique_id, s.full_name AS survey_full_name,
                     req.id AS requested_by_id, req.name AS requested_by_name, req.role AS requested_by_role
              FROM task_requests tr
              JOIN survey_tasks t ON t.id = tr.task_id
              JOIN surveys s ON s.id = t.survey_id
              JOIN users req ON req.id = tr.requested_by
              ${where}
              ORDER BY tr.created_at DESC`,
        args: { status },
      })
    ).rows;

    res.json({ data: rows });
  })
);

router.post(
  '/requests/:id/approve',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const ticket = (
      await db.execute({ sql: 'SELECT * FROM task_requests WHERE id = @id', args: { id: req.params.id } })
    ).rows[0];
    if (!ticket) return res.status(404).json({ message: 'Task request not found.' });
    if (ticket.status !== TASK_REQUEST_STATUS.PENDING) {
      return res.status(400).json({ message: 'This request has already been decided.' });
    }

    if (ticket.action === TASK_REQUEST_ACTION.DELETE) {
      // The task (and the rest of its request history) is gone either way —
      // no need to also update this ticket's own status first.
      await db.execute({ sql: 'DELETE FROM task_requests WHERE task_id = @id', args: { id: ticket.task_id } });
      await db.execute({ sql: 'DELETE FROM survey_tasks WHERE id = @id', args: { id: ticket.task_id } });
    } else {
      await db.execute({
        sql: "UPDATE task_requests SET status = @status, decided_by = @decidedBy, decided_at = datetime('now') WHERE id = @id",
        args: { status: TASK_REQUEST_STATUS.APPROVED, decidedBy: req.user.id, id: ticket.id },
      });
      await db.execute({
        sql: 'UPDATE survey_tasks SET status = @status WHERE id = @id',
        args: { status: ticket.proposed_status, id: ticket.task_id },
      });
    }

    res.json({ message: 'Request approved.' });
  })
);

router.post(
  '/requests/:id/decline',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const ticket = (
      await db.execute({ sql: 'SELECT * FROM task_requests WHERE id = @id', args: { id: req.params.id } })
    ).rows[0];
    if (!ticket) return res.status(404).json({ message: 'Task request not found.' });
    if (ticket.status !== TASK_REQUEST_STATUS.PENDING) {
      return res.status(400).json({ message: 'This request has already been decided.' });
    }

    await db.execute({
      sql: "UPDATE task_requests SET status = @status, decided_by = @decidedBy, decided_at = datetime('now') WHERE id = @id",
      args: { status: TASK_REQUEST_STATUS.DECLINED, decidedBy: req.user.id, id: ticket.id },
    });
    res.json({ message: 'Request declined.' });
  })
);

module.exports = router;
