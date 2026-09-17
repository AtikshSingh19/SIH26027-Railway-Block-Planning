import { useEffect, useMemo, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import DataTable from '../components/common/DataTable'
import SidePanel from '../components/common/SidePanel'
import ErrorState from '../components/common/ErrorState'
import Tag from '../components/common/Tag'
import OptimizationTriggerPanel from '../components/optimization/OptimizationTriggerPanel'
import PlanSummaryCards from '../components/optimization/PlanSummaryCards'
import SeparateVsCoordinatedCard from '../components/optimization/SeparateVsCoordinatedCard'
import BlockTasksPanelContent from '../components/optimization/BlockTasksPanelContent'
import HumanApprovalBar from '../components/optimization/HumanApprovalBar'
import api from '../services/api'
import { useWorkflow } from '../context/WorkflowContext'
import { buildSampleOptimizationPayload, sampleSections, sampleStations, sampleTrains as sampleTrainsForPlanner, sampleDisruptions } from '../data/sampleOptimizationPayload'
import { formatMinutesToTime } from '../utils/backendFormatters'
import { buildSectionMap, buildStationNameMap, sectionRouteLabel } from '../utils/sectionLabels'

export default function BlockPlanner() {
  const [processState, setProcessState] = useState('idle') // idle | preparing | optimizing | success | error
  const [result, setResult] = useState(null)
  const [availablePlans, setAvailablePlans] = useState([])
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [lastMode, setLastMode] = useState('database') // 'database' | 'custom'
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  // Only populated for 'custom' runs — the exact payload actually submitted,
  // not whatever is currently sitting in the (possibly since-edited) textarea.
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState(null)

  const [customPayloadText, setCustomPayloadText] = useState(() =>
    JSON.stringify(buildSampleOptimizationPayload(), null, 2),
  )
  const [payloadError, setPayloadError] = useState(null)

  const [reviewStatus, setReviewStatus] = useState(null) // null | 'approved' | 'rejected'
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [reoptimizing, setReoptimizing] = useState(false)
  const workflow = useWorkflow()
  useEffect(() => {
  async function loadMaintenanceRequests() {
  try {
    const requests = await api.getMaintenanceRequests()
    setMaintenanceRequests(requests)
    return requests
  } catch (err) {
    console.error('Failed to refresh maintenance requests:', err)
    return null
  }
}

  loadMaintenanceRequests()
}, [])

  const [selectedRequestIds, setSelectedRequestIds] = useState([])
  const [objective, setObjective] = useState('BALANCED')
const approvedRequests = maintenanceRequests.filter(
  (r) => r.status === 'APPROVED'
)

const unplannedApprovedRequests = approvedRequests.filter(
  (r) => r.planning_status !== 'PLANNED'
)

const plannedApprovedRequests = approvedRequests.filter(
  (r) => r.planning_status === 'PLANNED'
)

  const stationNameMap = useMemo(() => buildStationNameMap(sampleStations), [])

  // Requests/sections we can confidently attribute to this plan: exact for
  // a custom payload, empty/reference-only for a database-sourced run since
  // there is no GET endpoint to fetch the backend's actual current tables.
  const knownRequests = useMemo(() => {
    if (lastMode === 'custom' && lastSubmittedPayload) {
      return Object.fromEntries(lastSubmittedPayload.maintenance_requests.map((r) => [r.id, r]))
    }
    return {}
  }, [lastMode, lastSubmittedPayload])

  const sectionsById = useMemo(() => {
    if (lastMode === 'custom' && lastSubmittedPayload) {
      return buildSectionMap(lastSubmittedPayload.sections)
    }
    // Database mode: no backend endpoint returns sections, so fall back to
    // the local seed.sql-derived reference purely for a readable label.
    return buildSectionMap(sampleSections)
  }, [lastMode, lastSubmittedPayload])

  const sectionLabelIsReference = lastMode === 'database'

  async function runFlow(apiCall) {
  setProcessState('preparing')
  setErrorMessage(null)
  setReviewStatus(null)

  await new Promise((r) => setTimeout(r, 350))
  setProcessState('optimizing')

  try {
    const res = await apiCall()

      const plans = Array.isArray(res) ? res : [res]

      const normalizedPlans = plans.map((item) => {
        if (item?.result) {
          return {
            ...item.result,
            fallback_plan_id: item.plan_id,
            fallback_plan_name: item.plan_name,
            robustness_score: item.robustness_score,
            robustness_breakdown: item.breakdown,
          }
        }

        return item
      })

      setAvailablePlans(normalizedPlans)
      setSelectedPlanIndex(0)
      setResult(normalizedPlans[0] || null)
      setProcessState('success')

    // Refresh is secondary; don't let it turn a successful
    // optimization into an "Optimization failed" state.
    try {
      await loadMaintenanceRequests()
    } catch (refreshError) {
      console.error(
        'Plan generated, but request list refresh failed:',
        refreshError
      )
    }

  } catch (err) {
    setErrorMessage(
      err?.response?.data?.detail ||
      err.message ||
      'Optimization request failed.'
    )
    setProcessState('error')
  }
}


  function handleGenerateFromDatabase() {
  setLastMode('database')
  setLastSubmittedPayload(null)

  if (!approvedRequests.length) {
    setErrorMessage(
      'No approved maintenance requests are available. Approve requests in Block Requests first.'
    )
    setProcessState('error')
    return
  }

  if (selectedRequestIds.length === 0) {
    setErrorMessage('Please select at least one maintenance request.')
    setProcessState('error')
    return
  }

  runFlow(() => api.optimizeFromDatabase(selectedRequestIds))
}

  function handleRunCustomPayload() {
    let parsed
    try {
      parsed = JSON.parse(customPayloadText)
      setPayloadError(null)
    } catch (e) {
      setPayloadError(`Invalid JSON: ${e.message}`)
      return
    }
    setLastMode('custom')
    setLastSubmittedPayload(parsed)
    runFlow(() => api.optimize(parsed))
  }

  async function handleReoptimize() {
    setReoptimizing(true)
    try {
      const res =
        lastMode === 'custom' && lastSubmittedPayload
          ? await api.optimize(lastSubmittedPayload)
          : await api.optimizeFromDatabase()
      const plans = Array.isArray(res) ? res : [res]

      const normalizedPlans = plans.map((item) => {
        if (item?.result) {
          return {
            ...item.result,
            fallback_plan_id: item.plan_id,
            fallback_plan_name: item.plan_name,
            robustness_score: item.robustness_score,
            robustness_breakdown: item.breakdown,
          }
        }

        return item
      })

      setAvailablePlans(normalizedPlans)
      setSelectedPlanIndex(0)
      setResult(normalizedPlans[0] || null)
      setReviewStatus(null)
    } catch (err) {
      setErrorMessage(err?.response?.data?.detail || err.message || 'Re-optimization failed.')
      setProcessState('error')
    } finally {
      setReoptimizing(false)
    }
  }

  async function handleApprovePlan() {
    console.log('APPROVE CLICKED', result?.plan?.plan_id)

    if (!result?.plan?.plan_id) {
      setErrorMessage('No plan is available to approve.')
      return
    }

    try {
      const res = await api.approvePlan(result)

      setResult((current) => ({
        ...current,
        plan: res.plan,
      }))

      setReviewStatus('approved')
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.detail ||
        err.message ||
        'Plan approval failed.'
      )
    }
  }

  const blockColumns = [
    { key: 'block_id', header: 'block_id', render: (b) => <span className="font-mono text-xs">{b.block_id}</span> },
    {
      key: 'section_id',
      header: 'section_id',
      render: (b) => {
        const route = sectionRouteLabel(b.section_id, sectionsById, stationNameMap)
        return (
          <div className="flex flex-col gap-0.5">
            <Tag>{b.section_id}</Tag>
            {route ? (
              <span className="text-xs text-ink-faint">
                {route}
                {sectionLabelIsReference ? ' (reference)' : ''}
              </span>
            ) : null}
          </div>
        )
      },
    },
    { key: 'start', header: 'block_start_min', align: 'right', render: (b) => b.block_start_min },
    { key: 'end', header: 'block_end_min', align: 'right', render: (b) => b.block_end_min },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      render: (b) => formatMinutesToTime(b.block_end_min - b.block_start_min),
    },
    {
      key: 'tasks',
      header: 'Scheduled tasks',
      render: (b) => {
        const count = (result?.scheduled_tasks || []).filter((t) => t.block_id === b.block_id).length
        return `${count} task${count === 1 ? '' : 's'}`
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="AI Block Planner"
        subtitle="Runs the real optimization backend (POST /optimize or /optimize/database) — no scheduling logic runs in the browser."
      />

      <section className="bg-surface-1 border border-surface-3 rounded p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div><p className="text-sm font-medium text-ink-primary">Approved request queue</p><p className="text-xs text-ink-secondary mt-1">Only planner-approved requests can enter optimization. Select requests or generate with all approved items.</p></div>
          <span className="text-xs text-ink-faint">{approvedRequests.length} approved</span>
        </div>
        {approvedRequests.length === 0 ? (
  <p className="text-sm text-ink-faint border border-surface-3 rounded p-3">
    No approved requests yet. Open Block Requests and approve a pending employee request.
  </p>
) : unplannedApprovedRequests.length === 0 ? (
  <p className="text-xs text-ink-faint py-3">
    No approved requests are currently waiting for planning.
  </p>
) : (
  <div className="flex flex-col divide-y divide-surface-3">
    {unplannedApprovedRequests.map((entry) => (
      <label
        key={entry.id}
        className="flex items-center gap-3 py-2.5 cursor-pointer"
      >
        <input
          type="checkbox"
          checked={selectedRequestIds.includes(entry.id)}
          onChange={(e) =>
            setSelectedRequestIds((ids) =>
              e.target.checked
                ? [...ids, entry.id]
                : ids.filter((id) => id !== entry.id)
            )
          }
          className="accent-rail"
        />

        <span className="font-mono text-xs text-ink-primary">
          {entry.id}
        </span>

        <Tag>{entry.department}</Tag>

        <span className="text-xs text-ink-secondary">
          {entry.section_id} · {entry.base_duration_min} min
        </span>

        <span className="ml-auto text-[10px] font-medium px-2 py-1 rounded bg-warning/10 text-warning">
          READY FOR PLANNING
        </span>
      </label>
    ))}
  </div>
)}

{plannedApprovedRequests.length > 0 ? (
  <div className="mt-4 pt-4 border-t border-surface-3">
    <p className="text-sm font-medium text-ink-primary">
      Already planned
    </p>

    <p className="text-xs text-ink-faint mt-1 mb-2">
      These approved requests have already been included in a generated plan.
    </p>

    <div className="flex flex-col divide-y divide-surface-3">
      {plannedApprovedRequests.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 py-2.5"
        >
          <span className="font-mono text-xs text-ink-primary">
            {entry.id}
          </span>

          <Tag>{entry.department}</Tag>

          <span className="text-xs text-ink-secondary">
            {entry.section_id}
          </span>

          <span className="ml-auto text-xs text-ink-faint">
            {entry.plan_id}
          </span>
        </div>
      ))}
    </div>
  </div>
) : null}


          
      </section>

      <OptimizationTriggerPanel
        processState={processState}
        onGenerateFromDatabase={handleGenerateFromDatabase}
        onRunCustomPayload={handleRunCustomPayload}
        customPayloadText={customPayloadText}
        onCustomPayloadTextChange={setCustomPayloadText}
        payloadError={payloadError}
        objective={objective}
        onObjectiveChange={setObjective}
        selectedRequestIds={selectedRequestIds}
      />

      {processState === 'error' ? (
        <ErrorState
          message="Optimization request failed."
          detail={errorMessage}
          onRetry={lastMode === 'custom' ? handleRunCustomPayload : handleGenerateFromDatabase}
        />
      ) : null}

      {result && (processState === 'success' || reoptimizing) ? (
        <>

        {availablePlans.length > 1 ? (
          <section className="bg-surface-1 border border-surface-3 rounded p-4">
            <SectionHeader
              title="Generated Plans"
              subtitle="Select a plan to review its schedule and optimization details."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {availablePlans.map((plan, index) => (
                <button
                  key={plan.plan?.plan_id || plan.fallback_plan_id || index}
                  type="button"
                  onClick={() => {
                    setSelectedPlanIndex(index)
                    setResult(plan)
                    setReviewStatus(null)
                  }}
                  className={`text-left border rounded p-4 transition ${
                    selectedPlanIndex === index
                      ? 'border-ai bg-ai-muted'
                      : 'border-surface-3 bg-surface-1 hover:border-ai/50'
                  }`}
                >
                  <div className="text-sm font-medium text-ink-primary">
                    {plan.plan?.plan_name || plan.fallback_plan_name || 'Optimization Plan'}
                  </div>

                  <div className="text-xs text-ink-faint mt-1">
                    {plan.plan?.objective_type || '—'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <div className="text-ink-faint">Robustness</div>
                      <div className="font-medium text-ink-primary">
                        {plan.robustness_score ?? '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-ink-faint">Blocks</div>
                      <div className="font-medium text-ink-primary">
                        {plan.plan?.total_blocks_count ?? '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-ink-faint">Train delay</div>
                      <div className="font-medium text-ink-primary">
                        {formatMinutesToTime(plan.plan?.total_train_delay_min ?? 0)}
                      </div>
                    </div>

                    <div>
                      <div className="text-ink-faint">Window shift</div>
                      <div className="font-medium text-ink-primary">
                        {formatMinutesToTime(plan.plan?.total_window_shift_min ?? 0)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

          <section>
            <SectionHeader title="Plan summary" subtitle={result.plan.plan_name} />
            <PlanSummaryCards plan={result.plan} />
          </section>

          <section>
            <SectionHeader
              title="Separate blocks vs. coordinated block"
              subtitle="Real block_plans fields — baseline vs. actual"
            />
            <SeparateVsCoordinatedCard plan={result.plan} />
          </section>

          <section>
            <SectionHeader title="Maintenance blocks" subtitle="Click a block to see its scheduled tasks" />
            <DataTable columns={blockColumns} rows={result.blocks} onRowClick={setSelectedBlock} />
          </section>

          <section>
            <SectionHeader title="AI reasoning" subtitle="plan_explanations — why the optimizer chose this plan" />
            <div className="border border-ai/30 bg-ai-muted rounded p-4 flex flex-col gap-2.5">
              {result.explanations.map((exp) => (
                <div key={exp.id} className="flex items-start gap-2">
                  <Lightbulb size={14} className="text-ai shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-sm text-ink-secondary leading-snug">{exp.explanation_text}</p>
                </div>
              ))}
            </div>
          </section>

          <HumanApprovalBar
            reviewStatus={reviewStatus}
            onApprove={handleApprovePlan}
            onReject={() => setReviewStatus('rejected')}
            onModify={() => {
              setLastMode('custom')
              document.getElementById('root')?.scrollIntoView({ behavior: 'smooth' })
            }}
            onReoptimize={handleReoptimize}
            reoptimizing={reoptimizing}
          />
        </>
      ) : null}

      <SidePanel
        open={selectedBlock !== null}
        onClose={() => setSelectedBlock(null)}
        title={selectedBlock?.block_id}
        subtitle={selectedBlock?.section_id}
      >
        <BlockTasksPanelContent
          block={selectedBlock}
          scheduledTasks={result?.scheduled_tasks}
          knownRequests={knownRequests}
          sectionsById={sectionsById}
          stationNameMap={stationNameMap}
          sectionLabelIsReference={sectionLabelIsReference}
        />
      </SidePanel>
    </div>
  )
}
