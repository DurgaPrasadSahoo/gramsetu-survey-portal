const bcrypt = require('bcryptjs');
const db = require('./connection');

function seed() {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gramsetu.gov.in');
  const existingAgent = db.prepare('SELECT id FROM users WHERE email = ?').get('agent@gramsetu.gov.in');

  const insert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, 'active')
  `);

  if (!existingAdmin) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    insert.run('Portal Administrator', 'admin@gramsetu.gov.in', hash, 'admin');
    console.log('Seeded admin user: admin@gramsetu.gov.in / Admin@123');
  } else {
    console.log('Admin user already exists, skipping.');
  }

  if (!existingAgent) {
    const hash = bcrypt.hashSync('Agent@123', 10);
    insert.run('Field Agent Demo', 'agent@gramsetu.gov.in', hash, 'agent');
    console.log('Seeded agent user: agent@gramsetu.gov.in / Agent@123');
  } else {
    console.log('Agent user already exists, skipping.');
  }
}

seed();
