// Two-letter code per Odisha district, used inside unique ids (see utils/uniqueId.js).
// Keys match the district names in client/src/constants/surveyOptions.js (ODISHA_DISTRICTS).
const DISTRICT_CODES = {
  Angul: 'AN',
  Balangir: 'BA',
  Balasore: 'BL',
  Bargarh: 'BG',
  Bhadrak: 'BH',
  Boudh: 'BO',
  Cuttack: 'CT',
  Deogarh: 'DG',
  Dhenkanal: 'DH',
  Gajapati: 'GJ',
  Ganjam: 'GM',
  Jagatsinghpur: 'JS',
  Jajpur: 'JJ',
  Jharsuguda: 'JH',
  Kalahandi: 'KL',
  Kandhamal: 'KD',
  Kendrapara: 'KN',
  Kendujhar: 'KJ',
  Khordha: 'KH',
  Koraput: 'KP',
  Malkangiri: 'MK',
  Mayurbhanj: 'MB',
  Nabarangpur: 'NB',
  Nayagarh: 'NY',
  Nuapada: 'NP',
  Puri: 'PU',
  Rayagada: 'RG',
  Sambalpur: 'SM',
  Subarnapur: 'SB',
  Sundargarh: 'SG',
};

function districtCode(districtName) {
  return DISTRICT_CODES[districtName] || 'XX';
}

const ODISHA_DISTRICTS = Object.keys(DISTRICT_CODES);

module.exports = { DISTRICT_CODES, districtCode, ODISHA_DISTRICTS };
