import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, LayoutGrid } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import EmptyState from '../components/common/EmptyState'
import FilterBar from '../components/common/FilterBar'
import SidePanel from '../components/common/SidePanel'
import StatusBadge from '../components/common/StatusBadge'
import Tag from '../components/common/Tag'
import TimelineLegend from '../components/timeline/TimelineLegend'
import CorridorTimelineRow from '../components/timeline/CorridorTimelineRow'
import RouteGanttChart from '../components/timeline/RouteGanttChart'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { CORRIDORS } from '../utils/constants'
import { severityTone, blockRequestStatusTone } from '../utils/status'
import { formatDateTime, addMinutesToIso, formatDurationMins } from '../utils/formatters'

const INCLUDED_BLOCK_STATUSES = ['Approved', 'Suggested for Bundling', 'Conflict']

export default function TrainTimeline() {
  const { data: trains, loading: trainsLoading, error: trainsError, refetch: refetchTrains } = useFetch(
    () => api.getTrains(),
    [],
  )
  const { data: blockRequests, loading: requestsLoading } = useFetch(() => api.getBlockRequests(), [])
  const { data: plans } = useFetch(() => api.getPlans(), [])
  const { data: sections } = useFetch(() => api.getSections(), [])
  const { data: stations } = useFetch(() => api.getStations(), [])


  const [viewMode, setViewMode] = useState('gantt') // 'gantt' | 'cards'
  const [corridor, setCorridor] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [planDetails, setPlanDetails] = useState({})
  useEffect(() => {
  let cancelled = false

  async function loadPlanDetails() {
    const planList = Array.isArray(plans) ? plans : plans ? [plans] : []

    if (planList.length === 0) {
      setPlanDetails({})
      return
    }

    try {
      const results = await Promise.allSettled(
        planList.map(async (plan) => {
          const detail = await api.getPlan(plan.plan_id)
          return [plan.plan_id, detail]
        }),
      )
const entries = results
  .filter((result) => result.status === 'fulfilled')
  .map((result) => result.value)

      if (!cancelled) {
        setPlanDetails(Object.fromEntries(entries))
      }
    } catch (error) {
      console.error('Could not load plan details:', error)

      if (!cancelled) {
        setPlanDetails({})
      }
    }
  }

  loadPlanDetails()

  return () => {
    cancelled = true
  }
}, [plans])

  const corridorOptions = useMemo(() => {
    if (!trains || !blockRequests) {
      return CORRIDORS.map((c) => ({ value: c, label: c }))
    }
    const withData = new Set([...trains.map((t) => t.corridor), ...blockRequests.map((b) => b.corridor)])
    const available = CORRIDORS.filter((c) => withData.has(c))
    return (available.length > 0 ? available : CORRIDORS).map((c) => ({ value: c, label: c }))
  }, [trains, blockRequests])

  const grouped = useMemo(() => {
    if (!trains || !blockRequests) return []

    const items = []
    trains.forEach((t) => {
      items.push({
        id: `train-${t.id}`,
        corridor: t.corridor,
        label: `${t.type === 'freight' ? '🚆 Freight' : '🚆 Passenger'} ${t.id}`,
        sub: t.name,
        start: t.start,
        end: t.end,
        tone: 'rail',
        kind: 'train',
        raw: t,
      })
    })
    blockRequests
      .filter((b) => INCLUDED_BLOCK_STATUSES.includes(b.status))
      .forEach((b) => {
        items.push({
          id: `block-${b.id}`,
          corridor: b.corridor,
          label: `🛠️ ${b.id}`,
          sub: `${b.department} · ${b.status}`,
          start: b.requestedStart,
          end: addMinutesToIso(b.requestedStart, b.durationMins),
          tone: b.status === 'Conflict' ? 'critical' : 'ai',
          kind: 'block',
          raw: b,
        })
      })

    const names = Object.fromEntries((stations || []).map((x) => [x.id, x.name]))

const corridorForSection = (sectionId) => {
  const sec = (sections || []).find((x) => x.id === sectionId)

  return sec
    ? `${names[sec.source_station_id]} → ${names[sec.target_station_id]}`
    : sectionId
}

    const approvedPlans = Object.values(planDetails || {})
  .filter((detail) => detail?.plan?.status === 'APPROVED')
  .sort(
    (a, b) =>
      new Date(b.plan.created_at) - new Date(a.plan.created_at)
  )

const currentPlan = approvedPlans[0]

if (currentPlan) {
  currentPlan.blocks?.forEach((b) => {
    const base = new Date(
      `${currentPlan.plan.created_at.slice(0, 10)}T00:00:00`
    )
    base.setMinutes(Number(b.block_start_min))

    const end = new Date(
      `${currentPlan.plan.created_at.slice(0, 10)}T00:00:00`
    )
    end.setMinutes(Number(b.block_end_min))

    items.push({
      id: `plan-block-${b.block_id}`,
      corridor: corridorForSection(b.section_id),
      label: `🛠️ ${b.block_id}`,
      sub: `${currentPlan.plan.plan_name} · ${b.section_id}`,
      start: base.toISOString().slice(0, 19),
      end: end.toISOString().slice(0, 19),
      tone: 'ai',
      kind: 'plan-block',
      raw: b,
    })
  })
}

    const byCorridor = {}
    items.forEach((item) => {
      if (!byCorridor[item.corridor]) byCorridor[item.corridor] = []
      byCorridor[item.corridor].push(item)
    })

    return CORRIDORS.filter((c) => byCorridor[c] && byCorridor[c].length > 0)
      .filter((c) => !corridor || c === corridor)
      .map((c) => ({ corridor: c, items: byCorridor[c] }))
  }, [trains, blockRequests, corridor, planDetails, sections, stations])

  const loading = trainsLoading || requestsLoading

  if (trainsError) {
    return <ErrorState message="Could not load the train timeline." detail={trainsError.message} onRetry={refetchTrains} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Train & Block Schedule Timeline"
          subtitle="Real-time multi-route Gantt chart showing passenger/freight train movements and allocated maintenance blocks."
        />

        {/* View Toggle */}
        <div className="flex items-center bg-surface-2 border border-surface-3 rounded p-1 gap-1">
          <button
            type="button"
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'gantt'
                ? 'bg-surface-1 text-ink-primary shadow-sm border border-surface-3'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <BarChart3 size={14} className={viewMode === 'gantt' ? 'text-ai' : ''} />
            <span>Route Gantt Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'cards'
                ? 'bg-surface-1 text-ink-primary shadow-sm border border-surface-3'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <LayoutGrid size={14} className={viewMode === 'cards' ? 'text-rail' : ''} />
            <span>Corridor Cards</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState label="Loading timeline & train movements…" />
      ) : viewMode === 'gantt' ? (
        <RouteGanttChart
          trains={trains || []}
          blockRequests={blockRequests || []}
          plans={plans || []}
          planDetails={planDetails}
          selectedCorridor={corridor}
          onSelectCorridor={setCorridor}
          corridorOptions={corridorOptions}
          onSelectItem={setSelectedItem}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex items-center justify-between flex-wrap gap-3">
            <FilterBar
              filters={[
                {
                  key: 'corridor',
                  label: 'Corridor',
                  value: corridor,
                  onChange: setCorridor,
                  options: corridorOptions,
                },
              ]}
            />
            <TimelineLegend />
          </section>

          {grouped.length === 0 ? (
            <EmptyState message="No trains or maintenance blocks match this filter." />
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map((g) => (
                <CorridorTimelineRow key={g.corridor} corridor={g.corridor} items={g.items} onSelect={setSelectedItem} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Inspection Side Panel */}
      <SidePanel
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.raw?.name || selectedItem?.raw?.train_name || selectedItem?.raw?.id || selectedItem?.label}
        subtitle={selectedItem?.corridor || 'Railway Section'}
      >
        {selectedItem?.kind === 'train' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Tag>{selectedItem.raw.type === 'freight' ? 'Freight Rake' : 'Passenger Express'}</Tag>
              <StatusBadge
                tone={selectedItem.raw.priority === 'High' || selectedItem.raw.raw_priority === 1 ? 'critical' : 'rail'}
                label={selectedItem.raw.priority === 'High' || selectedItem.raw.raw_priority === 1 ? 'Priority 1 (Express)' : 'Priority 2'}
              />
            </div>
            <p className="text-sm text-ink-primary font-medium">{selectedItem.raw.name || selectedItem.raw.train_name}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm border-t border-surface-3 pt-4">
              <dt className="text-ink-secondary">Train Number</dt>
              <dd className="text-ink-primary text-right font-mono font-bold">{selectedItem.raw.id || selectedItem.raw.train_id}</dd>
              <dt className="text-ink-secondary">Corridor</dt>
              <dd className="text-ink-primary text-right">{selectedItem.raw.corridor || 'Section'}</dd>
              <dt className="text-ink-secondary">Section Entry</dt>
              <dd className="text-ink-primary text-right font-mono">
                {selectedItem.raw.start ? formatDateTime(selectedItem.raw.start) : `${selectedItem.raw.entry_time_min} min`}
              </dd>
              <dt className="text-ink-secondary">Section Exit</dt>
              <dd className="text-ink-primary text-right font-mono">
                {selectedItem.raw.end ? formatDateTime(selectedItem.raw.end) : `${selectedItem.raw.exit_time_min} min`}
              </dd>
              <dt className="text-ink-secondary">Operational Status</dt>
              <dd className="text-healthy text-right font-medium">{selectedItem.raw.status || 'ON_TIME'}</dd>
            </dl>
          </div>
        ) : selectedItem?.kind === 'block' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge tone={blockRequestStatusTone(selectedItem.raw.status)} label={selectedItem.raw.status || 'Approved'} />
              <StatusBadge tone={severityTone(selectedItem.raw.priority)} label={selectedItem.raw.priority || 'Medium'} />
              <Tag>{selectedItem.raw.department || 'Engineering'}</Tag>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm border-t border-surface-3 pt-4">
              <dt className="text-ink-secondary">Corridor</dt>
              <dd className="text-ink-primary text-right">{selectedItem.raw.corridor || selectedItem.corridor}</dd>
              <dt className="text-ink-secondary">Window</dt>
              <dd className="text-ink-primary text-right">
                {selectedItem.raw.requestedStart
                  ? `${formatDateTime(selectedItem.raw.requestedStart)} – ${formatDateTime(
                      addMinutesToIso(selectedItem.raw.requestedStart, selectedItem.raw.durationMins),
                    )}`
                  : `${selectedItem.raw.startMin}m – ${selectedItem.raw.endMin}m`}
              </dd>
              <dt className="text-ink-secondary">Duration</dt>
              <dd className="text-ink-primary text-right">{formatDurationMins(selectedItem.raw.durationMins || selectedItem.raw.durationMin || 60)}</dd>
              <dt className="text-ink-secondary">Linked Tasks</dt>
              <dd className="text-ink-primary text-right font-mono text-xs">
                {Array.isArray(selectedItem.raw.taskIds) ? selectedItem.raw.taskIds.join(', ') : 'T001, T002'}
              </dd>
            </dl>
            <Link
              to="/block-requests"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-rail hover:text-rail/80 border border-rail/40 rounded px-3 py-2"
            >
              View in Block Requests
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : selectedItem?.kind === 'plan-block' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Tag>AI Generated Maintenance Block</Tag>
              <StatusBadge tone="healthy" label="Optimized Possession" />
            </div>
            <p className="font-mono text-sm font-semibold text-ink-primary">{selectedItem.raw.id || selectedItem.raw.block_id}</p>
            <dl className="grid grid-cols-2 gap-2.5 text-sm border-t border-surface-3 pt-3">
              <dt className="text-ink-secondary">Section ID</dt>
              <dd className="text-right text-ink-primary font-mono">{selectedItem.raw.section_id || selectedItem.raw.sectionId}</dd>
              <dt className="text-ink-secondary">Possession Start</dt>
              <dd className="text-right text-ink-primary font-mono">{selectedItem.raw.startMin ?? selectedItem.raw.block_start_min} min</dd>
              <dt className="text-ink-secondary">Possession End</dt>
              <dd className="text-right text-ink-primary font-mono">{selectedItem.raw.endMin ?? selectedItem.raw.block_end_min} min</dd>
              <dt className="text-ink-secondary">Duration</dt>
              <dd className="text-right text-ink-primary font-mono font-medium">{selectedItem.raw.durationMin || (selectedItem.raw.block_end_min - selectedItem.raw.block_start_min)} mins</dd>
            </dl>
            <Link
              to="/plans"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-ai hover:text-ai/80 border border-ai/40 rounded px-3 py-2 mt-2"
            >
              View Generated Plans
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : null}
      </SidePanel>
    </div>
  )
}
