import { Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge'
import Tag from '../common/Tag'
import CriticalityBar from './CriticalityBar'
import { severityTone, taskStatusTone } from '../../utils/status'
import { formatDate, formatDurationMins } from '../../utils/formatters'
import { findBundleForTask, isCrossDepartmentOpportunity } from '../../utils/bundling'

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <div className="text-sm text-ink-primary mt-0.5">{children}</div>
    </div>
  )
}

export default function TaskDetailContent({ task, bundlingOpportunities }) {
  if (!task) return null

  const bundle = findBundleForTask(task.id, bundlingOpportunities)
  const isCrossDept = isCrossDepartmentOpportunity(bundle)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge tone={severityTone(task.severity)} label={task.severity} />
        <StatusBadge tone={taskStatusTone(task.status)} label={task.status} />
        <Tag>{task.source}</Tag>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Department">{task.department}</Field>
        <Field label="Corridor">{task.corridor}</Field>
        <Field label="Asset">{task.asset}</Field>
        <Field label="Location">{task.location}</Field>
        <Field label="Due date">{formatDate(task.dueDate)}</Field>
        <Field label="Predicted duration">{formatDurationMins(task.predictedDurationMins)}</Field>
      </div>

      <Field label="Defect / work type">
        <p className="leading-snug">{task.defect}</p>
      </Field>

      <Field label="Criticality score">
        <div className="mt-1">
          <CriticalityBar value={task.criticality} />
        </div>
      </Field>

      {isCrossDept ? (
        <div className="border border-ai/30 bg-ai-muted rounded p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-ai" strokeWidth={2} />
            <span className="text-sm font-medium text-ink-primary">Cross-department bundling opportunity</span>
          </div>
          <p className="text-xs text-ink-secondary leading-snug">{bundle.rationale}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {bundle.taskIds
              .filter((id) => id !== task.id)
              .map((id) => (
                <Tag key={id}>{id}</Tag>
              ))}
          </div>
          <Link to="/block-planner" className="text-xs text-ai hover:underline self-start mt-1">
            Review in Block Planner →
          </Link>
        </div>
      ) : null}
    </div>
  )
}
