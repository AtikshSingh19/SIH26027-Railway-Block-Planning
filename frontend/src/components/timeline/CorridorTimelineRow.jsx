import { formatDateTime } from '../../utils/formatters'

const TONE_BAR_CLASS = {
  rail: 'bg-rail',
  ai: 'bg-ai',
  critical: 'bg-critical',
}

/**
 * items: [{ id, label, sub, start (ISO), end (ISO), tone, kind, raw }]
 * Bars are positioned relative to this corridor's own min/max time span
 * (with 8% padding) — each corridor is scaled independently since the
 * synthetic demo data spans several different nights, not one shared day.
 */
export default function CorridorTimelineRow({ corridor, items, onSelect }) {
  if (!items || items.length === 0) return null

  const starts = items.map((i) => new Date(i.start).getTime())
  const ends = items.map((i) => new Date(i.end).getTime())
  const rawMin = Math.min(...starts)
  const rawMax = Math.max(...ends)
  const pad = Math.max((rawMax - rawMin) * 0.08, 5 * 60 * 1000)
  const domainStart = rawMin - pad
  const domainEnd = rawMax + pad
  const span = domainEnd - domainStart || 1

  const sorted = [...items].sort((a, b) => new Date(a.start) - new Date(b.start))

  return (
    <div className="border border-surface-3 rounded overflow-hidden">
      <div className="px-3 py-2 bg-surface-1 border-b border-surface-3 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm font-medium text-ink-primary">{corridor}</span>
        <span className="text-xs text-ink-faint">
          {formatDateTime(new Date(rawMin).toISOString())} – {formatDateTime(new Date(rawMax).toISOString())}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {sorted.map((item) => {
          const left = ((new Date(item.start).getTime() - domainStart) / span) * 100
          const width = Math.max(((new Date(item.end).getTime() - new Date(item.start).getTime()) / span) * 100, 1.5)
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-ink-secondary truncate" title={item.label}>
                {item.label}
              </span>
              <div className="flex-1 relative h-5 bg-surface-2 rounded">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  title={`${item.label} · ${item.sub} · ${formatDateTime(item.start)} – ${formatDateTime(item.end)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  className={`absolute top-0 h-full rounded hover:opacity-80 transition-opacity cursor-pointer ${
                    TONE_BAR_CLASS[item.tone] || TONE_BAR_CLASS.rail
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
