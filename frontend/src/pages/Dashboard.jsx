import { useState } from 'react'
import KpiCard from '../components/common/KpiCard'
import Button from '../components/common/Button'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import DataSourceStatusStrip from '../components/dashboard/DataSourceStatusStrip'
import CorridorOverview from '../components/dashboard/CorridorOverview'
import AiRecommendedBlock from '../components/dashboard/AiRecommendedBlock'
import RecentAlertsList from '../components/dashboard/RecentAlertsList'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { CORRIDORS } from '../utils/constants'
import { useRole } from '../context/RoleContext'
import { KPI_REGISTRY, ROLE_DASHBOARD_CONFIG, kpiGridColsClass } from '../config/dashboardConfig'
import { useWorkflow } from '../context/WorkflowContext'
import { sampleSections } from '../data/sampleOptimizationPayload'

export default function Dashboard() {
  const { role } = useRole()
  const workflow = useWorkflow()
  const [adminUsers, setAdminUsers] = useState([
    { id: 'EMP-1001', name: 'Asha Verma', role: 'Employee', department: 'Engineering', active: true },
    { id: 'EMP-1002', name: 'Rohan Singh', role: 'Planner', department: 'S&T', active: true },
    { id: 'EMP-1003', name: 'Neha Sharma', role: 'Planner', department: 'Traction Distribution', active: true },
    { id: 'ADM-0001', name: 'Admin Supervisor', role: 'Admin', department: 'Operations', active: true },
  ])
  const config = ROLE_DASHBOARD_CONFIG[role.id] || ROLE_DASHBOARD_CONFIG.control_office
  const department = role.department

  // Every fetch is re-run when the role changes, since the mock API layer
  // (and eventually the real backend) does the department scoping — this
  // page never filters data itself, it just asks for a different slice.
  const { data: summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useFetch(
    () => api.getDashboardSummary({ department }),
    [role.id],
  )
  const { data: recommendedBlock, loading: blockLoading } = useFetch(() => api.getAiRecommendedBlock(), [])
  const { data: sources, loading: sourcesLoading } = useFetch(
    () => api.getDataSources({ department }),
    [role.id],
  )
  const { data: tasks, loading: tasksLoading } = useFetch(() => api.getTasks({ department }), [role.id])
  const { data: blockRequests, loading: requestsLoading } = useFetch(
    () => api.getBlockRequests({ department }),
    [role.id],
  )
  const { data: alerts, loading: alertsLoading } = useFetch(() => api.getAlerts({ department }), [role.id])

  // Only needed for the Admin/Supervisor KPI set, but cheap enough to fetch
  // unconditionally rather than branch fetch logic on role in the page.
  const { data: pipeline, loading: pipelineLoading } = useFetch(() => api.getProcessingPipeline(), [])

  if (summaryError) {
    return (
      <ErrorState
        message="Could not load the dashboard summary."
        detail={summaryError.message}
        onRetry={refetchSummary}
      />
    )
  }

  const kpiContext = { summary, qualityScore: pipeline?.overallDataQualityScore }
  const needsQualityScore = config.kpis.includes('dataQualityScore')
  const kpisLoading = summaryLoading || !summary || (needsQualityScore && (pipelineLoading || !pipeline))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-secondary -mt-2">{config.focusNote}</p>

      {role.category === 'admin' ? <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <SectionHeader title="System Overview" subtitle="Administrative overview of connected workflows and assets" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Employees / users" value="24" tone="neutral" />
          <KpiCard label="Planners" value="6" tone="rail" />
          <KpiCard label="Active plans" value={workflow?.state?.plans?.length ?? summary?.activePlans ?? 1} tone="ai" />
          <KpiCard label="Active alerts" value={alerts?.length ?? workflow?.state?.disruptions?.length ?? 0} tone="critical" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div><p className="text-xs text-ink-faint uppercase tracking-wide mb-2">Railway sections</p><div className="space-y-2">{sampleSections.map((sec) => <div key={sec.id} className="border border-surface-3 rounded px-3 py-2 flex justify-between text-sm"><span className="font-mono text-ink-primary">{sec.id}</span><span className="text-ink-secondary">{sec.track_type} · {sec.electrified ? 'Electrified' : 'Non-electrified'}</span></div>)}</div></div>
          <div><p className="text-xs text-ink-faint uppercase tracking-wide mb-2">User management</p><div className="space-y-2 max-h-48 overflow-y-auto">{adminUsers.map((u) => <div key={u.id} className="border border-surface-3 rounded px-3 py-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm text-ink-primary truncate">{u.name}</p><p className="text-xs text-ink-faint">{u.id} · {u.role} · {u.department}</p></div><Button variant="secondary" size="sm" onClick={() => setAdminUsers((users) => users.map((x) => x.id === u.id ? { ...x, active: !x.active } : x))}>{u.active ? 'Deactivate' : 'Activate'}</Button></div>)}</div></div>
          <div><p className="text-xs text-ink-faint uppercase tracking-wide mb-2">System activity</p><div className="space-y-2 max-h-48 overflow-y-auto">{(workflow?.state?.activities || []).slice(0, 8).map((a) => <div key={a.id} className="border-b border-surface-3 pb-2 text-xs"><p className="text-ink-secondary">{a.text}</p><p className="text-ink-faint mt-0.5">{new Date(a.timestamp).toLocaleString('en-IN')}</p></div>)}</div></div>
        </div>
      </section> : null}

      {/* KPI row — driven entirely by ROLE_DASHBOARD_CONFIG[role.id].kpis */}
      <section>
        {kpisLoading ? (
          <LoadingState label="Loading KPIs…" compact />
        ) : (
          <div className={`grid grid-cols-2 ${kpiGridColsClass(config.kpis.length)} gap-3`}>
            {config.kpis.map((kpiKey) => {
              const def = KPI_REGISTRY[kpiKey]
              if (!def) return null
              return (
                <KpiCard
                  key={kpiKey}
                  label={def.label}
                  value={def.getValue(kpiContext)}
                  unit={def.unit}
                  tone={def.tone}
                  icon={def.icon}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Data source status */}
      {config.widgets.dataSources ? (
        <section>
          <SectionHeader
            title="Data-source status"
            subtitle={department ? `Sources relevant to ${department}` : 'TMS · SMMS · TDMS · COA · Timetable · Freight forecast'}
          />
          {sourcesLoading || !sources ? (
            <LoadingState label="Checking data sources…" compact />
          ) : (
            <DataSourceStatusStrip sources={sources} />
          )}
        </section>
      ) : null}

      {/* AI recommendation */}
      {config.widgets.aiRecommendedBlock ? (
        <section>
          <SectionHeader title="AI recommended block" subtitle="Highest-priority recommendation awaiting review" />
          {blockLoading || !recommendedBlock ? (
            <LoadingState label="Running block optimization…" compact />
          ) : (
            <AiRecommendedBlock block={recommendedBlock} />
          )}
        </section>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Corridor overview */}
        {config.widgets.corridorOverview ? (
          <section className="lg:col-span-2">
            <SectionHeader
              title="Railway corridor overview"
              subtitle={department ? `${department} tasks and conflicts by corridor` : 'Open tasks and conflicts by corridor'}
            />
            {tasksLoading || requestsLoading || !tasks || !blockRequests ? (
              <LoadingState label="Loading corridor data…" compact />
            ) : (
              <CorridorOverview corridors={CORRIDORS} tasks={tasks} blockRequests={blockRequests} />
            )}
          </section>
        ) : null}

        {/* Recent alerts */}
        {config.widgets.alerts ? (
          <section>
            <SectionHeader title="Recent alerts" />
            {alertsLoading || !alerts ? (
              <LoadingState label="Loading alerts…" compact />
            ) : (
              <RecentAlertsList alerts={alerts} />
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
