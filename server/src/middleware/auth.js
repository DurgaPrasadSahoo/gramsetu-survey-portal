const jwt = require('jsonwebtoken');
const { isMaintenanceMode } = require('../utils/settings');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }

  // While the developer has paused the portal, every other role is locked
  // out of every endpoint — the developer themselves is never blocked.
  if (req.user.role !== 'developer') {
    try {
      if (await isMaintenanceMode()) {
        return res.status(503).json({ message: 'The portal is temporarily paused for maintenance. Please check back shortly.' });
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
