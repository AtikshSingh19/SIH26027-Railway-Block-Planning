import { useEffect, useMemo, useState } from 'react'
import { Link2, Plus, ListChecks, ClipboardCheck } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import FilterBar from '../components/common/FilterBar'
import DataTable from '../components/common/DataTable'
import SidePanel from '../components/common/SidePanel'
import StatusBadge from '../components/common/StatusBadge'
import Tag from '../components/common/Tag'
import Button from '../components/common/Button'
import CriticalityBar from '../components/maintenance/CriticalityBar'
import BundlingOpportunityBanner from '../components/maintenance/BundlingOpportunityBanner'
import TaskDetailContent from '../components/maintenance/TaskDetailContent'
import NewMaintenanceRequestModal from '../components/maintenance/NewMaintenanceRequestModal'
import MyRequestsPanel from '../components/maintenance/MyRequestsPanel'
// Same review/approve/reject/modify UI the Block Requests page already uses
// for employee-submitted requests — reused here rather than duplicated.
import PlannerRequestReview from '../components/blockrequests/PlannerRequestReview'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { useRole } from '../context/RoleContext'
import { useWorkflow } from '../context/WorkflowContext'
import { DEPARTMENTS, SEVERITY_LEVELS, TASK_STATUSES } from '../utils/constants'
import { severityTone, taskStatusTone } from '../utils/status'
import { formatDate, formatDurationMins } from '../utils/formatters'
import { findBundleForTask } from '../utils/bundling'
import { sampleSections, sampleStations } from '../data/sampleOptimizationPayload'
import { buildSectionMap, buildStationNameMap } from '../utils/sectionLabels'

const stationNameMap = buildStationNameMap(sampleStations)
const sectionsById = buildSectionMap(sampleSections)

export default function MaintenanceRecords() {
  const { role } = useRole()

  // Role-aware default: Engineering/S&T/Traction planners start scoped to
  // their own department; Control Office, Block/Operations and Admin start
  // on "All". Re-derives whenever the role changes, and the dropdown still
  // lets anyone widen or narrow the view manually afterwards.
  const [department, setDepartment] = useState(role.department || '')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setDepartment(role.department || '')
  }, [role.id])

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useFetch(
    () => api.getTasks({ department, severity, status, overdueOnly, search }),
    [department, severity, status, overdueOnly, search],
  )

  const { data: bundlingOpportunities, loading: bundlingLoading } = useFetch(
    () => api.getBundlingOpportunities(),
    [],
  )

  // Unfiltered block-request records — the same data source Block Requests
  // uses for its review panel. A maintenance task and its originating
  // request are the SAME underlying workflowStore entry (see
  // workflowStore.requestToBlockRequest / taskFromRequest), just shaped
  // differently for the two tables, so we look the request up by task id
  // rather than creating any new record.
  const { data: blockRequests, refetch: refetchBlockRequests } = useFetch(
    () => api.getBlockRequests(),
    [],
  )

  const [selectedTask, setSelectedTask] = useState(null)
  const panelOpen = selectedTask !== null

  const selectedRequest = useMemo(
    () => blockRequests?.find((r) => r.id === selectedTask?.id) || null,
    [blockRequests, selectedTask],
  )
  // Only requests that originated from the employee workflow carry review
  // actions (system-seeded / legacy rows have no single owner to approve
  // against) — same condition Block Requests already uses.
  const isReviewable = selectedRequest?.source === 'employee-workflow'

  const { user } = useRole()
  const workflow = useWorkflow()
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false)
  const [myRequestsOpen, setMyRequestsOpen] = useState(false)

  // "My Requests" needs to read live backend state (status, planning_status,
  // plan_id) rather than only the local workflowStore copy: that local copy
  // is written once on request creation and is never updated when a request
  // or its plan is later approved/rejected on the backend, so it would show
  // a stale PENDING forever otherwise.
  const { data: backendMaintenanceRequests, refetch: refetchMaintenanceRequests } = useFetch(
    () => api.getMaintenanceRequests(),
    [],
  )

const myRequests = useMemo(() => {
  const requests = workflow.getMyRequests(user?.name)
  const entries = Array.isArray(requests) ? requests : []
  const liveById = new Map((backendMaintenanceRequests || []).map((r) => [r.id, r]))

  return entries.map((entry) => {
    const live = liveById.get(entry.id)
    if (!live) return entry

    // Backend is the source of truth for approval/planning state; the local
    // workflow entry only supplies display metadata (requestedBy,
    // description, createdAt) that the backend doesn't store. A request
    // that's APPROVED and already linked into an approved plan is shown as
    // SCHEDULED, matching the status this app already displays for that case.
    const status =
      live.status === 'APPROVED' && live.planning_status === 'PLANNED'
        ? 'SCHEDULED'
        : live.status

    return {
      ...entry,
      status,
      rejectionReason: live.rejection_reason ?? entry.rejectionReason,
      planId: live.plan_id ?? null,
    }
  })
}, [workflow, user?.name, backendMaintenanceRequests])

  async function handleSubmitNewRequest(request, meta) {
    await api.createMaintenanceRequest(request, { ...meta, requestedBy: user?.name || 'Employee' })
    setNewRequestModalOpen(false)
    setMyRequestsOpen(true)
    refetchTasks()
    refetchBlockRequests()
    refetchMaintenanceRequests()
    
  }

  function closeReviewAndRefresh() {
    setSelectedTask(null)
    refetchTasks()
    refetchBlockRequests()
    refetchMaintenanceRequests()
  }

  async function handleApprove() {
    await api.approveMaintenanceRequest(selectedRequest.id, user?.name || role.shortLabel)
    closeReviewAndRefresh()
  }
  async function handleReject(reason) {
    if (!reason) return
    await api.rejectMaintenanceRequest(selectedRequest.id, reason, user?.name || role.shortLabel)
    closeReviewAndRefresh()
  }
  async function handleModify(changes) {
    await api.modifyMaintenanceRequest(selectedRequest.id, changes, user?.name || role.shortLabel)
    closeReviewAndRefresh()
  }

  const columns = [
    {
      key: 'id',
      header: 'Task ID',
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-ink-primary">{t.id}</span>
          {findBundleForTask(t.id, bundlingOpportunities) ? (
            <span title="Bundling opportunity available">
              <Link2 size={12} className="text-ai shrink-0" strokeWidth={2} />
            </span>
          ) : null}
          {t.source === 'Employee request' && t.status === 'Pending' ? (
            <span title="Awaiting your review — click the row to approve, modify, or reject">
              <ClipboardCheck size={12} className="text-warning shrink-0" strokeWidth={2} />
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (t) => <Tag>{t.department}</Tag> },
    { key: 'asset', header: 'Asset' },
    { key: 'location', header: 'Location' },
    { key: 'defect', header: 'Defect / Work Type' },
    {
      key: 'severity',
      header: 'Severity',
      render: (t) => <StatusBadge tone={severityTone(t.severity)} label={t.severity} />,
    },
    {
      key: 'criticality',
      header: 'Criticality',
      align: 'right',
      render: (t) => <CriticalityBar value={t.criticality} />,
    },
    { key: 'dueDate', header: 'Due Date', render: (t) => formatDate(t.dueDate) },
    {
      key: 'predictedDurationMins',
      header: 'Duration',
      align: 'right',
      render: (t) => formatDurationMins(t.predictedDurationMins),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge tone={taskStatusTone(t.status)} label={t.status} />,
    },
  ]

  function rowClassName(task) {
    const classes = []
    if (task.status === 'Overdue') classes.push('bg-critical-muted/30')
    if (task.severity === 'Critical') classes.push('border-l-2 border-l-critical')
    return classes.join(' ')
  }

  if (tasksError) {
    return (
      <ErrorState
        message="Could not load maintenance records."
        detail={tasksError.message}
        onRetry={refetchTasks}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Maintenance Records"
        subtitle={
          role.department
            ? `Defaulted to ${role.department} — switch the department filter to see other teams' work.`
            : 'All departments — Engineering, S&T, and Traction Distribution.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={ListChecks}
              onClick={() => {
                setMyRequestsOpen(true)
                refetchMaintenanceRequests()
              }}
            >
              My Requests{myRequests.length > 0 ? ` (${myRequests.length})` : ''}
            </Button>
            <Button variant="ai" size="sm" icon={Plus} onClick={() => setNewRequestModalOpen(true)}>
              New Maintenance Request
            </Button>
          </>
        }
      />

      {/* Cross-department bundling opportunities */}
      <section>
        <SectionHeader
          title="Cross-department bundling opportunities"
          subtitle="Tasks from different departments on the same corridor and due window"
        />
        {bundlingLoading ? (
          <LoadingState label="Checking for bundling opportunities…" compact />
        ) : (
          <BundlingOpportunityBanner opportunities={bundlingOpportunities} />
        )}
      </section>

      {/* Table */}
      <section>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search task ID, asset, location, defect…"
          filters={[
            {
              key: 'department',
              label: 'Department',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
            },
            {
              key: 'severity',
              label: 'Severity',
              value: severity,
              onChange: setSeverity,
              options: SEVERITY_LEVELS.map((s) => ({ value: s, label: s })),
            },
            {
              key: 'status',
              label: 'Status',
              value: status,
              onChange: setStatus,
              options: TASK_STATUSES.map((s) => ({ value: s, label: s })),
            },
          ]}
          toggles={[{ key: 'overdueOnly', label: 'Overdue only', checked: overdueOnly, onChange: setOverdueOnly }]}
        />

        {tasksLoading || !tasks ? (
          <LoadingState label="Loading maintenance records…" />
        ) : (
          <DataTable
            columns={columns}
            rows={tasks}
            onRowClick={setSelectedTask}
            rowClassName={rowClassName}
            emptyMessage="No maintenance tasks match your filters."
          />
        )}
      </section>

      <SidePanel
        open={panelOpen}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.id}
        subtitle={isReviewable ? 'Review Request' : selectedTask?.asset}
      >
        {isReviewable ? (
          <PlannerRequestReview
            request={selectedRequest}
            onApprove={handleApprove}
            onReject={handleReject}
            onModify={handleModify}
          />
        ) : (
          <TaskDetailContent task={selectedTask} bundlingOpportunities={bundlingOpportunities} />
        )}
      </SidePanel>

      <NewMaintenanceRequestModal
        open={newRequestModalOpen}
        onClose={() => setNewRequestModalOpen(false)}
        role={role}
        onSubmit={handleSubmitNewRequest}
      />

      <SidePanel
        open={myRequestsOpen}
        onClose={() => setMyRequestsOpen(false)}
        title="My Requests"
        subtitle="Maintenance requests from the backend"

      >
        <MyRequestsPanel entries={myRequests} sectionsById={sectionsById} stationNameMap={stationNameMap} />
      </SidePanel>
    </div>
  )
}
