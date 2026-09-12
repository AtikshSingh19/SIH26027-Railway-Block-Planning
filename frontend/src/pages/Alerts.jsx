import { useMemo, useState } from 'react'
import { AlertOctagon, AlertTriangle, Bell, Radio, Siren } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import KpiCard from '../components/common/KpiCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import FilterBar from '../components/common/FilterBar'
import DataTable from '../components/common/DataTable'
import SidePanel from '../components/common/SidePanel'
import StatusBadge from '../components/common/StatusBadge'
import Tag from '../components/common/Tag'
import Button from '../components/common/Button'
import AlertDetailContent from '../components/alerts/AlertDetailContent'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { useRole } from '../context/RoleContext'
import { DEPARTMENTS, SEVERITY_LEVELS } from '../utils/constants'
import { alertSeverityTone } from '../utils/status'
import { formatDateTime } from '../utils/formatters'
import { sampleSections } from '../data/sampleOptimizationPayload'

export default function Alerts() {
  const { role } = useRole()
  const [impactResult, setImpactResult] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [report, setReport] = useState({ type: 'SECTION_BLOCKED', section_id: sampleSections[0].id, severity: 3, start_time_min: 180, end_time_min: 240, description: '' })

  const [severity, setSeverity] = useState('')
  const [department, setDepartment] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const { data: alerts, loading, error, refetch } = useFetch(() => api.getAlerts(), [])

  const typeOptions = useMemo(() => {
    if (!alerts) return []
    return [...new Set(alerts.map((a) => a.type))].map((t) => ({ value: t, label: t }))
  }, [alerts])

  const filtered = useMemo(() => {
    if (!alerts) return []
    return alerts.filter((a) => {
      if (severity && a.severity !== severity) return false
      if (department && a.department !== department) return false
      if (type && a.type !== type) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${a.id} ${a.message} ${a.relatedId || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [alerts, severity, department, type, search])

  const [selectedAlert, setSelectedAlert] = useState(null)

  const kpis = useMemo(() => {
    const list = alerts || []
    return {
      total: list.length,
      critical: list.filter((a) => a.severity === 'Critical').length,
      high: list.filter((a) => a.severity === 'High').length,
      systemWide: list.filter((a) => a.department === null).length,
    }
  }, [alerts])

  const columns = [
    {
      key: 'severity',
      header: 'Severity',
      render: (a) => <StatusBadge tone={alertSeverityTone(a.severity)} label={a.severity} />,
    },
    { key: 'type', header: 'Type', render: (a) => <Tag>{a.type}</Tag> },
    { key: 'message', header: 'Message', render: (a) => <span className="line-clamp-1 max-w-md">{a.message}</span> },
    {
      key: 'department',
      header: 'Department',
      render: (a) => (a.department ? <Tag>{a.department}</Tag> : <span className="text-ink-faint text-xs">System-wide</span>),
    },
    { key: 'relatedId', header: 'Related', render: (a) => <span className="font-mono text-xs">{a.relatedId || '—'}</span> },
    { key: 'timestamp', header: 'Raised', render: (a) => formatDateTime(a.timestamp) },
  ]

  function rowClassName(alert) {
    if (alert.severity === 'Critical') return 'bg-critical-muted/25 border-l-2 border-l-critical'
    return ''
  }

  if (error) {
    return <ErrorState message="Could not load alerts." detail={error.message} onRetry={refetch} />
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Alerts & Emergency Response"
        subtitle={
          role.department
            ? `Includes ${role.department} alerts and system-wide alerts affecting all departments.`
            : 'Monitor operational alerts and report disruptions that may require re-optimization.'
        }
        actions={<Button variant="danger" icon={Siren} onClick={() => setReportOpen((v) => !v)}>Report Emergency</Button>}
      />

      {reportOpen ? <section className="bg-surface-1 border border-critical/30 rounded p-4 flex flex-col gap-4">
        <div><p className="text-sm font-medium text-ink-primary">Emergency / disruption report</p><p className="text-xs text-ink-secondary mt-1">Submitting creates a shared disruption record for the mock workflow.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-ink-secondary">Type<select value={report.type} onChange={(e) => setReport({ ...report, type: e.target.value })} className="mt-1 w-full bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary"><option value="SECTION_BLOCKED">Section blocked</option><option value="EMERGENCY">Emergency maintenance</option><option value="TRAIN_DELAY">Train delay</option></select></label>
          <label className="text-xs text-ink-secondary">Section<select value={report.section_id} onChange={(e) => setReport({ ...report, section_id: e.target.value })} className="mt-1 w-full bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary">{sampleSections.map((s) => <option key={s.id}>{s.id}</option>)}</select></label>
          <label className="text-xs text-ink-secondary">Severity<select value={report.severity} onChange={(e) => setReport({ ...report, severity: Number(e.target.value) })} className="mt-1 w-full bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary"><option value="1">1 — Low</option><option value="2">2 — High</option><option value="3">3 — Critical</option></select></label>
          <label className="text-xs text-ink-secondary">Expected end (minute)<input type="number" value={report.end_time_min} onChange={(e) => setReport({ ...report, end_time_min: Number(e.target.value) })} className="mt-1 w-full bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary" /></label>
        </div>
        <textarea value={report.description} onChange={(e) => setReport({ ...report, description: e.target.value })} rows={2} placeholder="Describe the emergency" className="bg-surface-2 border border-surface-3 rounded px-3 py-2 text-sm text-ink-primary" />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await api.createDisruption({ ...report, id: undefined }); const impact = await api.runSimulation({ type: report.type === 'EMERGENCY' ? 'emergency' : 'section_blocked', section_id: report.section_id, notes: report.description }); setImpactResult(impact); setReportOpen(false); refetch() }}>Report & Start Impact Analysis</Button></div>
      </section> : null}

      {impactResult ? <section className="bg-surface-1 border border-warning/30 rounded p-4">
        <p className="text-sm font-medium text-ink-primary">Impact Analysis & Re-Optimization</p>
        <p className="text-xs text-ink-secondary mt-1">Affected trains: {impactResult.affectedTrains ?? 0} · Affected blocks: {impactResult.affectedBlocks?.length ?? 0} · New conflicts: {impactResult.newConflicts ?? 0}</p>
        {impactResult.updatedPlan?.plan ? <p className="text-xs text-healthy mt-2">Updated plan generated: <span className="font-mono">{impactResult.updatedPlan.plan.plan_id}</span> — {impactResult.updatedPlan.plan.total_blocks_count} blocks, {impactResult.updatedPlan.plan.total_train_delay_min} min train delay.</p> : <p className="text-xs text-ink-faint mt-2">No active plan was available to re-optimize.</p>}
      </section> : null}

      <section>
        {!alerts ? (
          <LoadingState label="Loading KPIs…" compact />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total alerts" value={kpis.total} tone="neutral" icon={Bell} />
            <KpiCard label="Critical" value={kpis.critical} tone="critical" icon={AlertOctagon} />
            <KpiCard label="High" value={kpis.high} tone="warning" icon={AlertTriangle} />
            <KpiCard label="System-wide" value={kpis.systemWide} tone="rail" icon={Radio} />
          </div>
        )}
      </section>

      <section>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search message, alert ID, related record…"
          filters={[
            {
              key: 'severity',
              label: 'Severity',
              value: severity,
              onChange: setSeverity,
              options: SEVERITY_LEVELS.map((s) => ({ value: s, label: s })),
            },
            {
              key: 'department',
              label: 'Department',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
            },
            {
              key: 'type',
              label: 'Type',
              value: type,
              onChange: setType,
              options: typeOptions,
            },
          ]}
        />

        {loading || !alerts ? (
          <LoadingState label="Loading alerts…" />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            onRowClick={setSelectedAlert}
            rowClassName={rowClassName}
            emptyMessage="No alerts match your filters."
          />
        )}
      </section>

      <SidePanel
        open={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.id}
        subtitle={selectedAlert?.type}
      >
        <AlertDetailContent alert={selectedAlert} />
      </SidePanel>
    </div>
  )
}
