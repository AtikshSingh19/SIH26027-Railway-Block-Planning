import { Sparkles } from 'lucide-react'
import Button from '../common/Button'
import { DEPARTMENTS, SEVERITY_LEVELS } from '../../utils/constants'

const HORIZONS = ['Weekly', 'Monthly']

export default function PlanningConfigPanel({
  horizon,
  onHorizonChange,
  dateRange,
  onDateRangeChange,
  selectedDepartments,
  onToggleDepartment,
  priorityThreshold,
  onPriorityThresholdChange,
  onGenerate,
  generating,
}) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Horizon */}
        <div>
          <p className="text-xs text-ink-secondary mb-1.5">Planning horizon</p>
          <div className="inline-flex border border-surface-3 rounded overflow-hidden">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => onHorizonChange(h)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  horizon === h ? 'bg-rail text-white' : 'bg-surface-1 text-ink-secondary hover:bg-surface-2'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="text-xs text-ink-secondary mb-1.5">Date range</p>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-rail w-full"
            />
            <span className="text-ink-faint text-xs">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="bg-surface-2 border border-surface-3 rounded px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-rail w-full"
            />
          </div>
        </div>

        {/* Departments */}
        <div>
          <p className="text-xs text-ink-secondary mb-1.5">Departments</p>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => (
              <label
                key={dept}
                className="flex items-center gap-1.5 bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-xs text-ink-secondary cursor-pointer select-none hover:text-ink-primary"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept)}
                  onChange={() => onToggleDepartment(dept)}
                  className="accent-rail"
                />
                {dept}
              </label>
            ))}
          </div>
        </div>

        {/* Priority threshold */}
        <div>
          <p className="text-xs text-ink-secondary mb-1.5">Minimum priority / criticality</p>
          <select
            value={priorityThreshold}
            onChange={(e) => onPriorityThresholdChange(e.target.value)}
            className="bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail w-full"
          >
            {SEVERITY_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}+
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-surface-3 pt-3.5">
        <p className="text-xs text-ink-faint max-w-md">
          The AI planner suggests block windows from current maintenance, block-request, and train-schedule data.
          Nothing is scheduled until a controller approves it.
        </p>
        <Button
          variant="ai"
          icon={Sparkles}
          onClick={onGenerate}
          disabled={generating || selectedDepartments.length === 0}
        >
          {generating ? 'Generating…' : 'Generate AI Plan'}
        </Button>
      </div>
    </div>
  )
}
