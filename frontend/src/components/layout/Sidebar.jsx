import {
  LayoutDashboard,
  Database,
  ClipboardList,
  GitPullRequestArrow,
  BrainCircuit,
  GanttChartSquare,
  CalendarClock,
  FlaskConical,
  LineChart,
  BellRing,
  FileBarChart2,
  Settings as SettingsIcon,
  TrainFront,
} from 'lucide-react'
import NavItem from './NavItem'
import { useFetch } from '../../hooks/useFetch'
import { useRole } from '../../context/RoleContext'
import api from '../../services/api'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Data',
    items: [{ to: '/data-processing', icon: Database, label: 'Data Processing' }],
  },
  {
    label: 'Maintenance',
    items: [
      { to: '/maintenance-records', icon: ClipboardList, label: 'Maintenance Records' },
      { to: '/block-requests', icon: GitPullRequestArrow, label: 'Block Requests' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/block-planner', icon: BrainCircuit, label: 'AI Block Planner' },
      { to: '/train-timeline', icon: GanttChartSquare, label: 'Train Timeline' },
      { to: '/plans', icon: CalendarClock, label: 'Plans' },
      { to: '/simulator', icon: FlaskConical, label: 'What-if Simulator' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', icon: LineChart, label: 'Analytics' },
      { to: '/alerts', icon: BellRing, label: 'Alerts', badgeKey: 'alerts' },
      { to: '/reports', icon: FileBarChart2, label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', icon: SettingsIcon, label: 'Settings' }],
  },
]

export default function Sidebar() {
  const { data: alerts } = useFetch(() => api.getAlerts(), [])
  const { role } = useRole()
  const criticalAlertCount = alerts?.filter((a) => a.severity === 'Critical').length

  const isEmployee = role?.category === 'employee'
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (isEmployee) return ['/', '/maintenance-records'].includes(item.to)
      return true
    }),
  })).filter((group) => group.items.length)

  return (
    <aside className="w-60 shrink-0 h-full bg-surface-1 border-r border-surface-3 flex flex-col">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-surface-3 shrink-0">
        <TrainFront size={20} className="text-rail" strokeWidth={2} />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink-primary">Block Planning Console</p>
          <p className="text-xs text-ink-faint">SIH26027 · Prototype</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-xs font-medium text-ink-faint tracking-wide">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badgeKey === 'alerts' && criticalAlertCount ? criticalAlertCount : null}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-surface-3 text-xs text-ink-faint shrink-0">
        Synthetic demo data · Not live railway data
      </div>
    </aside>
  )
}
