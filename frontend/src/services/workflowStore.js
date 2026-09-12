import { sampleMaintenanceRequests, sampleSections, sampleStations, sampleTrains, sampleDisruptions } from '../data/sampleOptimizationPayload'
import { blockRequests as legacyBlockRequests, maintenanceTasks as legacyTasks, alerts as seedAlerts } from '../data/mockData'

const STORAGE_KEY = 'bpc.workflow.v1'
const listeners = new Set()

function clone(value) { return JSON.parse(JSON.stringify(value)) }
function emit() { listeners.forEach((listener) => listener()) }
function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }

const seedRequestRecords = [
  {
    id: 'M001', request: sampleMaintenanceRequests[0], status: 'APPROVED',
    meta: { requestedBy: 'System seed', requestedByRole: 'Engineering Planner', requestedDate: '2026-09-05', description: 'Rail maintenance reference request', createdAt: '2026-09-04T08:00:00Z' },
  },
  {
    id: 'M002', request: sampleMaintenanceRequests[1], status: 'APPROVED',
    meta: { requestedBy: 'System seed', requestedByRole: 'S&T Planner', requestedDate: '2026-09-05', description: 'Point machine maintenance reference request', createdAt: '2026-09-04T08:05:00Z' },
  },
  {
    id: 'M003', request: sampleMaintenanceRequests[2], status: 'PENDING',
    meta: { requestedBy: 'System seed', requestedByRole: 'Traction/TD Planner', requestedDate: '2026-09-05', description: 'OHE maintenance reference request', createdAt: '2026-09-04T08:10:00Z' },
  },
]

function initialState() {
  return {
    requests: seedRequestRecords,
    plans: [],
    planDetails: {},
    disruptions: [],
    activities: [
      { id: 'ACT-001', type: 'system', text: 'Synthetic workflow initialized', timestamp: new Date().toISOString() },
    ],
  }
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return initialState()
}

let state = readState()

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  emit()
}

function addActivity(text, type = 'workflow') {
  state.activities = [
    { id: `ACT-${Date.now()}`, type, text, timestamp: new Date().toISOString() },
    ...state.activities,
  ].slice(0, 50)
}

function priorityLabel(priority) { return Number(priority) === 1 ? 'High' : 'Medium' }
function departmentLabel(code) { return code === 'TRACK' ? 'Engineering' : code === 'SIGNAL' ? 'S&T' : 'Traction Distribution' }
function sectionToCorridor(sectionId) {
  const section = sampleSections.find((s) => s.id === sectionId)
  if (!section) return sectionId
  const names = Object.fromEntries(sampleStations.map((s) => [s.id, s.name]))
  return `${names[section.source_station_id] || section.source_station_id} → ${names[section.target_station_id] || section.target_station_id}`
}

function requestToBlockRequest(entry) {
  const r = entry.request
  const date = entry.meta?.requestedDate || new Date().toISOString().slice(0, 10)
  const start = Number(r.window_start_min || 0)
  const startDate = new Date(`${date}T00:00:00`)
  startDate.setMinutes(start)
  const statusMap = { PENDING: 'Pending Review', APPROVED: 'Approved', REJECTED: 'Rejected', SCHEDULED: 'Scheduled' }
  return {
    id: entry.id,
    department: departmentLabel(r.department),
    corridor: sectionToCorridor(r.section_id),
    rawSectionId: r.section_id,
    requestedStart: startDate.toISOString().slice(0, 19),
    durationMins: Number(r.predicted_duration_min || r.base_duration_min),
    taskIds: [entry.id],
    priority: priorityLabel(r.priority),
    status: statusMap[entry.status] || entry.status,
    bundleGroup: null,
    conflictsWith: [],
    source: 'employee-workflow',
    requestedBy: entry.meta?.requestedBy || 'Employee',
    requestedDate: date,
    assetId: r.asset_id,
    assetType: r.asset_type,
    crewSize: r.crew_size,
    description: entry.meta?.description || '',
    rejectionReason: entry.rejectionReason || null,
    modifiedBy: entry.modifiedBy || null,
  }
}

function taskFromRequest(entry) {
  const r = entry.request
  const priority = Number(r.priority) === 1 ? 'High' : 'Medium'
  return {
    id: entry.id,
    department: departmentLabel(r.department),
    asset: r.asset_id || r.asset_type || 'Maintenance asset',
    location: r.section_id,
    corridor: sectionToCorridor(r.section_id),
    defect: entry.meta?.description || 'Maintenance request',
    severity: priority === 'High' ? 'High' : 'Medium',
    criticality: priority === 'High' ? 88 : 62,
    dueDate: entry.meta?.requestedDate || new Date().toISOString().slice(0, 10),
    predictedDurationMins: Number(r.predicted_duration_min || r.base_duration_min),
    status: entry.status === 'SCHEDULED' ? 'Scheduled' : entry.status === 'APPROVED' ? 'Approved' : entry.status === 'REJECTED' ? 'Rejected' : 'Pending',
    source: 'Employee request',
  }
}

export function getState() { return state }
export function resetWorkflow() { state = initialState(); persist() }
export { subscribe }

export function createRequest(request, meta) {
  const entry = { id: request.id, request: clone(request), meta: clone(meta), status: 'PENDING', rejectionReason: null, modifiedBy: null }
  state.requests.push(entry)
  addActivity(`Maintenance request ${request.id} submitted by ${meta.requestedBy || 'Employee'}`)
  persist()
  return clone(entry)
}

export function updateRequest(requestId, patch) {
  const entry = state.requests.find((r) => r.id === requestId)
  if (!entry) throw new Error('Maintenance request not found.')
  entry.request = { ...entry.request, ...(patch.request || {}) }
  entry.meta = { ...entry.meta, ...(patch.meta || {}) }
  if (patch.status) entry.status = patch.status
  if ('rejectionReason' in patch) entry.rejectionReason = patch.rejectionReason
  if ('modifiedBy' in patch) entry.modifiedBy = patch.modifiedBy
  persist()
  return clone(entry)
}

export function approveRequest(requestId, actor = 'Planner') {
  const entry = state.requests.find((r) => r.id === requestId)
  if (!entry) throw new Error('Maintenance request not found.')
  entry.status = 'APPROVED'; entry.rejectionReason = null
  addActivity(`Request ${requestId} approved by ${actor}`)
  persist(); return clone(entry)
}

export function rejectRequest(requestId, reason, actor = 'Planner') {
  const entry = state.requests.find((r) => r.id === requestId)
  if (!entry) throw new Error('Maintenance request not found.')
  entry.status = 'REJECTED'; entry.rejectionReason = reason
  addActivity(`Request ${requestId} rejected by ${actor}: ${reason}`)
  persist(); return clone(entry)
}

export function modifyRequest(requestId, changes, actor = 'Planner') {
  const entry = state.requests.find((r) => r.id === requestId)
  if (!entry) throw new Error('Maintenance request not found.')
  entry.request = { ...entry.request, ...(changes.request || {}) }
  entry.meta = { ...entry.meta, ...(changes.meta || {}) }
  entry.modifiedBy = actor
  addActivity(`Request ${requestId} modified by ${actor}`)
  persist(); return clone(entry)
}

function buildGeneratedPlan(selectedIds, objective = 'BALANCED', scenario = null) {
  const selected = state.requests.filter((r) => selectedIds.includes(r.id) && (r.status === 'APPROVED' || (scenario && r.status === 'SCHEDULED')))
  if (!selected.length) throw new Error('Select at least one approved maintenance request.')

  const groups = new Map()
  selected.forEach((entry) => {
    const key = entry.request.section_id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  })

  const blocks = []
  const scheduled_tasks = []
  let taskRowId = 1
  for (const [sectionId, entries] of groups) {
    const sorted = [...entries].sort((a, b) => Number(a.request.window_start_min) - Number(b.request.window_start_min))
    let cursor = Math.min(...sorted.map((e) => Number(e.request.window_start_min)))
    const windowEnd = Math.max(...sorted.map((e) => Number(e.request.window_end_min)))
    const blockId = `BLK-${Date.now()}-${blocks.length + 1}`
    for (const entry of sorted) {
      const duration = Number(entry.request.predicted_duration_min || entry.request.base_duration_min)
      const start = Math.max(cursor, Number(entry.request.window_start_min))
      const end = start + duration
      if (end > windowEnd + 30) continue
      scheduled_tasks.push({ id: taskRowId++, request_id: entry.id, block_id: blockId, scheduled_start_min: start, scheduled_end_min: end, duration_min: duration, start_deviation_min: Math.max(0, start - Number(entry.request.window_start_min)) })
      cursor = end
    }
    if (scheduled_tasks.some((t) => t.block_id === blockId)) {
      const tasks = scheduled_tasks.filter((t) => t.block_id === blockId)
      blocks.push({ block_id: blockId, plan_id: '', section_id: sectionId, block_start_min: Math.min(...tasks.map((t) => t.scheduled_start_min)), block_end_min: Math.max(...tasks.map((t) => t.scheduled_end_min)) })
    }
  }

  const id = `PLAN-MOCK-${Date.now()}`
  blocks.forEach((b) => { b.plan_id = id })
  const baseline = selected.length
  const totalBlocks = blocks.length
  const delay = scenario?.type === 'train_delay' ? Number(scenario.minutes || 15) : Math.max(0, totalBlocks - 1) * 5
  const plan = {
    plan_id: id,
    plan_name: `${scenario ? 'Re-optimized ' : ''}Approved Maintenance Plan`,
    objective_type: objective,
    baseline_blocks_count: baseline,
    total_blocks_count: totalBlocks,
    blocks_saved: Math.max(0, baseline - totalBlocks),
    total_wait_time_min: scheduled_tasks.reduce((sum, t) => sum + Number(t.start_deviation_min || 0), 0),
    total_train_delay_min: delay,
    created_at: new Date().toISOString(),
    status: 'DRAFT',
  }
  const explanations = [
    { id: 1, plan_id: id, explanation_text: `${selected.length} approved maintenance request${selected.length === 1 ? '' : 's'} were evaluated.` },
    { id: 2, plan_id: id, explanation_text: `Requests sharing a railway section were coordinated into ${totalBlocks} maintenance block${totalBlocks === 1 ? '' : 's'}.` },
    { id: 3, plan_id: id, explanation_text: objective === 'MIN_DELAY' ? 'The plan prioritizes minimizing estimated train delay.' : objective === 'MIN_BLOCKS' ? 'The plan prioritizes reducing the number of maintenance blocks.' : 'The plan balances block count, waiting time, and train impact.' },
  ]
  return { plan, blocks, scheduled_tasks, explanations }
}

export function generatePlan(selectedIds, objective, scenario = null) {
  const result = buildGeneratedPlan(selectedIds, objective, scenario)
  state.plans.unshift(result.plan)
  state.planDetails[result.plan.plan_id] = result
  selectedIds.forEach((id) => {
    const entry = state.requests.find((r) => r.id === id)
    if (entry && (entry.status === 'APPROVED' || entry.status === 'SCHEDULED')) entry.status = 'SCHEDULED'
  })
  addActivity(`Plan ${result.plan.plan_id} generated for ${selectedIds.length} approved request${selectedIds.length === 1 ? '' : 's'}`)
  persist()
  return clone(result)
}

export function getPlans() { return clone(state.plans) }
export function getPlanDetails(id) { return clone(state.planDetails[id] || null) }
export function addDisruption(disruption) {
  const record = { id: disruption.id || `DIS-${Date.now()}`, ...clone(disruption), createdAt: new Date().toISOString() }
  state.disruptions.unshift(record)
  addActivity(`Emergency/disruption ${record.id} reported on ${record.section_id}`)
  persist(); return clone(record)
}
export function getDisruptions() { return clone(state.disruptions) }
export function getActivities() { return clone(state.activities) }

export function getWorkflowBlockRequests() { return state.requests.map(requestToBlockRequest) }
export function getWorkflowTasks() { return state.requests.map(taskFromRequest) }
export function getMyRequests(userName) {
  return clone(state.requests.filter((r) => !userName || r.meta?.requestedBy === userName))
}

export function getCombinedBlockRequests() {
  const workflow = getWorkflowBlockRequests()
  const legacy = clone(legacyBlockRequests).filter((r) => !workflow.some((w) => w.id === r.id))
  return [...workflow, ...legacy]
}
export function getCombinedTasks() {
  const workflow = getWorkflowTasks()
  const legacy = clone(legacyTasks).filter((t) => !workflow.some((w) => w.id === t.id))
  return [...workflow, ...legacy]
}

export function getCombinedAlerts() {
  const dynamic = state.disruptions.map((d) => ({ id: d.id, severity: Number(d.severity) >= 3 ? 'Critical' : Number(d.severity) === 2 ? 'High' : 'Medium', type: 'Emergency / Disruption', message: d.description || `Disruption reported on ${d.section_id}`, department: null, relatedId: d.section_id, timestamp: d.createdAt }))
  return [...dynamic, ...clone(seedAlerts)]
}

export function getWorkflowAnalytics() {
  const requests = state.requests
  const plans = state.plans
  const total = requests.length
  const approved = requests.filter((r) => r.status === 'APPROVED').length
  const scheduled = requests.filter((r) => r.status === 'SCHEDULED').length
  const latest = plans[0]
  return {
    workflow: { totalRequests: total, pending: requests.filter((r) => r.status === 'PENDING').length, approved, rejected: requests.filter((r) => r.status === 'REJECTED').length, scheduled },
    latestPlan: latest || null,
    approvalRate: total ? Math.round((approved + scheduled) / total * 100) : 0,
  }
}

export const referenceData = { sampleTrains, sampleSections, sampleDisruptions, sampleStations }
