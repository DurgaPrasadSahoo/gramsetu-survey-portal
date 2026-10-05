// Organisational hierarchy, top to bottom:
//   developer -> admin -> head_of_district -> head_of_panchayat -> field_agent
export const ROLE_LABELS = {
  developer: 'Developer',
  admin: 'Administrator',
  head_of_district: 'Head of District',
  head_of_panchayat: 'Head of Panchayat',
  field_agent: 'Field Agent',
};

export const ROLE_BADGE_CLASS = {
  developer: 'badge-developer',
  admin: 'badge-admin',
  head_of_district: 'badge-head-of-district',
  head_of_panchayat: 'badge-head-of-panchayat',
  field_agent: 'badge-agent',
};

// Roles that can view a team directory of the users beneath them.
export const MANAGER_ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat'];

// Which role(s) each creatable role must/may report to (mirrors the server-side rules).
export const REQUIRED_PARENT_ROLES = {
  field_agent: ['head_of_panchayat'],
  head_of_panchayat: ['head_of_district'],
};
export const OPTIONAL_PARENT_ROLES = {
  head_of_district: ['admin', 'developer'],
};

// Which roles a given role is allowed to register (mirrors the server).
export const CREATABLE_ROLES_BY_ROLE = {
  developer: ['developer', 'admin', 'head_of_district', 'head_of_panchayat', 'field_agent'],
  admin: ['head_of_district', 'head_of_panchayat', 'field_agent'],
  head_of_district: ['head_of_panchayat', 'field_agent'],
  head_of_panchayat: ['field_agent'],
  field_agent: [],
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
