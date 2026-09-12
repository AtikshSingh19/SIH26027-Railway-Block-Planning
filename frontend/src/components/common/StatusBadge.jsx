import { toneClasses } from '../../utils/status'

// Generic badge. Pass an explicit `tone` (from utils/status.js helpers)
// or fall back to neutral. Keeps color logic out of every call site.
export default function StatusBadge({ label, tone = 'neutral', dot = true, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toneClasses(tone)} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {label}
    </span>
  )
}
