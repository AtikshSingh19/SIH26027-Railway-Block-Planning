import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles, Train, Users2 } from 'lucide-react'
import Tag from '../common/Tag'
import Button from '../common/Button'
import { formatDateTime, formatDurationMins } from '../../utils/formatters'

export default function AiRecommendedBlock({ block }) {
  const [showReasoning, setShowReasoning] = useState(false)

  if (!block) return null

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
          <span className="text-sm font-semibold text-ai tabular-nums">{block.confidence}%</span>
        </div>
      </div>

      <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-ink-secondary">Corridor</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{block.corridor}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Window</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{formatDateTime(block.windowStart)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Duration</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">{formatDurationMins(block.durationMins)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Asset availability impact</p>
          <p className="text-sm text-ink-primary font-medium mt-0.5">-{block.assetAvailabilityImpactPct}%</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Users2 size={13} />
          {block.departments.join(' · ')}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Train size={13} />
          {block.trainImpact.affectedTrains} train{block.trainImpact.affectedTrains === 1 ? '' : 's'} affected · avg{' '}
          {block.trainImpact.avgDelayMins}m hold
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {block.bundledTasks.map((taskId) => (
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
          {block.reasoning.map((line, i) => (
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
