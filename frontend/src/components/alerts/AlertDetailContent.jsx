import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import Tag from '../common/Tag'
import { alertSeverityTone } from '../../utils/status'
import { formatDateTime } from '../../utils/formatters'

// relatedId prefixes tell us which page can show the underlying record.
// Purely a presentation convenience — the alert itself doesn't need to
// change if a prefix isn't recognized, it just won't get a jump-to link.
function relatedRecordLink(relatedId) {
  if (!relatedId) return null
  if (/^(ENG|SNT|TRD)-/.test(relatedId)) {
    return { to: '/maintenance-records', label: 'View in Maintenance Records' }
  }
  if (/^BR-/.test(relatedId)) {
    return { to: '/block-requests', label: 'View in Block Requests' }
  }
  return null
}

export default function AlertDetailContent({ alert }) {
  if (!alert) return null

  const link = relatedRecordLink(alert.relatedId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge tone={alertSeverityTone(alert.severity)} label={alert.severity} />
        <Tag>{alert.type}</Tag>
        {alert.department ? <Tag>{alert.department}</Tag> : <Tag>System-wide</Tag>}
      </div>

      <p className="text-sm text-ink-primary leading-relaxed">{alert.message}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm border-t border-surface-3 pt-4">
        <dt className="text-ink-secondary">Alert ID</dt>
        <dd className="font-mono text-xs text-ink-primary text-right">{alert.id}</dd>

        <dt className="text-ink-secondary">Related record</dt>
        <dd className="font-mono text-xs text-ink-primary text-right">{alert.relatedId || '—'}</dd>

        <dt className="text-ink-secondary">Raised</dt>
        <dd className="text-ink-primary text-right">{formatDateTime(alert.timestamp)}</dd>
      </dl>

      {link ? (
        <Link
          to={link.to}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-rail hover:text-rail/80 border border-rail/40 rounded px-3 py-2"
        >
          {link.label}
          <ArrowRight size={14} />
        </Link>
      ) : null}
    </div>
  )
}
