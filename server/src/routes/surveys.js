const express = require('express');
const db = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const BOOL_FIELDS = [
  'has_two_wheeler',
  'has_four_wheeler',
  'has_fridge',
  'has_tv',
  'has_ac',
  'has_gas_connection',
  'has_washing_machine',
  'has_computer',
  'has_smartphone',
  'has_bank_account',
  'has_water_pump',
];

const TEXT_FIELDS = [
  'full_name',
  'guardian_name',
  'gender',
  'dob',
  'aadhaar_number',
  'mobile_number',
  'email',
  'state',
  'district',
  'block',
  'village_town',
  'address',
  'pincode',
  'category',
  'religion',
  'ration_card_type',
  'house_type',
  'house_ownership',
  'occupation',
  'bank_name',
  'bank_account_number',
  'govt_scheme_availed',
  'remarks',
];

const NUMERIC_FIELDS = ['family_members_count', 'monthly_income', 'land_owned_acres'];

function normalizePayload(body) {
  const data = {};
  for (const field of TEXT_FIELDS) {
    data[field] = body[field] !== undefined && body[field] !== null ? String(body[field]).trim() : null;
  }
  for (const field of NUMERIC_FIELDS) {
    const val = body[field];
    data[field] = val === '' || val === undefined || val === null ? null : Number(val);
  }
  for (const field of BOOL_FIELDS) {
    data[field] = body[field] ? 1 : 0;
  }
  return data;
}

function validate(data) {
  const errors = {};
  if (!data.full_name) errors.full_name = 'Full name is required.';
  if (!data.mobile_number) errors.mobile_number = 'Mobile number is required.';
  else if (!/^\d{10}$/.test(data.mobile_number)) errors.mobile_number = 'Mobile number must be 10 digits.';
  if (data.aadhaar_number && !/^\d{12}$/.test(data.aadhaar_number)) {
    errors.aadhaar_number = 'Aadhaar number must be 12 digits.';
  }
  if (data.pincode && !/^\d{6}$/.test(data.pincode)) errors.pincode = 'Pincode must be 6 digits.';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  return errors;
}

// List + search + filter + pagination. Both agents and admins can view the full register.
router.get('/', (req, res) => {
  const { search = '', category, rationCardType, district, page = 1, pageSize = 10 } = req.query;

  const clauses = [];
  const params = {};

  if (search) {
    clauses.push('(full_name LIKE @search OR mobile_number LIKE @search OR aadhaar_number LIKE @search)');
    params.search = `%${search}%`;
  }
  if (category) {
    clauses.push('category = @category');
    params.category = category;
  }
  if (rationCardType) {
    clauses.push('ration_card_type = @rationCardType');
    params.rationCardType = rationCardType;
  }
  if (district) {
    clauses.push('district = @district');
    params.district = district;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM surveys ${where}`).get(params).count;

  const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const rows = db
    .prepare(`SELECT * FROM surveys ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  res.json({ data: rows, total, page: currentPage, pageSize: limit, totalPages: Math.ceil(total / limit) || 1 });
});

router.get('/stats/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM surveys').get().c;
  const byCategory = db.prepare('SELECT category, COUNT(*) AS c FROM surveys GROUP BY category').all();
  const byRationCard = db.prepare('SELECT ration_card_type, COUNT(*) AS c FROM surveys GROUP BY ration_card_type').all();
  const assetCols = BOOL_FIELDS.map((f) => `SUM(${f}) AS ${f}`).join(', ');
  const assetOwnership = db.prepare(`SELECT ${assetCols} FROM surveys`).get();
  const myCount =
    req.user.role === 'agent'
      ? db.prepare('SELECT COUNT(*) AS c FROM surveys WHERE created_by = ?').get(req.user.id).c
      : null;

  res.json({ total, byCategory, byRationCard, assetOwnership, myCount });
});

router.get('/:id', (req, res) => {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!survey) return res.status(404).json({ message: 'Survey record not found.' });
  res.json({ data: survey });
});

// Both agents and admins can add new household records.
router.post('/', (req, res) => {
  const data = normalizePayload(req.body);
  const errors = validate(data);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
  const placeholders = columns.map((c) => `@${c}`).join(', ');
  const info = db
    .prepare(
      `INSERT INTO surveys (${columns.join(', ')}, created_by, created_by_name)
       VALUES (${placeholders}, @created_by, @created_by_name)`
    )
    .run({ ...data, created_by: req.user.id, created_by_name: req.user.name });

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ data: survey });
});

// Only admins may edit an existing record: once an agent submits it, it is locked.
router.put('/:id', requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Survey record not found.' });

  const data = normalizePayload(req.body);
  const errors = validate(data);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const columns = [...TEXT_FIELDS, ...NUMERIC_FIELDS, ...BOOL_FIELDS];
  const setClause = columns.map((c) => `${c} = @${c}`).join(', ');
  db.prepare(
    `UPDATE surveys SET ${setClause}, updated_by = @updated_by, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...data, updated_by: req.user.id, id: req.params.id });

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  res.json({ data: survey });
});

// Only admins may delete a record.
router.delete('/:id', requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Survey record not found.' });
  db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
  res.json({ message: 'Survey record deleted.' });
});

module.exports = router;
