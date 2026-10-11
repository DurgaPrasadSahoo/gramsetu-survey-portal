const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authenticate, requireRole('developer', 'admin'));

// A single free-text box over everything: profiles and surveys. Matches on
// whatever's "nearly similar" — a plain substring match across every field a
// user would plausibly search by (name, phone, id, place), not just exact hits.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ profiles: [], surveys: [] });
    const like = `%${q}%`;

    const profiles = (
      await db.execute({
        sql: `SELECT id, name, email, role, status, district, panchayat, mobile_number, unique_id
              FROM users
              WHERE role != 'developer' AND (
                name LIKE @q OR email LIKE @q OR mobile_number LIKE @q OR unique_id LIKE @q
                OR district LIKE @q OR panchayat LIKE @q
              )
              ORDER BY created_at DESC LIMIT 50`,
        args: { q: like },
      })
    ).rows;

    const surveys = (
      await db.execute({
        sql: `SELECT id, unique_id, full_name, guardian_name, mobile_number, aadhaar_number,
                     district, panchayat, village_town, created_by_name, status
              FROM surveys
              WHERE (
                full_name LIKE @q OR guardian_name LIKE @q OR mobile_number LIKE @q OR aadhaar_number LIKE @q
                OR unique_id LIKE @q OR village_town LIKE @q OR panchayat LIKE @q OR district LIKE @q
                OR created_by_name LIKE @q
              )
              ORDER BY created_at DESC LIMIT 50`,
        args: { q: like },
      })
    ).rows;

    res.json({ profiles, surveys });
  })
);

module.exports = router;
