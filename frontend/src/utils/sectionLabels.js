// Builds human-readable "Station A → Station B" labels for a section_id.
// This is presentation-only — it never changes what's sent to or received
// from the backend, and the raw section_id is always shown alongside it.
//
// Provenance matters here: if the section came from a payload the user
// actually submitted (POST /optimize with a custom body), the label is
// accurate to that call. If the plan came from /optimize/database, the
// frontend has no endpoint to fetch the backend's actual `sections` table
// (none exists), so any label shown is explicitly marked "(reference)" —
// built from the same seed.sql the DB was likely seeded with, not a
// guarantee of the database's current contents.

export function buildStationNameMap(stations) {
  return Object.fromEntries((stations || []).map((s) => [s.id, s.name]))
}

export function buildSectionMap(sections) {
  return Object.fromEntries((sections || []).map((s) => [s.id, s]))
}

export function sectionRouteLabel(sectionId, sectionsById, stationNameMap) {
  const section = sectionsById?.[sectionId]
  if (!section) return null
  const from = stationNameMap[section.source_station_id] || section.source_station_id
  const to = stationNameMap[section.target_station_id] || section.target_station_id
  return `${from} → ${to}`
}
