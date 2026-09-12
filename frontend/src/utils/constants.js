// Shared enums / lookups used across pages.
// Keeping these centralized means the mock layer and the future FastAPI
// layer can agree on the same vocabulary.

export const DEPARTMENTS = ['Engineering', 'S&T', 'Traction Distribution']

export const DEPARTMENT_SHORT = {
  Engineering: 'ENG',
  'S&T': 'S&T',
  'Traction Distribution': 'TRD',
}

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical']

export const TASK_STATUSES = [
  'Pending',
  'Scheduled',
  'In Block',
  'Completed',
  'Overdue',
]

export const BLOCK_REQUEST_STATUSES = [
  'Pending Review',
  'Conflict',
  'Suggested for Bundling',
  'Approved',
  'Rejected',
]

export const PLAN_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Archived']

export const DATA_SOURCES = [
  { key: 'TMS', label: 'TMS', fullName: 'Track Management System', owner: 'Engineering' },
  { key: 'SMMS', label: 'SMMS', fullName: 'Signal Maintenance Mgmt. System', owner: 'S&T' },
  { key: 'TDMS', label: 'TDMS', fullName: 'Traction Distribution Mgmt. System', owner: 'Traction Distribution' },
  { key: 'COA', label: 'COA', fullName: 'Corridor / Occupancy Availability', owner: 'Operations' },
  { key: 'TIMETABLE', label: 'Timetable', fullName: 'Train Timetable', owner: 'Operations' },
  { key: 'FREIGHT', label: 'Freight Forecast', fullName: 'Freight Forecast Feed', owner: 'Operations' },
]

export const PIPELINE_STAGES = [
  'Ingestion',
  'Validation',
  'Normalization',
  'Deduplication',
  'Conflict Detection',
  'Unified Dataset',
]

export const AI_PIPELINE_STAGES = [
  'Criticality Analysis',
  'Conflict Detection',
  'Task Bundling',
  'Block Optimization',
  'Recommended Plan',
]

export const CORRIDORS = [
  'NDLS–GZB (Up)',
  'NDLS–GZB (Down)',
  'CNB–ALD Main',
  'MGS–DDU Loop',
  'BSB–MGS Ghat',
  'ALD–PRG Cord',
]

export const PLANNING_HORIZONS = ['Today', 'Weekly', 'Monthly']

export const SIMULATION_SCENARIOS = [
  { key: 'train_delay', label: 'Train delay' },
  { key: 'new_train', label: 'New train introduced' },
  { key: 'block_unavailable', label: 'Block becomes unavailable' },
  { key: 'duration_increase', label: 'Maintenance duration increase' },
  { key: 'emergency_defect', label: 'Emergency defect reported' },
  { key: 'freight_change', label: 'Freight forecast change' },
]
