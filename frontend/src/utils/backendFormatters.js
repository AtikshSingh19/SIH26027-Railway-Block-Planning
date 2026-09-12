// ---------------------------------------------------------------------------
// Formatters for the ACTUAL backend contract (see main.py / models.py).
// Presentation only — never alters the underlying _min / coded values.
// Kept separate from utils/formatters.js, which serves the existing
// synthetic-demo pages (Dashboard, Data Processing, Maintenance Records,
// Block Requests) built against a different, non-backend data model.
// ---------------------------------------------------------------------------

// Backend times are integer minutes from the start of the planning period,
// not clock times. We render them as an elapsed-time label (e.g. "1h 30m")
// rather than inventing a wall-clock time the backend never specified.
export function formatMinutesToTime(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDuration(minutes) {
  return formatMinutesToTime(minutes)
}

const DEPARTMENT_LABELS = {
  TRACK: 'Engineering / Track',
  OHE: 'Traction / OHE',
  SIGNAL: 'S&T / Signal',
}

export function formatDepartment(code) {
  return DEPARTMENT_LABELS[code] || code
}

// Backend priority is 1 (high) or 2 (normal) — an int, not a string enum.
export function formatPriority(priority) {
  if (priority === 1) return 'High / Critical'
  if (priority === 2) return 'Normal / Routine'
  return `Priority ${priority}`
}

const DISRUPTION_TYPE_LABELS = {
  TRAIN_DELAY: 'Train delay',
  SECTION_BLOCKED: 'Section blocked',
  EMERGENCY: 'Emergency',
}

export function formatDisruptionType(type) {
  return DISRUPTION_TYPE_LABELS[type] || type
}

const OBJECTIVE_TYPE_LABELS = {
  MIN_DELAY: 'Minimize train delay',
  MIN_BLOCKS: 'Minimize block count',
  BALANCED: 'Balanced',
}

export function formatObjectiveType(type) {
  return OBJECTIVE_TYPE_LABELS[type] || type
}

const TRAIN_STATUS_LABELS = {
  ON_TIME: 'On time',
  DELAYED: 'Delayed',
  CANCELLED: 'Cancelled',
}

export function formatTrainStatus(status) {
  return TRAIN_STATUS_LABELS[status] || status
}
