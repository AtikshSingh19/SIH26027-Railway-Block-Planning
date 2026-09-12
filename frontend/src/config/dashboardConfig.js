// ---------------------------------------------------------------------------
// ROLE-BASED DASHBOARD CONFIGURATION
// ---------------------------------------------------------------------------
// Single source of truth for "what does each role see on the Dashboard".
// Dashboard.jsx reads this config and renders accordingly — it never
// branches on role.id directly. Adding a 7th role or changing what an
// existing role sees means editing this file only, never duplicating the
// Dashboard page or its components.
// ---------------------------------------------------------------------------

import {
  Activity,
  AlertOctagon,
  Clock,
  PieChart,
  GitMerge,
  Gauge,
  ClipboardList,
  GitPullRequestArrow,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
// `department` maps a role to the `department` field already present on
// maintenanceTasks / blockRequests / alerts. `null` means "cross-department,
// sees everything" — used by Control Office, Block/Operations, and Admin.
export const ROLES = [
  { id: 'employee', label: 'Employee / Maintenance Requester', shortLabel: 'Employee', department: 'Engineering', category: 'employee' },
  {
    id: 'control_office',
    label: 'Control Office / Divisional Operations Planner',
    shortLabel: 'Control Office',
    department: null,
    category: 'planner',
  },
  {
    id: 'engineering',
    label: 'Engineering Planner',
    shortLabel: 'Engineering',
    department: 'Engineering',
    category: 'planner',
  },
  {
    id: 'snt',
    label: 'S&T Planner',
    shortLabel: 'S&T',
    department: 'S&T',
    category: 'planner',
  },
  {
    id: 'traction',
    label: 'Traction/TD Planner',
    shortLabel: 'Traction/TD',
    department: 'Traction Distribution',
    category: 'planner',
  },
  {
    id: 'block_ops',
    label: 'Block/Operations Planner',
    shortLabel: 'Block/Operations',
    department: null,
    category: 'planner',
  },
  {
    id: 'admin',
    label: 'Admin/Supervisor',
    shortLabel: 'Admin',
    department: null,
    category: 'admin',
  },
]

export const DEFAULT_ROLE_ID = 'control_office'

export function getRoleById(roleId) {
  return ROLES.find((r) => r.id === roleId) || ROLES.find((r) => r.id === DEFAULT_ROLE_ID)
}

// ---------------------------------------------------------------------------
// KPI registry
// ---------------------------------------------------------------------------
// Every KPI a role could show lives here once. `getValue(ctx)` receives
// `{ summary, qualityScore }` — the data Dashboard.jsx already fetches —
// and returns the number to render. Tone/icon travel with the definition
// so KpiCard stays a dumb presentational component.
export const KPI_REGISTRY = {
  assetAvailability: {
    label: 'Asset availability',
    unit: '%',
    tone: 'healthy',
    icon: Activity,
    getValue: (ctx) => ctx?.summary?.assetAvailabilityPct ?? 88,
  },
  criticalTasks: {
    label: 'Critical tasks',
    tone: 'critical',
    icon: AlertOctagon,
    getValue: (ctx) => ctx?.summary?.criticalTasks ?? 0,
  },
  overdueTasks: {
    label: 'Overdue tasks',
    tone: 'warning',
    icon: Clock,
    getValue: (ctx) => ctx?.summary?.overdueTasks ?? 0,
  },
  blockUtilization: {
    label: 'Block utilization',
    unit: '%',
    tone: 'rail',
    icon: PieChart,
    getValue: (ctx) => ctx?.summary?.blockUtilizationPct ?? 74,
  },
  trainConflicts: {
    label: 'Train conflicts',
    tone: 'critical',
    icon: GitMerge,
    getValue: (ctx) => ctx?.summary?.trainConflicts ?? 0,
  },
  openTasks: {
    label: 'Open tasks (dept.)',
    tone: 'rail',
    icon: ClipboardList,
    getValue: (ctx) => ctx?.summary?.departmentTaskCount ?? 0,
  },
  pendingBlockRequests: {
    label: 'Pending block requests',
    tone: 'warning',
    icon: GitPullRequestArrow,
    getValue: (ctx) => ctx?.summary?.pendingBlockRequests ?? 0,
  },
  dataQualityScore: {
    label: 'Data quality score',
    unit: '/ 100',
    tone: 'ai',
    icon: Gauge,
    getValue: (ctx) => ctx?.qualityScore ?? 96,
  },
}

// ---------------------------------------------------------------------------
// Per-role dashboard layout
// ---------------------------------------------------------------------------
// `kpis` — ordered KPI_REGISTRY keys shown at the top of the page.
// `widgets` — which of the existing dashboard sections/components render.
// `focusNote` — one-line context shown under the page title.
export const ROLE_DASHBOARD_CONFIG = {
  employee: {
    kpis: ['openTasks', 'pendingBlockRequests'],
    widgets: { dataSources: false, aiRecommendedBlock: false, corridorOverview: true, alerts: true },
    focusNote: 'Employee view — submit maintenance requests and track their approval and scheduling status.',
  },
  control_office: {
    kpis: ['assetAvailability', 'criticalTasks', 'overdueTasks', 'blockUtilization', 'trainConflicts'],
    widgets: { dataSources: true, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'Full cross-department view across all corridors — the default control office view.',
  },
  engineering: {
    kpis: ['openTasks', 'criticalTasks', 'overdueTasks', 'blockUtilization'],
    widgets: { dataSources: true, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'Scoped to Engineering tasks, TMS feed health, and Engineering-related alerts.',
  },
  snt: {
    kpis: ['openTasks', 'criticalTasks', 'overdueTasks', 'blockUtilization'],
    widgets: { dataSources: true, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'Scoped to S&T tasks, SMMS feed health, and S&T-related alerts.',
  },
  traction: {
    kpis: ['openTasks', 'criticalTasks', 'overdueTasks', 'blockUtilization'],
    widgets: { dataSources: true, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'Scoped to Traction Distribution tasks, TDMS feed health, and TRD-related alerts.',
  },
  block_ops: {
    kpis: ['blockUtilization', 'pendingBlockRequests', 'trainConflicts', 'criticalTasks'],
    widgets: { dataSources: false, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'Focused on block utilization, pending requests, and cross-department conflicts.',
  },
  admin: {
    kpis: ['assetAvailability', 'dataQualityScore', 'criticalTasks', 'overdueTasks', 'trainConflicts'],
    widgets: { dataSources: true, aiRecommendedBlock: true, corridorOverview: true, alerts: true },
    focusNote: 'System-wide oversight, including data pipeline health across all sources.',
  },
}

const GRID_COLS_CLASS_BY_COUNT = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
}

export function kpiGridColsClass(count) {
  return GRID_COLS_CLASS_BY_COUNT[count] || 'lg:grid-cols-5'
}
