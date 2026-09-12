import { TrainFront, Wrench, AlertTriangle } from 'lucide-react'

const ITEMS = [
  { icon: TrainFront, label: 'Train movement', swatchClass: 'bg-rail' },
  { icon: Wrench, label: 'Maintenance block', swatchClass: 'bg-ai' },
  { icon: AlertTriangle, label: 'Conflict', swatchClass: 'bg-critical' },
]

export default function TimelineLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-ink-secondary">
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`w-3 h-2.5 rounded-sm shrink-0 ${item.swatchClass}`} />
          <item.icon size={13} strokeWidth={1.75} className="shrink-0" />
          {item.label}
        </span>
      ))}
    </div>
  )
}
