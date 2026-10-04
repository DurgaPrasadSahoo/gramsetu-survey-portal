const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();
const { ROLES } = require('../constants/roles');

const dbPath = process.env.DB_PATH || './data/gramsetu.db';
const resolvedPath = path.resolve(__dirname, '../../', dbPath);
const dataDir = path.dirname(resolvedPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const USERS_TABLE_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (${ROLES.map((r) => `'${r}'`).join(', ')})),
    parent_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    reset_token TEXT,
    reset_token_expires INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const usersTableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`).get();

if (!usersTableExists) {
  db.exec(USERS_TABLE_SQL);
} else {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  // Older installs predate the hierarchy roles (admin/agent only, no parent_id).
  // Rebuild the table in place, mapping the old 'agent' role onto 'field_agent'.
  if (!columns.includes('parent_id')) {
    // legacy_alter_table keeps other tables' "REFERENCES users(id)" text pointing
    // at the literal name "users" across the rename below, instead of SQLite
    // rewriting it to "users_old" (which would leave a dangling FK once dropped).
    db.pragma('foreign_keys = OFF');
    db.pragma('legacy_alter_table = ON');
    db.exec('BEGIN');
    try {
      db.exec('ALTER TABLE users RENAME TO users_old');
      db.exec(USERS_TABLE_SQL);
      db.exec(`
        INSERT INTO users (id, name, email, password_hash, role, parent_id, status, reset_token, reset_token_expires, created_at)
        SELECT id, name, email, password_hash,
               CASE role WHEN 'agent' THEN 'field_agent' ELSE role END,
               NULL, status, reset_token, reset_token_expires, created_at
        FROM users_old
      `);
      db.exec('DROP TABLE users_old');
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.pragma('legacy_alter_table = OFF');
      db.pragma('foreign_keys = ON');
    }
  }
}

db.exec('CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)');

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    guardian_name TEXT,
    gender TEXT,
    dob TEXT,
    aadhaar_number TEXT,
    mobile_number TEXT NOT NULL,
    email TEXT,
    state TEXT,
    district TEXT,
    block TEXT,
    village_town TEXT,
    address TEXT,
    pincode TEXT,
    category TEXT,
    religion TEXT,
    ration_card_type TEXT,
    house_type TEXT,
    house_ownership TEXT,
    family_members_count INTEGER,
    monthly_income REAL,
    occupation TEXT,
    land_owned_acres REAL,
    has_two_wheeler INTEGER NOT NULL DEFAULT 0,
    has_four_wheeler INTEGER NOT NULL DEFAULT 0,
    has_fridge INTEGER NOT NULL DEFAULT 0,
    has_tv INTEGER NOT NULL DEFAULT 0,
    has_ac INTEGER NOT NULL DEFAULT 0,
    has_gas_connection INTEGER NOT NULL DEFAULT 0,
    has_washing_machine INTEGER NOT NULL DEFAULT 0,
    has_computer INTEGER NOT NULL DEFAULT 0,
    has_smartphone INTEGER NOT NULL DEFAULT 0,
    has_bank_account INTEGER NOT NULL DEFAULT 0,
    bank_name TEXT,
    bank_account_number TEXT,
    has_water_pump INTEGER NOT NULL DEFAULT 0,
    govt_scheme_availed TEXT,
    remarks TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_by_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by INTEGER REFERENCES users(id),
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON surveys(created_by);
  CREATE INDEX IF NOT EXISTS idx_surveys_full_name ON surveys(full_name);
`);

module.exports = db;
