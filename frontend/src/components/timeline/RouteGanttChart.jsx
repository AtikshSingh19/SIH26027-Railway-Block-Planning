import { useMemo, useState } from 'react'
import {
  Train,
  Wrench,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react'

// Format minutes from midnight to HH:MM string
function minToTimeStr(minutes) {
  const normalized = Math.max(0, Math.floor(minutes)) % 1440
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0')
  const mm = String(normalized % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

// Choose sensible tick interval based on visible range
function getTickStep(rangeMinutes) {
  if (rangeMinutes <= 120) return 15
  if (rangeMinutes <= 240) return 30
  if (rangeMinutes <= 480) return 60
  return 120
}

const TIME_PRESETS = [
  { key: 'fit', label: 'Fit Activity' },
  { key: '6h', label: '6h', minutes: 360 },
  { key: '12h', label: '12h', minutes: 720 },
  { key: '24h', label: '24h', minutes: 1440 },
]

const ROW_HEIGHT = 32 // px per individual train row
const LABEL_WIDTH_CLASS = 'w-44' // left label column

export default function RouteGanttChart({
  trains = [],
  blockRequests = [],
  plans = [],
  planDetails = {},
  selectedSectionId,
  selectedCorridor,
  onSelectSection,
  onSelectCorridor,
  sectionOptions = [],
  corridorOptions = [],
  onSelectItem,
}) {
  const [timeMode, setTimeMode] = useState('fit') // 'fit' | '6h' | '12h' | '24h'
  const [hoveredItem, setHoveredItem] = useState(null)

  // Options list and active canonical section_id
  const options = sectionOptions.length > 0 ? sectionOptions : corridorOptions
  const activeSectionId =
    selectedSectionId ||
    selectedCorridor ||
    options[0]?.value ||
    ''

  // Display label for the active section
  const activeDisplayLabel = useMemo(() => {
    const found = options.find((o) => o.value === activeSectionId)
    return found?.label || activeSectionId || 'Section'
  }, [options, activeSectionId])

  const handleSectionChange = (val) => {
    if (onSelectSection) onSelectSection(val)
    if (onSelectCorridor) onSelectCorridor(val)
  }

  // Filter trains strictly by section_id
  const corridorTrains = useMemo(() => {
    return (trains || []).filter((t) => {
      if (!t.section_id) return false
      return activeSectionId ? t.section_id === activeSectionId : true
    })
  }, [trains, activeSectionId])

  // Filter blocks strictly by section_id
  const corridorBlocks = useMemo(() => {
    const blocks = []

    const approvedPlans = Object.values(planDetails || {})
      .filter((detail) => detail?.plan?.status === 'APPROVED')
      .sort(
        (a, b) =>
          new Date(b.plan.created_at) - new Date(a.plan.created_at)
      )

    const currentPlan = approvedPlans[0]

    if (currentPlan) {
      currentPlan.blocks
        ?.filter((b) => {
          if (!b.section_id) return false
          return activeSectionId ? b.section_id === activeSectionId : true
        })
        .forEach((b) => {
          blocks.push({
            id: b.block_id,
            source: 'AI_PLAN',
            planName: currentPlan.plan?.plan_name || 'AI Optimized Plan',
            sectionId: b.section_id,
            startMin: Number(b.block_start_min),
            endMin: Number(b.block_end_min),
            durationMin:
              Number(b.block_end_min) - Number(b.block_start_min),
            department: 'BUNDLED',
            departmentLabel: 'Multi-Department Bundled',
            tasks: (currentPlan.scheduled_tasks || []).filter(
              (st) => st.block_id === b.block_id
            ),
            tone: 'ai',
          })
        })
    }

    // From approved block requests if no plan blocks found for this section
    if (blocks.length === 0 && blockRequests) {
      blockRequests
        .filter((b) => {
          const secId = b.sectionId || b.rawSectionId
          if (!secId) return false
          return activeSectionId ? secId === activeSectionId : true
        })
        .forEach((b) => {
          const secId = b.sectionId || b.rawSectionId
          const reqStart = new Date(b.requestedStart)
          const startMin =
            b.windowStartMin != null
              ? Number(b.windowStartMin)
              : reqStart.getHours() * 60 + reqStart.getMinutes()

          blocks.push({
            id: b.id,
            source: 'BLOCK_REQUEST',
            planName: `Request ${b.id}`,
            sectionId: secId,
            startMin,
            endMin: b.windowEndMin != null ? Number(b.windowEndMin) : startMin + Number(b.durationMins || 60),
            durationMin: Number(b.durationMins || 60),
            department: b.department || 'TRACK',
            departmentLabel: b.department || 'Engineering',
            tasks: b.taskIds || [],
            tone: b.status === 'Conflict' ? 'critical' : 'ai',
          })
        })
    }

    return blocks
  }, [planDetails, blockRequests, activeSectionId])

  // Compute free track slots for internal stats (kept for stats calculations)
  const freeTrackSlots = useMemo(() => {
    const busyIntervals = corridorTrains
      .map((t) => {
        const start = t.entry_time_min ?? 0
        const end = t.exit_time_min ?? (start + 25)
        return { start, end }
      })
      .sort((a, b) => a.start - b.start)

    const freeSlots = []
    let cursor = 0

    for (const interval of busyIntervals) {
      if (interval.start > cursor + 20) {
        const overlappingBlock = corridorBlocks.find(
          (b) => b.startMin >= cursor - 5 && b.endMin <= interval.start + 5
        )
        freeSlots.push({
          startMin: cursor,
          endMin: interval.start,
          durationMin: interval.start - cursor,
          isOccupiedByMaintenance: Boolean(overlappingBlock),
        })
      }
      cursor = Math.max(cursor, interval.end)
    }

    return freeSlots
  }, [corridorTrains, corridorBlocks])

  // Fit-activity window: computed from data extent with padding
  const fitWindow = useMemo(() => {
    const allStarts = [
      ...corridorTrains.map((t) => t.entry_time_min ?? 0),
      ...corridorBlocks.map((b) => b.startMin),
    ]
    const allEnds = [
      ...corridorTrains.map((t) => t.exit_time_min ?? (t.entry_time_min + 30)),
      ...corridorBlocks.map((b) => b.endMin),
    ]

    if (allStarts.length === 0) {
      return { windowMin: 0, windowMax: 1440 }
    }

    const dataMin = Math.min(...allStarts)
    const dataMax = Math.max(...allEnds)
    const span = dataMax - dataMin
    // Add 10% padding on each side, minimum 15 min
    const pad = Math.max(15, Math.round(span * 0.1))
    return {
      windowMin: Math.max(0, dataMin - pad),
      windowMax: Math.min(1440, dataMax + pad),
    }
  }, [corridorTrains, corridorBlocks])

  // Time window configuration based on selected mode
  const { windowMin, windowMax, totalMinutes } = useMemo(() => {
    if (timeMode === '24h') {
      return { windowMin: 0, windowMax: 1440, totalMinutes: 1440 }
    }
    if (timeMode === 'fit') {
      const min = fitWindow.windowMin
      const max = fitWindow.windowMax
      return { windowMin: min, windowMax: max, totalMinutes: Math.max(60, max - min) }
    }
    // Fixed-range presets: center on data midpoint
    const preset = TIME_PRESETS.find((p) => p.key === timeMode)
    const rangeMinutes = preset?.minutes || 1440
    const dataMid = (fitWindow.windowMin + fitWindow.windowMax) / 2
    const half = rangeMinutes / 2
    const min = Math.max(0, Math.round(dataMid - half))
    const max = Math.min(1440, min + rangeMinutes)
    return { windowMin: min, windowMax: max, totalMinutes: max - min }
  }, [timeMode, fitWindow])

  // Helper to compute percentage position on Gantt
  function getLeftPercent(minute) {
    const clamped = Math.max(windowMin, Math.min(windowMax, minute))
    return ((clamped - windowMin) / totalMinutes) * 100
  }

  function getWidthPercent(startMin, endMin) {
    const start = Math.max(windowMin, startMin)
    const end = Math.min(windowMax, endMin)
    const duration = Math.max(2, end - start)
    return Math.max(0.8, (duration / totalMinutes) * 100)
  }

  // Time tick marks with adaptive interval
  const timeTicks = useMemo(() => {
    const step = getTickStep(totalMinutes)
    const ticks = []
    // Snap to step boundary
    const firstTick = Math.ceil(windowMin / step) * step
    for (let m = firstTick; m <= windowMax; m += step) {
      ticks.push(m)
    }
    return ticks
  }, [windowMin, windowMax, totalMinutes])

  // Group trains by type
  const passengerTrains = useMemo(
    () => corridorTrains.filter((t) => t.type !== 'freight'),
    [corridorTrains]
  )
  const freightTrains = useMemo(
    () => corridorTrains.filter((t) => t.type === 'freight'),
    [corridorTrains]
  )

  // Route statistics — compact, no fake claims
  const stats = useMemo(() => {
    const totalTrainCount = corridorTrains.length
    const passengerCount = passengerTrains.length
    const freightCount = freightTrains.length
    const maintenanceHours = (corridorBlocks.reduce((acc, b) => acc + b.durationMin, 0) / 60).toFixed(1)
    const delayedCount = corridorTrains.filter((t) => (t.delay_minutes || 0) > 0).length

    return { totalTrainCount, passengerCount, freightCount, maintenanceHours, delayedCount }
  }, [corridorTrains, passengerTrains, freightTrains, corridorBlocks])

  // ── Render helpers ──

  // Render a single train bar inside its individual row
  const renderTrainBar = (t, colorClasses, hoverRingColor) => {
    const startMin = t.entry_time_min ?? 0
    const exitMin = t.exit_time_min ?? (startMin + 30)
    const left = getLeftPercent(startMin)
    const width = getWidthPercent(startMin, exitMin)
    const hasDelay = (t.delay_minutes || 0) > 0

    return (
      <button
        key={t.id}
        type="button"
        onClick={() =>
          onSelectItem?.({ kind: 'train', raw: t, label: t.name || t.id, corridor: activeDisplayLabel })
        }
        onMouseEnter={() => setHoveredItem({ type: 'train', item: t })}
        onMouseLeave={() => setHoveredItem(null)}
        style={{ left: `${left}%`, width: `${width}%` }}
        className={`absolute top-0.5 bottom-0.5 rounded px-1.5 flex items-center gap-1 text-left cursor-pointer transition-all shadow-sm hover:ring-2 ${hoverRingColor} hover:z-20 ${colorClasses}`}
        title={`${t.name || t.id} (${minToTimeStr(startMin)}–${minToTimeStr(exitMin)})${hasDelay ? ` · Delay: +${t.delay_minutes}m` : ''}`}
      >
        <span className="text-[10px] font-semibold font-mono truncate">{t.id}</span>
        {hasDelay && (
          <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1 rounded font-mono font-bold shrink-0">
            +{t.delay_minutes}m
          </span>
        )}
        <span className="text-[9px] opacity-70 font-mono truncate hidden lg:inline">
          {minToTimeStr(startMin)}–{minToTimeStr(exitMin)}
        </span>
      </button>
    )
  }

  // Render an individual train row (label + bar)
  const renderTrainRow = (t, colorClasses, hoverRingColor) => {
    const hasDelay = (t.delay_minutes || 0) > 0

    return (
      <div key={t.id} className="flex items-center" style={{ height: ROW_HEIGHT }}>
        {/* Row label */}
        <div className={`${LABEL_WIDTH_CLASS} shrink-0 flex items-center gap-1.5 pr-2 overflow-hidden`}>
          <span className="text-[11px] font-mono font-semibold text-ink-primary truncate">{t.id}</span>
          <span className="text-[10px] text-ink-secondary truncate hidden sm:inline">{t.name || ''}</span>
          {hasDelay && (
            <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1 rounded font-mono font-bold shrink-0">
              +{t.delay_minutes}m
            </span>
          )}
        </div>
        {/* Bar area */}
        <div className="flex-1 relative" style={{ height: ROW_HEIGHT - 4 }}>
          {renderTrainBar(t, colorClasses, hoverRingColor)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 bg-surface-1 border border-surface-3 rounded-lg p-4 shadow-sm">
      {/* ── Header: Section selector + zoom controls ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-surface-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-rail/10 border border-rail/20 text-rail">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">Section Gantt Schedule</h3>
            <p className="text-[11px] text-ink-secondary">
              Train movements and maintenance blocks — {activeDisplayLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Section selector */}
          <select
            value={activeSectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-xs font-medium text-ink-primary focus:border-rail outline-none cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Time zoom controls */}
          <div className="flex items-center bg-surface-2 border border-surface-3 rounded overflow-hidden">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setTimeMode(preset.key)}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  timeMode === preset.key
                    ? 'bg-rail text-white'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-3'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Compact KPI strip ── */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Train size={12} className="text-rail" />
          <span className="text-ink-secondary">Trains:</span>
          <span className="font-mono font-semibold text-ink-primary">{stats.totalTrainCount}</span>
          <span className="text-ink-faint">
            ({stats.passengerCount}P / {stats.freightCount}F)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wrench size={12} className="text-ai" />
          <span className="text-ink-secondary">Maintenance:</span>
          <span className="font-mono font-semibold text-ai">{stats.maintenanceHours}h</span>
          <span className="text-ink-faint">({corridorBlocks.length} blocks)</span>
        </div>
        {stats.delayedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-ink-secondary">Delayed:</span>
            <span className="font-mono font-semibold text-amber-500">{stats.delayedCount}</span>
          </div>
        )}
        <div className="text-ink-faint ml-auto">
          {minToTimeStr(windowMin)}–{minToTimeStr(windowMax)}
        </div>
      </div>

      {/* ── Gantt Chart ── */}
      <div className="relative border border-surface-3 rounded bg-surface-2/20 overflow-hidden">
        {/* Time axis header */}
        <div className={`relative h-7 bg-surface-1 border-b border-surface-3 flex items-end`}>
          {/* Spacer for label column */}
          <div className={`${LABEL_WIDTH_CLASS} shrink-0`} />
          <div className="flex-1 relative h-full">
            {timeTicks.map((minute) => {
              const left = getLeftPercent(minute)
              return (
                <div
                  key={minute}
                  style={{ left: `${left}%` }}
                  className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center"
                >
                  <span className="text-[10px] font-mono text-ink-secondary leading-tight">{minToTimeStr(minute)}</span>
                  <div className="w-px h-1 bg-surface-3" />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SECTION: Passenger Trains ── */}
        {passengerTrains.length > 0 && (
          <div className="border-b border-surface-3/60">
            {/* Section header */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1/50">
              <Train size={12} className="text-rail" />
              <span className="text-[11px] font-semibold text-ink-primary uppercase tracking-wide">
                Passenger Trains
              </span>
              <span className="text-[10px] text-ink-faint">({passengerTrains.length})</span>
            </div>
            {/* Individual train rows */}
            <div className="relative px-3 py-1">
              {/* Vertical grid lines */}
              <div className={`absolute inset-y-0 right-0`} style={{ left: '11rem' }}>
                {timeTicks.map((minute) => (
                  <div
                    key={`pg-${minute}`}
                    style={{ left: `${getLeftPercent(minute)}%` }}
                    className="absolute top-0 bottom-0 w-px bg-surface-3/30"
                  />
                ))}
              </div>
              {passengerTrains.map((t) => {
                const isHighPriority = t.priority === 'High' || t.raw_priority === 1
                return renderTrainRow(
                  t,
                  isHighPriority
                    ? 'bg-gradient-to-r from-blue-800 to-rail text-white border border-rail-light/40'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white border border-blue-400/30',
                  'hover:ring-rail'
                )
              })}
            </div>
          </div>
        )}

        {/* ── SECTION: Freight Trains ── */}
        {freightTrains.length > 0 && (
          <div className="border-b border-surface-3/60">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1/50">
              <Train size={12} className="text-amber-500" />
              <span className="text-[11px] font-semibold text-ink-primary uppercase tracking-wide">
                Freight Trains
              </span>
              <span className="text-[10px] text-ink-faint">({freightTrains.length})</span>
            </div>
            <div className="relative px-3 py-1">
              <div className={`absolute inset-y-0 right-0`} style={{ left: '11rem' }}>
                {timeTicks.map((minute) => (
                  <div
                    key={`fg-${minute}`}
                    style={{ left: `${getLeftPercent(minute)}%` }}
                    className="absolute top-0 bottom-0 w-px bg-surface-3/30"
                  />
                ))}
              </div>
              {freightTrains.map((t) =>
                renderTrainRow(
                  t,
                  'bg-gradient-to-r from-amber-700 to-amber-600 text-amber-50 border border-amber-400/40',
                  'hover:ring-amber-400'
                )
              )}
            </div>
          </div>
        )}

        {/* ── SECTION: Maintenance Blocks ── */}
        {corridorBlocks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1/50">
              <Wrench size={12} className="text-ai" />
              <span className="text-[11px] font-semibold text-ai uppercase tracking-wide">
                Maintenance Blocks
              </span>
              <span className="text-[10px] text-ink-faint">({corridorBlocks.length})</span>
            </div>
            <div className="relative px-3 py-1">
              {/* Vertical grid lines */}
              <div className={`absolute inset-y-0 right-0`} style={{ left: '11rem' }}>
                {timeTicks.map((minute) => (
                  <div
                    key={`mg-${minute}`}
                    style={{ left: `${getLeftPercent(minute)}%` }}
                    className="absolute top-0 bottom-0 w-px bg-surface-3/30"
                  />
                ))}
              </div>
              {corridorBlocks.map((b) => {
                const left = getLeftPercent(b.startMin)
                const width = getWidthPercent(b.startMin, b.endMin)

                return (
                  <div key={b.id} className="flex items-center" style={{ height: ROW_HEIGHT + 4 }}>
                    {/* Row label */}
                    <div className={`${LABEL_WIDTH_CLASS} shrink-0 flex flex-col pr-2 overflow-hidden`}>
                      <span className="text-[11px] font-mono font-semibold text-ai truncate">{b.id}</span>
                      <span className="text-[9px] text-ink-faint truncate">
                        {b.departmentLabel} · {b.durationMin}m
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="flex-1 relative" style={{ height: ROW_HEIGHT }}>
                      <button
                        type="button"
                        onClick={() =>
                          onSelectItem?.({
                            kind: b.source === 'AI_PLAN' ? 'plan-block' : 'block',
                            raw: b,
                            label: b.id,
                            corridor: activeDisplayLabel,
                          })
                        }
                        onMouseEnter={() => setHoveredItem({ type: 'block', item: b })}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className="absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-left cursor-pointer transition-all shadow-sm hover:ring-2 hover:ring-ai hover:z-30 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white border border-teal-300/40"
                        title={`${b.id} (${minToTimeStr(b.startMin)}–${minToTimeStr(b.endMin)}) · ${b.departmentLabel} · ${b.durationMin}m`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <Sparkles size={10} className="text-teal-200 shrink-0" />
                          <span className="text-[10px] font-semibold font-mono truncate">{b.id}</span>
                        </div>
                        <span className="text-[9px] bg-black/30 px-1 py-0.5 rounded font-mono shrink-0 hidden sm:inline">
                          {b.durationMin}m
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {corridorTrains.length === 0 && corridorBlocks.length === 0 && (
          <div className="py-10 text-center text-sm text-ink-faint">
            No trains or maintenance blocks for this section.
          </div>
        )}
      </div>

      {/* ── Hover inspector ── */}
      {hoveredItem && (
        <div className="p-2.5 bg-surface-2 border border-surface-3 rounded flex items-center gap-3 text-xs animate-in fade-in duration-150">
          <Info size={14} className="text-rail shrink-0" />
          {hoveredItem.type === 'train' ? (
            <span>
              <strong className="text-ink-primary font-mono">{hoveredItem.item.id}</strong>
              {' — '}
              <span className="text-ink-secondary">{hoveredItem.item.name || 'Train'}</span>
              {' · '}
              <strong className="font-mono text-ink-primary">
                {minToTimeStr(hoveredItem.item.entry_time_min ?? 0)} → {minToTimeStr(hoveredItem.item.exit_time_min ?? 30)}
              </strong>
              {(hoveredItem.item.delay_minutes || 0) > 0 ? (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono font-semibold">
                  +{hoveredItem.item.delay_minutes}m Delay
                </span>
              ) : (
                <span className="ml-2 text-healthy font-mono text-[11px]">(On Time)</span>
              )}
            </span>
          ) : (
            <span>
              <strong className="text-ai font-mono">{hoveredItem.item.id}</strong>
              {' — '}
              <span className="text-ink-secondary">{hoveredItem.item.departmentLabel}</span>
              {' · '}
              <strong className="font-mono text-ink-primary">
                {minToTimeStr(hoveredItem.item.startMin)} → {minToTimeStr(hoveredItem.item.endMin)}
              </strong>
              {' '}({hoveredItem.item.durationMin} mins)
            </span>
          )}
          <span className="text-ink-faint ml-auto shrink-0">Click for details</span>
        </div>
      )}

      {/* ── Compact legend ── */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] pt-1 border-t border-surface-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rail border border-rail-light" />
          <span className="text-ink-secondary">Passenger</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-600 border border-amber-400" />
          <span className="text-ink-secondary">Freight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-600 to-teal-600 border border-teal-300" />
          <span className="text-ink-secondary">Maintenance Block</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1 rounded font-mono font-bold">+Nm</span>
          <span className="text-ink-secondary">Delay Indicator</span>
        </div>
      </div>
    </div>
  )
}
