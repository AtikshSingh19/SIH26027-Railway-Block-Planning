import { Link2 } from 'lucide-react'
import Tag from '../common/Tag'
import EmptyState from '../common/EmptyState'
import { isCrossDepartmentOpportunity } from '../../utils/bundling'

/**
 * Surfaces bundling suggestions from api.getBundlingOpportunities() —
 * precomputed (mock) output of a conflict-detection stage, purely
 * displayed here. Only cross-department opportunities are shown, since
 * same-department bundling isn't the interesting case for this page.
 */
export default function BundlingOpportunityBanner({ opportunities }) {
  const crossDept = (opportunities || []).filter(isCrossDepartmentOpportunity)

  if (crossDept.length === 0) {
    return <EmptyState message="No cross-department bundling opportunities detected right now." />
  }

  return (
    <div className="flex flex-col gap-2">
      {crossDept.map((opp) => (
        <div
          key={opp.id}
          className="border border-ai/30 bg-ai-muted rounded p-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <Link2 size={16} className="text-ai shrink-0" strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-sm font-medium text-ink-primary">{opp.corridor}</span>
              <span className="text-xs text-ink-faint">·</span>
              <span className="text-xs text-ink-secondary">{opp.windowNote}</span>
            </div>
            <p className="text-xs text-ink-secondary leading-snug">{opp.rationale}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {opp.taskIds.map((taskId) => (
                <Tag key={taskId}>{taskId}</Tag>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
