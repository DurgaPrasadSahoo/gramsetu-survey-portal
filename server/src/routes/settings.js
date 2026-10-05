const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { isMaintenanceMode, setMaintenanceMode } = require('../utils/settings');

const router = express.Router();
router.use(authenticate);

router.get(
  '/maintenance',
  asyncHandler(async (req, res) => {
    res.json({ maintenanceMode: await isMaintenanceMode() });
  })
);

router.patch(
  '/maintenance',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    await setMaintenanceMode(!!enabled, req.user.id);
    res.json({ maintenanceMode: !!enabled });
  })
);

module.exports = router;
