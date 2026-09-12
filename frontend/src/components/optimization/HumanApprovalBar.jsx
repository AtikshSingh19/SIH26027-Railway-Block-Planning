import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'

/**
 * This system RECOMMENDS a plan. It does not control the railway. An
 * authorized controller reviews and decides — that framing is stated
 * explicitly here, not just implied by button labels.
 *
 * Controller approval/rejection decisions are persisted by the backend.
 * The system does not directly control signalling, trains, or track access.
 */
export default function HumanApprovalBar({ reviewStatus, onApprove, onReject, onModify, onReoptimize, reoptimizing }) {
  return (
    <div className="border border-surface-3 bg-surface-1 rounded p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <ShieldAlert size={15} className="text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-xs text-ink-secondary leading-snug">
          This is an AI-generated recommendation, not an executed schedule. An authorized railway controller must
          review and approve it before any block is implemented. The system does not control signalling, trains, or
          track access on its own.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 border-t border-surface-3 pt-3">
        <div className="flex items-center gap-2">
          {reviewStatus ? (
            <StatusBadge
              tone={reviewStatus === 'approved' ? 'healthy' : 'critical'}
              label={reviewStatus === 'approved' ? 'Approved (local review only)' : 'Rejected (local review only)'}
            />
          ) : (
            <span className="text-xs text-ink-faint">Not yet reviewed</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onReoptimize} disabled={reoptimizing}>
            {reoptimizing ? 'Re-optimizing…' : 'Re-optimize'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onModify}>
            Modify inputs
          </Button>
          <Button variant="danger" size="sm" icon={XCircle} onClick={onReject}>
            Reject
          </Button>
          <Button variant="success" size="sm" icon={CheckCircle2} onClick={onApprove}>
            Approve Plan
          </Button>
        </div>
      </div>
      <p className="text-xs text-ink-faint">
  Controller decisions are persisted by the backend. Re-optimize generates a new recommendation using the current
  inputs.
</p>
    </div>
  )
}
