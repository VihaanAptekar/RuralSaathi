export const queryKeys = {
  meta: ['meta'],
  households: ['households'],
  householdRecords: (id) => ['households', id, 'records'],
  budget: (id) => ['households', id, 'budget'],
  cropRisk: (id) => ['households', id, 'crop-risk'],
  villageDashboard: ['village', 'dashboard'],
  villageResources: ['village', 'resources'],
  consultancy: ['consultancy', 'projects'],
  advisoryLogs: ['advisory-logs'],
};
