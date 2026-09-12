import { useState } from 'react'
import { Check, Edit3, Save, X } from 'lucide-react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import Tag from '../common/Tag'
import { formatDepartment, formatPriority } from '../../utils/backendFormatters'
import { sampleSections } from '../../data/sampleOptimizationPayload'

export default function PlannerRequestReview({ request, onApprove, onReject, onModify }) {
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState('Operational conflict')
  const [customReason, setCustomReason] = useState('')
  const [duration, setDuration] = useState(request?.durationMins || 60)
  const [priority, setPriority] = useState(request?.priority || 'Medium')
  const [section, setSection] = useState(
  request?.section_id || request?.rawSectionId || ''
)

  const [date, setDate] = useState(request?.requestedDate || '')
  const [crew, setCrew] = useState(request?.crewSize || 1)
  const [notes, setNotes] = useState(request?.description || '')
  if (!request) return null
  const isPending =
  request.status === 'Pending Review' ||
  request.status === 'PENDING_REVIEW' ||
  request.status === 'PENDING' ||
  request.status === 'Pending'

    const isApproved =
    request.status === 'APPROVED' ||
    request.status === 'Approved'

  const isRejected =
    request.status === 'REJECTED' ||
    request.status === 'Rejected'


  const rejectReason = reason === 'Other' ? customReason : reason
  return <div className="flex flex-col gap-5">
    <div className="flex items-center gap-2 flex-wrap">
      <StatusBadge
  tone={isPending ? 'warning' : isApproved ? 'healthy' : isRejected ? 'critical' : 'rail'}
  label={request.status}
/> <Tag>{request.department}</Tag></div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <Field label="Request ID"><span className="font-mono">{request.id}</span></Field>
      <Field label="Requested by">{request.requestedBy || 'System'}</Field>
      <Field label="Section">{request.corridor}</Field>
      <Field label="Date">{request.requestedDate || '—'}</Field>
      <Field label="Priority">{formatPriority(request.priority === 'High' ? 1 : 2)}</Field>
      <Field label="Crew">{request.crewSize || '—'}</Field>
      <Field label="Asset">{request.assetId || '—'}</Field>
      <Field label="Duration">{request.durationMins} min</Field>
    </div>
    {request.description ? <div><p className="text-xs text-ink-faint">Description</p><p className="text-sm text-ink-secondary mt-1">{request.description}</p></div> : null}

    {isPending && !editing ? (
  <div className="flex gap-2 flex-wrap border-t border-surface-3 pt-4">
    <Button variant="success" icon={Check} onClick={onApprove}>
      Approve
    </Button>

    <Button
      variant="danger"
      icon={X}
      onClick={() => onReject(rejectReason)}
    >
      Reject
    </Button>

    <Button
      variant="secondary"
      icon={Edit3}
      onClick={() => setEditing(true)}
    >
      Modify
    </Button>
  </div>
) : null}

    {editing ? <div className="border border-surface-3 bg-surface-2 rounded p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-ink-primary">Modify scheduling fields</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-ink-secondary">Section<select value={section} onChange={(e) => setSection(e.target.value)} className="mt-1 w-full bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary"><option value="">Keep current</option>{sampleSections.map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}</select></label>
        <label className="text-xs text-ink-secondary">Requested date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" /></label>
        <label className="text-xs text-ink-secondary">Duration (min)<input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-full bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" /></label>
        <label className="text-xs text-ink-secondary">Crew size<input type="number" min="1" value={crew} onChange={(e) => setCrew(e.target.value)} className="mt-1 w-full bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" /></label>
        <label className="text-xs text-ink-secondary">Priority<select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary"><option>High</option><option>Medium</option></select></label>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Planner notes" className="bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" />
      <div className="flex gap-2"><Button variant="success" icon={Save} onClick={() => { const start = Number(request.requestedStart ? new Date(request.requestedStart).getHours() * 60 + new Date(request.requestedStart).getMinutes() : 1320); onModify({ request: { ...(section ? { section_id: section } : {}), window_start_min: start, window_end_min: start + Number(duration), base_duration_min: Number(duration), crew_size: Number(crew), priority: priority === 'High' ? 1 : 2 }, meta: { requestedDate: date, description: notes } }); setEditing(false) }}>Save changes</Button><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div>
    </div> : null}

    {isPending ? (
  <div className="border-t border-surface-3 pt-4">
      <p className="text-xs text-ink-faint mb-2">Rejection reason (required for reject)</p>
      <div className="flex gap-2 flex-wrap"><select value={reason} onChange={(e) => setReason(e.target.value)} className="bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary"><option>Operational conflict</option><option>Insufficient maintenance window</option><option>Resource unavailable</option><option>Duplicate request</option><option>Invalid request</option><option>Other</option></select>{reason === 'Other' ? <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Enter reason" className="flex-1 min-w-[180px] bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" /> : null}</div>
      <p className="text-xs text-ink-faint mt-2">Selected: {rejectReason || 'Choose a reason before rejecting.'}</p>
    </div>
    ) : null}
  </div>
}
function Field({ label, children }) { return <div><p className="text-xs text-ink-faint">{label}</p><div className="text-ink-primary mt-0.5">{children}</div></div> }
