// Central mapping from domain status/severity strings to visual tone.
// Components should call these instead of hard-coding color logic,
// so the palette stays consistent everywhere and is a one-place edit.

const TONE_CLASSES = {
  neutral: 'text-ink-secondary bg-surface-3/60 border-surface-3',
  healthy: 'text-healthy bg-healthy-muted border-healthy/30',
  warning: 'text-warning bg-warning-muted border-warning/30',
  critical: 'text-critical bg-critical-muted border-critical/30',
  rail: 'text-rail bg-rail-muted border-rail/30',
  ai: 'text-ai bg-ai-muted border-ai/30',
}

export function toneClasses(tone = 'neutral') {
  return TONE_CLASSES[tone] || TONE_CLASSES.neutral
}

export function severityTone(severity) {
  switch (severity) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'warning'
    case 'Medium':
      return 'rail'
    case 'Low':
    default:
      return 'neutral'
  }
}

export function taskStatusTone(status) {
  switch (status) {
    case 'Overdue':
      return 'critical'
    case 'In Block':
      return 'ai'
    case 'Scheduled':
      return 'rail'
    case 'Completed':
      return 'healthy'
    case 'Pending':
    default:
      return 'neutral'
  }
}

export function blockRequestStatusTone(status) {
  switch (status) {
    case 'Conflict':
      return 'critical'
    case 'Suggested for Bundling':
      return 'ai'
    case 'Approved':
      return 'healthy'
    case 'Rejected':
      return 'neutral'
    case 'Pending Review':
    default:
      return 'warning'
  }
}

export function planStatusTone(status) {
  switch (status) {
    case 'Approved':
      return 'healthy'
    case 'Pending Approval':
      return 'warning'
    case 'Archived':
      return 'neutral'
    case 'Draft':
    default:
      return 'rail'
  }
}

export function pipelineStageTone(status) {
  switch (status) {
    case 'failed':
      return 'critical'
    case 'warning':
      return 'warning'
    case 'processing':
      return 'ai'
    case 'completed':
    default:
      return 'healthy'
  }
}

export function dataSourceStatusTone(status) {
  switch (status) {
    case 'offline':
      return 'critical'
    case 'warning':
      return 'warning'
    case 'online':
    default:
      return 'healthy'
  }
}

export function alertSeverityTone(severity) {
  return severityTone(severity)
}
