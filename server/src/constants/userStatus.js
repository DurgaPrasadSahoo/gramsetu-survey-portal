// A user account's real, stored status — this is what gates login.
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  // Set at creation when registered by anyone other than a developer; no
  // password exists yet, so login fails naturally until a developer approves.
  UNDER_AUTHENTICATION: 'under_authentication',
};

// A pending activate/deactivate ticket does NOT change the stored status
// above — the account keeps working exactly as before — it only changes what
// the UI displays, via this separate request state.
const STATUS_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
};

const PROFILE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
};

module.exports = { USER_STATUS, STATUS_REQUEST_STATUS, PROFILE_REQUEST_STATUS };
