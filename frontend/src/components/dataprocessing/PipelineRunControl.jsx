import { RefreshCw } from 'lucide-react'
import Button from '../common/Button'
import { formatDateTime } from '../../utils/formatters'

export default function PipelineRunControl({ running, progress, lastRunAt, lastRunDurationSec, onRun }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-ink-primary">Pipeline run</p>
          <p className="text-xs text-ink-secondary mt-0.5">
            Last run {formatDateTime(lastRunAt)} · took {lastRunDurationSec}s
          </p>
        </div>
        <Button variant="primary" size="sm" icon={RefreshCw} onClick={onRun} disabled={running}>
          {running ? 'Running pipeline…' : 'Run Pipeline / Reprocess'}
        </Button>
      </div>

      {running ? (
        <div>
          <div className="h-1.5 w-full bg-surface-3 rounded overflow-hidden">
            <div
              className="h-full bg-rail transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-ink-faint mt-1.5 tabular-nums">{progress}% complete</p>
        </div>
      ) : null}
    </div>
  )
}
