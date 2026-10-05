// Mirrors server/src/constants/taskStatus.js.
export const TASK_STATUS_LABELS = {
  added: 'Added',
  initiated: 'Initiated',
  completed: 'Completed',
};

export const TASK_STATUS_BADGE_CLASS = {
  added: 'badge-status-edit-requested',
  initiated: 'badge-status-request-approved',
  completed: 'badge-active',
};

export function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status;
}
