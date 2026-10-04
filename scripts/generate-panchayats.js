#!/usr/bin/env node
// Regenerates client/src/constants/panchayatsByDistrict.json — every Gram Panchayat
// in Odisha, grouped by district.
//
// Source: Ministry of Panchayati Raj's Local Government Directory (LGD), mirrored as
// CSV at https://github.com/planemad/india-local-government-directory
// (municipal/rural-local-body.csv). That file is ~24MB and not checked into this repo;
// download it and pass its path as the first argument:
//
//   curl -L -o /tmp/rural-local-body.csv \
//     https://raw.githubusercontent.com/planemad/india-local-government-directory/main/municipal/rural-local-body.csv
//   node scripts/generate-panchayats.js /tmp/rural-local-body.csv
//
// The CSV has no "district name" column for Gram Panchayat rows — only a
// "District Panchayat Code" that must be joined against Odisha's 30 District
// Panchayat rows (local body type 1) to get a name. DISTRICT_CODE_TO_NAME below is
// that join, pre-resolved, with LGD's spellings mapped onto this app's existing
// ODISHA_DISTRICTS names (e.g. LGD's "BALESHWAR" -> "Balasore") so district values
// already stored in survey records keep matching.
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DISTRICT_CODE_TO_NAME = {
  303: 'Angul', 304: 'Balangir', 305: 'Balasore', 306: 'Bargarh', 307: 'Bhadrak',
  308: 'Boudh', 309: 'Cuttack', 310: 'Deogarh', 311: 'Dhenkanal', 312: 'Gajapati',
  313: 'Ganjam', 314: 'Jagatsinghpur', 315: 'Jajpur', 316: 'Jharsuguda', 317: 'Kalahandi',
  318: 'Kandhamal', 319: 'Kendrapara', 320: 'Kendujhar', 321: 'Khordha', 322: 'Koraput',
  323: 'Malkangiri', 324: 'Mayurbhanj', 325: 'Nabarangpur', 326: 'Nayagarh', 327: 'Nuapada',
  328: 'Puri', 329: 'Rayagada', 330: 'Sambalpur', 331: 'Subarnapur', 332: 'Sundargarh',
};

const GRAM_PANCHAYAT_TYPE_CODE = '3';
const ODISHA_STATE_NAME = 'ODISHA';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toTitleCase(s) {
  return s.toLowerCase().replace(/(^|[\s\-'()/.])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/generate-panchayats.js <path-to-rural-local-body.csv>');
    process.exit(1);
  }

  const byDistrict = {};
  for (const name of Object.values(DISTRICT_CODE_TO_NAME)) byDistrict[name] = new Set();

  const rl = readline.createInterface({ input: fs.createReadStream(csvPath) });
  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const [, , nameEn, , typeCode, , , districtPanchayatCode, , stateName] = fields;
    if (stateName !== ODISHA_STATE_NAME || typeCode !== GRAM_PANCHAYAT_TYPE_CODE) continue;
    const districtName = DISTRICT_CODE_TO_NAME[Number(districtPanchayatCode)];
    if (!districtName) continue;
    byDistrict[districtName].add(toTitleCase(nameEn.trim()));
  }

  const out = {};
  let total = 0;
  for (const [district, set] of Object.entries(byDistrict)) {
    out[district] = [...set].sort((a, b) => a.localeCompare(b));
    total += out[district].length;
  }

  const outPath = path.join(__dirname, '../client/src/constants/panchayatsByDistrict.json');
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(`Wrote ${total} panchayats across ${Object.keys(out).length} districts to ${outPath}`);
}

main();
