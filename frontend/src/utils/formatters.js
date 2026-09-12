// Presentation-only formatting helpers. No business logic here —
// that belongs in services/api.js or, eventually, the backend.

export function formatDate(isoString, opts = {}) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: opts.withYear === false ? undefined : 'numeric',
  })
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDurationMins(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function addMinutesToIso(isoString, minutes) {
  if (!isoString || minutes == null) return null
  return new Date(new Date(isoString).getTime() + minutes * 60000).toISOString()
}

export function formatDateKey(isoString) {
  if (!isoString) return null
  return new Date(isoString).toISOString().slice(0, 10)
}

// For plain 'YYYY-MM-DD' strings (no time component) — constructs the Date
// from local calendar parts so it can't shift a day depending on the
// browser's timezone offset, unlike `new Date('2026-09-05')` which parses
// as UTC midnight.
export function formatDateOnly(dateKey) {
  if (!dateKey) return '—'
  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPercent(value, digits = 0) {
  if (value == null) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatRelativeFreshness(minutesAgo) {
  if (minutesAgo == null) return '—'
  if (minutesAgo < 1) return 'just now'
  if (minutesAgo < 60) return `${minutesAgo}m ago`
  const hours = Math.floor(minutesAgo / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatNumber(value) {
  if (value == null) return '—'
  return value.toLocaleString('en-IN')
}
