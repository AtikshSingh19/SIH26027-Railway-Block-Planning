// Small presentational lookup helpers — NOT optimization logic. The actual
// bundling suggestions are precomputed in the mock data / future backend;
// this just answers "does this task appear in one of them?" for rendering.

export function findBundleForTask(taskId, opportunities) {
  if (!opportunities) return null
  return opportunities.find((opp) => opp.taskIds.includes(taskId)) || null
}

export function isCrossDepartmentOpportunity(opportunity) {
  return opportunity && new Set(opportunity.departments).size > 1
}
