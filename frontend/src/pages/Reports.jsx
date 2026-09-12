import { useState } from 'react'
import { CalendarRange, Download, Gauge, GitMerge, PieChart, Users } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import Button from '../components/common/Button'
import api from '../services/api'
import { downloadCsv } from '../utils/csv'

const REPORTS = [
  {
    key: 'weekly-maintenance',
    title: 'Weekly Maintenance Report',
    description: 'Every maintenance task in the unified dataset — department, asset, defect, severity, and status.',
    icon: CalendarRange,
    filename: 'weekly-maintenance-report.csv',
    async buildRows() {
      const tasks = await api.getTasks()
      return tasks.map((t) => ({
        ID: t.id,
        Department: t.department,
        Asset: t.asset,
        Location: t.location,
        Corridor: t.corridor,
        Defect: t.defect,
        Severity: t.severity,
        Criticality: t.criticality,
        DueDate: t.dueDate,
        PredictedDurationMins: t.predictedDurationMins,
        Status: t.status,
        Source: t.source,
      }))
    },
  },
  {
    key: 'monthly-utilization',
    title: 'Monthly Utilization Report',
    description: 'Daily block utilization percentage over the recorded trend window.',
    icon: Gauge,
    filename: 'monthly-utilization-report.csv',
    async buildRows() {
      const analytics = await api.getAnalytics()
      return analytics.blockUtilization.map((d) => ({ Date: d.date, BlockUtilizationPct: d.value }))
    },
  },
  {
    key: 'availability',
    title: 'Availability Report',
    description: 'Daily asset-availability percentage over the recorded trend window.',
    icon: PieChart,
    filename: 'availability-report.csv',
    async buildRows() {
      const analytics = await api.getAnalytics()
      return analytics.assetAvailability.map((d) => ({ Date: d.date, AssetAvailabilityPct: d.value }))
    },
  },
  {
    key: 'conflicts',
    title: 'Conflict Report',
    description: 'Block requests currently flagged as conflicting with another department\u2019s request.',
    icon: GitMerge,
    filename: 'conflict-report.csv',
    async buildRows() {
      const requests = await api.getBlockRequests({ status: 'Conflict' })
      return requests.map((b) => ({
        ID: b.id,
        Department: b.department,
        Corridor: b.corridor,
        RequestedStart: b.requestedStart,
        DurationMins: b.durationMins,
        Priority: b.priority,
        Status: b.status,
        ConflictsWith: b.conflictsWith.join('; '),
      }))
    },
  },
  {
    key: 'department',
    title: 'Department Report',
    description: 'Every block request across all departments, for cross-department review.',
    icon: Users,
    filename: 'department-report.csv',
    async buildRows() {
      const requests = await api.getBlockRequests()
      return requests.map((b) => ({
        ID: b.id,
        Department: b.department,
        Corridor: b.corridor,
        Status: b.status,
        Priority: b.priority,
        DurationMins: b.durationMins,
      }))
    },
  },
]

export default function Reports() {
  const [generatingKey, setGeneratingKey] = useState(null)
  const [downloadedKey, setDownloadedKey] = useState(null)
  const [errorKey, setErrorKey] = useState(null)

  async function handleGenerate(report) {
    setGeneratingKey(report.key)
    setErrorKey(null)
    try {
      const rows = await report.buildRows()
      downloadCsv(report.filename, rows)
      setDownloadedKey(report.key)
      setTimeout(() => setDownloadedKey((k) => (k === report.key ? null : k)), 2500)
    } catch {
      setErrorKey(report.key)
    } finally {
      setGeneratingKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Reports"
        subtitle="Generate a CSV export from current data. Files download directly — nothing is emailed or stored server-side yet."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((report) => (
          <div key={report.key} className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-rail-muted flex items-center justify-center shrink-0">
                <report.icon size={16} className="text-rail" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">{report.title}</p>
                <p className="text-xs text-ink-secondary mt-1">{report.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => handleGenerate(report)}
                disabled={generatingKey === report.key}
              >
                {generatingKey === report.key ? 'Generating…' : 'Generate & Download CSV'}
              </Button>
              {downloadedKey === report.key ? (
                <span className="text-xs text-healthy">Downloaded ✓</span>
              ) : errorKey === report.key ? (
                <span className="text-xs text-critical">Could not generate this report.</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
