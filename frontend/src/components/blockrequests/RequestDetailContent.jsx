import { AlertTriangle, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge'
import Tag from '../common/Tag'
import { severityTone, blockRequestStatusTone } from '../../utils/status'
import { formatDate, formatTime, addMinutesToIso, formatDurationMins } from '../../utils/formatters'
import { getRelatedRequests, getOverlappingDepartments, resolveLinkedTasks } from '../../utils/blockRequests'

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <div className="text-sm text-ink-primary mt-0.5">{children}</div>
    </div>
  )
}

export default function RequestDetailContent({ request, allRequests, tasksById }) {
  if (!request) return null

  const endTime = addMinutesToIso(request.requestedStart, request.durationMins)
  const linkedTasks = resolveLinkedTasks(request.taskIds, tasksById)
  const relatedRequests = getRelatedRequests(request, allRequests)
  const overlappingDepartments = getOverlappingDepartments(request, relatedRequests)
  const isConflict = request.status === 'Conflict'
  const isBundleSuggestion = request.status === 'Suggested for Bundling'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge tone={blockRequestStatusTone(request.status)} label={request.status} />
        <StatusBadge tone={severityTone(request.priority)} label={`${request.priority} priority`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Department">{request.department}</Field>
        <Field label="Corridor / section">{request.corridor}</Field>
        <Field label="Requested date">{formatDate(request.requestedStart)}</Field>
        <Field label="Duration">{formatDurationMins(request.durationMins)}</Field>
        <Field label="Start time">{formatTime(request.requestedStart)}</Field>
        <Field label="End time">{formatTime(endTime)}</Field>
      </div>

      <div>
        <p className="text-xs text-ink-faint mb-1.5">Linked maintenance tasks</p>
        {linkedTasks.length === 0 ? (
          <p className="text-sm text-ink-secondary">No tasks linked to this request.</p>
        ) : (
          <ul className="space-y-2">
            {linkedTasks.map((task) => (
              <li
                key={task.id}
                className="border border-surface-3 bg-surface-2 rounded p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-primary font-medium">{task.id}</p>
                  <p className="text-xs text-ink-secondary truncate">{task.asset}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tag>{task.department}</Tag>
                  <StatusBadge tone={severityTone(task.severity)} label={task.severity} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {overlappingDepartments.length > 0 ? (
        <div
          className={`border rounded p-3.5 flex flex-col gap-2 ${
            isConflict ? 'border-critical/30 bg-critical-muted' : 'border-ai/30 bg-ai-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            {isConflict ? (
              <AlertTriangle size={14} className="text-critical" strokeWidth={2} />
            ) : (
              <Link2 size={14} className="text-ai" strokeWidth={2} />
            )}
            <span className={`text-sm font-medium ${isConflict ? 'text-critical' : 'text-ink-primary'}`}>
              {isConflict ? "Overlaps with another department's request" : 'Cross-department bundling opportunity'}
            </span>
          </div>
          <p className="text-xs text-ink-secondary leading-snug">
            {isConflict
              ? `This request overlaps in time and corridor with a request from ${overlappingDepartments.join(', ')}. A controller needs to resolve this before approval.`
              : `Tasks from ${overlappingDepartments.join(', ')} on the same corridor fall in a similar window and could share one occupancy block.`}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {relatedRequests.map((r) => (
              <Tag key={r.id}>
                {r.id} · {r.department}
              </Tag>
            ))}
          </div>
          {isBundleSuggestion ? (
            <Link to="/block-planner" className="text-xs text-ai hover:underline self-start mt-1">
              Review in Block Planner →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
