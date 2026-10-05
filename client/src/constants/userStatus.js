// Mirrors server/src/constants/userStatus.js. `pending_status_action` (from
// the API) overrides the display label/class below without touching the
// user's real, stored status.
export const USER_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  under_authentication: 'Under Authentication',
};

export const USER_STATUS_BADGE_CLASS = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  under_authentication: 'badge-status-edit-requested',
};

export function displayUserStatus(user) {
  if (user.pending_status_action) {
    return { label: 'Under Verification', badgeClass: 'badge-status-request-approved' };
  }
  return {
    label: USER_STATUS_LABELS[user.status] || user.status,
    badgeClass: USER_STATUS_BADGE_CLASS[user.status] || '',
  };
}
