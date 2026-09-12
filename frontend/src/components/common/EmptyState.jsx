import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'Nothing to show here yet.', icon: Icon = Inbox, action = null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center border border-dashed border-surface-3 rounded">
      <Icon size={22} className="text-ink-faint" strokeWidth={1.5} />
      <p className="text-sm text-ink-secondary max-w-sm">{message}</p>
      {action}
    </div>
  )
}
