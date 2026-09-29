'use strict';

function makeQueries(db) {
  const statements = {
    households: db.prepare('SELECT * FROM households ORDER BY id'),
    householdById: db.prepare('SELECT * FROM households WHERE id = ?'),
    incomeByHh: db.prepare('SELECT * FROM income_records WHERE household_id = ? ORDER BY date, id'),
    expensesByHh: db.prepare('SELECT * FROM expense_records WHERE household_id = ? ORDER BY date, id'),
    loansByHh: db.prepare('SELECT * FROM loans WHERE household_id = ? ORDER BY id'),
    cropsByHh: db.prepare('SELECT * FROM crops WHERE household_id = ? ORDER BY id'),
    allIncome: db.prepare('SELECT * FROM income_records ORDER BY date, id'),
    allExpenses: db.prepare('SELECT * FROM expense_records ORDER BY date, id'),
    allLoans: db.prepare('SELECT * FROM loans ORDER BY id'),
    cropPrices: db.prepare('SELECT * FROM crop_prices ORDER BY month, id'),
    rainfall: db.prepare('SELECT * FROM district_rainfall ORDER BY month, id'),
    resources: db.prepare('SELECT * FROM village_resources ORDER BY id'),
    skills: db.prepare('SELECT * FROM skills ORDER BY id'),
    projects: db.prepare('SELECT * FROM projects ORDER BY id'),
    metaByKey: db.prepare('SELECT value FROM village_meta WHERE key = ?'),
    insertLog: db.prepare(
      `INSERT INTO advisory_logs (household_id, village_level, feature, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ),
  };

  return {
    households: { all: () => statements.households.all() },
    householdById: { get: (id) => statements.householdById.get(id) },
    incomeByHh: { all: (id) => statements.incomeByHh.all(id) },
    expensesByHh: { all: (id) => statements.expensesByHh.all(id) },
    loansByHh: { all: (id) => statements.loansByHh.all(id) },
    cropsByHh: { all: (id) => statements.cropsByHh.all(id) },
    allIncome: { all: () => statements.allIncome.all() },
    allExpenses: { all: () => statements.allExpenses.all() },
    allLoans: { all: () => statements.allLoans.all() },
    cropPrices: { all: () => statements.cropPrices.all() },
    rainfall: { all: () => statements.rainfall.all() },
    resources: { all: () => statements.resources.all() },
    skills: { all: () => statements.skills.all() },
    metaNumber(key) {
      const row = statements.metaByKey.get(key);
      if (!row) return 0;
      const value = Number(row.value);
      return Number.isFinite(value) ? value : 0;
    },
    loadProjects() {
      return statements.projects.all().map((project) => ({
        ...project,
        required_skills: JSON.parse(project.required_skills_json),
        required_equipment: JSON.parse(project.required_equipment_json),
      }));
    },
    loadVillage() {
      const row = (key) => statements.metaByKey.get(key);
      const asNumber = (key) => {
        const value = Number(row(key)?.value ?? 0);
        return Number.isFinite(value) ? value : 0;
      };
      return {
        skills: statements.skills.all(),
        village_resources: statements.resources.all(),
        shg_fund_available: asNumber('shg_fund_available'),
        govt_scheme_budget: asNumber('govt_scheme_budget'),
      };
    },
    logAdvisory({ householdId = null, villageLevel = 0, feature, payload = null }) {
      statements.insertLog.run(
        householdId,
        villageLevel ? 1 : 0,
        feature,
        payload === null ? null : JSON.stringify(payload),
        new Date().toISOString()
      );
    },
  };
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row);
  }
  return grouped;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { makeQueries, groupBy, round2 };