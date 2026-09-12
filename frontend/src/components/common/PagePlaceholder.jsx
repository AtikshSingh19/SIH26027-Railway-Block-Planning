import { Construction } from 'lucide-react'

// Temporary stand-in so every route in the sidebar is navigable from day
// one. Replace each usage with the real page as we build it out.
export default function PagePlaceholder({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-24 border border-dashed border-surface-3 rounded">
      <Construction size={22} className="text-ink-faint" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ink-primary">{title}</p>
        <p className="text-sm text-ink-secondary mt-1 max-w-md">{description}</p>
      </div>
    </div>
  )
}
