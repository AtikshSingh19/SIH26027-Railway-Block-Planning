import { ArrowRight } from 'lucide-react'
import { formatMinutesToTime } from '../../utils/backendFormatters'

/**
 * Uses only real BlockPlan fields (baseline_blocks_count, total_blocks_count,
 * blocks_saved, total_wait_time_min, total_train_delay_min) — no invented
 * per-request arithmetic. "Separate" = what a non-bundled baseline would
 * have needed; "Coordinated" = what this plan actually produced.
 */
export default function SeparateVsCoordinatedCard({ plan }) {
  if (!plan) return null

  return (
    <div className="border border-surface-3 rounded overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-surface-3">
        <div className="p-4 bg-surface-1">
          <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">If planned separately</p>
          <p className="text-2xl font-semibold text-ink-primary tabular-nums">{plan.baseline_blocks_count}</p>
          <p className="text-xs text-ink-faint mt-0.5">blocks / occupancy windows needed</p>
        </div>
        <div className="p-4 bg-ai-muted">
          <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">AI-coordinated plan</p>
          <p className="text-2xl font-semibold text-ai tabular-nums">{plan.total_blocks_count}</p>
          <p className="text-xs text-ink-faint mt-0.5">blocks actually required</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-surface-3 bg-surface-2 text-sm">
        <span className="text-ink-secondary">
          Saved <span className="text-healthy font-semibold">{plan.blocks_saved}</span> block
          {plan.blocks_saved === 1 ? '' : 's'}
        </span>
        <ArrowRight size={13} className="text-ink-faint" />
        <span className="text-ink-secondary">
          {formatMinutesToTime(plan.total_wait_time_min)} total wait ·{' '}
          {formatMinutesToTime(plan.total_train_delay_min)} added train delay
        </span>
      </div>
    </div>
  )
}
