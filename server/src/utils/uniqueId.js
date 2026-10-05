const crypto = require('crypto');
const { districtCode } = require('../constants/districtCodes');
const { ROLE_CODES } = require('../constants/roles');

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STATE_CODE = 'OD'; // only Odisha is in scope for this portal

function randomSuffix(length = 4) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[crypto.randomInt(ALPHANUM.length)];
  }
  return out;
}

// First two letters of a free-text place name (panchayat/village), uppercased.
// Doesn't need to be globally unique on its own — the trailing random suffix
// guarantees the full id is — it's just a human-readable hint.
function placeCode(name) {
  const letters = (name || '').toUpperCase().replace(/[^A-Z]/g, '');
  return (letters + 'XX').slice(0, 2);
}

// #<ROLE>-OD-<DISTRICT>-<RANDOM4>, e.g. #HP-OD-KH-AB12
function buildProfileId(role, district) {
  const roleCode = ROLE_CODES[role] || 'XX';
  return `#${roleCode}-${STATE_CODE}-${districtCode(district)}-${randomSuffix()}`;
}

// #SE-OD-<DISTRICT>-<PANCHAYAT>-<VILLAGE>-<RANDOM4>, e.g. #SE-OD-KH-AB-AA-AB12
function buildSurveyId(district, panchayat, village) {
  return `#SE-${STATE_CODE}-${districtCode(district)}-${placeCode(panchayat)}-${placeCode(village)}-${randomSuffix()}`;
}

// Retries id generation until `exists(id)` (an async DB lookup) comes back
// empty. Collisions are vanishingly unlikely (36^4 combinations per bucket)
// but are cheap to guard against outright.
async function generateUniqueId(build, exists) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = build();
    if (!(await exists(id))) return id;
  }
  throw new Error('Could not generate a unique id after multiple attempts.');
}

module.exports = { buildProfileId, buildSurveyId, generateUniqueId };
