// Mirrors server/src/constants/surveyStatus.js — keep both in sync.
export const SURVEY_STATUS = {
  FINAL: 'Final',
  EDIT_REQUESTED: 'Edit Requested',
  REQUEST_APPROVED: 'Request Approved',
};

export const STATUS_BADGE_CLASS = {
  [SURVEY_STATUS.FINAL]: 'badge-status-final',
  [SURVEY_STATUS.EDIT_REQUESTED]: 'badge-status-edit-requested',
  [SURVEY_STATUS.REQUEST_APPROVED]: 'badge-status-request-approved',
};
