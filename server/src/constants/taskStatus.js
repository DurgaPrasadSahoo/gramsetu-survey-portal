const TASK_STATUS = {
  ADDED: 'added',
  INITIATED: 'initiated',
  COMPLETED: 'completed',
};

const TASK_REQUEST_ACTION = {
  STATUS_CHANGE: 'status_change',
  DELETE: 'delete',
};

const TASK_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
};

module.exports = { TASK_STATUS, TASK_REQUEST_ACTION, TASK_REQUEST_STATUS };
