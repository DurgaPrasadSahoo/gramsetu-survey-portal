const express = require('express');
const { db } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { SCHEME_BY_KEY, markedSchemeLabels } = require('../constants/schemes');
const { TASK_STATUS } = require('../constants/taskStatus');

const router = express.Router();
router.use(authenticate);
// Both analysis views are an admin/developer-only reporting surface over
// every household and every worker, so there's no hierarchy-visibility
// scoping here the way there is for surveys.js/users.js — just a role gate.
router.use(requireRole('developer', 'admin'));

// Distinct village names actually on record for a district/panchayat. There's
// no static village list to cascade from (SurveyForm takes the village as
// free text), so the filter is built from whatever households have already
// been surveyed there.
router.get(
  '/villages',
  asyncHandler(async (req, res) => {
    const { district, panchayat } = req.query;
    const clauses = [`village_town IS NOT NULL`, `village_town != ''`];
    const params = {};
    if (district) {
      clauses.push('district = @district');
      params.district = district;
    }
    if (panchayat) {
      clauses.push('panchayat = @panchayat');
      params.panchayat = panchayat;
    }
    const rows = (
      await db.execute({
        sql: `SELECT DISTINCT village_town FROM surveys WHERE ${clauses.join(' AND ')} ORDER BY village_town`,
        args: params,
      })
    ).rows;
    res.json({ data: rows.map((r) => r.village_town) });
  })
);

// Survey analysis: every household survey under the selected area, filtered
// to those where every selected scheme is (or isn't) marked availed.
router.get(
  '/surveys',
  asyncHandler(async (req, res) => {
    const { district, panchayat, village, availability, page = 1, pageSize = 10 } = req.query;

    const schemeKeys = String(req.query.schemes || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (schemeKeys.length === 0) {
      return res.status(400).json({ message: 'Select at least one scheme to run this analysis.' });
    }
    if (!['yes', 'no'].includes(availability)) {
      return res.status(400).json({ message: 'Select an availability option (Yes or No).' });
    }
    const schemes = schemeKeys.map((k) => SCHEME_BY_KEY[k]);
    if (schemes.some((s) => !s)) {
      return res.status(400).json({ message: 'One or more selected schemes are invalid.' });
    }

    const clauses = [];
    const params = {};
    if (district) {
      clauses.push('district = @district');
      params.district = district;
    }
    if (panchayat) {
      clauses.push('panchayat = @panchayat');
      params.panchayat = panchayat;
    }
    if (village) {
      clauses.push('village_town = @village');
      params.village = village;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = (
      await db.execute({
        sql: `SELECT id, unique_id, full_name, created_by_name, district, panchayat, village_town, govt_scheme_availed
              FROM surveys ${where} ORDER BY created_at DESC`,
        args: params,
      })
    ).rows;

    // govt_scheme_availed is a free-form ", "-joined label string, not a
    // normalized join table, so the multi-scheme match happens in memory —
    // "Yes" means every selected scheme is marked, "No" means none of them are.
    const selectedLabels = schemes.map((s) => s.label);
    const matched = rows.filter((survey) => {
      const marked = new Set(markedSchemeLabels(survey.govt_scheme_availed));
      return availability === 'yes'
        ? selectedLabels.every((label) => marked.has(label))
        : selectedLabels.every((label) => !marked.has(label));
    });

    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const start = (currentPage - 1) * limit;

    res.json({
      data: matched.slice(start, start + limit),
      total: matched.length,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(matched.length / limit) || 1,
    });
  })
);

// Team worker analysis: how much each worker has done (surveys submitted, or
// work tasks initiated) within the selected area.
router.get(
  '/workers',
  asyncHandler(async (req, res) => {
    const { district, panchayat, village, performanceBased, sort = 'desc' } = req.query;
    if (!['survey', 'task'].includes(performanceBased)) {
      return res.status(400).json({ message: 'Select a performance basis (Survey or Work Task).' });
    }
    if (!['asc', 'desc'].includes(sort)) {
      return res.status(400).json({ message: 'Select a sort order.' });
    }

    let statusKeys = [];
    if (performanceBased === 'task') {
      statusKeys = String(req.query.statuses || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const validStatuses = Object.values(TASK_STATUS);
      if (statusKeys.length === 0 || statusKeys.some((s) => !validStatuses.includes(s))) {
        return res.status(400).json({ message: 'Select at least one work task status.' });
      }
    }

    const areaClauses = [];
    const areaParams = {};
    if (district) {
      areaClauses.push('district = @district');
      areaParams.district = district;
    }
    if (panchayat) {
      areaClauses.push('panchayat = @panchayat');
      areaParams.panchayat = panchayat;
    }
    if (village) {
      areaClauses.push('village_town = @village');
      areaParams.village = village;
    }

    let countRows;
    if (performanceBased === 'survey') {
      const where = areaClauses.length ? `WHERE ${areaClauses.join(' AND ')}` : '';
      countRows = (
        await db.execute({
          sql: `SELECT created_by AS user_id, COUNT(*) AS cnt FROM surveys ${where} GROUP BY created_by`,
          args: areaParams,
        })
      ).rows;
    } else {
      const params = { ...areaParams };
      const surveyAreaClauses = areaClauses.map((c) => c.replace(/^(\w+)/, 's.$1'));
      const statusPlaceholders = statusKeys.map((s, i) => {
        params[`status${i}`] = s;
        return `@status${i}`;
      });
      const clauses = [...surveyAreaClauses, `t.status IN (${statusPlaceholders.join(', ')})`];
      countRows = (
        await db.execute({
          sql: `SELECT t.initiated_by AS user_id, COUNT(*) AS cnt
                FROM survey_tasks t JOIN surveys s ON s.id = t.survey_id
                WHERE ${clauses.join(' AND ')}
                GROUP BY t.initiated_by`,
          args: params,
        })
      ).rows;
    }
    const countMap = new Map(countRows.map((r) => [r.user_id, Number(r.cnt)]));

    // Base roster: every team-hierarchy worker, scoped to the selected
    // district so the area's head shows up even at zero count. Never the
    // developer (they're not anyone's "team member") and never a bare admin —
    // either of those only appears below via actual evidence of work done.
    const rosterClauses = [`role IN ('head_of_district', 'head_of_panchayat', 'field_agent')`];
    const rosterParams = {};
    if (district) {
      rosterClauses.push('district = @district');
      rosterParams.district = district;
    }
    const rosterRows = (
      await db.execute({
        sql: `SELECT id, name, role, unique_id FROM users WHERE ${rosterClauses.join(' AND ')}`,
        args: rosterParams,
      })
    ).rows;
    const roster = new Map(rosterRows.map((u) => [u.id, u]));

    // Anyone outside that roster — an out-of-area head, an admin, even the
    // developer — who actually has matching work in this area counts too.
    const evidenceIds = [...countMap.keys()].filter((id) => !roster.has(id));
    if (evidenceIds.length) {
      const params = {};
      const placeholders = evidenceIds.map((id, i) => {
        params[`ev${i}`] = id;
        return `@ev${i}`;
      });
      const extra = (
        await db.execute({
          sql: `SELECT id, name, role, unique_id FROM users WHERE id IN (${placeholders.join(', ')})`,
          args: params,
        })
      ).rows;
      for (const u of extra) roster.set(u.id, u);
    }

    const result = [...roster.values()].map((u) => ({
      id: u.id,
      unique_id: u.unique_id,
      name: u.name,
      role: u.role,
      count: countMap.get(u.id) || 0,
    }));

    result.sort((a, b) => (sort === 'asc' ? a.count - b.count : b.count - a.count) || a.name.localeCompare(b.name));

    res.json({ data: result });
  })
);

module.exports = router;
