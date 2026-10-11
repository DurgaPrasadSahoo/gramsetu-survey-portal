const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { buildProfileId, generateUniqueId } = require('../utils/uniqueId');

const router = express.Router();
router.use(authenticate, requireRole('developer'));

// Developer's three-section Trash: every deleted survey, work task and
// profile still sitting there un-restored, newest first.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = (await db.execute('SELECT * FROM trash WHERE restored = 0 ORDER BY deleted_at DESC')).rows;
    const shape = (r) => ({
      trash_id: r.id,
      deleted_by_name: r.deleted_by_name,
      deleted_at: r.deleted_at,
      record: JSON.parse(r.payload),
    });
    res.json({
      surveys: rows.filter((r) => r.record_type === 'survey').map(shape),
      tasks: rows.filter((r) => r.record_type === 'task').map(shape),
      profiles: rows.filter((r) => r.record_type === 'profile').map(shape),
    });
  })
);

// Restoring re-inserts the original row (with its original id — AUTOINCREMENT
// never reissues a freed one, so this can't collide) once it's checked clean
// against whatever exists now. `overrides` lets the developer patch the
// conflicting fields and retry without starting over.
router.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const row = (
      await db.execute({ sql: 'SELECT * FROM trash WHERE id = @id AND restored = 0', args: { id: req.params.id } })
    ).rows[0];
    if (!row) return res.status(404).json({ message: 'Deleted record not found.' });

    const data = { ...JSON.parse(row.payload), ...req.body.overrides };
    const conflicts = [];

    if (row.record_type === 'survey') {
      const mobileDupe = (
        await db.execute({ sql: 'SELECT 1 FROM surveys WHERE mobile_number = @m', args: { m: data.mobile_number } })
      ).rows[0];
      if (mobileDupe) conflicts.push(`Mobile number ${data.mobile_number} is already used by another survey record.`);
      if (data.aadhaar_number) {
        const aadhaarDupe = (
          await db.execute({ sql: 'SELECT 1 FROM surveys WHERE aadhaar_number = @a', args: { a: data.aadhaar_number } })
        ).rows[0];
        if (aadhaarDupe) conflicts.push(`Aadhaar number ${data.aadhaar_number} is already used by another survey record.`);
      }
      const creatorExists = (
        await db.execute({ sql: 'SELECT 1 FROM users WHERE id = @id', args: { id: data.created_by } })
      ).rows[0];
      if (!creatorExists) conflicts.push('The profile that originally submitted this survey no longer exists.');

      if (conflicts.length) {
        return res.status(409).json({ message: 'Cannot restore — this conflicts with current records.', conflicts, record: data });
      }
      const columns = Object.keys(data);
      await db.execute({
        sql: `INSERT INTO surveys (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
        args: data,
      });
    } else if (row.record_type === 'task') {
      const surveyExists = (
        await db.execute({ sql: 'SELECT 1 FROM surveys WHERE id = @id', args: { id: data.survey_id } })
      ).rows[0];
      if (!surveyExists) conflicts.push('The survey this work task belonged to no longer exists — restore that survey first.');
      const schemeTaken = (
        await db.execute({
          sql: 'SELECT 1 FROM survey_tasks WHERE survey_id = @sid AND scheme_key = @sk',
          args: { sid: data.survey_id, sk: data.scheme_key },
        })
      ).rows[0];
      if (schemeTaken) conflicts.push(`A work task for "${data.scheme_label}" already exists on this survey.`);
      const initiatorExists = (
        await db.execute({ sql: 'SELECT 1 FROM users WHERE id = @id', args: { id: data.initiated_by } })
      ).rows[0];
      if (!initiatorExists) conflicts.push('The profile that initiated this work task no longer exists.');

      if (conflicts.length) {
        return res.status(409).json({ message: 'Cannot restore — this conflicts with current records.', conflicts, record: data });
      }
      const columns = Object.keys(data);
      await db.execute({
        sql: `INSERT INTO survey_tasks (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
        args: data,
      });
    } else if (row.record_type === 'profile') {
      const emailTaken = (
        await db.execute({ sql: 'SELECT 1 FROM users WHERE email = @email', args: { email: data.email } })
      ).rows[0];
      if (emailTaken) conflicts.push(`Email ${data.email} is already in use by another profile.`);

      if (conflicts.length) {
        return res.status(409).json({ message: 'Cannot restore — this conflicts with current records.', conflicts, record: data });
      }

      // A deleted supervisor can't be restored into — drop the reporting
      // line rather than block the whole restore over it.
      if (data.parent_id) {
        const parentExists = (await db.execute({ sql: 'SELECT 1 FROM users WHERE id = @id', args: { id: data.parent_id } })).rows[0];
        if (!parentExists) data.parent_id = null;
      }
      const uniqueIdTaken = (
        await db.execute({ sql: 'SELECT 1 FROM users WHERE unique_id = @id', args: { id: data.unique_id } })
      ).rows[0];
      if (uniqueIdTaken) {
        data.unique_id = await generateUniqueId(
          () => buildProfileId(data.role, data.district),
          async (candidate) => !!(await db.execute({ sql: 'SELECT 1 FROM users WHERE unique_id = @id', args: { id: candidate } })).rows[0]
        );
      }

      const columns = Object.keys(data);
      await db.execute({
        sql: `INSERT INTO users (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
        args: data,
      });
    }

    await db.execute({ sql: "UPDATE trash SET restored = 1, restored_at = datetime('now') WHERE id = @id", args: { id: row.id } });
    res.json({ message: 'Record restored.' });
  })
);

module.exports = router;
