import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Tag from '../common/Tag'
import { sampleSections, sampleStations } from '../../data/sampleOptimizationPayload'
import { buildSectionMap, buildStationNameMap, sectionRouteLabel } from '../../utils/sectionLabels'
import { backendDepartmentForRole, generateMaintenanceRequestId } from '../../utils/maintenanceRequestMapping'
import { formatDepartment } from '../../utils/backendFormatters'

const stationNameMap = buildStationNameMap(sampleStations)
const sectionsById = buildSectionMap(sampleSections)

/**
 * Collects a real MaintenanceRequest-shaped object (matches models.py
 * field-for-field). Two things are deliberately NOT sent to the backend
 * because no field for them exists there: `description` (kept for the
 * employee's own reference only) and `requested_by` (there is no such
 * field on MaintenanceRequest — only `department` exists).
 *
 * The section list is built from the local seed.sql-derived reference
 * data (sampleSections), since there is no GET /sections endpoint to load
 * the backend's actual current section list.
 */
export default function NewMaintenanceRequestModal({ open, onClose, role, onSubmit }) {
  const departmentCode = backendDepartmentForRole(role.department)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [availableFrom, setAvailableFrom] = useState('22:00')
  const [sectionId, setSectionId] = useState(sampleSections[0].id)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('2')
  const [durationMin, setDurationMin] = useState(60)
  const [allowedWindowMin, setAllowedWindowMin] = useState(240)
  const [crewSize, setCrewSize] = useState(4)
  const [assetId, setAssetId] = useState('')
  const [isNight, setIsNight] = useState(true)

  const sectionOptions = useMemo(
    () =>
      sampleSections.map((s) => ({
        value: s.id,
        label: `${s.id} — ${sectionRouteLabel(s.id, sectionsById, stationNameMap)}`,
      })),
    [],
  )

  function minutesFromMidnight(timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!departmentCode) return

    const windowStartMin = minutesFromMidnight(availableFrom)

    // Real MaintenanceRequest fields only — matches models.py exactly.
    const request = {
      id: generateMaintenanceRequestId(departmentCode),
      department: departmentCode,
      section_id: sectionId,
      asset_id: assetId || null,
      asset_type: null,
      window_start_min: windowStartMin,
      window_end_min: windowStartMin + Number(allowedWindowMin),
      base_duration_min: Number(durationMin),
      predicted_duration_min: null, // no ML prediction service exists in this backend
      crew_size: Number(crewSize),
      priority: Number(priority),
      is_night: isNight,
    }

    // Frontend-only context, never sent to the backend.
    const localMeta = {
      date,
      description,
      submittedByRole: role.label,
    }

    onSubmit(request, localMeta)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Maintenance Request" width="max-w-2xl">
      {!departmentCode ? (
        <div className="text-sm text-ink-secondary">
          Your current role (<span className="text-ink-primary">{role.label}</span>) isn't tied to a single
          maintenance department. Switch to Engineering, S&T, or Traction/TD Planner to submit a request.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Maintenance category (from your role)</p>
              <Tag>{formatDepartment(departmentCode)}</Tag>
              <p className="text-xs text-ink-faint mt-1">
                Sent to the backend as <code className="font-mono">department: "{departmentCode}"</code>
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Priority</p>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              >
                <option value="1">High / Critical (priority 1)</option>
                <option value="2">Normal / Routine (priority 2)</option>
              </select>
            </div>

            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Date</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Available from (earliest start)</p>
              <input
                type="time"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
            </div>

            <div className="col-span-2">
              <p className="text-xs text-ink-secondary mb-1.5">Route / Section</p>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              >
                {sectionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-faint mt-1">
                Reference section list (seed.sql) — no GET /sections endpoint exists yet to load the live list.
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-ink-secondary mb-1.5">Description</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Rail fracture near Km marker, right rail"
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail resize-none"
              />
              <p className="text-xs text-ink-faint mt-1">
                Kept for your own reference only — the backend's MaintenanceRequest has no description field.
              </p>
            </div>

            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Estimated duration (minutes)</p>
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
              <p className="text-xs text-ink-faint mt-1">
                base_duration_min — no ML duration prediction exists yet, so this is your own estimate.
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Allowed window length (minutes)</p>
              <input
                type="number"
                min={durationMin}
                value={allowedWindowMin}
                onChange={(e) => setAllowedWindowMin(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
              <p className="text-xs text-ink-faint mt-1">How late the optimizer may push the start time.</p>
            </div>

            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Crew size</p>
              <input
                type="number"
                min={1}
                value={crewSize}
                onChange={(e) => setCrewSize(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Asset ID (optional)</p>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g. TRK-014"
                className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"
              />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={isNight}
                onChange={(e) => setIsNight(e.target.checked)}
                className="accent-rail"
              />
              Night-time work (is_night)
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-surface-3 pt-3.5">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="ai" size="sm" type="submit">
              Submit for optimization
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
