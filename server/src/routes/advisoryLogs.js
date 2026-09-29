'use strict';
const express = require('express');
const v = require('../lib/validate');

module.exports = function advisoryLogsRoutes({ db }) {
  const router = express.Router();
  const recent = db.prepare(
    `SELECT l.id, l.household_id, h.head_name AS household_name, l.village_level, l.feature, l.payload_json, l.created_at
       FROM advisory_logs l LEFT JOIN households h ON h.id = l.household_id
      ORDER BY l.id DESC LIMIT ?`
  );

  router.get('/', (req, res) => {
    let limit = 10;
    if (req.query.limit !== undefined) {
      if (typeof req.query.limit !== 'string' || !/^\d{1,4}$/.test(req.query.limit)) throw v.bad('limit must be an integer between 1 and 200');
      limit = Number(req.query.limit);
      if (limit < 1 || limit > 200) throw v.bad('limit must be an integer between 1 and 200');
    }
    res.json(
      recent.all(limit).map(({ payload_json, ...row }) => {
        const payload = payload_json ? JSON.parse(payload_json) : null;
        // payload_summary + village_level (boolean) mirror what the old frontend's advisory log rows looked like
        return { ...row, village_level: !!row.village_level, payload_summary: payload && payload.summary ? payload.summary : '', payload };
      })
    );
  });
  return router;
};
