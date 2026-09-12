import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import api from '../../services/api'
import StatusBadge from '../common/StatusBadge'
import RoleSelector from './RoleSelector'
import { useRole } from '../../context/RoleContext'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Header({ pageTitle }) {
  const now = useClock()
  const { user, logout } = useRole()
  const navigate = useNavigate()
  const { data: sources } = useFetch(() => api.getDataSources(), [])
  const { data: alerts } = useFetch(() => api.getAlerts(), [])

  const hasOffline = sources?.some((s) => s.status === 'offline')
  const hasWarning = sources?.some((s) => s.status === 'warning')
  const systemTone = hasOffline ? 'critical' : hasWarning ? 'warning' : 'healthy'
  const systemLabel = hasOffline ? 'Data source offline' : hasWarning ? 'Degraded feed' : 'All systems nominal'

  return (
    <header className="h-14 shrink-0 border-b border-surface-3 bg-surface-0 flex items-center justify-between px-6">
      <div>
        <h1 className="text-base font-semibold text-ink-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <StatusBadge tone={systemTone} label={systemLabel} />

        <span className="text-xs text-ink-faint font-mono tabular-nums hidden sm:inline">
          {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ·{' '}
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST
        </span>

        <Link
          to="/alerts"
          className="relative text-ink-secondary hover:text-ink-primary p-1.5 rounded hover:bg-surface-2"
          aria-label="View alerts"
        >
          <Bell size={17} strokeWidth={1.75} />
          {alerts && alerts.length > 0 ? (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-critical" />
          ) : null}
        </Link>

        <RoleSelector />
        {user ? <button onClick={() => { logout(); navigate('/login') }} className="text-xs text-ink-faint hover:text-ink-primary border-l border-surface-3 pl-3">Logout</button> : null}
      </div>
    </header>
  )
}
