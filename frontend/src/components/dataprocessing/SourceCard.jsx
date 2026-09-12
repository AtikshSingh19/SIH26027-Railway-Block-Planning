import { AlertTriangle } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { dataSourceStatusTone } from '../../utils/status'
import { formatRelativeFreshness, formatNumber } from '../../utils/formatters'

const CONNECTION_LABEL = {
  online: 'Connected',
  warning: 'Connected',
  offline: 'Disconnected',
}

export default function SourceCard({ source }) {
  const tone = dataSourceStatusTone(source.status)

  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-primary truncate">{source.label}</p>
          <p className="text-xs text-ink-faint truncate">{source.fullName}</p>
        </div>
        <StatusBadge tone={tone} label={CONNECTION_LABEL[source.status]} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2 border-t border-surface-3">
        <div>
          <p className="text-xs text-ink-faint">Last sync</p>
          <p className="text-xs text-ink-primary font-medium mt-0.5">
            {formatRelativeFreshness(source.lastSyncMinutesAgo)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Records received</p>
          <p className="text-xs text-ink-primary font-medium mt-0.5">{formatNumber(source.recordsToday)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Owning dept.</p>
          <p className="text-xs text-ink-primary font-medium mt-0.5 truncate">{source.owner}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Warnings</p>
          <p
            className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${
              source.warningCount > 0 ? 'text-warning' : 'text-ink-primary'
            }`}
          >
            {source.warningCount > 0 ? <AlertTriangle size={11} /> : null}
            {source.warningCount}
          </p>
        </div>
      </div>
    </div>
  )
}
