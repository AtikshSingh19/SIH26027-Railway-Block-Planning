import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, GanttChartSquare } from 'lucide-react'
import LoadingState from '../common/LoadingState'
import ErrorState from '../common/ErrorState'
import DataTable from '../common/DataTable'
import Tag from '../common/Tag'
import Button from '../common/Button'
import PlanSummaryCards from '../optimization/PlanSummaryCards'
import SeparateVsCoordinatedCard from '../optimization/SeparateVsCoordinatedCard'
import { formatMinutesToTime } from '../../utils/backendFormatters'
import { formatDateTime } from '../../utils/formatters'
import { sampleSections, sampleStations } from '../../data/sampleOptimizationPayload'
import { buildSectionMap, buildStationNameMap, sectionRouteLabel } from '../../utils/sectionLabels'

const stationNameMap = buildStationNameMap(sampleStations)
const sectionsById = buildSectionMap(sampleSections)

export default function PlanDetailContent({ dashboard, loading, error, onRetry }) {
  const blockColumns = useMemo(
    () => [
      { key: 'block_id', header: 'Block ID', render: (b) => <span className="font-mono text-xs">{b.block_id}</span> },
      {
        key: 'section_id',
        header: 'Section',
        render: (b) => {
          const route = sectionRouteLabel(b.section_id, sectionsById, stationNameMap)
          return (
            <div className="flex flex-col gap-0.5">
              <Tag>{b.section_id}</Tag>
              {route ? <span className="text-xs text-ink-faint">{route} (reference)</span> : null}
            </div>
          )
        },
      },
      {
        key: 'window',
        header: 'Window',
        render: (b) => `${b.block_start_min}–${b.block_end_min} min`,
      },
      {
        key: 'duration',
        header: 'Duration',
        align: 'right',
        render: (b) => formatMinutesToTime(b.block_end_min - b.block_start_min),
      },
      {
        key: 'tasks',
        header: 'Tasks',
        align: 'right',
        render: (b) => (dashboard?.scheduled_tasks || []).filter((t) => t.block_id === b.block_id).length,
      },
    ],
    [dashboard],
  )

  if (loading || !dashboard) {
    return <LoadingState label="Loading plan…" compact />
  }
  if (error) {
    return <ErrorState message="Could not load this plan." detail={error.message} onRetry={onRetry} />
  }

  const { plan, blocks, explanations } = dashboard

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Generated</p>
        <p className="text-sm text-ink-primary">{formatDateTime(plan.created_at)}</p>
      </div>

      <PlanSummaryCards plan={plan} />

      <SeparateVsCoordinatedCard plan={plan} />

      <section>
        <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">Maintenance blocks</p>
        <DataTable columns={blockColumns} rows={blocks} emptyMessage="No blocks in this plan." />
      </section>

      <section>
        <p className="text-xs text-ink-secondary uppercase tracking-wide mb-2">AI reasoning</p>
        <div className="border border-ai/30 bg-ai-muted rounded p-3 flex flex-col gap-2.5">
          {(explanations || []).map((exp) => (
            <div key={exp.id} className="flex items-start gap-2">
              <Lightbulb size={13} className="text-ai shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-ink-secondary leading-snug">{exp.explanation_text}</p>
            </div>
          ))}
        </div>
      </section>

      <Link to="/train-timeline">
        <Button variant="secondary" size="sm" icon={GanttChartSquare} className="w-full justify-center">
          View on Train Timeline
        </Button>
      </Link>
    </div>
  )
}
