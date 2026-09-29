// The 6 embedded development projects. Numbers are tuned so the
// feasibility ranking and net-benefit figures produce a believable,
// varied spread against the seeded village resource registry.

export const PROJECTS = [
  {
    id: 'check_dam_repair',
    name: 'Check Dam Repair',
    description:
      'Repair the silted, cracked check dam so it holds monsoon runoff through the rabi season and recharges nearby wells.',
    required_budget: 140000,
    required_skills: [
      { skill: 'mason', count: 4 },
      { skill: 'pump_repair', count: 2 },
    ],
    required_equipment: [{ type: 'tractor', count: 1 }],
    expected_monthly_income_gain: 7000,
    maintenance_cost_per_year: 10000,
    expected_beneficiary_households: 28,
  },
  {
    id: 'community_compost_unit',
    name: 'Community Compost Unit',
    description:
      'A shared composting yard turning crop residue and dairy waste into organic manure, cutting fertiliser costs for member households.',
    required_budget: 45000,
    required_skills: [
      { skill: 'mason', count: 1 },
      { skill: 'dairy_farmer', count: 1 },
    ],
    required_equipment: [{ type: 'tractor', count: 1 }],
    expected_monthly_income_gain: 2500,
    maintenance_cost_per_year: 3000,
    expected_beneficiary_households: 22,
  },
  {
    id: 'dairy_cooperative',
    name: 'Dairy Cooperative',
    description:
      'A milk-collection and chilling cooperative so households selling milk get cooperative rates instead of private-trader prices.',
    required_budget: 380000,
    required_skills: [
      { skill: 'dairy_farmer', count: 6 },
      { skill: 'electrician', count: 1 },
    ],
    required_equipment: [
      { type: 'tractor', count: 1 },
      { type: 'thresher', count: 1 },
    ],
    expected_monthly_income_gain: 9000,
    maintenance_cost_per_year: 18000,
    expected_beneficiary_households: 35,
  },
  {
    id: 'solar_pump_installation',
    name: 'Solar Pump Installation',
    description:
      'Solar-powered irrigation pumps to cut diesel cost and free up borewell irrigation from erratic grid power.',
    required_budget: 200000,
    required_skills: [
      { skill: 'electrician', count: 2 },
      { skill: 'pump_repair', count: 2 },
    ],
    required_equipment: [{ type: 'pump_set', count: 1 }],
    expected_monthly_income_gain: 6500,
    maintenance_cost_per_year: 8000,
    expected_beneficiary_households: 18,
  },
  {
    id: 'seed_bank',
    name: 'Seed Bank',
    description:
      'A village-owned store of certified seed for the main kharif and rabi crops, lending seed at sowing time and repaid at harvest.',
    required_budget: 35000,
    required_skills: [{ skill: 'mason', count: 1 }],
    required_equipment: [{ type: 'thresher', count: 1 }],
    expected_monthly_income_gain: 1800,
    maintenance_cost_per_year: 1500,
    expected_beneficiary_households: 40,
  },
  {
    id: 'village_grain_storage',
    name: 'Village Grain Storage',
    description:
      'A common covered godown so households can hold harvest and sell when prices recover instead of at the post-harvest price trough.',
    required_budget: 260000,
    required_skills: [
      { skill: 'mason', count: 5 },
      { skill: 'electrician', count: 1 },
    ],
    required_equipment: [
      { type: 'tractor', count: 2 },
      { type: 'thresher', count: 1 },
    ],
    expected_monthly_income_gain: 5500,
    maintenance_cost_per_year: 14000,
    expected_beneficiary_households: 42,
  },
];

// Rough phase durations (weeks) used to build the top-ranked project's
// Project Plan checklist. Scaled a little by budget size at render time.
export const PROJECT_PHASES = [
  { key: 'approve', label: 'Approve', baseWeeks: 2 },
  { key: 'resource_allocation', label: 'Resource Allocation', baseWeeks: 3 },
  { key: 'execution', label: 'Execution', baseWeeks: 8 },
  { key: 'handover', label: 'Handover to Maintenance Owner', baseWeeks: 1 },
];
