import { Database } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { formatDateTime, formatNumber } from '../../utils/formatters'

export default function UnifiedDatasetSummary({ summary }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-rail" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-ink-primary">Unified dataset</span>
        </div>
        <StatusBadge
          tone={summary.readyForPlanning ? 'healthy' : 'warning'}
          label={summary.readyForPlanning ? 'Ready for planning' : 'Not ready'}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-ink-secondary">Total records</p>
          <p className="text-lg font-semibold text-ink-primary mt-0.5 tabular-nums">
            {formatNumber(summary.totalRecords)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Maintenance tasks</p>
          <p className="text-lg font-semibold text-ink-primary mt-0.5 tabular-nums">
            {formatNumber(summary.totalTasks)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Block requests</p>
          <p className="text-lg font-semibold text-ink-primary mt-0.5 tabular-nums">
            {formatNumber(summary.totalBlockRequests)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Corridors covered</p>
          <p className="text-lg font-semibold text-ink-primary mt-0.5 tabular-nums">{summary.corridorsCovered}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Departments</p>
          <p className="text-lg font-semibold text-ink-primary mt-0.5 tabular-nums">{summary.departmentsCovered}</p>
        </div>
      </div>

      <p className="text-xs text-ink-faint border-t border-surface-3 pt-3">
        Last published {formatDateTime(summary.lastPublishedAt)}
      </p>
    </div>
  )
}
