// Mirrors client/src/constants/surveyOptions.js (CENTRAL_SCHEMES + ODISHA_SCHEMES) —
// kept server-side too so "which schemes are missing from this survey" can be
// computed and validated authoritatively, not just trusted from the client.
const ALL_SCHEMES = [
  { key: 'PMAY', label: 'PM Awas Yojana (PMAY)' },
  { key: 'PM-KISAN', label: 'PM Kisan Samman Nidhi' },
  { key: 'AB-PMJAY', label: 'Ayushman Bharat (PM-JAY)' },
  { key: 'MGNREGA', label: 'MGNREGA' },
  { key: 'PMUY', label: 'PM Ujjwala Yojana' },
  { key: 'PMJDY', label: 'PM Jan Dhan Yojana' },
  { key: 'APY', label: 'Atal Pension Yojana' },
  { key: 'PMJJBY-PMSBY', label: 'PM Jeevan Jyoti / Suraksha Bima Yojana' },
  { key: 'PMFBY', label: 'PM Fasal Bima Yojana' },
  { key: 'NSAP', label: 'National Social Assistance Programme' },
  { key: 'SBM', label: 'Swachh Bharat Mission' },
  { key: 'KALIA', label: 'KALIA Yojana' },
  { key: 'BSKY', label: 'Biju Swasthya Kalyan Yojana (BSKY)' },
  { key: 'MBPY', label: 'Madhu Babu Pension Yojana (MBPY)' },
  { key: 'MISSION_SHAKTI', label: 'Mission Shakti' },
  { key: 'BIJU_PUCCA_GHAR', label: 'Biju Pucca Ghar Yojana' },
  { key: 'AMA_GAON_AMA_BIKASH', label: 'Ama Gaon Ama Bikash' },
  { key: 'BIJU_GRAM_JYOTI', label: 'Biju Gram Jyoti Yojana' },
  { key: 'MILLET_MISSION', label: 'Odisha Millet Mission' },
  { key: 'GOPABANDHU_GRAMIN', label: 'Gopabandhu Gramin Yojana' },
];

const SCHEME_BY_KEY = Object.fromEntries(ALL_SCHEMES.map((s) => [s.key, s]));

// A survey's govt_scheme_availed is a ", "-joined string of scheme LABELS.
function markedSchemeLabels(govtSchemeAvailed) {
  return (govtSchemeAvailed || '').split(', ').map((s) => s.trim()).filter(Boolean);
}

function unmarkedSchemes(govtSchemeAvailed) {
  const marked = new Set(markedSchemeLabels(govtSchemeAvailed));
  return ALL_SCHEMES.filter((s) => !marked.has(s.label));
}

module.exports = { ALL_SCHEMES, SCHEME_BY_KEY, markedSchemeLabels, unmarkedSchemes };
