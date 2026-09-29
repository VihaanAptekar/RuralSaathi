import { round, clamp } from '../utils/random.js';
import { PROJECT_PHASES } from '../data/projects.js';

const SKILL_LABELS = {
  mason: 'masons',
  dairy_farmer: 'dairy farmers',
  tailor: 'tailors',
  pump_repair: 'pump-repair technicians',
  electrician: 'electricians',
  well_digger: 'well diggers',
};

const EQUIPMENT_LABELS = { tractor: 'tractor', thresher: 'thresher', pump_set: 'pump set' };
function pluralizeEquipment(type, count) {
  const base = EQUIPMENT_LABELS[type] || type;
  return count === 1 ? base : `${base}s`;
}

function equipmentAvailability(villageResources) {
  const map = {};
  villageResources
    .filter((r) => r.resource_type === 'equipment')
    .forEach((r) => {
      const key = r.name.toLowerCase().includes('tractor') ? 'tractor'
        : r.name.toLowerCase().includes('thresher') ? 'thresher'
        : r.name.toLowerCase().includes('pump') ? 'pump_set'
        : r.name.toLowerCase();
      map[key] = (map[key] || 0) + (r.quantity_or_capacity || 0);
    });
  return map;
}

function skillAvailability(skills) {
  const map = {};
  skills.forEach((s) => { map[s.skill_name] = s.person_count; });
  return map;
}

/**
 * `resourceOverrides` lets the admin "simulate adding a resource" —
 * e.g. { skills: { mason: +2 }, equipment: { tractor: +1 }, budget: +50000 }
 */
export function computeProjectFeasibility(project, village, resourceOverrides = {}) {
  const skillAvail = skillAvailability(village.skills);
  const equipAvail = equipmentAvailability(village.village_resources);

  Object.entries(resourceOverrides.skills || {}).forEach(([k, v]) => {
    skillAvail[k] = (skillAvail[k] || 0) + v;
  });
  Object.entries(resourceOverrides.equipment || {}).forEach(([k, v]) => {
    equipAvail[k] = (equipAvail[k] || 0) + v;
  });

  const budgetAvailable = village.shg_fund_available + village.govt_scheme_budget + (resourceOverrides.budget || 0);
  const budgetCoverage = clamp(project.required_budget > 0 ? budgetAvailable / project.required_budget : 1, 0, 1);

  const skillCoverages = project.required_skills.map((req) => {
    const available = skillAvail[req.skill] || 0;
    const coverage = clamp(req.count > 0 ? available / req.count : 1, 0, 1);
    return { skill: req.skill, required: req.count, available, coverage, shortfall: Math.max(0, req.count - available) };
  });
  const skillCoverage = skillCoverages.length
    ? skillCoverages.reduce((s, c) => s + c.coverage, 0) / skillCoverages.length
    : 1;

  const equipCoverages = project.required_equipment.map((req) => {
    const available = equipAvail[req.type] || 0;
    const coverage = clamp(req.count > 0 ? available / req.count : 1, 0, 1);
    return { type: req.type, required: req.count, available, coverage, shortfall: Math.max(0, req.count - available) };
  });
  const equipmentCoverage = equipCoverages.length
    ? equipCoverages.reduce((s, c) => s + c.coverage, 0) / equipCoverages.length
    : 1;

  const feasibilityScore = round((0.4 * budgetCoverage + 0.3 * skillCoverage + 0.3 * equipmentCoverage) * 100, 1);

  const gaps = [];
  if (budgetCoverage < 1) {
    const shortfall = round(project.required_budget - budgetAvailable);
    gaps.push(`Short ₹${shortfall.toLocaleString('en-IN')} of budget — top up via SHG contributions or an additional govt scheme grant.`);
  }
  skillCoverages.forEach((c) => {
    if (c.shortfall > 0) {
      const label = SKILL_LABELS[c.skill] || c.skill;
      const singular = label.endsWith('s') && c.shortfall === 1 ? label.slice(0, -1) : label;
      gaps.push(`Needs ${c.shortfall} more ${singular} — train via the skill registry or bring in help from a neighbouring village.`);
    }
  });
  equipCoverages.forEach((c) => {
    if (c.shortfall > 0) {
      gaps.push(`Needs ${c.shortfall} more ${pluralizeEquipment(c.type, c.shortfall)} — hire in for the project window or coordinate a shared schedule.`);
    }
  });
  if (gaps.length === 0) gaps.push('Fully resourced — no gaps against current village resources.');

  const annualNetBenefit = round(
    project.expected_monthly_income_gain * 12 * project.expected_beneficiary_households - project.maintenance_cost_per_year
  );

  const maintenanceSkill = project.required_skills[0]?.skill;
  const maintenanceCostSharePct = round((project.maintenance_cost_per_year / project.required_budget) * 100, 1);

  return {
    projectId: project.id,
    name: project.name,
    description: project.description,
    feasibilityScore,
    budgetCoverage: round(budgetCoverage * 100, 1),
    skillCoverage: round(skillCoverage * 100, 1),
    equipmentCoverage: round(equipmentCoverage * 100, 1),
    skillCoverages,
    equipCoverages,
    gaps,
    annualNetBenefit,
    maintenance: {
      skill: maintenanceSkill,
      skillLabel: maintenanceSkill ? (SKILL_LABELS[maintenanceSkill] || maintenanceSkill) : null,
      availablePeople: maintenanceSkill ? (skillAvail[maintenanceSkill] || 0) : 0,
      costPerYear: project.maintenance_cost_per_year,
      costSharePct: maintenanceCostSharePct,
    },
    raw: project,
  };
}

export function rankProjects(projects, village, resourceOverrides = {}) {
  const scored = projects.map((p) => computeProjectFeasibility(p, village, resourceOverrides));
  scored.sort((a, b) => b.feasibilityScore - a.feasibilityScore || b.annualNetBenefit - a.annualNetBenefit);
  return scored;
}

export function buildProjectPlan(scoredProject) {
  const budget = scoredProject.raw.required_budget;
  const scale = clamp(budget / 150000, 0.6, 1.8);
  return PROJECT_PHASES.map((phase) => ({
    key: phase.key,
    label: phase.label,
    estimatedWeeks: Math.max(1, Math.round(phase.baseWeeks * scale)),
  }));
}
