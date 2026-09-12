import EmptyState from '../common/EmptyState'
import RequestFeasibilityContent from './RequestFeasibilityContent'

export default function MyRequestsPanel({ entries, sectionsById, stationNameMap }) {
  if (!entries?.length) return <EmptyState message="No maintenance requests submitted by this employee yet." />
  return <div className="flex flex-col divide-y divide-surface-3">
    {[...entries].reverse().map((entry) => <div key={entry.id} className="py-4 first:pt-0">
      <div className="flex items-center justify-between mb-2"><span className="font-mono text-xs text-ink-primary">{entry.id}</span><span className="text-xs text-ink-faint">{entry.meta?.createdAt ? new Date(entry.meta.createdAt).toLocaleString('en-IN') : ''}</span></div>
      <RequestFeasibilityContent entry={entry} sectionsById={sectionsById} stationNameMap={stationNameMap} />
    </div>)}
  </div>
}
