'use strict';

const { generateSeedData } = require('./data/seedData.js');

// Every table that seedDatabase() owns, in a safe DELETE order:
// children (rows that reference households) first, households last.
const TABLES_CHILD_FIRST = [
  'advisory_logs',
  'income_records',
  'expense_records',
  'loans',
  'crops',
  'village_resources',
  'skills',
  'projects',
  'crop_prices',
  'district_rainfall',
  'village_meta',
  'households',
];

/** True when the households table has 0 rows. */
function isEmpty(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM households').get().n === 0;
}

/** Row count per table, e.g. { households: 50, income_records: 1062, ... }. */
function tableCounts(db) {
  const counts = {};
  for (const t of [...TABLES_CHILD_FIRST].reverse()) {
    counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  }
  return counts;
}

/**
 * Populate the database from generateSeedData() in ONE transaction.
 *  - Without `force`, refuses to run on a database that already has households.
 *  - With `force`, deletes all rows (child tables first), resets AUTOINCREMENT
 *    counters, then re-inserts. Everything rolls back together on any error.
 * Returns the per-table row counts.
 */
function seedDatabase(db, { force = false } = {}) {
  if (!force && !isEmpty(db)) {
    throw new Error('seedDatabase: database already contains data; pass { force: true } to wipe and reseed.');
  }

  const data = generateSeedData();

  const insHousehold = db.prepare(
    `INSERT INTO households (id, head_name, village, family_size, land_acres, irrigation_type)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insIncome = db.prepare(
    `INSERT INTO income_records (household_id, date, source_type, amount) VALUES (?, ?, ?, ?)`
  );
  const insExpense = db.prepare(
    `INSERT INTO expense_records (household_id, date, category, amount) VALUES (?, ?, ?, ?)`
  );
  const insLoan = db.prepare(
    `INSERT INTO loans (household_id, lender_type, principal, interest_rate_pct, monthly_installment, start_date, months_remaining)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insCrop = db.prepare(
    `INSERT INTO crops (household_id, crop_name, sowing_month, acreage, irrigation_type, expected_yield_quintal, cost_per_acre)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insPrice = db.prepare(
    `INSERT INTO crop_prices (crop_name, month, price_per_quintal) VALUES (?, ?, ?)`
  );
  const insRain = db.prepare(
    `INSERT INTO district_rainfall (month, rainfall_mm) VALUES (?, ?)`
  );
  const insResource = db.prepare(
    `INSERT INTO village_resources (id, resource_type, name, quantity_or_capacity, condition, owner_household_id, hourly_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insSkill = db.prepare(
    `INSERT INTO skills (id, skill_name, person_count) VALUES (?, ?, ?)`
  );
  const insProject = db.prepare(
    `INSERT INTO projects (id, name, description, required_budget, required_skills_json, required_equipment_json,
                           expected_monthly_income_gain, maintenance_cost_per_year, expected_beneficiary_households)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insMeta = db.prepare(`INSERT INTO village_meta (key, value) VALUES (?, ?)`);

  const run = db.transaction(() => {
    if (force) {
      for (const t of TABLES_CHILD_FIRST) db.prepare(`DELETE FROM ${t}`).run();
      // sqlite_sequence only holds rows for AUTOINCREMENT tables that have inserted at least once.
      db.prepare(
        `DELETE FROM sqlite_sequence WHERE name IN (${TABLES_CHILD_FIRST.map(() => '?').join(',')})`
      ).run(...TABLES_CHILD_FIRST);
    }

    // Households keep their generated ids (1..50): all other tables reference them.
    for (const h of data.households) {
      insHousehold.run(h.id, h.head_name, h.village, h.family_size, h.land_acres, h.irrigation_type);
    }
    // The generator's string ids (e.g. '3-inc-0') are dropped; SQLite assigns integer ids
    // in generation order, so results are deterministic.
    for (const r of data.income_records) insIncome.run(r.household_id, r.date, r.source_type, r.amount);
    for (const r of data.expense_records) insExpense.run(r.household_id, r.date, r.category, r.amount);
    for (const l of data.loans) {
      insLoan.run(l.household_id, l.lender_type, l.principal, l.interest_rate_pct,
        l.monthly_installment, l.start_date, l.months_remaining);
    }
    for (const c of data.crops) {
      insCrop.run(c.household_id, c.crop_name, c.sowing_month, c.acreage, c.irrigation_type,
        c.expected_yield_quintal, c.cost_per_acre);
    }
    for (const p of data.crop_prices) insPrice.run(p.crop_name, p.month, p.price_per_quintal);
    for (const r of data.district_rainfall) insRain.run(r.month, r.rainfall_mm);
    for (const r of data.village_resources) {
      insResource.run(r.id, r.resource_type, r.name, r.quantity_or_capacity, r.condition,
        r.owner_household_id ?? null, r.hourly_rate ?? null);
    }
    for (const s of data.skills) insSkill.run(s.id, s.skill_name, s.person_count);
    for (const p of data.projects) {
      insProject.run(p.id, p.name, p.description, p.required_budget,
        JSON.stringify(p.required_skills), JSON.stringify(p.required_equipment),
        p.expected_monthly_income_gain, p.maintenance_cost_per_year, p.expected_beneficiary_households);
    }
    insMeta.run('shg_fund_available', String(data.shg_fund_available));
    insMeta.run('govt_scheme_budget', String(data.govt_scheme_budget));
  });

  run();
  return tableCounts(db);
}

module.exports = { seedDatabase, isEmpty, tableCounts };

// ---- CLI: `node src/seed.js` (or `npm run seed` in server/) ----
if (require.main === module) {
  // Path is computed here only, never at import time.
  const path = require('path');
  const { openDb } = require('./db.js');
  const dbPath = path.join(__dirname, '..', 'data', 'ruralsaathi.sqlite');

  const db = openDb(dbPath);
  try {
    const counts = seedDatabase(db, { force: true });
    console.log(`Seeded ${dbPath}`);
    console.table(counts);
  } finally {
    db.close();
  }
}
