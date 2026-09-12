import Tag from '../common/Tag'

/**
 * Renders a compact list of task-id chips. Used both in the table (capped)
 * and the side panel (uncapped) so the two views stay visually consistent.
 */
export default function LinkedTasksCell({ taskIds, max }) {
  if (!taskIds || taskIds.length === 0) {
    return <span className="text-xs text-ink-faint">—</span>
  }

  const visible = max ? taskIds.slice(0, max) : taskIds
  const hidden = max ? taskIds.length - visible.length : 0

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((id) => (
        <Tag key={id}>{id}</Tag>
      ))}
      {hidden > 0 ? <span className="text-xs text-ink-faint">+{hidden} more</span> : null}
    </div>
  )
}
