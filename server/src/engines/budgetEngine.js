import { round, clamp } from '../utils/random.js';

const DISCRETIONARY_CATEGORIES = ['food', 'festival', 'other'];

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}
function calendarMonth(dateStr) {
  return Number(dateStr.slice(5, 7));
}

function sumBy(records, keyFn) {
  const out = {};
  for (const r of records) {
    const k = keyFn(r);
    out[k] = (out[k] || 0) + (r.amount ?? 0);
  }
  return out;
}

/**
 * Compute the full budgeting picture for one household from its raw records.
 * incomeRecords / expenseRecords: last 12 months for this household.
 * loans: this household's loans (usually 0 or 1 in the seed data).
 */
export function computeHouseholdBudget(household, incomeRecords, expenseRecords, loans) {
  const monthsSeen = new Set([...incomeRecords, ...expenseRecords].map((r) => monthKey(r.date)));
  const monthCount = Math.max(monthsSeen.size, 1);

  const totalAnnualIncome = incomeRecords.reduce((s, r) => s + r.amount, 0);
  const totalAnnualExpense = expenseRecords.reduce((s, r) => s + r.amount, 0);

  const avgMonthlyIncome = totalAnnualIncome / monthCount;
  const avgMonthlyExpense = totalAnnualExpense / monthCount;

  const monthlyNetCashFlow = avgMonthlyIncome - avgMonthlyExpense;
  const savingsRatePct = avgMonthlyIncome > 0 ? (monthlyNetCashFlow / avgMonthlyIncome) * 100 : 0;

  const totalMonthlyInstallments = (loans || []).reduce((s, l) => s + (l.monthly_installment || 0), 0);
  const debtToIncomePct = avgMonthlyIncome > 0 ? (totalMonthlyInstallments / avgMonthlyIncome) * 100 : 0;

  // --- income by calendar month (for the 12-month bar chart + lean detection) ---
  const incomeByMonth = sumBy(incomeRecords, (r) => monthKey(r.date));
  const expenseByMonth = sumBy(expenseRecords, (r) => monthKey(r.date));
  const allMonthKeys = Object.keys({ ...incomeByMonth, ...expenseByMonth }).sort();

  const monthlySeries = allMonthKeys.map((mk) => ({
    month: mk,
    income: round(incomeByMonth[mk] || 0),
    expense: round(expenseByMonth[mk] || 0),
  }));

  // 3 lowest-income months -> lean-season buffer
  const sortedByIncome = [...monthlySeries].sort((a, b) => a.income - b.income);
  const threeLowest = sortedByIncome.slice(0, 3);
  const avgExpenseInLeanMonths = threeLowest.length
    ? threeLowest.reduce((s, m) => s + m.expense, 0) / threeLowest.length
    : 0;
  const leanSeasonBuffer = avgExpenseInLeanMonths * 3;

  // "current savings" proxy: cumulative net cash flow banked over the 12 months seen so far
  const currentSavings = Math.max(0, totalAnnualIncome - totalAnnualExpense);

  let bufferStatus = 'SAFE';
  if (currentSavings < leanSeasonBuffer * 0.5) bufferStatus = 'CRITICAL';
  else if (currentSavings < leanSeasonBuffer) bufferStatus = 'AT_RISK';

  // --- seasonal split: kharif (Jun-Oct) / rabi (Nov-Mar) / lean (Apr-May) ---
  let kharifIncome = 0; let rabiIncome = 0; let leanIncome = 0;
  incomeRecords.forEach((r) => {
    const m = calendarMonth(r.date);
    if (m >= 6 && m <= 10) kharifIncome += r.amount;
    else if (m === 11 || m === 12 || m <= 3) rabiIncome += r.amount;
    else leanIncome += r.amount;
  });

  // --- income concentration by source ---
  const incomeBySource = sumBy(incomeRecords, (r) => r.source_type);
  let topSource = null; let topSourceShare = 0;
  Object.entries(incomeBySource).forEach(([source, amt]) => {
    const share = totalAnnualIncome > 0 ? (amt / totalAnnualIncome) * 100 : 0;
    if (share > topSourceShare) { topSourceShare = share; topSource = source; }
  });

  // --- alerts ---
  const alerts = [];
  if (debtToIncomePct > 40) {
    alerts.push({
      id: 'over_indebted',
      severity: 'high',
      title: 'Over-indebted',
      message: `Loan installments are ${round(debtToIncomePct)}% of monthly income — avoid new borrowing until this comes down.`,
    });
  }
  const moneylenderLoan = (loans || []).find((l) => l.lender_type === 'moneylender');
  if (moneylenderLoan) {
    alerts.push({
      id: 'moneylender_debt',
      severity: 'high',
      title: 'High-cost debt',
      message: `A moneylender loan at ${moneylenderLoan.interest_rate_pct}% interest is active — check bank/SHG refinance to cut the interest cost.`,
    });
  }
  if (bufferStatus === 'CRITICAL') {
    const shortfall = Math.max(0, round(leanSeasonBuffer - currentSavings));
    alerts.push({
      id: 'buffer_critical',
      severity: 'high',
      title: 'Lean-season buffer critical',
      message: `Build a lean-season buffer of ₹${shortfall.toLocaleString('en-IN')} to safely cover the 3 leanest months.`,
    });
  } else if (bufferStatus === 'AT_RISK') {
    const shortfall = Math.max(0, round(leanSeasonBuffer - currentSavings));
    alerts.push({
      id: 'buffer_at_risk',
      severity: 'medium',
      title: 'Lean-season buffer at risk',
      message: `Savings cover only part of the lean-season buffer — ₹${shortfall.toLocaleString('en-IN')} more would make it SAFE.`,
    });
  }
  if (topSourceShare > 80 && topSource) {
    alerts.push({
      id: 'concentrated_income',
      severity: 'medium',
      title: 'Concentrated income risk',
      message: `${round(topSourceShare)}% of income comes from a single source (${topSource.replace('_', ' ')}) — a bad season there hits the whole household.`,
    });
  }

  // --- budget suggestion card ---
  const savingsTarget = Math.max(avgMonthlyIncome * 0.2, leanSeasonBuffer / 6);
  const expenseByCategory = sumBy(expenseRecords, (r) => r.category);
  const discretionaryAvgMonthly = DISCRETIONARY_CATEGORIES
    .map((cat) => ({ category: cat, avgMonthly: (expenseByCategory[cat] || 0) / monthCount }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly)
    .slice(0, 2)
    .map((c) => ({ ...c, potentialMonthlySavings: round(c.avgMonthly * 0.15) }));

  return {
    avgMonthlyIncome: round(avgMonthlyIncome),
    avgMonthlyExpense: round(avgMonthlyExpense),
    monthlyNetCashFlow: round(monthlyNetCashFlow),
    savingsRatePct: round(savingsRatePct, 1),
    debtToIncomePct: round(debtToIncomePct, 1),
    leanSeasonBuffer: round(leanSeasonBuffer),
    currentSavings: round(currentSavings),
    bufferStatus,
    monthlySeries,
    seasonalSplit: {
      kharif: round(kharifIncome),
      rabi: round(rabiIncome),
      lean: round(leanIncome),
    },
    incomeBySource,
    topSource,
    topSourceSharePct: round(topSourceShare, 1),
    alerts,
    suggestion: {
      savingsTarget: round(savingsTarget),
      topDiscretionary: discretionaryAvgMonthly,
    },
  };
}
