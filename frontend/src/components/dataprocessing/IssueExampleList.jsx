import Tag from '../common/Tag'
import EmptyState from '../common/EmptyState'

export default function IssueExampleList({ issue }) {
  if (!issue) return null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-secondary">{issue.description}</p>

      {issue.examples.length === 0 ? (
        <EmptyState message="No example records available." />
      ) : (
        <ul className="space-y-2.5">
          {issue.examples.map((example) => (
            <li key={example.id} className="border border-surface-3 bg-surface-2 rounded p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-ink-primary">{example.id}</span>
                <Tag>{example.source}</Tag>
              </div>
              <p className="text-xs text-ink-secondary leading-snug">{example.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-faint border-t border-surface-3 pt-3">
        Showing {issue.examples.length} of {issue.count} flagged record{issue.count === 1 ? '' : 's'}.
      </p>
    </div>
  )
}
