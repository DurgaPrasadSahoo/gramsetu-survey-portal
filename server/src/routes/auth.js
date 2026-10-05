const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { ROLES, REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES, CREATABLE_ROLES_BY_ROLE } = require('../constants/roles');
const { ODISHA_DISTRICTS } = require('../constants/districtCodes');
const { USER_STATUS, PROFILE_REQUEST_STATUS } = require('../constants/userStatus');
const { buildProfileId, generateUniqueId } = require('../utils/uniqueId');
const { getVisibleUserIds } = require('../utils/hierarchy');
const { isMaintenanceMode } = require('../utils/settings');

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
    mobile_number: user.mobile_number,
    unique_id: user.unique_id,
  };
}

async function findUserByEmail(email) {
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = @email', args: { email } });
  return result.rows[0];
}

async function findUserById(id) {
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = @id', args: { id } });
  return result.rows[0];
}

// Registering new accounts: everyone but a field agent may do it, for any role
// strictly below their own (see CREATABLE_ROLES_BY_ROLE) and only for people
// who'd end up working under them. Only a developer sets a password directly
// (their new accounts go live immediately); anyone else's submissions are
// parked as 'under_authentication' with a profile_requests ticket for a
// developer to review, set a password for, and activate.
router.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, email, password, confirmPassword, role, parentId, district, mobileNumber } = req.body;
    const isDeveloper = req.user.role === 'developer';

    const creatableRoles = CREATABLE_ROLES_BY_ROLE[req.user.role] || [];
    if (!creatableRoles.length) {
      return res.status(403).json({ message: 'You do not have permission to register new accounts.' });
    }

    if (!name || !email || !role || !district || !mobileNumber) {
      return res.status(400).json({ message: 'Name, email, mobile number, role and district are required.' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Mobile number must be 10 digits.' });
    }
    if (!ROLES.includes(role) || !creatableRoles.includes(role)) {
      return res.status(403).json({ message: 'You do not have permission to register this role.' });
    }
    if (!ODISHA_DISTRICTS.includes(district)) {
      return res.status(400).json({ message: 'Invalid district selected.' });
    }
    if (isDeveloper) {
      if (!password) return res.status(400).json({ message: 'Password is required.' });
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
      }
    }

    let resolvedParentId = null;
    const requiredParentRoles = REQUIRED_PARENT_ROLES[role];
    const optionalParentRoles = OPTIONAL_PARENT_ROLES[role];

    if (requiredParentRoles || (optionalParentRoles && parentId)) {
      if (requiredParentRoles && !parentId) {
        return res.status(400).json({ message: 'Please select who this user reports to.' });
      }
      const parent = await findUserById(parentId);
      const allowedParentRoles = requiredParentRoles || optionalParentRoles;
      if (!parent || !allowedParentRoles.includes(parent.role)) {
        return res.status(400).json({ message: 'Selected supervisor is not valid for this role.' });
      }
      // The supervisor must actually be reachable in the requester's own
      // downline (or be the requester themselves) — a Head of District can
      // register a Field Agent under one of their own Heads of Panchayat,
      // but not under some other District's. getVisibleUserIds already
      // returns null (no restriction) for admin/developer.
      const visibleIds = await getVisibleUserIds(req.user);
      if (visibleIds && !visibleIds.includes(parent.id)) {
        return res.status(403).json({ message: 'That supervisor is not part of your own team.' });
      }
      resolvedParentId = parent.id;
    }

    const existing = await findUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const uniqueId = await generateUniqueId(
      () => buildProfileId(role, district),
      async (candidate) => {
        const result = await db.execute({ sql: 'SELECT 1 FROM users WHERE unique_id = @id', args: { id: candidate } });
        return !!result.rows[0];
      }
    );

    const hash = isDeveloper ? bcrypt.hashSync(password, 10) : null;
    const status = isDeveloper ? USER_STATUS.ACTIVE : USER_STATUS.UNDER_AUTHENTICATION;

    const info = await db.execute({
      sql: `INSERT INTO users (name, email, password_hash, role, parent_id, district, mobile_number, unique_id, status)
            VALUES (@name, @email, @hash, @role, @parentId, @district, @mobileNumber, @uniqueId, @status)`,
      args: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hash,
        role,
        parentId: resolvedParentId,
        district,
        mobileNumber,
        uniqueId,
        status,
      },
    });
    const newUserId = Number(info.lastInsertRowid);

    if (!isDeveloper) {
      await db.execute({
        sql: 'INSERT INTO profile_requests (user_id, requested_by, status) VALUES (@userId, @requestedBy, @status)',
        args: { userId: newUserId, requestedBy: req.user.id, status: PROFILE_REQUEST_STATUS.PENDING },
      });
    }

    const user = await findUserById(newUserId);
    res.status(201).json({ user: toPublicUser(user), pendingApproval: !isDeveloper });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (user.role !== 'developer' && (await isMaintenanceMode())) {
      return res.status(503).json({ message: 'The portal is temporarily paused for maintenance. Please check back shortly.' });
    }
    if (user.status === USER_STATUS.INACTIVE) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
    }
    if (user.status === USER_STATUS.UNDER_AUTHENTICATION) {
      return res.status(403).json({ message: 'Your account is awaiting developer approval. Please check back later.' });
    }

    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: toPublicUser(user) });
  })
);

// Forgot password: issues a time-limited reset token.
// NOTE: this demo has no email/SMS service wired up, so the token is returned
// directly in the API response (and logged) instead of being emailed out.
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await findUserByEmail(email.toLowerCase().trim());
    // Always respond with 200 to avoid leaking which emails are registered.
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutes

    await db.execute({
      sql: 'UPDATE users SET reset_token = @token, reset_token_expires = @expires WHERE id = @id',
      args: { token, expires, id: user.id },
    });

    console.log(`[password reset] ${user.email} -> token=${token} (valid 30 min)`);

    res.json({
      message: 'If that email is registered, a reset link has been generated.',
      // Exposed here only because this demo portal has no outbound email/SMS integration.
      devResetToken: token,
    });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const result = await db.execute({ sql: 'SELECT * FROM users WHERE reset_token = @token', args: { token } });
    const user = result.rows[0];
    if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    await db.execute({
      sql: 'UPDATE users SET password_hash = @hash, reset_token = NULL, reset_token_expires = NULL WHERE id = @id',
      args: { hash, id: user.id },
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  })
);

module.exports = router;
