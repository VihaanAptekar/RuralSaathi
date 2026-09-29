'use strict';

const { CROPS, CROP_META } = require('./cropMeta.js');
const { PROJECTS } = require('./projects.js');

const HOUSEHOLD_HEADS = [
  ['Ramesh Yadav', 'Kheda'],
  ['Sunita Devi', 'Kheda'],
  ['Mohan Lal', 'Rampur'],
  ['Geeta Bai', 'Rampur'],
  ['Harish Patel', 'Kheda'],
  ['Lakshmi Naik', 'Rampur'],
];
const MONTHLY_RAINFALL = [8, 7, 9, 12, 28, 92, 148, 122, 78, 34, 12, 7];
const PRICE_VARIATION = [0.86, 0.94, 1.02, 1.1, 1.16, 1.07, 0.96, 0.89, 0.93, 1.04, 1.12, 1.01];

function generateSeedData() {
  let state = 7129;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  const households = [];
  const incomeRecords = [];
  const expenseRecords = [];
  const loans = [];
  const crops = [];

  HOUSEHOLD_HEADS.forEach(([head_name, village], index) => {
    const id = index + 1;
    const land_acres = 1 + Math.round(random() * 40) / 10;
    const irrigation_type = ['rainfed', 'borewell', 'canal'][index % 3];
    households.push({
      id,
      head_name,
      village,
      family_size: 3 + (index % 4),
      land_acres,
      irrigation_type,
    });

    const monthlyBase = 9000 + random() * 9000;
    for (let month = 1; month <= 12; month += 1) {
      const date = `2025-${String(month).padStart(2, '0')}-15`;
      incomeRecords.push({
        household_id: id,
        date,
        source_type: month % 3 ? 'wage_labour' : 'crop_sale',
        amount: Math.round(monthlyBase * (month % 3 ? 0.7 : 1.6)),
      });
      expenseRecords.push({
        household_id: id,
        date,
        category: ['food', 'seeds', 'health', 'education'][month % 4],
        amount: Math.round(monthlyBase * (0.5 + random() * 0.35)),
      });
    }

    if (index % 2 === 0) {
      const moneylender = index === 4;
      loans.push({
        household_id: id,
        lender_type: moneylender ? 'moneylender' : 'bank',
        principal: 60000,
        interest_rate_pct: moneylender ? 36 : 9,
        monthly_installment: moneylender ? 4200 : 1800,
        start_date: '2025-01-01',
        months_remaining: 18,
      });
    }

    const crop_name = CROPS[index % CROPS.length];
    crops.push({
      household_id: id,
      crop_name,
      sowing_month: CROP_META[crop_name].recommendedSowingMonth,
      acreage: land_acres,
      irrigation_type,
      expected_yield_quintal: Math.round(land_acres * 14),
      cost_per_acre: 14000,
    });
  });

  const crop_prices = CROPS.flatMap((crop_name) => PRICE_VARIATION.map((variation, index) => ({
    crop_name,
    month: `2025-${String(index + 1).padStart(2, '0')}`,
    price_per_quintal: Math.round(CROP_META[crop_name].avgPricePerQuintal * variation),
  })));
  const district_rainfall = [2024, 2025].flatMap((year) => MONTHLY_RAINFALL.map((rainfall_mm, index) => ({
    month: `${year}-${String(index + 1).padStart(2, '0')}`,
    rainfall_mm: Math.max(0, Math.round(rainfall_mm * (year === 2024 ? 0.9 : 1.1))),
  })));

  return {
    households,
    income_records: incomeRecords,
    expense_records: expenseRecords,
    loans,
    crops,
    crop_prices,
    district_rainfall,
    village_resources: [
      { id: 1, resource_type: 'equipment', name: 'Tractor', quantity_or_capacity: 1, condition: 'good' },
      { id: 2, resource_type: 'equipment', name: 'Thresher', quantity_or_capacity: 1, condition: 'fair' },
      { id: 3, resource_type: 'equipment', name: 'Solar Pump Set', quantity_or_capacity: 1, condition: 'good' },
    ],
    skills: [
      { id: 1, skill_name: 'mason', person_count: 2 },
      { id: 2, skill_name: 'dairy_farmer', person_count: 4 },
      { id: 3, skill_name: 'pump_repair', person_count: 1 },
      { id: 4, skill_name: 'electrician', person_count: 1 },
    ],
    projects: PROJECTS,
    shg_fund_available: 250000,
    govt_scheme_budget: 400000,
  };
}

module.exports = { generateSeedData };