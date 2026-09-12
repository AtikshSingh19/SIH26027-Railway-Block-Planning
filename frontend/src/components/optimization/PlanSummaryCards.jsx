import { Layers, TrendingDown, TrainFront, Target } from 'lucide-react'
import KpiCard from '../common/KpiCard'
import { formatObjectiveType, formatMinutesToTime } from '../../utils/backendFormatters'

export default function PlanSummaryCards({ plan }) {
  if (!plan) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard label="Objective" value={formatObjectiveType(plan.objective_type)} tone="ai" icon={Target} />
      <KpiCard label="Baseline blocks" value={plan.baseline_blocks_count} tone="neutral" icon={Layers} />
      <KpiCard label="Total blocks" value={plan.total_blocks_count} tone="rail" icon={Layers} />
      <KpiCard label="Blocks saved" value={plan.blocks_saved} tone="healthy" icon={TrendingDown} />
      <KpiCard
        label="Train delay / wait"
        value={formatMinutesToTime(plan.total_train_delay_min)}
        unit={`· ${formatMinutesToTime(plan.total_wait_time_min)} wait`}
        tone="warning"
        icon={TrainFront}
      />
    </div>
  )
}
