'use strict';
const express = require('express');
const { rankProjects, buildProjectPlan } = require('../engines/consultancyEngine');

// Same objects the engine returns, plus `plan` (the Project Plan checklist the UI used to build client-side).
const withPlan = (ranked) => ranked.map((p) => ({ ...p, plan: buildProjectPlan(p) }));
const C = require('../constants');
const v = require('../lib/validate');
const { makeQueries } = require('../lib/queries');

module.exports = function consultancyRoutes({ db }) {
  const router = express.Router();
  const q = makeQueries(db);

  // Ranked feasibility against the current DB state. Logs one advisory_logs row.
  router.get('/projects', (_req, res) => {
    const ranked = rankProjects(q.loadProjects(), q.loadVillage());
    const top = ranked[0];
    q.logAdvisory({
      villageLevel: 1,
      feature: 'consultancy',
      payload: {
        summary: `top=${top ? top.name : '\u2014'} score=${top ? top.feasibilityScore : 0}`,
        projects: ranked.length,
        topProject: top ? top.projectId : null,
        topFeasibilityScore: top ? top.feasibilityScore : null,
      },
    });
    res.json(withPlan(ranked));
  });

  // What-if: overrides are applied in memory only. Reads from the DB, writes nothing.
  router.post('/simulate', (req, res) => {
    const b = v.bodyObject(req);
    const village = q.loadVillage();
    const knownSkills = village.skills.map((s) => s.skill_name);

    const overrideMap = (key, allowed) => {
      const raw = b[key];
      if (raw === undefined) return {};
      if (!v.isPlainObject(raw)) throw v.bad(`${key} must be an object of { name: number }`);
      const out = {};
      for (const [name, delta] of Object.entries(raw)) {
        if (!allowed.includes(name)) throw v.bad(`${key}: unknown key "${name}" (allowed: ${allowed.join(', ')})`);
        if (typeof delta !== 'number' || !Number.isFinite(delta) || Math.abs(delta) > 1e6) {
          throw v.bad(`${key}.${name} must be a finite number`);
        }
        out[name] = delta;
      }
      return out;
    };

    const overrides = {
      skills: overrideMap('skills', knownSkills),
      equipment: overrideMap('equipment', C.EQUIPMENT_TYPES),
      budget: v.number(b, 'budget', { optional: true, min: -1e10, max: 1e10 }) ?? 0,
    };

    res.json(withPlan(rankProjects(q.loadProjects(), village, overrides)));
  });

  return router;
};
