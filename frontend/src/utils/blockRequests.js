// Presentational lookups only — the relationships themselves (conflictsWith,
// bundleGroup) are precomputed in the mock data / future backend. This just
// resolves those references against the full request list for display.

export function getRelatedRequests(request, allRequests) {
  if (!request || !allRequests) return []
  const relatedIds = new Set(request.conflictsWith || [])
  if (request.bundleGroup) {
    allRequests.forEach((r) => {
      if (r.id !== request.id && r.bundleGroup === request.bundleGroup) relatedIds.add(r.id)
    })
  }
  return allRequests.filter((r) => relatedIds.has(r.id))
}

export function getOverlappingDepartments(request, relatedRequests) {
  if (!request) return []
  return [...new Set(relatedRequests.map((r) => r.department).filter((d) => d !== request.department))]
}

export function resolveLinkedTasks(taskIds, tasksById) {
  if (!taskIds || !tasksById) return []
  return taskIds.map((id) => tasksById[id]).filter(Boolean)
}
