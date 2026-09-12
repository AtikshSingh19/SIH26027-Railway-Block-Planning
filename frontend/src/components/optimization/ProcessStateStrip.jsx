import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

const STEPS = [
  { key: 'preparing', label: 'Preparing optimization' },
  { key: 'optimizing', label: 'Optimizing' },
  { key: 'success', label: 'Success' },
]

// Deliberately only 3 real steps — the backend runs POST /optimize as a
// single call with no incremental progress reporting, so this doesn't
// fabricate stage-by-stage detail the API can't actually provide.
export default function ProcessStateStrip({ state }) {
  if (state === 'idle') return null

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-critical">
        <XCircle size={16} strokeWidth={2} />
        Optimization failed
      </div>
    )
  }

  const activeIndex = STEPS.findIndex((s) => s.key === state)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {STEPS.map((step, idx) => {
        const isDone = idx < activeIndex || state === 'success'
        const isActive = idx === activeIndex && state !== 'success'
        const Icon = isDone ? CheckCircle2 : isActive ? Loader2 : Circle
        const colorClass = isDone ? 'text-healthy' : isActive ? 'text-ai' : 'text-ink-faint'
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <Icon size={14} className={`${colorClass} ${isActive ? 'animate-spin' : ''}`} strokeWidth={2} />
            <span className={`text-sm ${isDone || isActive ? 'text-ink-primary' : 'text-ink-faint'}`}>
              {step.label}
            </span>
            {idx < STEPS.length - 1 ? <span className="text-ink-faint mx-1">→</span> : null}
          </div>
        )
      })}
    </div>
  )
}
