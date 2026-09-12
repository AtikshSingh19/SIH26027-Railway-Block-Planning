import { NavLink } from 'react-router-dom'

export default function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
          isActive
            ? 'bg-surface-2 text-ink-primary border-l-2 border-rail -ml-px pl-[11px]'
            : 'text-ink-secondary hover:bg-surface-2/60 hover:text-ink-primary'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="text-xs px-1.5 py-0.5 rounded bg-critical-muted text-critical font-medium">{badge}</span>
      ) : null}
    </NavLink>
  )
}
