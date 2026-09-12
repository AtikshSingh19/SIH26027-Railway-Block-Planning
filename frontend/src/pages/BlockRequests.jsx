import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Link2 } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import FilterBar from '../components/common/FilterBar'
import DataTable from '../components/common/DataTable'
import SidePanel from '../components/common/SidePanel'
import StatusBadge from '../components/common/StatusBadge'
import Tag from '../components/common/Tag'
import LinkedTasksCell from '../components/blockrequests/LinkedTasksCell'
import RequestDetailContent from '../components/blockrequests/RequestDetailContent'
import PlannerRequestReview from '../components/blockrequests/PlannerRequestReview'
import { useWorkflow } from '../context/WorkflowContext'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'
import { useRole } from '../context/RoleContext'
import { DEPARTMENTS, SEVERITY_LEVELS, BLOCK_REQUEST_STATUSES } from '../utils/constants'
import { severityTone, blockRequestStatusTone } from '../utils/status'
import { formatDurationMins } from '../utils/formatters'
import { getRelatedRequests, getOverlappingDepartments } from '../utils/blockRequests'

function formatPlanningTime(minutes) {
  const total = Number(minutes)

  if (!Number.isFinite(total)) return '—'

  const day = Math.floor(total / 1440)
  const minutesInDay = total % 1440

  const hours = Math.floor(minutesInDay / 60)
  const mins = minutesInDay % 60

  const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`

  return day > 0 ? `Day ${day + 1}, ${time}` : time
}

export default function BlockRequests() {
  const { role, user } = useRole()
  const workflow = useWorkflow()

  // Role-aware default: Engineering/S&T/Traction planners start scoped to
  // their own department; Control Office, Block/Operations and Admin see
  // every request. Same pattern as Maintenance Records.
  const [department, setDepartment] = useState(role.department || '')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  // const [date, setDate] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setDepartment(role.department || '')
  }, [role.id])

  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useFetch(() => api.getBlockRequests({ department, status, priority, search }), [
    department,
    status,
    priority,
    // date,
    search,
  ])

  // Unfiltered copies used only to resolve cross-request relationships
  // (conflictsWith / bundleGroup) and to build the linked-task lookup —
  // a filtered view could otherwise hide the "other side" of a conflict.
  const { data: allRequests } = useFetch(() => api.getBlockRequests(), [])
  const { data: allTasks } = useFetch(() => api.getTasks(), [])

  const tasksById = useMemo(() => {
    if (!allTasks) return {}
    return Object.fromEntries(allTasks.map((t) => [t.id, t]))
  }, [allTasks])

  // const dateOptions = useMemo(() => {
  //   if (!allRequests) return []
  //   const unique = [...new Set(allRequests.map((r) => r.requestedStart.slice(0, 10)))].sort()
  //   return unique.map((d) => ({ value: d, label: formatDateOnly(d) }))
  // }, [allRequests])

  const dateOptions = []

  const [selectedRequest, setSelectedRequest] = useState(null)
  const panelOpen = selectedRequest !== null

  function coordinationIndicator(request) {
    if (!allRequests) return null
    const related = getRelatedRequests(request, allRequests)
    const overlapping = getOverlappingDepartments(request, related)
    if (overlapping.length === 0) return null
    if (request.status === 'Conflict') {
      return (
        <span title={`Overlaps with ${overlapping.join(', ')}`}>
          <AlertTriangle size={13} className="text-critical shrink-0" strokeWidth={2} />
        </span>
      )
    }
    return (
      <span title={`Bundling opportunity with ${overlapping.join(', ')}`}>
        <Link2 size={13} className="text-ai shrink-0" strokeWidth={2} />
      </span>
    )
  }

  const columns = [
  {
    key: 'id',
    header: 'Request ID',
    render: (r) => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-ink-primary">
          {r.id}
        </span>
        {coordinationIndicator(r)}
      </div>
    ),
  },

  {
    key: 'department',
    header: 'Department',
    render: (r) => <Tag>{r.department}</Tag>,
  },

  {
    key: 'corridor',
    header: 'Corridor / Section',
    render: (r) => (
      <div>
        <div>{r.corridor || '—'}</div>
        {r.sectionId ? (
          <div className="text-xs text-ink-faint">
            {r.sectionId}
          </div>
        ) : null}
      </div>
    ),
  },

  {
    key: 'window',
    header: 'Requested Window',
    render: (r) =>
      `${formatPlanningTime(r.windowStartMin)} – ${formatPlanningTime(
        r.windowEndMin
      )}`,
  },

  {
    key: 'duration',
    header: 'Duration',
    align: 'right',
    render: (r) => formatDurationMins(r.durationMins),
  },

  {
    key: 'tasks',
    header: 'Linked Tasks',
    render: (r) => (
      <LinkedTasksCell
        taskIds={Array.isArray(r.taskIds) ? r.taskIds : []}
        max={2}
      />
    ),
  },

  {
    key: 'priority',
    header: 'Priority',
    render: (r) => (
      <StatusBadge
        tone={severityTone(r.priority)}
        label={r.priority}
      />
    ),
  },

  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <StatusBadge
        tone={blockRequestStatusTone(r.status)}
        label={r.status}
      />
    ),
  },
]

  function rowClassName(request) {
    if (request.status === 'Conflict') return 'bg-critical-muted/25 border-l-2 border-l-critical'
    if (request.status === 'Suggested for Bundling') return 'border-l-2 border-l-ai'
    return ''
  }

  if (requestsError) {
    return (
      <ErrorState
        message="Could not load block requests."
        detail={requestsError.message}
        onRetry={refetchRequests}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Block Requests"
        subtitle={
          role.department
            ? `Defaulted to ${role.department} — switch the department filter to see other teams' requests.`
            : 'All departments — Engineering, S&T, and Traction Distribution.'
        }
      />

      <section>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search request ID, corridor, task…"
          filters={[
            {
              key: 'department',
              label: 'Department',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
            },
            {
              key: 'status',
              label: 'Status',
              value: status,
              onChange: setStatus,
              options: BLOCK_REQUEST_STATUSES.map((s) => ({ value: s, label: s })),
            },
            {
              key: 'priority',
              label: 'Priority',
              value: priority,
              onChange: setPriority,
              options: SEVERITY_LEVELS.map((s) => ({ value: s, label: s })),
            },
            // {
            //   key: 'date',
            //   label: 'Date',
            //   value: date,
            //   onChange: setDate,
            //   options: dateOptions,
            // },
          ]}
        />

        {requestsLoading || !requests ? (
          <LoadingState label="Loading block requests…" />
        ) : (
          <DataTable
            columns={columns}
            rows={requests}
            onRowClick={setSelectedRequest}
            rowClassName={rowClassName}
            emptyMessage="No block requests match your filters."
          />
        )}
      </section>

      <SidePanel
  open={panelOpen}
  onClose={() => setSelectedRequest(null)}
  title={selectedRequest?.id}
  subtitle={selectedRequest?.corridor}
>
  {selectedRequest ? (
  <PlannerRequestReview
    request={selectedRequest}
    onApprove={async () => {
      await api.approveMaintenanceRequest(
        selectedRequest.id,
        user?.name || role.shortLabel
      )
      setSelectedRequest(null)
      refetchRequests()
    }}
    onReject={async (reason) => {
      if (!reason) return
      await api.rejectMaintenanceRequest(
        selectedRequest.id,
        reason,
        user?.name || role.shortLabel
      )
      setSelectedRequest(null)
      refetchRequests()
    }}
    onModify={async (changes) => {
      await api.modifyMaintenanceRequest(
        selectedRequest.id,
        changes,
        user?.name || role.shortLabel
      )
      setSelectedRequest(null)
      refetchRequests()
    }}
  />
) : null}

</SidePanel>
    </div>
  )
}
