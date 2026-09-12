// Synthetic / demo data only — modeled on the shape of real railway systems
// (TMS, SMMS, TDMS, COA, Timetable, Freight Forecast) for the SIH prototype.
// No real railway operational data is used or implied.

import { CORRIDORS } from '../utils/constants'

// ---------------------------------------------------------------------------
// Data source connection status (feeds the Dashboard strip + Data Processing page)
// ---------------------------------------------------------------------------
export const dataSources = [
  {
    key: 'TMS',
    label: 'TMS',
    fullName: 'Track Management System',
    owner: 'Engineering',
    status: 'online',
    lastSyncMinutesAgo: 4,
    recordsToday: 1284,
    warningCount: 2,
  },
  {
    key: 'SMMS',
    label: 'SMMS',
    fullName: 'Signal Maintenance Mgmt. System',
    owner: 'S&T',
    status: 'online',
    lastSyncMinutesAgo: 6,
    recordsToday: 842,
    warningCount: 0,
  },
  {
    key: 'TDMS',
    label: 'TDMS',
    fullName: 'Traction Distribution Mgmt. System',
    owner: 'Traction Distribution',
    status: 'warning',
    lastSyncMinutesAgo: 47,
    recordsToday: 316,
    warningCount: 5,
  },
  {
    key: 'COA',
    label: 'COA',
    fullName: 'Corridor / Occupancy Availability',
    owner: 'Operations',
    status: 'online',
    lastSyncMinutesAgo: 2,
    recordsToday: 96,
    warningCount: 0,
  },
  {
    key: 'TIMETABLE',
    label: 'Timetable',
    fullName: 'Train Timetable',
    owner: 'Operations',
    status: 'online',
    lastSyncMinutesAgo: 12,
    recordsToday: 214,
    warningCount: 1,
  },
  {
    key: 'FREIGHT',
    label: 'Freight Forecast',
    fullName: 'Freight Forecast Feed',
    owner: 'Operations',
    status: 'offline',
    lastSyncMinutesAgo: 191,
    recordsToday: 0,
    warningCount: 3,
  },
]

// ---------------------------------------------------------------------------
// Maintenance tasks (unified view after cross-department normalization)
// ---------------------------------------------------------------------------
export const maintenanceTasks = [
  {
    id: 'ENG-4471',
    department: 'Engineering',
    asset: 'Rail Panel — Km 1284/6',
    location: 'Km 1284/6',
    corridor: CORRIDORS[0],
    defect: 'Rail fracture, right rail',
    severity: 'Critical',
    criticality: 96,
    dueDate: '2026-09-05',
    predictedDurationMins: 180,
    status: 'Overdue',
    source: 'TMS',
  },
  {
    id: 'SNT-2290',
    department: 'S&T',
    asset: 'Point Machine 14B',
    location: 'GZB Yard, PT 14B',
    corridor: CORRIDORS[0],
    defect: 'Erratic point detection',
    severity: 'High',
    criticality: 88,
    dueDate: '2026-09-06',
    predictedDurationMins: 120,
    status: 'Scheduled',
    source: 'SMMS',
  },
  {
    id: 'TRD-1187',
    department: 'Traction Distribution',
    asset: 'OHE Mast 220',
    location: 'Km 1291/2',
    corridor: CORRIDORS[0],
    defect: 'Contact wire wear beyond limit',
    severity: 'High',
    criticality: 82,
    dueDate: '2026-09-07',
    predictedDurationMins: 150,
    status: 'Pending',
    source: 'TDMS',
  },
  {
    id: 'ENG-4472',
    department: 'Engineering',
    asset: 'Ballast Section 88',
    location: 'Km 1301/4',
    corridor: CORRIDORS[1],
    defect: 'Ballast fouling, drainage blocked',
    severity: 'Medium',
    criticality: 61,
    dueDate: '2026-09-09',
    predictedDurationMins: 240,
    status: 'Pending',
    source: 'TMS',
  },
  {
    id: 'SNT-2291',
    department: 'S&T',
    asset: 'Axle Counter AC-09',
    location: 'CNB Outer',
    corridor: CORRIDORS[2],
    defect: 'False occupancy reported',
    severity: 'Critical',
    criticality: 93,
    dueDate: '2026-09-05',
    predictedDurationMins: 90,
    status: 'In Block',
    source: 'SMMS',
  },
  {
    id: 'TRD-1188',
    department: 'Traction Distribution',
    asset: 'Feeder Post FP-6',
    location: 'DDU Loop Km 22/0',
    corridor: CORRIDORS[3],
    defect: 'Insulator flashover marks',
    severity: 'Medium',
    criticality: 58,
    dueDate: '2026-09-10',
    predictedDurationMins: 120,
    status: 'Pending',
    source: 'TDMS',
  },
  {
    id: 'ENG-4473',
    department: 'Engineering',
    asset: 'Bridge No. 112',
    location: 'Km 1340/9',
    corridor: CORRIDORS[4],
    defect: 'Bearing displacement, minor',
    severity: 'Medium',
    criticality: 54,
    dueDate: '2026-09-11',
    predictedDurationMins: 200,
    status: 'Pending',
    source: 'TMS',
  },
  {
    id: 'SNT-2292',
    department: 'S&T',
    asset: 'Signal S-412',
    location: 'MGS Home',
    corridor: CORRIDORS[3],
    defect: 'LED aspect intensity low',
    severity: 'Low',
    criticality: 34,
    dueDate: '2026-09-14',
    predictedDurationMins: 60,
    status: 'Scheduled',
    source: 'SMMS',
  },
  {
    id: 'TRD-1189',
    department: 'Traction Distribution',
    asset: 'OHE Mast 305',
    location: 'ALD–PRG Km 8/2',
    corridor: CORRIDORS[5],
    defect: 'Dropper tension out of range',
    severity: 'High',
    criticality: 79,
    dueDate: '2026-09-07',
    predictedDurationMins: 100,
    status: 'Pending',
    source: 'TDMS',
  },
  {
    id: 'ENG-4474',
    department: 'Engineering',
    asset: 'Rail Panel — Km 1290/1',
    location: 'Km 1290/1',
    corridor: CORRIDORS[0],
    defect: 'Corrugation, moderate',
    severity: 'Low',
    criticality: 29,
    dueDate: '2026-09-16',
    predictedDurationMins: 150,
    status: 'Completed',
    source: 'TMS',
  },
  {
    id: 'SNT-2293',
    department: 'S&T',
    asset: 'Point Machine 07A',
    location: 'BSB Yard, PT 07A',
    corridor: CORRIDORS[4],
    defect: 'Lubrication overdue',
    severity: 'Low',
    criticality: 22,
    dueDate: '2026-09-18',
    predictedDurationMins: 45,
    status: 'Pending',
    source: 'SMMS',
  },
  {
    id: 'TRD-1190',
    department: 'Traction Distribution',
    asset: 'Feeder Post FP-2',
    location: 'CNB–ALD Km 4/6',
    corridor: CORRIDORS[2],
    defect: 'Circuit breaker trip history',
    severity: 'Critical',
    criticality: 91,
    dueDate: '2026-09-05',
    predictedDurationMins: 130,
    status: 'Overdue',
    source: 'TDMS',
  },
]

// ---------------------------------------------------------------------------
// Departmental block requests
// ---------------------------------------------------------------------------
// `taskIds` link each request to real maintenanceTasks entries above.
// `conflictsWith` / `bundleGroup` are precomputed (synthetic) relationships —
// the frontend only displays them, mirroring how a real conflict-detection
// backend stage would flag these. Not real Indian Railways data.
export const blockRequests = [
  // --- Three-department bundling candidate on NDLS–GZB (Up) -----------
  // Same corridor, overlapping night window, three different departments —
  // exactly the set the AI recommended block (BLK-AI-0091) bundles.
  {
    id: 'BR-3301',
    department: 'Engineering',
    corridor: CORRIDORS[0],
    requestedStart: '2026-09-05T23:00:00',
    durationMins: 180,
    taskIds: ['ENG-4471'],
    priority: 'High',
    status: 'Suggested for Bundling',
    bundleGroup: 'BND-01',
    conflictsWith: [],
  },
  {
    id: 'BR-3302',
    department: 'S&T',
    corridor: CORRIDORS[0],
    requestedStart: '2026-09-05T23:30:00',
    durationMins: 120,
    taskIds: ['SNT-2290'],
    priority: 'Critical',
    status: 'Suggested for Bundling',
    bundleGroup: 'BND-01',
    conflictsWith: [],
  },
  {
    id: 'BR-3307',
    department: 'Traction Distribution',
    corridor: CORRIDORS[0],
    requestedStart: '2026-09-05T23:15:00',
    durationMins: 150,
    taskIds: ['TRD-1187'],
    priority: 'High',
    status: 'Suggested for Bundling',
    bundleGroup: 'BND-01',
    conflictsWith: [],
  },

  // --- Genuine two-department conflict on MGS–DDU Loop -----------------
  // Same corridor, overlapping window, unresolved — no bundling suggestion,
  // just a scheduling clash that needs a controller decision.
  {
    id: 'BR-3305',
    department: 'S&T',
    corridor: CORRIDORS[3],
    requestedStart: '2026-09-06T23:00:00',
    durationMins: 60,
    taskIds: ['SNT-2292'],
    priority: 'Low',
    status: 'Conflict',
    bundleGroup: null,
    conflictsWith: ['BR-3312'],
  },
  {
    id: 'BR-3312',
    department: 'Traction Distribution',
    corridor: CORRIDORS[3],
    requestedStart: '2026-09-06T23:15:00',
    durationMins: 120,
    taskIds: ['TRD-1188'],
    priority: 'Medium',
    status: 'Conflict',
    bundleGroup: null,
    conflictsWith: ['BR-3305'],
  },

  // --- Standalone requests at various stages ---------------------------
  {
    id: 'BR-3303',
    department: 'Traction Distribution',
    corridor: CORRIDORS[2],
    requestedStart: '2026-09-06T01:00:00',
    durationMins: 130,
    taskIds: ['TRD-1190'],
    priority: 'Critical',
    status: 'Pending Review',
    bundleGroup: null,
    conflictsWith: [],
  },
  {
    id: 'BR-3304',
    department: 'Engineering',
    corridor: CORRIDORS[4],
    requestedStart: '2026-09-06T22:00:00',
    durationMins: 200,
    taskIds: ['ENG-4473'],
    priority: 'Medium',
    status: 'Approved',
    bundleGroup: null,
    conflictsWith: [],
  },
  {
    id: 'BR-3306',
    department: 'Traction Distribution',
    corridor: CORRIDORS[5],
    requestedStart: '2026-09-07T00:30:00',
    durationMins: 100,
    taskIds: ['TRD-1189'],
    priority: 'High',
    status: 'Pending Review',
    bundleGroup: null,
    conflictsWith: [],
  },
  {
    id: 'BR-3313',
    department: 'S&T',
    corridor: CORRIDORS[4],
    requestedStart: '2026-08-30T21:00:00',
    durationMins: 45,
    taskIds: ['SNT-2293'],
    priority: 'Low',
    status: 'Rejected',
    bundleGroup: null,
    conflictsWith: [],
  },
  {
    id: 'BR-3314',
    department: 'Engineering',
    corridor: CORRIDORS[1],
    requestedStart: '2026-09-08T22:00:00',
    durationMins: 240,
    taskIds: ['ENG-4472'],
    priority: 'Medium',
    status: 'Pending Review',
    bundleGroup: null,
    conflictsWith: [],
  },
]

// ---------------------------------------------------------------------------
// AI recommended block — headline recommendation shown on the Dashboard
// and expanded on the Block Planner page
// ---------------------------------------------------------------------------
export const aiRecommendedBlock = {
  id: 'BLK-AI-0091',
  corridor: CORRIDORS[0],
  windowStart: '2026-09-05T23:15:00',
  durationMins: 150,
  confidence: 91,
  bundledTasks: ['ENG-4471', 'SNT-2290', 'TRD-1187'],
  departments: ['Engineering', 'S&T', 'Traction Distribution'],
  trainImpact: {
    affectedTrains: 2,
    avgDelayMins: 8,
    cancelled: 0,
  },
  assetAvailabilityImpactPct: 6,
  reasoning: [
    'Bundles the highest-criticality Engineering, S&T and Traction defects on the same corridor segment into one occupancy window.',
    'Overlaps BR-3301 and BR-3302, which were requesting conflicting slots 30 minutes apart on the same line.',
    'Falls inside the nightly low-traffic window, limiting impact to 2 freight services with an average 8-minute hold.',
    'Clears two Critical and one High severity defect before their next inspection cycle.',
  ],
}

// ---------------------------------------------------------------------------
// Alerts feed
// ---------------------------------------------------------------------------
export const alerts = [
  {
    id: 'ALT-901',
    type: 'Critical defect',
    severity: 'Critical',
    message: 'Rail fracture at Km 1284/6 has exceeded its due date by 1 day.',
    relatedId: 'ENG-4471',
    department: 'Engineering',
    timestamp: '2026-09-04T06:12:00',
  },
  {
    id: 'ALT-902',
    type: 'Block conflict',
    severity: 'High',
    message: 'BR-3301 and BR-3302 request overlapping windows on NDLS–GZB (Up).',
    relatedId: 'BR-3301',
    department: 'Engineering',
    timestamp: '2026-09-04T05:40:00',
  },
  {
    id: 'ALT-903',
    type: 'Data-source failure',
    severity: 'Medium',
    message: 'Freight Forecast feed has not synced in over 3 hours.',
    relatedId: 'FREIGHT',
    department: null,
    timestamp: '2026-09-04T02:55:00',
  },
  {
    id: 'ALT-904',
    type: 'Overdue maintenance',
    severity: 'Critical',
    message: 'FP-2 circuit breaker task TRD-1190 is overdue.',
    relatedId: 'TRD-1190',
    department: 'Traction Distribution',
    timestamp: '2026-09-03T22:10:00',
  },
  {
    id: 'ALT-905',
    type: 'Forecast update',
    severity: 'Low',
    message: 'Freight forecast for CNB–ALD Main revised, +1 additional service tonight.',
    relatedId: 'CNB-ALD',
    department: null,
    timestamp: '2026-09-03T19:30:00',
  },
]

// ---------------------------------------------------------------------------
// Trains — used by the Train Timeline (Gantt) page
// ---------------------------------------------------------------------------
export const trains = [
  { id: 'T-12301', type: 'passenger', name: 'Rajdhani Express', corridor: CORRIDORS[0], start: '2026-09-05T22:40:00', end: '2026-09-05T23:05:00' },
  { id: 'T-12302', type: 'passenger', name: 'Shatabdi Express', corridor: CORRIDORS[0], start: '2026-09-06T00:10:00', end: '2026-09-06T00:35:00' },
  { id: 'T-FR-441', type: 'freight', name: 'Freight FR-441', corridor: CORRIDORS[0], start: '2026-09-05T23:50:00', end: '2026-09-06T00:40:00' },
  { id: 'T-FR-442', type: 'freight', name: 'Freight FR-442', corridor: CORRIDORS[2], start: '2026-09-06T01:15:00', end: '2026-09-06T02:00:00' },
  { id: 'T-12909', type: 'passenger', name: 'Garib Rath', corridor: CORRIDORS[3], start: '2026-09-06T21:50:00', end: '2026-09-06T22:15:00' },
]

// ---------------------------------------------------------------------------
// Plans — Today / Weekly / Monthly / Archived
// ---------------------------------------------------------------------------
export const plans = [
  {
    id: 'PLN-2026-09-05',
    date: '2026-09-05',
    horizon: 'Today',
    blockCount: 4,
    tasksScheduled: 9,
    departments: ['Engineering', 'S&T', 'Traction Distribution'],
    status: 'Pending Approval',
  },
  {
    id: 'PLN-2026-W36',
    date: '2026-09-01',
    horizon: 'Weekly',
    blockCount: 19,
    tasksScheduled: 41,
    departments: ['Engineering', 'S&T', 'Traction Distribution'],
    status: 'Approved',
  },
  {
    id: 'PLN-2026-09',
    date: '2026-09-01',
    horizon: 'Monthly',
    blockCount: 76,
    tasksScheduled: 168,
    departments: ['Engineering', 'S&T', 'Traction Distribution'],
    status: 'Draft',
  },
  {
    id: 'PLN-2026-08-29',
    date: '2026-08-29',
    horizon: 'Today',
    blockCount: 5,
    tasksScheduled: 11,
    departments: ['Engineering', 'S&T'],
    status: 'Archived',
  },
]

// ---------------------------------------------------------------------------
// Dashboard-level KPI summary (would be a dedicated endpoint later)
// ---------------------------------------------------------------------------
export const dashboardSummary = {
  assetAvailabilityPct: 87,
  criticalTasks: maintenanceTasks.filter((t) => t.severity === 'Critical').length,
  overdueTasks: maintenanceTasks.filter((t) => t.status === 'Overdue').length,
  blockUtilizationPct: 64,
  trainConflicts: blockRequests.filter((b) => b.status === 'Conflict').length,
}

// ---------------------------------------------------------------------------
// Analytics trend series
// ---------------------------------------------------------------------------
export const analyticsTrends = {
  assetAvailability: [
    { date: 'Aug 29', value: 82 },
    { date: 'Aug 30', value: 83 },
    { date: 'Aug 31', value: 81 },
    { date: 'Sep 01', value: 85 },
    { date: 'Sep 02', value: 86 },
    { date: 'Sep 03', value: 85 },
    { date: 'Sep 04', value: 87 },
  ],
  blockUtilization: [
    { date: 'Aug 29', value: 58 },
    { date: 'Aug 30', value: 61 },
    { date: 'Aug 31', value: 55 },
    { date: 'Sep 01', value: 63 },
    { date: 'Sep 02', value: 65 },
    { date: 'Sep 03', value: 62 },
    { date: 'Sep 04', value: 64 },
  ],
  departmentWorkload: [
    { department: 'Engineering', tasks: 5 },
    { department: 'S&T', tasks: 4 },
    { department: 'Traction Distribution', tasks: 3 },
  ],
}

// ---------------------------------------------------------------------------
// Data Processing — pipeline stage detail
// ---------------------------------------------------------------------------
// Six-stage pipeline that turns raw feeds from TMS/SMMS/TDMS/COA/Timetable/
// Freight into one unified, conflict-checked dataset. Each stage records how
// many rows it saw, how long it took, its outcome status, and when it last
// completed successfully — this is what the Data Processing page renders.
export const pipelineStages = [
  {
    key: 'ingestion',
    label: 'Ingestion',
    description: 'Pulls raw records from all six source systems.',
    status: 'completed',
    recordsIn: 2802,
    recordsOut: 2802,
    processingTimeSec: 18,
    lastSuccessAt: '2026-09-04T06:20:00',
  },
  {
    key: 'validation',
    label: 'Validation',
    description: 'Checks required fields, types, and value ranges.',
    status: 'completed',
    recordsIn: 2802,
    recordsOut: 2765,
    processingTimeSec: 11,
    lastSuccessAt: '2026-09-04T06:20:18',
  },
  {
    key: 'normalization',
    label: 'Normalization',
    description: 'Maps department-specific codes to a common schema.',
    status: 'completed',
    recordsIn: 2765,
    recordsOut: 2765,
    processingTimeSec: 9,
    lastSuccessAt: '2026-09-04T06:20:29',
  },
  {
    key: 'deduplication',
    label: 'Deduplication',
    description: 'Collapses repeat reports of the same asset/defect.',
    status: 'warning',
    recordsIn: 2765,
    recordsOut: 2727,
    processingTimeSec: 14,
    lastSuccessAt: '2026-09-04T06:20:43',
  },
  {
    key: 'conflict_detection',
    label: 'Conflict Detection',
    description: 'Flags overlapping block requests across departments.',
    status: 'warning',
    recordsIn: 2727,
    recordsOut: 2727,
    processingTimeSec: 7,
    lastSuccessAt: '2026-09-04T06:20:57',
  },
  {
    key: 'unified_dataset',
    label: 'Unified Dataset',
    description: 'Publishes the merged dataset for planning and analytics.',
    status: 'completed',
    recordsIn: 2727,
    recordsOut: 2727,
    processingTimeSec: 3,
    lastSuccessAt: '2026-09-04T06:21:04',
  },
]

export const pipelineRunMeta = {
  lastRunAt: '2026-09-04T06:21:04',
  lastRunDurationSec: 62,
  overallDataQualityScore: 91,
  runFrequency: 'Every 15 minutes',
}

// ---------------------------------------------------------------------------
// Data quality issues with realistic synthetic examples for the
// "View Issues" side panel.
// ---------------------------------------------------------------------------
export const dataQualityIssues = {
  duplicates: {
    label: 'Duplicate records',
    count: 38,
    description: 'The same defect reported more than once, usually by two shifts on the same asset.',
    examples: [
      { id: 'ENG-4471-D1', source: 'TMS', detail: 'Rail fracture at Km 1284/6 logged twice, 40 minutes apart.' },
      { id: 'SNT-2290-D1', source: 'SMMS', detail: 'Point Machine 14B fault submitted by both shift and depot inspector.' },
      { id: 'TRD-1187-D1', source: 'TDMS', detail: 'OHE Mast 220 wear reading duplicated across two patrol logs.' },
    ],
  },
  missingFields: {
    label: 'Missing fields',
    count: 21,
    description: 'Records that arrived without a required field, most often predicted duration or asset ID.',
    examples: [
      { id: 'TRD-1188', source: 'TDMS', detail: 'Feeder Post FP-6 record missing predicted maintenance duration.' },
      { id: 'ENG-4473', source: 'TMS', detail: 'Bridge No. 112 record missing severity classification.' },
      { id: 'SNT-2292', source: 'SMMS', detail: 'Signal S-412 record missing corridor assignment.' },
    ],
  },
  invalidDates: {
    label: 'Invalid dates',
    count: 6,
    description: 'Due dates or timestamps outside an expected range, usually a data-entry error.',
    examples: [
      { id: 'ENG-4474', source: 'TMS', detail: 'Due date recorded as 2019-09-16 — likely a typo for 2026.' },
      { id: 'SNT-2293', source: 'SMMS', detail: 'Inspection timestamp recorded ahead of the report submission time.' },
    ],
  },
  unknownAssets: {
    label: 'Unknown assets',
    count: 9,
    description: 'Asset IDs referenced in a task that do not match the asset register.',
    examples: [
      { id: 'TRD-1190-U1', source: 'TDMS', detail: 'Feeder Post "FP-2A" not found in the traction asset register.' },
      { id: 'ENG-4472-U1', source: 'TMS', detail: 'Ballast section "88B" not found in the current track layout.' },
    ],
  },
  conflictingRequests: {
    label: 'Conflicting requests',
    count: 2,
    description: 'Block requests from different departments overlapping on the same corridor and time window.',
    examples: [
      { id: 'BR-3301', source: 'COA', detail: 'Engineering block request overlaps BR-3302 on NDLS–GZB (Up), 30-minute overlap.' },
      { id: 'BR-3302', source: 'COA', detail: 'S&T block request overlaps BR-3301 on NDLS–GZB (Up), same window.' },
    ],
  },
}

// ---------------------------------------------------------------------------
// Unified dataset summary — the output of the pipeline
// ---------------------------------------------------------------------------
export const unifiedDatasetSummary = {
  totalRecords: 2727,
  totalTasks: maintenanceTasks.length,
  totalBlockRequests: blockRequests.length,
  corridorsCovered: CORRIDORS.length,
  departmentsCovered: 3,
  lastPublishedAt: '2026-09-04T06:21:04',
  readyForPlanning: true,
}

// ---------------------------------------------------------------------------
// Cross-department bundling opportunities
// ---------------------------------------------------------------------------
// Synthetic output of the (backend) conflict-detection / bundling stage —
// the frontend only displays these, it does not compute them. Each entry
// groups tasks from different departments that share a corridor and a
// tight due-date window, making them candidates for a single shared block.
export const bundlingOpportunities = [
  {
    id: 'BND-01',
    corridor: CORRIDORS[0],
    taskIds: ['ENG-4471', 'SNT-2290', 'TRD-1187'],
    departments: ['Engineering', 'S&T', 'Traction Distribution'],
    windowNote: 'Due within the same 48-hour window',
    rationale:
      'All three defects sit on the same corridor segment and fall due within 48 hours — a strong candidate for one shared occupancy block instead of three separate ones.',
  },
  {
    id: 'BND-02',
    corridor: CORRIDORS[2],
    taskIds: ['SNT-2291', 'TRD-1190'],
    departments: ['S&T', 'Traction Distribution'],
    windowNote: 'Both due 05 Sep, both Critical',
    rationale:
      'Both tasks are Critical severity, due the same day, and on the same corridor — bundling avoids two separate night blocks for the same section.',
  },
]

// ---------------------------------------------------------------------------
// AI Block Planner — generated plan blocks
// ---------------------------------------------------------------------------
// Synthetic output of the (future) backend optimization service. The
// frontend only renders this shape — no scoring, bundling, or optimization
// happens in the browser. `comparison` figures are plain arithmetic over
// the block requests being bundled (sum of their durations vs. the
// coordinated block's actual duration), precomputed here rather than in
// a component.
export const generatedPlanBlocks = [
  {
    id: 'BLK-AI-0091',
    featured: true,
    corridor: CORRIDORS[0],
    windowStart: '2026-09-05T23:15:00',
    durationMins: 150,
    departments: ['Engineering', 'S&T', 'Traction Distribution'],
    taskIds: ['ENG-4471', 'SNT-2290', 'TRD-1187'],
    sourceRequestIds: ['BR-3301', 'BR-3302', 'BR-3307'],
    criticalityScore: 89,
    aiScore: 91,
    trainImpact: { affectedTrains: 2, avgDelayMins: 8, conflictLevel: 'low' },
    reasoning: [
      'Same corridor: all three defects sit on the same NDLS–GZB (Up) segment, so one occupancy covers all of them.',
      'Compatible time window: the three separately requested windows (23:00–02:00, 23:30–01:30, 23:15–01:45) overlap almost completely.',
      'Multiple departments can safely work in parallel during a single block, since the work sites do not physically interfere.',
      'Reduces duplicate block occupation: three requests for the same corridor become one shared closure instead of three back-to-back or overlapping ones.',
      'Clears two Critical and one High severity defect before their next inspection cycle.',
    ],
    comparison: {
      separate: { blockCount: 3, totalOccupationMins: 450, controllerApprovalsNeeded: 3 },
      coordinated: { blockCount: 1, totalOccupationMins: 150, controllerApprovalsNeeded: 1 },
    },
  },
  {
    id: 'BLK-AI-0092',
    featured: false,
    corridor: CORRIDORS[5],
    windowStart: '2026-09-07T00:15:00',
    durationMins: 100,
    departments: ['Traction Distribution'],
    taskIds: ['TRD-1189'],
    sourceRequestIds: ['BR-3306'],
    criticalityScore: 79,
    aiScore: 84,
    trainImpact: { affectedTrains: 1, avgDelayMins: 4, conflictLevel: 'none' },
    reasoning: [
      'Only Traction Distribution has open work on this corridor tonight, so there is nothing to bundle it with.',
      'Block sized to match the task\u2019s own predicted duration, with no other requests to reconcile.',
    ],
    comparison: null,
  },
  {
    id: 'BLK-AI-0093',
    featured: false,
    corridor: CORRIDORS[4],
    windowStart: '2026-09-06T22:00:00',
    durationMins: 200,
    departments: ['Engineering'],
    taskIds: ['ENG-4473'],
    sourceRequestIds: ['BR-3304'],
    criticalityScore: 54,
    aiScore: 77,
    trainImpact: { affectedTrains: 0, avgDelayMins: 0, conflictLevel: 'none' },
    reasoning: [
      'Matches an already-approved block request (BR-3304) — no competing requests found on this corridor for the window.',
    ],
    comparison: null,
  },
]
