export default function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
        {subtitle ? <p className="text-sm text-ink-secondary mt-0.5">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  )
}
