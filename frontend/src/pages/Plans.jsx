import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Layers, TrendingDown, TrainFront, Eye, Sparkles } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import KpiCard from '../components/common/KpiCard'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import DataTable from '../components/common/DataTable'
import SidePanel from '../components/common/SidePanel'
import Button from '../components/common/Button'
import PlanDetailContent from '../components/plans/PlanDetailContent'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { formatObjectiveType, formatMinutesToTime } from '../utils/backendFormatters'
import { formatDate } from '../utils/formatters'

export default function Plans() {
  const { data: plans, loading, error, refetch } = useFetch(() => api.getPlans(), [])

  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useFetch(() => (selectedPlanId ? api.getPlanDashboard(selectedPlanId) : Promise.resolve(null)), [selectedPlanId])

  const kpis = useMemo(() => {
    const list = plans || []
    const blocksSaved = list.reduce((sum, p) => sum + (p.blocks_saved || 0), 0)
    const avgDelay = list.length
      ? Math.round(list.reduce((sum, p) => sum + (p.total_train_delay_min || 0), 0) / list.length)
      : 0
    const avgWait = list.length
      ? Math.round(list.reduce((sum, p) => sum + (p.total_wait_time_min || 0), 0) / list.length)
      : 0
    return { total: list.length, blocksSaved, avgDelay, avgWait }
  }, [plans])

  const columns = [
    { key: 'plan_id', header: 'Plan ID', render: (p) => <span className="font-mono text-xs">{p.plan_id}</span> },
    { key: 'plan_name', header: 'Plan Name' },
    { key: 'objective_type', header: 'Objective', render: (p) => formatObjectiveType(p.objective_type) },
    { key: 'created_at', header: 'Generated', render: (p) => formatDate(p.created_at) },
    { key: 'baseline_blocks_count', header: 'Baseline', align: 'right' },
    { key: 'total_blocks_count', header: 'Total Blocks', align: 'right' },
    {
      key: 'blocks_saved',
      header: 'Blocks Saved',
      align: 'right',
      render: (p) => <span className="text-healthy font-medium">{p.blocks_saved}</span>,
    },
    {
      key: 'total_train_delay_min',
      header: 'Train Delay',
      align: 'right',
      render: (p) => formatMinutesToTime(p.total_train_delay_min),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <Button variant="secondary" size="sm" icon={Eye} onClick={() => setSelectedPlanId(p.plan_id)}>
          View
        </Button>
      ),
    },
  ]

  if (error) {
    return <ErrorState message="Could not load plans." detail={error.message} onRetry={refetch} />
  }

  const selectedPlanSummary = (plans || []).find((p) => p.plan_id === selectedPlanId)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Plans"
        subtitle="Every plan produced by the optimizer (POST /optimize, /optimize/database) or a re-optimization run."
        actions={
          <Link to="/block-planner">
            <Button variant="ai" size="sm" icon={Sparkles}>
              Generate New Plan
            </Button>
          </Link>
        }
      />

      <section>
        {!plans ? (
          <LoadingState label="Loading KPIs…" compact />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total plans" value={kpis.total} tone="neutral" icon={CalendarClock} />
            <KpiCard label="Total blocks saved" value={kpis.blocksSaved} tone="healthy" icon={TrendingDown} />
            <KpiCard label="Avg. wait / plan" value={formatMinutesToTime(kpis.avgWait)} tone="rail" icon={Layers} />
            <KpiCard label="Avg. train delay / plan" value={formatMinutesToTime(kpis.avgDelay)} tone="warning" icon={TrainFront} />
          </div>
        )}
      </section>

      <section>
        {loading || !plans ? (
          <LoadingState label="Loading plans…" />
        ) : (
          <DataTable
            columns={columns}
            rows={plans}
            onRowClick={(p) => setSelectedPlanId(p.plan_id)}
            emptyMessage="No plans have been generated yet. Run the AI Block Planner to create one."
          />
        )}
      </section>

      <SidePanel
        open={selectedPlanId !== null}
        onClose={() => setSelectedPlanId(null)}
        title={selectedPlanSummary?.plan_name || selectedPlanId}
        subtitle={selectedPlanId}
      >
        <PlanDetailContent
          dashboard={dashboard}
          loading={dashboardLoading}
          error={dashboardError}
          onRetry={refetchDashboard}
        />
      </SidePanel>
    </div>
  )
}
