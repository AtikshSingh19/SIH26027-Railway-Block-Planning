// A quieter chip than StatusBadge — for metadata like department or corridor,
// not for state/severity (use StatusBadge for that).
export default function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium text-ink-secondary bg-surface-2 border border-surface-3 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}
