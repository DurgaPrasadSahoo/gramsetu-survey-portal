const bcrypt = require('bcryptjs');
const { db } = require('./connection');
const { buildProfileId, generateUniqueId } = require('../utils/uniqueId');

// Ordered so each entry's parentEmail already exists by the time it is inserted:
// developer -> admin -> head of district -> head of panchayat -> field agent.
// Every demo account shares the same password — see connection.js's one-time
// default-password migration, which resets every existing account to match.
const DEMO_PASSWORD = '12345';

const DEMO_USERS = [
  { name: 'Portal Developer', email: 'developer@gramsetu.gov.in', password: DEMO_PASSWORD, role: 'developer', parentEmail: null },
  { name: 'Portal Administrator', email: 'admin@gramsetu.gov.in', password: DEMO_PASSWORD, role: 'admin', parentEmail: null },
  {
    name: 'Khordha Head of District',
    email: 'district.head@gramsetu.gov.in',
    password: DEMO_PASSWORD,
    role: 'head_of_district',
    parentEmail: 'admin@gramsetu.gov.in',
  },
  {
    name: 'Bhubaneswar Head of Panchayat',
    email: 'panchayat.head@gramsetu.gov.in',
    password: DEMO_PASSWORD,
    role: 'head_of_panchayat',
    panchayat: 'Achutyapurpatna',
    parentEmail: 'district.head@gramsetu.gov.in',
  },
  {
    name: 'Field Agent Demo',
    email: 'agent@gramsetu.gov.in',
    password: DEMO_PASSWORD,
    role: 'field_agent',
    parentEmail: 'panchayat.head@gramsetu.gov.in',
  },
];

const DEMO_DISTRICT = 'Khordha';

async function findByEmail(email) {
  const result = await db.execute({ sql: 'SELECT id FROM users WHERE email = @email', args: { email } });
  return result.rows[0];
}

async function seed() {
  for (const u of DEMO_USERS) {
    if (await findByEmail(u.email)) {
      console.log(`${u.role} user already exists, skipping: ${u.email}`);
      continue;
    }
    const parent = u.parentEmail ? await findByEmail(u.parentEmail) : null;
    const hash = bcrypt.hashSync(u.password, 10);
    const uniqueId = await generateUniqueId(
      () => buildProfileId(u.role, DEMO_DISTRICT),
      async (candidate) => {
        const existing = await db.execute({ sql: 'SELECT 1 FROM users WHERE unique_id = @id', args: { id: candidate } });
        return !!existing.rows[0];
      }
    );
    await db.execute({
      sql: `INSERT INTO users (name, email, password_hash, role, parent_id, district, panchayat, unique_id, status)
            VALUES (@name, @email, @hash, @role, @parentId, @district, @panchayat, @uniqueId, 'active')`,
      args: {
        name: u.name,
        email: u.email,
        hash,
        role: u.role,
        parentId: parent?.id ?? null,
        district: DEMO_DISTRICT,
        panchayat: u.panchayat || null,
        uniqueId,
      },
    });
    console.log(`Seeded ${u.role} user: ${u.email} / ${u.password}`);
  }

  // Accounts created before the hierarchy existed (or self-registered under the
  // old public /register flow) have no supervisor. Attach them to the demo
  // Head of Panchayat / Head of District so their existing survey data stays
  // visible within the new tree instead of becoming orphaned.
  const demoHop = await findByEmail('panchayat.head@gramsetu.gov.in');
  if (demoHop) {
    await db.execute({
      sql: `UPDATE users SET parent_id = @parentId WHERE role = 'field_agent' AND parent_id IS NULL AND id != @parentId`,
      args: { parentId: demoHop.id },
    });
  }
  await db.execute(
    `UPDATE users SET panchayat = 'Achutyapurpatna'
     WHERE email = 'panchayat.head@gramsetu.gov.in' AND (panchayat IS NULL OR panchayat = '')`
  );

  const demoHod = await findByEmail('district.head@gramsetu.gov.in');
  if (demoHod) {
    await db.execute({
      sql: `UPDATE users SET parent_id = @parentId WHERE role = 'head_of_panchayat' AND parent_id IS NULL AND id != @parentId`,
      args: { parentId: demoHod.id },
    });
  }
}

module.exports = seed;

// Allows `npm run seed` to be run standalone (e.g. before the server has ever
// started), not just as part of index.js's startup sequence.
if (require.main === module) {
  const { migrate } = require('./connection');
  migrate()
    .then(seed)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
