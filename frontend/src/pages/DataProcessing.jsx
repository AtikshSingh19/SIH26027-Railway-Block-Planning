import { useEffect, useRef, useState } from 'react'
import { Gauge } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import KpiCard from '../components/common/KpiCard'
import SidePanel from '../components/common/SidePanel'
import PipelineFlow from '../components/dataprocessing/PipelineFlow'
import PipelineRunControl from '../components/dataprocessing/PipelineRunControl'
import SourceCard from '../components/dataprocessing/SourceCard'
import DataQualityCard from '../components/dataprocessing/DataQualityCard'
import UnifiedDatasetSummary from '../components/dataprocessing/UnifiedDatasetSummary'
import IssueExampleList from '../components/dataprocessing/IssueExampleList'
import { useFetch } from '../hooks/useFetch'
import { useApiAction } from '../hooks/useApiAction'
import api from '../services/api'

export default function DataProcessing() {
  const {
    data: pipeline,
    loading: pipelineLoading,
    error: pipelineError,
    refetch: refetchPipeline,
  } = useFetch(() => api.getProcessingPipeline(), [])

  const { data: sources, loading: sourcesLoading, error: sourcesError } = useFetch(
    () => api.getDataSources(),
    [],
  )

  const {
    data: qualityIssues,
    loading: qualityLoading,
    error: qualityError,
  } = useFetch(() => api.getDataQualityIssues(), [])

  const {
    data: unifiedSummary,
    loading: unifiedLoading,
    refetch: refetchUnified,
  } = useFetch(() => api.getUnifiedDatasetSummary(), [])

  const { run: runPipelineAction, loading: running } = useApiAction(api.runPipeline)

  // Fake-but-honest progress bar: ticks up while the mock request is in
  // flight, then snaps to 100 when it actually resolves. Once a real
  // backend exists this can stream real progress instead.
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      setProgress(4)
      progressIntervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 92 ? 92 : p + Math.random() * 12))
      }, 300)
    } else {
      clearInterval(progressIntervalRef.current)
    }
    return () => clearInterval(progressIntervalRef.current)
  }, [running])

  async function handleRunPipeline() {
    await runPipelineAction()
    setProgress(100)
    refetchPipeline()
    refetchUnified()
    setTimeout(() => setProgress(0), 900)
  }

  const [activeIssueKey, setActiveIssueKey] = useState(null)
  const panelOpen = activeIssueKey !== null
  const activeIssue = activeIssueKey && qualityIssues ? qualityIssues[activeIssueKey] : null

  if (pipelineError || sourcesError || qualityError) {
    return (
      <ErrorState
        message="Could not load the data processing pipeline."
        detail={(pipelineError || sourcesError || qualityError).message}
        onRetry={refetchPipeline}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Data Processing"
        subtitle="Ingestion → Validation → Normalization → Deduplication → Conflict Detection → Unified Dataset"
      />

      {/* Quality score + run control */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pipelineLoading || !pipeline ? (
          <LoadingState label="Loading pipeline status…" compact />
        ) : (
          <>
            <KpiCard
              label="Data quality score"
              value={pipeline.overallDataQualityScore}
              unit="/ 100"
              tone={pipeline.overallDataQualityScore >= 90 ? 'healthy' : 'warning'}
              icon={Gauge}
            />
            <div className="sm:col-span-2">
              <PipelineRunControl
                running={running}
                progress={Math.round(progress)}
                lastRunAt={pipeline.lastRunAt}
                lastRunDurationSec={pipeline.lastRunDurationSec}
                onRun={handleRunPipeline}
              />
            </div>
          </>
        )}
      </section>

      {/* Pipeline stages */}
      <section>
        <SectionHeader title="Pipeline stages" subtitle="Runs automatically every 15 minutes, or on demand" />
        {pipelineLoading || !pipeline ? (
          <LoadingState label="Loading stages…" compact />
        ) : (
          <PipelineFlow stages={pipeline.stages} />
        )}
      </section>

      {/* Data sources */}
      <section>
        <SectionHeader title="Connected data sources" subtitle="TMS · SMMS · TDMS · COA · Timetable · Freight forecast" />
        {sourcesLoading || !sources ? (
          <LoadingState label="Checking data sources…" compact />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((source) => (
              <SourceCard key={source.key} source={source} />
            ))}
          </div>
        )}
      </section>

      {/* Data quality */}
      <section>
        <SectionHeader title="Data quality" subtitle="Issues found during validation and deduplication" />
        {qualityLoading || !qualityIssues ? (
          <LoadingState label="Checking data quality…" compact />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(qualityIssues).map(([key, issue]) => (
              <DataQualityCard key={key} issueKey={key} issue={issue} onViewIssues={setActiveIssueKey} />
            ))}
          </div>
        )}
      </section>

      {/* Unified dataset */}
      <section>
        <SectionHeader title="Unified dataset" />
        {unifiedLoading || !unifiedSummary ? (
          <LoadingState label="Publishing unified dataset…" compact />
        ) : (
          <UnifiedDatasetSummary summary={unifiedSummary} />
        )}
      </section>

      <SidePanel
        open={panelOpen}
        onClose={() => setActiveIssueKey(null)}
        title={activeIssue?.label || 'Issue details'}
        subtitle={activeIssue ? `${activeIssue.count} flagged records` : undefined}
      >
        <IssueExampleList issue={activeIssue} />
      </SidePanel>
    </div>
  )
}
