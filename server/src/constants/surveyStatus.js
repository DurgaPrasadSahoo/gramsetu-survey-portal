// A survey record's lifecycle:
//   Final -> (owner requests edit) -> Edit Requested -> developer decides:
//     approved -> Request Approved -> (owner edits, saved) -> back to Final
//     declined -> Final
const SURVEY_STATUS = {
  FINAL: 'Final',
  EDIT_REQUESTED: 'Edit Requested',
  REQUEST_APPROVED: 'Request Approved',
};

const EDIT_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
};

module.exports = { SURVEY_STATUS, EDIT_REQUEST_STATUS };
