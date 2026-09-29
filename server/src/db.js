'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  head_name TEXT NOT NULL,
  village TEXT NOT NULL,
  family_size INTEGER NOT NULL,
  land_acres REAL NOT NULL,
  irrigation_type TEXT NOT NULL CHECK (irrigation_type IN ('rainfed','borewell','canal'))
);
CREATE TABLE IF NOT EXISTS income_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  date TEXT NOT NULL, source_type TEXT NOT NULL, amount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS expense_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  date TEXT NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  lender_type TEXT NOT NULL, principal REAL NOT NULL, interest_rate_pct REAL NOT NULL,
  monthly_installment REAL NOT NULL, start_date TEXT NOT NULL, months_remaining INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  crop_name TEXT NOT NULL, sowing_month INTEGER NOT NULL, acreage REAL NOT NULL,
  irrigation_type TEXT NOT NULL, expected_yield_quintal REAL NOT NULL, cost_per_acre REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS crop_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_name TEXT NOT NULL, month TEXT NOT NULL, price_per_quintal REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS district_rainfall (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL, rainfall_mm REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS village_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL, name TEXT NOT NULL, quantity_or_capacity REAL NOT NULL,
  condition TEXT NOT NULL, owner_household_id INTEGER REFERENCES households(id), hourly_rate REAL
);
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL UNIQUE, person_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
  required_budget REAL NOT NULL, required_skills_json TEXT NOT NULL,
  required_equipment_json TEXT NOT NULL, expected_monthly_income_gain REAL NOT NULL,
  maintenance_cost_per_year REAL NOT NULL, expected_beneficiary_households INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS advisory_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER, village_level INTEGER NOT NULL DEFAULT 0,
  feature TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS village_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/**
 * Open (creating if needed) the SQLite database at dbPath and ensure the schema exists.
 * The caller decides the path; nothing here reads env vars or computes locations.
 * @param {string} dbPath
 * @returns {import('better-sqlite3').Database}
 */
function openDb(dbPath) {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new TypeError('openDb(dbPath): dbPath must be a non-empty string');
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb };
