import { dataSourceStatusTone } from '../../utils/status'
import { formatRelativeFreshness } from '../../utils/formatters'

export default function DataSourceStatusStrip({ sources }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {sources.map((source) => {
        const tone = dataSourceStatusTone(source.status)
        const dotColor =
          tone === 'critical' ? 'bg-critical' : tone === 'warning' ? 'bg-warning' : 'bg-healthy'
        return (
          <div
            key={source.key}
            className="bg-surface-1 border border-surface-3 rounded p-3 flex flex-col gap-1.5 min-w-0"
            title={source.fullName}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-sm font-medium text-ink-primary truncate">{source.label}</span>
            </div>
            <p className="text-xs text-ink-faint truncate">{source.owner}</p>
            <p className="text-xs text-ink-secondary">
              Synced {formatRelativeFreshness(source.lastSyncMinutesAgo)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
