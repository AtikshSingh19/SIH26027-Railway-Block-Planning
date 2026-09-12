// Mirrors seed.sql exactly — same IDs, same field names as models.py.
// This is the default request body offered on the Optimization page for
// the POST /optimize (custom payload) path. It is NOT invented data: every
// field name here matches TrainSchedule / MaintenanceRequest / Section /
// Disruption in the real backend's models.py.

export const sampleTrains = [
  { train_id: 'T001', train_name: 'Rajdhani Express', priority: 1, section_id: 'SEC001', entry_time_min: 60, exit_time_min: 90, delay_minutes: 0, status: 'ON_TIME' },
  { train_id: 'T002', train_name: 'Shatabdi Express', priority: 1, section_id: 'SEC001', entry_time_min: 110, exit_time_min: 140, delay_minutes: 0, status: 'ON_TIME' },
  { train_id: 'T003', train_name: 'Passenger 1201', priority: 2, section_id: 'SEC001', entry_time_min: 155, exit_time_min: 195, delay_minutes: 5, status: 'DELAYED' },
  { train_id: 'T004', train_name: 'Intercity Express', priority: 1, section_id: 'SEC002', entry_time_min: 90, exit_time_min: 145, delay_minutes: 0, status: 'ON_TIME' },
  { train_id: 'T005', train_name: 'Passenger 2204', priority: 2, section_id: 'SEC002', entry_time_min: 160, exit_time_min: 220, delay_minutes: 0, status: 'ON_TIME' },
  { train_id: 'T006', train_name: 'Superfast Express', priority: 1, section_id: 'SEC003', entry_time_min: 120, exit_time_min: 170, delay_minutes: 0, status: 'ON_TIME' },
  { train_id: 'T007', train_name: 'Goods Express', priority: 2, section_id: 'SEC003', entry_time_min: 190, exit_time_min: 250, delay_minutes: 10, status: 'DELAYED' },
]

export const sampleMaintenanceRequests = [
  { id: 'M001', department: 'TRACK', section_id: 'SEC001', asset_id: 'TRK-001', asset_type: 'TRACK', window_start_min: 90, window_end_min: 180, base_duration_min: 45, predicted_duration_min: null, crew_size: 8, priority: 1, is_night: false },
  { id: 'M002', department: 'OHE', section_id: 'SEC001', asset_id: 'OHE-001', asset_type: 'OHE', window_start_min: 100, window_end_min: 190, base_duration_min: 30, predicted_duration_min: null, crew_size: 5, priority: 2, is_night: false },
  { id: 'M003', department: 'SIGNAL', section_id: 'SEC001', asset_id: 'SIG-001', asset_type: 'SIGNAL', window_start_min: 105, window_end_min: 200, base_duration_min: 25, predicted_duration_min: null, crew_size: 4, priority: 2, is_night: false },
  { id: 'M004', department: 'TRACK', section_id: 'SEC002', asset_id: 'TRK-002', asset_type: 'TRACK', window_start_min: 130, window_end_min: 230, base_duration_min: 50, predicted_duration_min: null, crew_size: 7, priority: 1, is_night: false },
  { id: 'M005', department: 'OHE', section_id: 'SEC002', asset_id: 'OHE-002', asset_type: 'OHE', window_start_min: 140, window_end_min: 240, base_duration_min: 35, predicted_duration_min: null, crew_size: 5, priority: 2, is_night: false },
  { id: 'M006', department: 'SIGNAL', section_id: 'SEC003', asset_id: 'SIG-003', asset_type: 'SIGNAL', window_start_min: 160, window_end_min: 260, base_duration_min: 30, predicted_duration_min: null, crew_size: 4, priority: 2, is_night: false },
  { id: 'M007', department: 'TRACK', section_id: 'SEC003', asset_id: 'TRK-003', asset_type: 'TRACK', window_start_min: 170, window_end_min: 280, base_duration_min: 60, predicted_duration_min: null, crew_size: 8, priority: 1, is_night: true },
]

export const sampleSections = [
  { id: 'SEC001', source_station_id: 'ST001', target_station_id: 'ST002', length_km: 25.0, track_type: 'TRIPLE', electrified: true, max_speed: 120 },
  { id: 'SEC002', source_station_id: 'ST002', target_station_id: 'ST003', length_km: 55.0, track_type: 'DOUBLE', electrified: true, max_speed: 110 },
  { id: 'SEC003', source_station_id: 'ST002', target_station_id: 'ST004', length_km: 95.0, track_type: 'DOUBLE', electrified: true, max_speed: 110 },
]

export const sampleDisruptions = [
  { id: 'D001', section_id: 'SEC001', disruption_type: 'TRAIN_DELAY', start_time_min: 110, end_time_min: 150, delay_minutes: 20, severity: 2, description: 'Rajdhani/express movement delayed due to operational issue' },
  { id: 'D002', section_id: 'SEC003', disruption_type: 'SECTION_BLOCKED', start_time_min: 220, end_time_min: 250, delay_minutes: 0, severity: 3, description: 'Temporary section blockage due to emergency inspection' },
]

// Stations are NOT part of OptimizationRequest — models.py only expects
// trains / maintenance_requests / sections / disruptions in that body.
// This is kept separate and used ONLY to build human-readable "A → B"
// labels for a section_id in the UI (see utils/sectionLabels.js). It
// mirrors seed.sql, but is explicitly reference data, not something the
// backend returns alongside a plan or block.
export const sampleStations = [
  { id: 'ST001', name: 'New Delhi' },
  { id: 'ST002', name: 'Ghaziabad' },
  { id: 'ST003', name: 'Meerut' },
  { id: 'ST004', name: 'Aligarh' },
  { id: 'ST005', name: 'Kanpur' },
  { id: 'ST006', name: 'Lucknow' },
  { id: 'ST007', name: 'Agra' },
  { id: 'ST008', name: 'Mathura' },
]

export function buildSampleOptimizationPayload() {
  return {
    trains: sampleTrains,
    maintenance_requests: sampleMaintenanceRequests,
    sections: sampleSections,
    disruptions: sampleDisruptions,
  }
}
