const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const { ROLES, REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES } = require('../constants/roles');
const { ODISHA_DISTRICTS } = require('../constants/districtCodes');
const { buildProfileId, generateUniqueId } = require('../utils/uniqueId');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    parent_id: user.parent_id,
    district: user.district,
    unique_id: user.unique_id,
  };
}

// Registering new accounts (of any role, including field agents) is a developer-only
// action — there is no public self-registration. This is how every level of the
// Head of District -> Head of Panchayat -> Field Agent hierarchy gets provisioned.
router.post('/register', authenticate, requireRole('developer'), (req, res) => {
  const { name, email, password, confirmPassword, role, parentId, district } = req.body;

  if (!name || !email || !password || !role || !district) {
    return res.status(400).json({ message: 'Name, email, password, role and district are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role selected.' });
  }
  if (!ODISHA_DISTRICTS.includes(district)) {
    return res.status(400).json({ message: 'Invalid district selected.' });
  }

  let resolvedParentId = null;
  const requiredParentRoles = REQUIRED_PARENT_ROLES[role];
  const optionalParentRoles = OPTIONAL_PARENT_ROLES[role];

  if (requiredParentRoles) {
    if (!parentId) {
      return res.status(400).json({ message: 'Please select who this user reports to.' });
    }
    const parent = db.prepare('SELECT * FROM users WHERE id = ?').get(parentId);
    if (!parent || !requiredParentRoles.includes(parent.role)) {
      return res.status(400).json({ message: 'Selected supervisor is not valid for this role.' });
    }
    resolvedParentId = parent.id;
  } else if (optionalParentRoles && parentId) {
    const parent = db.prepare('SELECT * FROM users WHERE id = ?').get(parentId);
    if (!parent || !optionalParentRoles.includes(parent.role)) {
      return res.status(400).json({ message: 'Selected supervisor is not valid for this role.' });
    }
    resolvedParentId = parent.id;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const uniqueId = generateUniqueId(
    () => buildProfileId(role, district),
    (candidate) => !!db.prepare('SELECT 1 FROM users WHERE unique_id = ?').get(candidate)
  );
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, parent_id, district, unique_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
    )
    .run(name.trim(), email.toLowerCase().trim(), hash, role, resolvedParentId, district, uniqueId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ user: toPublicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
  }

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: toPublicUser(user) });
});

// Forgot password: issues a time-limited reset token.
// NOTE: this demo has no email/SMS service wired up, so the token is returned
// directly in the API response (and logged) instead of being emailed out.
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  // Always respond with 200 to avoid leaking which emails are registered.
  if (!user) {
    return res.json({ message: 'If that email is registered, a reset link has been generated.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 1000 * 60 * 30; // 30 minutes

  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  console.log(`[password reset] ${user.email} -> token=${token} (valid 30 min)`);

  res.json({
    message: 'If that email is registered, a reset link has been generated.',
    // Exposed here only because this demo portal has no outbound email/SMS integration.
    devResetToken: token,
  });
});

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Reset token and new password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(
    hash,
    user.id
  );

  res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

module.exports = router;
