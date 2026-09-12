import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ErrorState({
  message = 'This data could not be loaded.',
  detail,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center border border-critical/30 bg-critical-muted rounded">
      <AlertTriangle size={22} className="text-critical" strokeWidth={1.75} />
      <div>
        <p className="text-sm text-ink-primary font-medium">{message}</p>
        {detail ? <p className="text-xs text-ink-secondary mt-1 max-w-sm">{detail}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
