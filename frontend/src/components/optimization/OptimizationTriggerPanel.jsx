import { useState } from 'react'
import { ChevronDown, Database, Sparkles } from 'lucide-react'
import Button from '../common/Button'
import ProcessStateStrip from './ProcessStateStrip'

export default function OptimizationTriggerPanel({
  processState,
  onGenerateFromDatabase,
  onRunCustomPayload,
  customPayloadText,
  onCustomPayloadTextChange,
  payloadError,
  objective,
  onObjectiveChange,
  selectedRequestIds,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const isBusy = processState === 'preparing' || processState === 'optimizing'
  const hasSelectedRequests = selectedRequestIds?.length > 0

  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-ink-primary">Generate Optimized Plan</p>
          <p className="text-xs text-ink-secondary mt-0.5">
            Runs the backend optimizer against the current trains, maintenance requests, sections, and disruptions
            in the database.
          </p>
        </div>
        <Button variant="ai" icon={Sparkles} onClick={onGenerateFromDatabase} disabled={isBusy || !hasSelectedRequests}>
          {isBusy ? 'Optimizing…' : 'Generate Optimized Plan'}
        </Button>
      </div>

      <ProcessStateStrip state={processState} />

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center justify-between text-xs font-medium text-ink-secondary hover:text-ink-primary border-t border-surface-3 pt-3"
      >
        <span className="flex items-center gap-1.5">
          <Database size={13} /> Advanced: run with a custom payload (POST /optimize)
        </span>
        <ChevronDown size={13} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-faint">
            Edit the request body sent to <code className="font-mono">POST /optimize</code>. Must be valid JSON
            matching <code className="font-mono">trains</code>, <code className="font-mono">maintenance_requests</code>,{' '}
            <code className="font-mono">sections</code>, and <code className="font-mono">disruptions</code> from the
            backend's Pydantic models.
          </p>
          <textarea
            value={customPayloadText}
            onChange={(e) => onCustomPayloadTextChange(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full bg-surface-0 border border-surface-3 rounded p-3 text-xs font-mono text-ink-primary outline-none focus:border-rail resize-y"
          />
          {payloadError ? <p className="text-xs text-critical">{payloadError}</p> : null}
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={onRunCustomPayload} disabled={isBusy}>
              Run with this payload
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
