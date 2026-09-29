'use strict';
const express = require('express');
const { computeHouseholdBudget } = require('../engines/budgetEngine');
const { assessCropRisk, incomeConcentrationByCrop } = require('../engines/cropRiskEngine');
const { CROPS } = require('../data/cropMeta');
const C = require('../constants');
const v = require('../lib/validate');
const { makeQueries, groupBy } = require('../lib/queries');

module.exports = function householdsRoutes({ db }) {
  const router = express.Router();
  const q = makeQueries(db);

  const insertHousehold = db.prepare(
    'INSERT INTO households (head_name, village, family_size, land_acres, irrigation_type) VALUES (?, ?, ?, ?, ?)'
  );
  const insertIncome = db.prepare('INSERT INTO income_records (household_id, date, source_type, amount) VALUES (?, ?, ?, ?)');
  const insertExpense = db.prepare('INSERT INTO expense_records (household_id, date, category, amount) VALUES (?, ?, ?, ?)');
  const insertLoan = db.prepare(
    `INSERT INTO loans (household_id, lender_type, principal, interest_rate_pct, monthly_installment, start_date, months_remaining)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertCrop = db.prepare(
    `INSERT INTO crops (household_id, crop_name, sowing_month, acreage, irrigation_type, expected_yield_quintal, cost_per_acre)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const incomeById = db.prepare('SELECT * FROM income_records WHERE id = ?');
  const expenseById = db.prepare('SELECT * FROM expense_records WHERE id = ?');
  const loanById = db.prepare('SELECT * FROM loans WHERE id = ?');
  const cropById = db.prepare('SELECT * FROM crops WHERE id = ?');

  /** Parse :id and make sure that household exists; 400 otherwise (per Phase 2 spec). */
  function requireHousehold(req) {
    const id = v.idParam(req.params.id, 'household id');
    const household = q.householdById.get(id);
    if (!household) throw v.bad(`Household ${id} does not exist`);
    return household;
  }

  /** household row + the two summary fields the list view needs, from the budget engine. */
  function withSummary(household, income, expenses, loans) {
    const b = computeHouseholdBudget(household, income, expenses, loans);
    return { ...household, savingsRatePct: b.savingsRatePct, bufferStatus: b.bufferStatus };
  }

  function summaryFor(household) {
    return withSummary(
      household,
      q.incomeByHh.all(household.id),
      q.expensesByHh.all(household.id),
      q.loansByHh.all(household.id)
    );
  }

  // ---- list / create / detail --------------------------------------------------------------
  router.get('/', (_req, res) => {
    const income = groupBy(q.allIncome.all(), 'household_id');
    const expenses = groupBy(q.allExpenses.all(), 'household_id');
    const loans = groupBy(q.allLoans.all(), 'household_id');
    res.json(
      q.households.all().map((h) => withSummary(h, income.get(h.id) || [], expenses.get(h.id) || [], loans.get(h.id) || []))
    );
  });

  router.post('/', (req, res) => {
    const b = v.bodyObject(req);
    const row = [
      v.string(b, 'head_name'),
      v.string(b, 'village'),
      v.number(b, 'family_size', { integer: true, min: 1, max: 30 }),
      v.number(b, 'land_acres', { min: 0, max: 1000 }),
      v.oneOf(b, 'irrigation_type', C.IRRIGATION_TYPES),
    ];
    const info = insertHousehold.run(...row);
    res.status(201).json(summaryFor(q.householdById.get(info.lastInsertRowid)));
  });

  router.get('/:id', (req, res) => {
    res.json(summaryFor(requireHousehold(req)));
  });

  router.get('/:id/records', (req, res) => {
    const h = requireHousehold(req);
    res.json({
      income: q.incomeByHh.all(h.id),
      expenses: q.expensesByHh.all(h.id),
      loans: q.loansByHh.all(h.id),
      crops: q.cropsByHh.all(h.id),
    });
  });

  // ---- create records ----------------------------------------------------------------------
  router.post('/:id/income', (req, res) => {
    const h = requireHousehold(req);
    const b = v.bodyObject(req);
    const info = insertIncome.run(
      h.id,
      v.date(b, 'date'),
      v.oneOf(b, 'source_type', C.INCOME_SOURCE_TYPES),
      v.number(b, 'amount', { min: 0, minExclusive: true, max: 1e9 })
    );
    res.status(201).json(incomeById.get(info.lastInsertRowid));
  });

  router.post('/:id/expenses', (req, res) => {
    const h = requireHousehold(req);
    const b = v.bodyObject(req);
    const info = insertExpense.run(
      h.id,
      v.date(b, 'date'),
      v.oneOf(b, 'category', C.EXPENSE_CATEGORIES),
      v.number(b, 'amount', { min: 0, minExclusive: true, max: 1e9 })
    );
    res.status(201).json(expenseById.get(info.lastInsertRowid));
  });

  router.post('/:id/loans', (req, res) => {
    const h = requireHousehold(req);
    const b = v.bodyObject(req);
    const info = insertLoan.run(
      h.id,
      v.oneOf(b, 'lender_type', C.LENDER_TYPES),
      v.number(b, 'principal', { min: 0, minExclusive: true, max: 1e9 }),
      v.number(b, 'interest_rate_pct', { min: 0, max: 100 }),
      v.number(b, 'monthly_installment', { min: 0, max: 1e9 }),
      v.date(b, 'start_date'),
      v.number(b, 'months_remaining', { integer: true, min: 0, max: 600 })
    );
    res.status(201).json(loanById.get(info.lastInsertRowid));
  });

  router.post('/:id/crops', (req, res) => {
    const h = requireHousehold(req);
    const b = v.bodyObject(req);
    const info = insertCrop.run(
      h.id,
      v.oneOf(b, 'crop_name', CROPS),
      v.number(b, 'sowing_month', { integer: true, min: 1, max: 12 }),
      v.number(b, 'acreage', { min: 0, minExclusive: true, max: 1000 }),
      v.oneOf(b, 'irrigation_type', C.IRRIGATION_TYPES),
      v.number(b, 'expected_yield_quintal', { min: 0, max: 1e6 }),
      v.number(b, 'cost_per_acre', { min: 0, max: 1e7 })
    );
    res.status(201).json(cropById.get(info.lastInsertRowid));
  });

  // ---- engine-backed reads (each writes one advisory_logs row) -----------------------------
  router.get('/:id/budget', (req, res) => {
    const h = requireHousehold(req);
    const result = computeHouseholdBudget(h, q.incomeByHh.all(h.id), q.expensesByHh.all(h.id), q.loansByHh.all(h.id));
    q.logAdvisory({
      householdId: h.id,
      feature: 'budgeting',
      payload: {
        summary: `savingsRate=${result.savingsRatePct}% buffer=${result.bufferStatus}`,
        bufferStatus: result.bufferStatus,
        savingsRatePct: result.savingsRatePct,
        debtToIncomePct: result.debtToIncomePct,
        alerts: result.alerts.map((a) => a.id),
      },
    });
    res.json(result);
  });

  router.get('/:id/crop-risk', (req, res) => {
    const h = requireHousehold(req);
    const crops = q.cropsByHh.all(h.id);
    const ctx = { districtRainfall: q.rainfall.all(), cropPrices: q.cropPrices.all() };
    const assessments = crops.map((c) => assessCropRisk(c, ctx));
    const concentration = incomeConcentrationByCrop(crops, ctx.cropPrices);
    q.logAdvisory({
      householdId: h.id,
      feature: 'crop_risk',
      payload: {
        summary: `crops=${assessments.length} highRisk=${assessments.filter((a) => a.classification === 'HIGH').length}`,
        crops: assessments.length,
        high: assessments.filter((a) => a.classification === 'HIGH').length,
        classifications: assessments.map((a) => ({ crop: a.cropName, classification: a.classification })),
      },
    });
    res.json({ assessments, concentration });
  });

  return router;
};
