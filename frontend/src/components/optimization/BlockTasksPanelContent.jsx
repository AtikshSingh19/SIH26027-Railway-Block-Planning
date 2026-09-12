import Tag from '../common/Tag'
import EmptyState from '../common/EmptyState'
import { formatMinutesToTime, formatDepartment, formatPriority } from '../../utils/backendFormatters'
import { sectionRouteLabel } from '../../utils/sectionLabels'

/**
 * `knownRequests`: map of request_id -> the actual MaintenanceRequest object,
 * populated ONLY when we know for certain what was sent (a custom /optimize
 * payload). For /optimize/database runs this is empty — the backend has no
 * endpoint to fetch its maintenance_requests table, so department/priority
 * are shown as "not available" rather than guessed.
 *
 * `sectionsById` / `stationNameMap` / `sectionLabelIsReference`: same idea
 * for building a human-readable section route — `isReference` means the
 * label came from local seed.sql-derived data, not a confirmed backend value.
 */
export default function BlockTasksPanelContent({
  block,
  scheduledTasks,
  knownRequests,
  sectionsById,
  stationNameMap,
  sectionLabelIsReference,
}) {
  if (!block) return null
  const tasks = (scheduledTasks || []).filter((t) => t.block_id === block.block_id)
  const routeLabel = sectionsById ? sectionRouteLabel(block.section_id, sectionsById, stationNameMap) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-ink-faint">section_id</p>
          <p className="text-sm text-ink-primary font-mono mt-0.5">{block.section_id}</p>
          {routeLabel ? (
            <p className="text-xs text-ink-secondary mt-0.5">
              {routeLabel}
              {sectionLabelIsReference ? <span className="text-ink-faint"> (reference)</span> : null}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-ink-faint">Duration</p>
          <p className="text-sm text-ink-primary mt-0.5">
            {formatMinutesToTime(block.block_end_min - block.block_start_min)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">block_start_min</p>
          <p className="text-sm text-ink-primary font-mono mt-0.5">{block.block_start_min}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">block_end_min</p>
          <p className="text-sm text-ink-primary font-mono mt-0.5">{block.block_end_min}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-ink-faint mb-1.5">Scheduled tasks (scheduled_tasks)</p>
        {tasks.length === 0 ? (
          <EmptyState message="No scheduled tasks reference this block." />
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const request = knownRequests?.[t.request_id]
              return (
                <li key={t.id} className="border border-surface-3 bg-surface-2 rounded p-2.5">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-medium text-ink-primary">{t.request_id}</span>
                    <div className="flex items-center gap-1.5">
                      {request ? <Tag>{formatDepartment(request.department)}</Tag> : null}
                      <Tag>{formatMinutesToTime(t.duration_min)}</Tag>
                    </div>
                  </div>
                  <p className="text-xs text-ink-secondary">
                    {t.scheduled_start_min}–{t.scheduled_end_min} min
                    <span className="text-ink-faint">
                      {' '}
                      · deviation {t.start_deviation_min >= 0 ? '+' : ''}
                      {t.start_deviation_min}m
                    </span>
                  </p>
                  {request ? (
                    <p className="text-xs text-ink-faint mt-1">{formatPriority(request.priority)}</p>
                  ) : (
                    <p className="text-xs text-ink-faint mt-1">
                      department/priority not available — this task's originating request wasn't part of a payload
                      this session submitted
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
