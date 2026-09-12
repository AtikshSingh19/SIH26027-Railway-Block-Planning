import { Link } from 'react-router-dom'
import { alertSeverityTone } from '../../utils/status'
import { formatDateTime } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'
import EmptyState from '../common/EmptyState'

export default function RecentAlertsList({ alerts, limit = 5 }) {
  if (!alerts || alerts.length === 0) {
    return <EmptyState message="No active alerts." />
  }

  const visible = [...alerts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)

  return (
    <div className="divide-y divide-surface-3 border border-surface-3 rounded">
      {visible.map((alert) => (
        <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
          <StatusBadge tone={alertSeverityTone(alert.severity)} label={alert.severity} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-primary">{alert.message}</p>
            <p className="text-xs text-ink-faint mt-1">
              {alert.type} · {formatDateTime(alert.timestamp)}
            </p>
          </div>
        </div>
      ))}
      <Link
        to="/alerts"
        className="block text-center text-xs text-rail hover:underline px-4 py-2.5"
      >
        View all alerts
      </Link>
    </div>
  )
}
