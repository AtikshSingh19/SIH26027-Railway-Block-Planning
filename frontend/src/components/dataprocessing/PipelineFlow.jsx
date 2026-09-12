import { ChevronRight } from 'lucide-react'
import PipelineStageCard from './PipelineStageCard'

function minutesSince(isoString) {
  if (!isoString) return null
  const diffMs = Date.now() - new Date(isoString).getTime()
  return Math.max(0, Math.round(diffMs / 60000))
}

export default function PipelineFlow({ stages }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 overflow-x-auto pb-1">
      {stages.map((stage, idx) => (
        <div key={stage.key} className="flex items-center gap-2 sm:contents">
          <PipelineStageCard stage={stage} index={idx} minutesSinceSuccess={minutesSince(stage.lastSuccessAt)} />
          {idx < stages.length - 1 ? (
            <ChevronRight size={16} className="text-ink-faint shrink-0 rotate-90 sm:rotate-0 mx-auto sm:mx-0" />
          ) : null}
        </div>
      ))}
    </div>
  )
}
