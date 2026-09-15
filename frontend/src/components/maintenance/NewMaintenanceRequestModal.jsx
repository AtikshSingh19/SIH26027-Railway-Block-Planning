import { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Tag from '../common/Tag'
import { buildSectionMap, buildStationNameMap, sectionRouteLabel } from '../../utils/sectionLabels'
import { backendDepartmentForRole, generateMaintenanceRequestId } from '../../utils/maintenanceRequestMapping'
import { formatDepartment } from '../../utils/backendFormatters'
import api from '../../services/api'

export default function NewMaintenanceRequestModal({ open, onClose, role, onSubmit }) {
  const roleDepartmentCode = backendDepartmentForRole(role.department)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [availableFrom, setAvailableFrom] = useState('22:00')
  const [sectionId, setSectionId] = useState('')
  const [department, setDepartment] = useState('TRACK')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('2')
  const [durationMin, setDurationMin] = useState(60)
  const [allowedWindowMin, setAllowedWindowMin] = useState(240)
  const [crewSize, setCrewSize] = useState(4)
  const [assetId, setAssetId] = useState('')
  const [isNight, setIsNight] = useState(true)
  const [sections, setSections] = useState([])
  const [stations, setStations] = useState([])
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [sectionsError, setSectionsError] = useState('')
  const [stationsError, setStationsError] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let isCurrent = true
    setIsLoadingSections(true)
    setSectionsError('')
    setStationsError('')
    setValidationError('')

    api.getSections()
      .then((data) => {
        if (!isCurrent) return
        const liveSections = Array.isArray(data) ? data : []
        setSections(liveSections)
        setSectionId((currentId) => liveSections.some((section) => section.id === currentId) ? currentId : (liveSections[0]?.id || ''))
      })
      .catch(() => {
        if (!isCurrent) return
        setSections([])
        setSectionId('')
        setSectionsError('Unable to load live railway sections. Please try again before submitting a request.')
      })
      .finally(() => { if (isCurrent) setIsLoadingSections(false) })

    api.getStations()
      .then((data) => { if (isCurrent) setStations(Array.isArray(data) ? data : []) })
      .catch(() => { if (isCurrent) setStationsError('Station names could not be loaded; station IDs are shown instead.') })

    return () => { isCurrent = false }
  }, [open])

  const stationNameMap = useMemo(() => buildStationNameMap(stations), [stations])
  const sectionsById = useMemo(() => buildSectionMap(sections), [sections])
  const sectionOptions = useMemo(() => sections.map((section) => ({
    value: section.id,
    label: `${section.id} — ${sectionRouteLabel(section.id, sectionsById, stationNameMap)}`,
  })), [sections, sectionsById, stationNameMap])
  const selectedSection = sectionsById[sectionId]
  const isSelectedSectionElectrified = selectedSection?.electrified === true || Number(selectedSection?.electrified) === 1

  function minutesFromMidnight(timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  function handleSubmit(e) {
    e.preventDefault()
    setValidationError('')
    if (!roleDepartmentCode) return
    if (!selectedSection) {
      setValidationError('Select a live railway section before submitting this request.')
      return
    }
    if (department === 'OHE' && !isSelectedSectionElectrified) {
      setValidationError('OHE maintenance requests can only be submitted for electrified sections.')
      return
    }
    const windowStartMin = minutesFromMidnight(availableFrom)
    const request = {
      id: generateMaintenanceRequestId(department),
      department,
      section_id: sectionId,
      asset_id: assetId || null,
      asset_type: null,
      window_start_min: windowStartMin,
      window_end_min: windowStartMin + Number(allowedWindowMin),
      base_duration_min: Number(durationMin),
      predicted_duration_min: null,
      crew_size: Number(crewSize),
      priority: Number(priority),
      is_night: isNight,
    }
    onSubmit(request, { date, description, submittedByRole: role.label })
  }

  const updateSection = (value) => {
    setSectionId(value)
    setValidationError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="New Maintenance Request" width="max-w-2xl">
      {!roleDepartmentCode ? (
        <div className="text-sm text-ink-secondary">
          Your current role (<span className="text-ink-primary">{role.label}</span>) isn't tied to a single maintenance department. Switch to Engineering, S&T, or Traction/TD Planner to submit a request.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Maintenance category</p>
              <select value={department} onChange={(e) => { setDepartment(e.target.value); setValidationError('') }} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail">
                <option value="TRACK">TRACK</option><option value="OHE">OHE</option><option value="SIGNAL">SIGNAL</option>
              </select>
              <Tag>{formatDepartment(department)}</Tag>
              <p className="text-xs text-ink-faint mt-1">Sent to the backend as <code className="font-mono">department: "{department}"</code></p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-1.5">Priority</p>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail"><option value="1">High / Critical (priority 1)</option><option value="2">Normal / Routine (priority 2)</option></select>
            </div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Date</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /></div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Available from (earliest start)</p><input type="time" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /></div>
            <div className="col-span-2">
              <p className="text-xs text-ink-secondary mb-1.5">Route / Section</p>
              <select value={sectionId} onChange={(e) => updateSection(e.target.value)} disabled={isLoadingSections || Boolean(sectionsError) || sectionOptions.length === 0} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail">
                {isLoadingSections && <option value="">Loading live sections…</option>}
                {!isLoadingSections && sectionOptions.length === 0 && <option value="">No live sections available</option>}
                {sectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {sectionsError ? <p className="text-xs text-critical mt-1">{sectionsError}</p> : <p className="text-xs text-ink-faint mt-1">Live railway sections from the backend.</p>}
              {stationsError && <p className="text-xs text-ink-faint mt-1">{stationsError}</p>}
              {department === 'OHE' && selectedSection && !isSelectedSectionElectrified && <p className="text-xs text-critical mt-1">OHE maintenance requests require an electrified section.</p>}
              {validationError && <p className="text-xs text-critical mt-1">{validationError}</p>}
            </div>
            <div className="col-span-2"><p className="text-xs text-ink-secondary mb-1.5">Description</p><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="e.g. Rail fracture near Km marker, right rail" className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail resize-none" /><p className="text-xs text-ink-faint mt-1">Kept for your own reference only — the backend's MaintenanceRequest has no description field.</p></div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Estimated duration (minutes)</p><input type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /><p className="text-xs text-ink-faint mt-1">base_duration_min — no ML duration prediction exists yet, so this is your own estimate.</p></div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Allowed window length (minutes)</p><input type="number" min={durationMin} value={allowedWindowMin} onChange={(e) => setAllowedWindowMin(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /><p className="text-xs text-ink-faint mt-1">How late the optimizer may push the start time.</p></div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Crew size</p><input type="number" min={1} value={crewSize} onChange={(e) => setCrewSize(e.target.value)} className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /></div>
            <div><p className="text-xs text-ink-secondary mb-1.5">Asset ID (optional)</p><input type="text" value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="e.g. TRK-014" className="w-full bg-surface-2 border border-surface-3 rounded px-2.5 py-1.5 text-sm text-ink-primary outline-none focus:border-rail" /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={isNight} onChange={(e) => setIsNight(e.target.checked)} className="accent-rail" />Night-time work (is_night)</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-surface-3 pt-3.5">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">Cancel</Button>
            <Button variant="ai" size="sm" type="submit" disabled={isLoadingSections || Boolean(sectionsError) || !selectedSection}>Submit for optimization</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
