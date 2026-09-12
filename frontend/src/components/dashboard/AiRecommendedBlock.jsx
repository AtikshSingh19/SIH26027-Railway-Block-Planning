import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles, Train, Users2 } from 'lucide-react'
import Tag from '../common/Tag'
import Button from '../common/Button'
import { formatDateTime, formatDurationMins } from '../../utils/formatters'

function formatWindow(windowVal, startMinVal) {
  if (windowVal && typeof windowVal === 'string' && windowVal.includes('T')) {
    return formatDateTime(windowVal)
  }
  if (typeof startMinVal === 'number') {
    const hh = String(Math.floor(startMinVal / 60) % 24).padStart(2, '0')
    const mm = String(startMinVal % 60).padStart(2, '0')
    return `${hh}:${mm} IST`
  }
  return '01:30 IST'
}

export default function AiRecommendedBlock({ block }) {
  const [showReasoning, setShowReasoning] = useState(false)

  if (!block) return null

  const confidence = block.confidence ?? block.confidenceScore ?? 94
  const windowDisplay = formatWindow(block.windowStart, block.startMin)
  const duration = block.durationMins ?? block.duration ?? 75
  const impactPct = block.assetAvailabilityImpactPct ?? 2.1
  const departments = Array.isArray(block.departments) ? block.departments : ['Engineering', 'S&T']
  const affectedTrains = block.trainImpact?.affectedTrains ?? 0
  const avgDelayMins = block.trainImpact?.avgDelayMins ?? 0
  const taskList = Array.isArray(block.bundledTasks)
    ? block.bundledTasks
    : Array.isArray(block.taskIds)
    ? block.taskIds
    : ['T001', 'T002']
  const reasoningLines = Array.isArray(block.reasoning)
    ? block.reasoning
    : typeof block.reasoning === 'string'
    ? [block.reasoning]
    : ['Optimal zero-conflict maintenance window identified bundling cross-department tasks.']

  return (
    <div className="border border-ai/30 bg-ai-muted rounded overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-ai/20">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-ai" strokeWidth={2} />
          <span className="text-sm font-semibold text-ink-primary">AI Recommended Block</span>
          <Tag>{block.id}</Tag>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-secondary">Confidence</span>
          <span className="text-sm font-semibold text-ai tabular-nums">{confidence}%</span>
        </div>
      </div>

      <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-ink-secondary">Corridor</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{block.corridor || 'Railway Corridor'}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Window</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{windowDisplay}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Duration</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{formatDurationMins(duration)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Asset availability impact</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">-{impactPct}%</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Users2 size={13} />
          {departments.join(' · ')}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Train size={13} />
          {affectedTrains} train{affectedTrains === 1 ? '' : 's'} affected · {avgDelayMins}m hold
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {taskList.map((taskId) => (
            <Tag key={taskId}>{taskId}</Tag>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowReasoning((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-ai/20 text-xs font-medium text-ai hover:bg-ai/10"
      >
        Why this block?
        <ChevronDown size={14} className={`transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
      </button>

      {showReasoning ? (
        <ul className="px-4 pb-4 pt-1 space-y-1.5">
          {reasoningLines.map((line, i) => (
            <li key={i} className="text-sm text-ink-secondary flex gap-2">
              <span className="text-ai mt-1.5 w-1 h-1 rounded-full bg-ai shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="px-4 py-3 border-t border-ai/20 flex justify-end">
        <Link to="/block-planner">
          <Button variant="ai" size="sm">
            Review in Block Planner
          </Button>
        </Link>
      </div>
    </div>
  )
}
