import Button from '../common/Button'

export default function DataQualityCard({ issueKey, issue, onViewIssues }) {
  const hasIssues = issue.count > 0

  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-secondary uppercase tracking-wide">{issue.label}</span>
        <span className={`text-xl font-semibold tabular-nums ${hasIssues ? 'text-warning' : 'text-healthy'}`}>
          {issue.count}
        </span>
      </div>
      <p className="text-xs text-ink-secondary leading-snug">{issue.description}</p>
      <Button
        variant="ghost"
        size="sm"
        className="self-start mt-1"
        disabled={!hasIssues}
        onClick={() => onViewIssues(issueKey)}
      >
        {hasIssues ? 'View issues' : 'No issues'}
      </Button>
    </div>
  )
}
