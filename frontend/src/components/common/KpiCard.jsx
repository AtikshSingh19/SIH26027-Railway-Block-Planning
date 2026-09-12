const TONE_TEXT = {
  neutral: 'text-ink-primary',
  healthy: 'text-healthy',
  warning: 'text-warning',
  critical: 'text-critical',
  rail: 'text-rail',
  ai: 'text-ai',
}

/**
 * KpiCard — the single-number-with-label control-room tile.
 * `trend` is optional: { direction: 'up'|'down', label: '+3 today' }
 */
export default function KpiCard({ label, value, unit, tone = 'neutral', icon: Icon, trend, onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`text-left bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-2 ${
        onClick ? 'hover:border-surface-3/80 hover:bg-surface-2 cursor-pointer transition-colors' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-secondary uppercase tracking-wide">{label}</span>
        {Icon ? <Icon size={16} className={TONE_TEXT[tone]} strokeWidth={1.75} /> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</span>
        {unit ? <span className="text-sm text-ink-secondary">{unit}</span> : null}
      </div>
      {trend ? (
        <span className={`text-xs ${trend.direction === 'up' ? 'text-healthy' : 'text-critical'}`}>
          {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
        </span>
      ) : null}
    </Wrapper>
  )
}
