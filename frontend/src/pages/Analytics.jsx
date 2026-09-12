import { useMemo } from 'react'
import { ClipboardList, TrendingDown, TrainFront, CheckCircle2, CalendarCheck2 } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import KpiCard from '../components/common/KpiCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import TrendLineChart from '../components/analytics/TrendLineChart'
import GroupedBarChart from '../components/analytics/GroupedBarChart'
import DistributionPieChart from '../components/analytics/DistributionPieChart'
import SeparateVsCoordinatedCard from '../components/optimization/SeparateVsCoordinatedCard'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { formatMinutesToTime } from '../utils/backendFormatters'
import { formatPercent } from '../utils/formatters'

export default function Analytics() {
  const { data: trends, loading: trendsLoading, error: trendsError, refetch: refetchTrends } = useFetch(
    () => api.getAnalytics(),
    [],
  )
  const { data: requests, loading: requestsLoading } = useFetch(() => api.getBlockRequests(), [])
  const { data: tasks, loading: tasksLoading } = useFetch(() => api.getTasks(), [])
  const { data: plans, loading: plansLoading } = useFetch(() => api.getPlans(), [])

  const kpis = useMemo(() => {
    const reqs = requests || []
    const taskList = tasks || []
    const approved = reqs.filter((r) => r.status === 'Approved').length
    const decided = reqs.filter((r) => r.status === 'Approved' || r.status === 'Rejected').length
    const latestPlan = plans && plans.length ? plans[0] : null
    return {
      totalRequests: reqs.length,
      approvalRate: decided ? (approved / decided) * 100 : null,
      blocksSaved: latestPlan?.blocks_saved ?? null,
      trainDelay: latestPlan?.total_train_delay_min ?? null,
      scheduledMaintenance: taskList.filter((t) => t.status === 'Scheduled' || t.status === 'In Block').length,
    }
  }, [requests, tasks, plans])

  const requestsByDepartment = useMemo(() => {
    if (!requests) return []
    const counts = {}
    requests.forEach((r) => {
      counts[r.department] = (counts[r.department] || 0) + 1
    })
    return Object.entries(counts).map(([department, count]) => ({ department, count }))
  }, [requests])

  const statusDistribution = useMemo(() => {
    if (!requests) return []
    const counts = {}
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [requests])

  const priorityDistribution = useMemo(() => {
    if (!requests) return []
    const order = ['Critical', 'High', 'Medium', 'Low']
    const counts = {}
    requests.forEach((r) => {
      counts[r.priority] = (counts[r.priority] || 0) + 1
    })
    return order.filter((p) => counts[p]).map((priority) => ({ priority, count: counts[priority] }))
  }, [requests])

  const maintenanceBySection = useMemo(() => {
    if (!tasks) return []
    const counts = {}
    tasks.forEach((t) => {
      counts[t.corridor] = (counts[t.corridor] || 0) + 1
    })
    return Object.entries(counts).map(([corridor, count]) => ({ corridor, count }))
  }, [tasks])

  const latestPlan = plans && plans.length ? plans[0] : null

  if (trendsError) {
    return <ErrorState message="Could not load analytics." detail={trendsError.message} onRetry={refetchTrends} />
  }

  const kpisReady = !requestsLoading && !tasksLoading && !plansLoading

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Analytics"
        subtitle="Asset availability, block utilization, request outcomes, and optimization performance."
      />

      <section>
        {!kpisReady ? (
          <LoadingState label="Loading KPIs…" compact />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="Total requests" value={kpis.totalRequests} tone="neutral" icon={ClipboardList} />
            <KpiCard
              label="Approval rate"
              value={kpis.approvalRate == null ? '—' : formatPercent(kpis.approvalRate)}
              tone="healthy"
              icon={CheckCircle2}
            />
            <KpiCard label="Blocks saved (latest plan)" value={kpis.blocksSaved ?? '—'} tone="ai" icon={TrendingDown} />
            <KpiCard
              label="Train delay (latest plan)"
              value={kpis.trainDelay == null ? '—' : formatMinutesToTime(kpis.trainDelay)}
              tone="warning"
              icon={TrainFront}
            />
            <KpiCard label="Scheduled maintenance" value={kpis.scheduledMaintenance} tone="rail" icon={CalendarCheck2} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Asset availability trend</p>
          <p className="text-xs text-ink-secondary mb-2">Last 7 days, percent of assets available for service.</p>
          {trendsLoading || !trends ? (
            <LoadingState compact />
          ) : (
            <TrendLineChart data={trends.assetAvailability} tone="healthy" unit="%" />
          )}
        </section>

        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Block utilization trend</p>
          <p className="text-xs text-ink-secondary mb-2">Last 7 days, percent of planned block time actually used.</p>
          {trendsLoading || !trends ? (
            <LoadingState compact />
          ) : (
            <TrendLineChart data={trends.blockUtilization} tone="rail" unit="%" />
          )}
        </section>

        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Requests by department</p>
          <p className="text-xs text-ink-secondary mb-2">Open and historical block requests, by requesting department.</p>
          {requestsLoading || !requests ? (
            <LoadingState compact />
          ) : (
            <GroupedBarChart data={requestsByDepartment} nameKey="department" valueKey="count" color="#4E8FE0" />
          )}
        </section>

        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Request status distribution</p>
          <p className="text-xs text-ink-secondary mb-2">Where every block request currently stands.</p>
          {requestsLoading || !requests ? (
            <LoadingState compact />
          ) : (
            <DistributionPieChart data={statusDistribution} />
          )}
        </section>

        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Priority distribution</p>
          <p className="text-xs text-ink-secondary mb-2">Block requests grouped by priority level.</p>
          {requestsLoading || !requests ? (
            <LoadingState compact />
          ) : (
            <GroupedBarChart data={priorityDistribution} nameKey="priority" valueKey="count" color="#D6A947" />
          )}
        </section>

        <section className="bg-surface-1 border border-surface-3 rounded p-4">
          <p className="text-sm font-medium text-ink-primary mb-1">Maintenance by corridor</p>
          <p className="text-xs text-ink-secondary mb-2">Open maintenance tasks grouped by railway corridor.</p>
          {tasksLoading || !tasks ? (
            <LoadingState compact />
          ) : (
            <GroupedBarChart data={maintenanceBySection} nameKey="corridor" valueKey="count" color="#8B7FD6" />
          )}
        </section>
      </div>

      <section>
        <p className="text-sm font-medium text-ink-primary mb-1">Optimization performance</p>
        <p className="text-xs text-ink-secondary mb-2">
          {latestPlan ? `Latest plan: ${latestPlan.plan_name}` : 'No plan generated yet.'}
        </p>
        {plansLoading ? <LoadingState compact /> : latestPlan ? <SeparateVsCoordinatedCard plan={latestPlan} /> : null}
      </section>
    </div>
  )
}
