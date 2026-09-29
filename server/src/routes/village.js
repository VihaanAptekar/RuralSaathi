'use strict';
const express = require('express');
const { computeHouseholdBudget } = require('../engines/budgetEngine');
const C = require('../constants');
const v = require('../lib/validate');
const { makeQueries, groupBy, round2 } = require('../lib/queries');

module.exports = function villageRoutes({ db }) {
  const router = express.Router();
  const q = makeQueries(db);

  const resourceById = db.prepare('SELECT * FROM village_resources WHERE id = ?');
  const skillById = db.prepare('SELECT * FROM skills WHERE id = ?');
  const updateResource = db.prepare(
    'UPDATE village_resources SET quantity_or_capacity = ?, condition = ? WHERE id = ?'
  );
  const updateSkill = db.prepare('UPDATE skills SET person_count = ? WHERE id = ?');

  // ---- dashboard ---------------------------------------------------------------------------
  router.get('/dashboard', (_req, res) => {
    const households = q.households.all();
    const allIncome = q.allIncome.all();
    const allExpenses = q.allExpenses.all();
    const income = groupBy(allIncome, 'household_id');
    const expenses = groupBy(allExpenses, 'household_id');
    const loans = groupBy(q.allLoans.all(), 'household_id');

    // The 12 most recent calendar months present in the data, oldest first.
    const monthSet = new Set([...allIncome, ...allExpenses].map((r) => r.date.slice(0, 7)));
    const months = [...monthSet].sort().slice(-12);
    const inWindow = new Set(months);

    const cashByMonth = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
    const mix = new Map();
    let totalIncome = 0;
    let totalExpense = 0;
    for (const r of allIncome) {
      const m = r.date.slice(0, 7);
      if (!inWindow.has(m)) continue;
      cashByMonth.get(m).income += r.amount;
      mix.set(r.source_type, (mix.get(r.source_type) || 0) + r.amount);
      totalIncome += r.amount;
    }
    for (const r of allExpenses) {
      const m = r.date.slice(0, 7);
      if (!inWindow.has(m)) continue;
      cashByMonth.get(m).expense += r.amount;
      totalExpense += r.amount;
    }

    // Per-household picture via the budget engine (same thresholds as the household alerts).
    const overIndebted = [];
    let sumAvgMonthlyIncome = 0;
    let sumSavingsRate = 0;
    let bufferCritical = 0;
    let bufferAtRisk = 0;
    let moneylenderLoans = 0;
    for (const h of households) {
      const hl = loans.get(h.id) || [];
      const b = computeHouseholdBudget(h, income.get(h.id) || [], expenses.get(h.id) || [], hl);
      sumAvgMonthlyIncome += b.avgMonthlyIncome;
      sumSavingsRate += b.savingsRatePct;
      if (b.bufferStatus === 'CRITICAL') bufferCritical += 1;
      else if (b.bufferStatus === 'AT_RISK') bufferAtRisk += 1;
      const hasMoneylender = hl.some((l) => l.lender_type === 'moneylender');
      if (hasMoneylender) moneylenderLoans += 1;
      if (b.alerts.some((a) => a.id === 'over_indebted')) {
        overIndebted.push({
          id: h.id,
          head_name: h.head_name,
          village: h.village,
          debtToIncomePct: b.debtToIncomePct,
          avgMonthlyIncome: b.avgMonthlyIncome,
          monthlyInstallments: round2(hl.reduce((s, l) => s + l.monthly_installment, 0)),
          hasMoneylender,
        });
      }
    }
    overIndebted.sort((a, b) => b.debtToIncomePct - a.debtToIncomePct);

    const n = households.length;
    res.json({
      kpis: {
        totalHouseholds: n,
        totalAnnualIncome: round2(totalIncome),
        totalAnnualExpense: round2(totalExpense),
        avgMonthlyIncomePerHousehold: n ? round2(sumAvgMonthlyIncome / n) : 0,
        avgSavingsRatePct: n ? Math.round((sumSavingsRate / n) * 10) / 10 : 0,
        overIndebtedCount: overIndebted.length,
        bufferCriticalCount: bufferCritical,
        bufferAtRiskCount: bufferAtRisk,
        moneylenderLoanCount: moneylenderLoans,
      },
      incomeMix: [...mix.entries()]
        .map(([source, amount]) => ({
          source,
          value: round2(amount),
          sharePct: totalIncome > 0 ? round2((amount / totalIncome) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value),
      cashFlow: [...cashByMonth.values()].map((m) => ({
        month: m.month,
        income: round2(m.income),
        expense: round2(m.expense),
        net: round2(m.income - m.expense),
      })),
      overIndebted,
    });
  });

  // ---- resources & skills ------------------------------------------------------------------
  router.get('/resources', (_req, res) => {
    res.json({
      resources: q.resources.all(),
      skills: q.skills.all(),
      shg_fund_available: q.metaNumber('shg_fund_available'),
      govt_scheme_budget: q.metaNumber('govt_scheme_budget'),
    });
  });

  router.patch('/resources/:id', (req, res) => {
    const id = v.idParam(req.params.id, 'resource id');
    const existing = resourceById.get(id);
    if (!existing) throw v.bad(`Resource ${id} does not exist`);
    const b = v.bodyObject(req);
    const quantity = v.number(b, 'quantity_or_capacity', { optional: true, min: 0, max: 1e9 });
    const condition = v.oneOf(b, 'condition', C.RESOURCE_CONDITIONS, { optional: true });
    if (quantity === undefined && condition === undefined) {
      throw v.bad('Provide quantity_or_capacity and/or condition');
    }
    updateResource.run(quantity ?? existing.quantity_or_capacity, condition ?? existing.condition, id);
    res.json(resourceById.get(id));
  });

  router.patch('/skills/:id', (req, res) => {
    const id = v.idParam(req.params.id, 'skill id');
    if (!skillById.get(id)) throw v.bad(`Skill ${id} does not exist`);
    const b = v.bodyObject(req);
    const personCount = v.number(b, 'person_count', { integer: true, min: 0, max: 100000 });
    updateSkill.run(personCount, id);
    res.json(skillById.get(id));
  });

  return router;
};
