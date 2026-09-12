import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import Tag from '../common/Tag'
import { formatDepartment, formatMinutesToTime, formatPriority } from '../../utils/backendFormatters'
import { sectionRouteLabel } from '../../utils/sectionLabels'

const STATUS_LABEL = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', SCHEDULED: 'SCHEDULED' }
const STATUS_TONE = { PENDING: 'warning', APPROVED: 'healthy', REJECTED: 'critical', SCHEDULED: 'rail' }

export default function RequestFeasibilityContent({ entry, sectionsById, stationNameMap }) {
  if (!entry) return null
  const { request, meta } = entry
  const route = sectionRouteLabel(request.section_id, sectionsById, stationNameMap)
  return <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2 flex-wrap">
      <StatusBadge tone={STATUS_TONE[entry.status] || 'neutral'} label={STATUS_LABEL[entry.status] || entry.status} />
      {entry.modifiedBy ? <Tag>Modified by {entry.modifiedBy}</Tag> : null}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><p className="text-xs text-ink-faint">Requested by</p><p className="text-sm text-ink-primary mt-0.5">{meta?.requestedBy || 'Employee'}</p></div>
      <div><p className="text-xs text-ink-faint">Category</p><p className="text-sm text-ink-primary mt-0.5">{formatDepartment(request.department)}</p></div>
      <div><p className="text-xs text-ink-faint">Priority</p><p className="text-sm text-ink-primary mt-0.5">{formatPriority(request.priority)}</p></div>
      <div><p className="text-xs text-ink-faint">Crew</p><p className="text-sm text-ink-primary mt-0.5">{request.crew_size}</p></div>
      <div className="col-span-2"><p className="text-xs text-ink-faint">Section</p><p className="text-sm text-ink-primary mt-0.5">{request.section_id}{route ? <span className="text-ink-secondary"> — {route}</span> : null}</p></div>
      <div><p className="text-xs text-ink-faint">Requested window</p><p className="text-sm text-ink-primary mt-0.5">{request.window_start_min}–{request.window_end_min} min</p></div>
      <div><p className="text-xs text-ink-faint">Duration</p><p className="text-sm text-ink-primary mt-0.5">{formatMinutesToTime(request.base_duration_min)}</p></div>
    </div>
    {meta?.description ? <div><p className="text-xs text-ink-faint">Description</p><p className="text-sm text-ink-secondary mt-0.5">{meta.description}</p></div> : null}
    {entry.status === 'PENDING' ? <div className="border border-warning/30 bg-warning-muted rounded p-3 flex items-center gap-2 text-xs text-ink-secondary"><Clock3 size={14} className="text-warning" /> Waiting for planner review.</div> : null}
    {entry.status === 'APPROVED' ? <div className="border border-healthy/30 bg-healthy-muted rounded p-3 flex items-center gap-2 text-xs text-ink-secondary"><CheckCircle2 size={14} className="text-healthy" /> Approved and available to the AI Block Planner.</div> : null}
    {entry.status === 'SCHEDULED' ? <div className="border border-rail/30 bg-rail-muted rounded p-3 flex items-center gap-2 text-xs text-ink-secondary"><CheckCircle2 size={14} className="text-rail" /> Scheduled in a generated maintenance plan.</div> : null}
    {entry.status === 'REJECTED' ? <div className="border border-critical/30 bg-critical-muted rounded p-3 flex items-start gap-2 text-xs text-ink-secondary"><XCircle size={14} className="text-critical mt-0.5" /> Rejection reason: {entry.rejectionReason || 'Not specified'}</div> : null}
  </div>
}
