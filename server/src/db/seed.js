const bcrypt = require('bcryptjs');
const db = require('./connection');

// Ordered so each entry's parentEmail already exists by the time it is inserted:
// developer -> admin -> head of district -> head of panchayat -> field agent.
const DEMO_USERS = [
  { name: 'Portal Developer', email: 'developer@gramsetu.gov.in', password: 'Developer@123', role: 'developer', parentEmail: null },
  { name: 'Portal Administrator', email: 'admin@gramsetu.gov.in', password: 'Admin@123', role: 'admin', parentEmail: null },
  {
    name: 'Khordha Head of District',
    email: 'district.head@gramsetu.gov.in',
    password: 'District@123',
    role: 'head_of_district',
    parentEmail: 'admin@gramsetu.gov.in',
  },
  {
    name: 'Bhubaneswar Head of Panchayat',
    email: 'panchayat.head@gramsetu.gov.in',
    password: 'Panchayat@123',
    role: 'head_of_panchayat',
    parentEmail: 'district.head@gramsetu.gov.in',
  },
  {
    name: 'Field Agent Demo',
    email: 'agent@gramsetu.gov.in',
    password: 'Agent@123',
    role: 'field_agent',
    parentEmail: 'panchayat.head@gramsetu.gov.in',
  },
];

function seed() {
  const findByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const insert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, parent_id, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  for (const u of DEMO_USERS) {
    if (findByEmail.get(u.email)) {
      console.log(`${u.role} user already exists, skipping: ${u.email}`);
      continue;
    }
    const parentId = u.parentEmail ? findByEmail.get(u.parentEmail)?.id ?? null : null;
    const hash = bcrypt.hashSync(u.password, 10);
    insert.run(u.name, u.email, hash, u.role, parentId);
    console.log(`Seeded ${u.role} user: ${u.email} / ${u.password}`);
  }

  // Accounts created before the hierarchy existed (or self-registered under the
  // old public /register flow) have no supervisor. Attach them to the demo
  // Head of Panchayat / Head of District so their existing survey data stays
  // visible within the new tree instead of becoming orphaned.
  const demoHop = findByEmail.get('panchayat.head@gramsetu.gov.in');
  if (demoHop) {
    db.prepare(`UPDATE users SET parent_id = ? WHERE role = 'field_agent' AND parent_id IS NULL AND id != ?`).run(
      demoHop.id,
      demoHop.id
    );
  }
  const demoHod = findByEmail.get('district.head@gramsetu.gov.in');
  if (demoHod) {
    db.prepare(`UPDATE users SET parent_id = ? WHERE role = 'head_of_panchayat' AND parent_id IS NULL AND id != ?`).run(
      demoHod.id,
      demoHod.id
    );
  }
}

seed();
