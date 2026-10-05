const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');
require('dotenv').config();
const { ROLES } = require('../constants/roles');
const { buildProfileId, buildSurveyId, generateUniqueId } = require('../utils/uniqueId');

// Production points TURSO_DATABASE_URL/TURSO_AUTH_TOKEN at a free Turso cloud
// database, so data survives restarts/redeploys on Render's ephemeral free
// tier. With no Turso env vars set (plain local dev), this falls back to the
// same local SQLite file as before — libSQL's embedded mode.
const tursoUrl = process.env.TURSO_DATABASE_URL;
let url;
if (tursoUrl) {
  url = tursoUrl;
} else {
  const dbPath = process.env.DB_PATH || './data/gramsetu.db';
  const resolvedPath = path.resolve(__dirname, '../../', dbPath);
  const dataDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  url = `file:${resolvedPath}`;
}

const db = createClient(tursoUrl ? { url, authToken: process.env.TURSO_AUTH_TOKEN } : { url });

// WAL mode only makes sense for a local file (Turso's hosted sqld manages its
// own storage/journaling). Without it, libSQL's default rollback journal
// creates/deletes a `-journal` file on every write, which — among other
// things — makes nodemon think the project changed and restart mid-request.
const journalModeReady = tursoUrl ? Promise.resolve() : db.execute('PRAGMA journal_mode = WAL');

const USERS_TABLE_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN (${ROLES.map((r) => `'${r}'`).join(', ')})),
    parent_id INTEGER REFERENCES users(id),
    district TEXT,
    mobile_number TEXT,
    unique_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_authentication')),
    reset_token TEXT,
    reset_token_expires INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

async function tableInfo(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.map((c) => c.name);
}

async function tableExists(table) {
  const result = await db.execute({
    sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name = @table`,
    args: { table },
  });
  return !!result.rows[0];
}

// Runs the full schema setup / migration / backfill. Awaited once at server
// startup (see index.js) before the app starts accepting requests.
async function migrate() {
  await journalModeReady;

  if (!(await tableExists('users'))) {
    await db.execute(USERS_TABLE_SQL);
  } else {
    const columns = await tableInfo('users');
    // Older installs predate the hierarchy roles (admin/agent only, no parent_id).
    // Rebuild the table in place, mapping the old 'agent' role onto 'field_agent'.
    if (!columns.includes('parent_id')) {
      // surveys/edit_requests may already exist and reference users(id) by
      // this point (a later run of this same migration) — foreign_keys must
      // be off for the rename+drop below, or dropping users_old fails even
      // though legacy_alter_table keeps their FK text pointed at "users".
      await db.execute('PRAGMA foreign_keys = OFF');
      const tx = await db.transaction('write');
      try {
        await tx.execute('PRAGMA legacy_alter_table = ON');
        await tx.execute('ALTER TABLE users RENAME TO users_old');
        await tx.execute(USERS_TABLE_SQL);
        await tx.execute(`
          INSERT INTO users (id, name, email, password_hash, role, parent_id, status, reset_token, reset_token_expires, created_at)
          SELECT id, name, email, password_hash,
                 CASE role WHEN 'agent' THEN 'field_agent' ELSE role END,
                 NULL, status, reset_token, reset_token_expires, created_at
          FROM users_old
        `);
        await tx.execute('DROP TABLE users_old');
        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err;
      } finally {
        await db.execute('PRAGMA foreign_keys = ON');
      }
    }
  }

  // Older installs predate district/unique_id/mobile_number on users.
  const userColumns = await tableInfo('users');
  if (!userColumns.includes('district')) {
    await db.execute('ALTER TABLE users ADD COLUMN district TEXT');
  }
  if (!userColumns.includes('unique_id')) {
    await db.execute('ALTER TABLE users ADD COLUMN unique_id TEXT');
  }
  if (!userColumns.includes('mobile_number')) {
    await db.execute('ALTER TABLE users ADD COLUMN mobile_number TEXT');
  }

  // Older installs predate the under_authentication status and the nullable
  // password_hash it requires (a pending account has no password yet) — a
  // CHECK constraint and a NOT NULL constraint can't be altered in place, so
  // rebuild the table once, now that every column above is guaranteed to exist.
  const usersTableSql = (
    await db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
  ).rows[0]?.sql;
  if (usersTableSql && !usersTableSql.includes('under_authentication')) {
    // Same reasoning as the rebuild above: surveys/edit_requests already
    // exist and reference users(id) on any install that's gotten this far.
    await db.execute('PRAGMA foreign_keys = OFF');
    const tx = await db.transaction('write');
    try {
      await tx.execute('PRAGMA legacy_alter_table = ON');
      await tx.execute('ALTER TABLE users RENAME TO users_old');
      await tx.execute(USERS_TABLE_SQL);
      await tx.execute(`
        INSERT INTO users (id, name, email, password_hash, role, parent_id, district, mobile_number, unique_id,
                            status, reset_token, reset_token_expires, created_at)
        SELECT id, name, email, password_hash, role, parent_id, district, mobile_number, unique_id,
               status, reset_token, reset_token_expires, created_at
        FROM users_old
      `);
      await tx.execute('DROP TABLE users_old');
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    } finally {
      await db.execute('PRAGMA foreign_keys = ON');
    }
  }

  // Backfill: every pre-existing account needs a home district (defaulted to
  // Khordha, this project's base) and a unique id, since both are now assigned
  // at creation time going forward.
  await db.execute(`UPDATE users SET district = 'Khordha' WHERE district IS NULL OR district = ''`);

  const usersNeedingId = await db.execute(
    "SELECT id, role, district FROM users WHERE unique_id IS NULL OR unique_id = ''"
  );
  for (const u of usersNeedingId.rows) {
    const uniqueId = await generateUniqueId(
      () => buildProfileId(u.role, u.district),
      async (candidate) => {
        const existing = await db.execute({ sql: 'SELECT 1 FROM users WHERE unique_id = @id', args: { id: candidate } });
        return !!existing.rows[0];
      }
    );
    await db.execute({ sql: 'UPDATE users SET unique_id = @uniqueId WHERE id = @id', args: { uniqueId, id: u.id } });
  }

  await db.execute('CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)');
  try {
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_id ON users(unique_id)');
  } catch (err) {
    console.warn('Could not create uniqueness index on users.unique_id:', err.message);
  }

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT,
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
      panchayat TEXT,
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
      updated_at TEXT,
      status TEXT NOT NULL DEFAULT 'Final'
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON surveys(created_by);
    CREATE INDEX IF NOT EXISTS idx_surveys_full_name ON surveys(full_name);

    CREATE TABLE IF NOT EXISTS edit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL REFERENCES surveys(id),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_by INTEGER REFERENCES users(id),
      decided_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_edit_requests_survey_id ON edit_requests(survey_id);
    CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);

    -- A newly registered account (by anyone other than a developer) sits here
    -- awaiting developer review: they set a password (and may edit details),
    -- which is what actually activates the user row already created for it.
    CREATE TABLE IF NOT EXISTS profile_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_by INTEGER REFERENCES users(id),
      decided_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_profile_requests_user_id ON profile_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_profile_requests_status ON profile_requests(status);

    -- A manager (anyone but a developer or field agent) asking to activate or
    -- deactivate someone beneath them. The target's real status column is
    -- untouched until a developer decides — they keep working normally.
    CREATE TABLE IF NOT EXISTS status_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_by INTEGER REFERENCES users(id),
      decided_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_status_requests_user_id ON status_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_requests_status ON status_requests(status);

    -- Single-row table: developer-controlled maintenance switch that, while
    -- on, blocks every non-developer request.
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT
    );

    -- A follow-up task for one scheme a survey's household hasn't been
    -- enrolled in yet. Created freely by anyone who can view the survey, once
    -- it's Final; locked immediately afterwards (see task_requests).
    CREATE TABLE IF NOT EXISTS survey_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT,
      survey_id INTEGER NOT NULL REFERENCES surveys(id),
      scheme_key TEXT NOT NULL,
      scheme_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'added',
      initiated_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_survey_tasks_survey_id ON survey_tasks(survey_id);
    CREATE INDEX IF NOT EXISTS idx_survey_tasks_initiated_by ON survey_tasks(initiated_by);

    -- A request to change a task's status or delete it outright — any change
    -- to a task once created needs a developer's approval, same as surveys.
    CREATE TABLE IF NOT EXISTS task_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES survey_tasks(id),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      proposed_status TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_by INTEGER REFERENCES users(id),
      decided_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_task_requests_task_id ON task_requests(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_requests_status ON task_requests(status);
  `);

  await db.execute("INSERT OR IGNORE INTO app_settings (id, maintenance_mode) VALUES (1, 0)");

  // Older installs predate the status/Panchayat/unique_id columns.
  const surveyColumns = await tableInfo('surveys');
  if (!surveyColumns.includes('status')) {
    await db.execute("ALTER TABLE surveys ADD COLUMN status TEXT NOT NULL DEFAULT 'Final'");
  }
  if (!surveyColumns.includes('panchayat')) {
    await db.execute('ALTER TABLE surveys ADD COLUMN panchayat TEXT');
  }
  if (!surveyColumns.includes('unique_id')) {
    await db.execute('ALTER TABLE surveys ADD COLUMN unique_id TEXT');
  }

  // Backfill unique ids for any pre-existing survey rows.
  const surveysNeedingId = await db.execute(
    "SELECT id, district, panchayat, village_town FROM surveys WHERE unique_id IS NULL OR unique_id = ''"
  );
  for (const s of surveysNeedingId.rows) {
    const uniqueId = await generateUniqueId(
      () => buildSurveyId(s.district, s.panchayat, s.village_town),
      async (candidate) => {
        const existing = await db.execute({
          sql: 'SELECT 1 FROM surveys WHERE unique_id = @id',
          args: { id: candidate },
        });
        return !!existing.rows[0];
      }
    );
    await db.execute({ sql: 'UPDATE surveys SET unique_id = @uniqueId WHERE id = @id', args: { uniqueId, id: s.id } });
  }

  // Older rows predate the canonical xxxx-xxxx-xxxx Aadhaar format — reformat any
  // still stored as a bare 12-digit string (dashed/empty values are left untouched).
  await db.execute(`
    UPDATE surveys
    SET aadhaar_number = substr(aadhaar_number, 1, 4) || '-' || substr(aadhaar_number, 5, 4) || '-' || substr(aadhaar_number, 9, 4)
    WHERE aadhaar_number GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  `);

  // Defense in depth against duplicate mobile/Aadhaar numbers, on top of the
  // application-level check in routes/surveys.js. Wrapped because an existing
  // install could in theory already contain duplicates this can't retroactively fix.
  try {
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_mobile_unique ON surveys(mobile_number)');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_aadhaar_unique ON surveys(aadhaar_number)');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_unique_id ON surveys(unique_id)');
  } catch (err) {
    console.warn('Could not create uniqueness indexes on surveys (existing duplicate data?):', err.message);
  }

  try {
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_tasks_unique_id ON survey_tasks(unique_id)');
    // One open task per scheme per survey — once it's done/removed, another can be added.
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_tasks_survey_scheme ON survey_tasks(survey_id, scheme_key)');
  } catch (err) {
    console.warn('Could not create uniqueness indexes on survey_tasks:', err.message);
  }
}

module.exports = { db, migrate };
