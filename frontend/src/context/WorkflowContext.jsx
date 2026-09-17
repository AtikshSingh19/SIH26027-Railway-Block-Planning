import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as store from '../services/workflowStore'

const WorkflowContext = createContext(null)

export function WorkflowProvider({ children }) {
  // `tick` is the actual change signal: it increments on every store mutation
  // (see subscribe() below). store.getState() is the wrong dependency to
  // memoize on — the store mutates the same state object in place rather
  // than replacing it, so store.getState() returns an identical reference
  // before and after a change and never invalidates this memo. That stale
  // `value` (and therefore stale `workflow` object identity in consumers)
  // is why things like MaintenanceRecords' `myRequests` useMemo — which
  // depends on `[workflow, user?.name]` — never recomputed after a new
  // request was created: neither dependency ever appeared to change.
  const [tick, forceUpdate] = useState(0)
  useEffect(() => store.subscribe(() => forceUpdate((v) => v + 1)), [])
  const value = useMemo(() => ({
    state: store.getState(),
    createRequest: store.createRequest,
    approveRequest: store.approveRequest,
    rejectRequest: store.rejectRequest,
    modifyRequest: store.modifyRequest,
    addDisruption: store.addDisruption,
    getMyRequests: store.getMyRequests,
    getDisruptions: store.getDisruptions,
    getActivities: store.getActivities,
    reset: store.resetWorkflow,
  }), [tick])
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflow() must be used inside WorkflowProvider')
  return ctx
}
