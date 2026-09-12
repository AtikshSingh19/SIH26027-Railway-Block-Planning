import { Loader2 } from 'lucide-react'

export default function LoadingState({ label = 'Loading data…', compact = false }) {
  return (
    <div className={`flex items-center gap-2.5 text-ink-secondary ${compact ? 'py-4' : 'py-16'} justify-center`}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
