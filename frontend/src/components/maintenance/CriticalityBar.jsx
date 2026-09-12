function toneForCriticality(value) {
  if (value >= 85) return { bar: 'bg-critical', text: 'text-critical' }
  if (value >= 60) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-rail', text: 'text-rail' }
}

export default function CriticalityBar({ value }) {
  const tone = toneForCriticality(value)
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-14 h-1.5 bg-surface-3 rounded overflow-hidden">
        <div className={`h-full ${tone.bar}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-6 text-right ${tone.text}`}>{value}</span>
    </div>
  )
}
