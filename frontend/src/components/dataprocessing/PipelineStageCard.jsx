import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { pipelineStageTone } from '../../utils/status'
import { formatRelativeFreshness, formatNumber } from '../../utils/formatters'

const STATUS_LABEL = {
  completed: 'Completed',
  processing: 'Processing',
  warning: 'Warning',
  failed: 'Failed',
}

const STATUS_ICON = {
  completed: CheckCircle2,
  processing: Loader2,
  warning: AlertTriangle,
  failed: XCircle,
}

export default function PipelineStageCard({ stage, index, minutesSinceSuccess }) {
  const tone = pipelineStageTone(stage.status)
  const Icon = STATUS_ICON[stage.status] || CheckCircle2
  const dropped = stage.recordsIn - stage.recordsOut

  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-3.5 flex flex-col gap-2.5 w-full sm:w-56 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-faint font-mono">{String(index + 1).padStart(2, '0')}</span>
        <Icon
          size={14}
          className={stage.status === 'processing' ? 'animate-spin text-ai' : undefined}
          strokeWidth={2}
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-ink-primary">{stage.label}</p>
        <p className="text-xs text-ink-secondary mt-0.5 leading-snug">{stage.description}</p>
      </div>

      <StatusBadge tone={tone} label={STATUS_LABEL[stage.status]} className="self-start" />

      <div className="pt-2 border-t border-surface-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-faint">Records</span>
          <span className="text-ink-primary font-medium tabular-nums">
            {formatNumber(stage.recordsOut)}
            {dropped > 0 ? <span className="text-ink-faint font-normal"> / {formatNumber(stage.recordsIn)}</span> : null}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-faint">Processing time</span>
          <span className="text-ink-primary font-medium tabular-nums">{stage.processingTimeSec}s</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-faint">Last success</span>
          <span className="text-ink-primary font-medium tabular-nums">
            {formatRelativeFreshness(minutesSinceSuccess)}
          </span>
        </div>
      </div>
    </div>
  )
}
