import { AlertTriangle } from 'lucide-react'
import EmptyState from '../common/EmptyState'

/**
 * Derives a per-corridor rollup from tasks + block requests so the
 * dashboard can show, at a glance, which corridors need attention.
 */
export default function CorridorOverview({ corridors, tasks, blockRequests }) {
  if (!corridors || corridors.length === 0) {
    return <EmptyState message="No corridor data available." />
  }

  const rows = corridors.map((corridor) => {
    const corridorTasks = tasks.filter((t) => t.corridor === corridor)
    const criticalCount = corridorTasks.filter((t) => t.severity === 'Critical').length
    const overdueCount = corridorTasks.filter((t) => t.status === 'Overdue').length
    const conflictCount = blockRequests.filter((b) => b.corridor === corridor && b.status === 'Conflict').length
    return { corridor, taskCount: corridorTasks.length, criticalCount, overdueCount, conflictCount }
  })

  return (
    <div className="divide-y divide-surface-3 border border-surface-3 rounded">
      {rows.map((row) => (
        <div key={row.corridor} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{row.corridor}</p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {row.taskCount} open task{row.taskCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {row.criticalCount > 0 && (
              <span className="text-xs text-critical font-medium tabular-nums">{row.criticalCount} critical</span>
            )}
            {row.overdueCount > 0 && (
              <span className="text-xs text-warning font-medium tabular-nums">{row.overdueCount} overdue</span>
            )}
            {row.conflictCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-critical font-medium">
                <AlertTriangle size={12} /> {row.conflictCount} conflict{row.conflictCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-xs text-ink-faint">No conflicts</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
