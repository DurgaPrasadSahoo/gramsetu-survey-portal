// Organisational hierarchy, top to bottom:
//   developer -> admin -> head_of_district -> head_of_panchayat -> field_agent
// developer and admin can see/manage every user; every other role can only
// see itself and the users beneath it in the tree (via users.parent_id).
const ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat', 'field_agent'];

// Roles allowed to view a "team directory" of the users under them.
const MANAGER_ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat'];

// Which parent role(s) a given role must (or may) report to.
const REQUIRED_PARENT_ROLES = {
  field_agent: ['head_of_panchayat'],
  head_of_panchayat: ['head_of_district'],
};
const OPTIONAL_PARENT_ROLES = {
  head_of_district: ['admin', 'developer'],
};

// Two-letter code used inside a profile's unique id (see utils/uniqueId.js).
const ROLE_CODES = {
  developer: 'DV',
  admin: 'AD',
  head_of_district: 'HD',
  head_of_panchayat: 'HP',
  field_agent: 'FA',
};

// Which roles a given role is allowed to register (strictly below them in the
// hierarchy — never their own level or above). Field agents can't register
// anyone; only another developer can create a developer or admin account.
const CREATABLE_ROLES_BY_ROLE = {
  developer: ['developer', 'admin', 'head_of_district', 'head_of_panchayat', 'field_agent'],
  admin: ['head_of_district', 'head_of_panchayat', 'field_agent'],
  head_of_district: ['head_of_panchayat', 'field_agent'],
  head_of_panchayat: ['field_agent'],
  field_agent: [],
};

module.exports = {
  ROLES,
  MANAGER_ROLES,
  REQUIRED_PARENT_ROLES,
  OPTIONAL_PARENT_ROLES,
  ROLE_CODES,
  CREATABLE_ROLES_BY_ROLE,
};
