// ---------------------------------------------------------------------------
// Mock responses shaped EXACTLY like the real backend's actual responses —
// used only when USE_MOCK is true in services/api.js (e.g. this sandbox has
// no network access to a live FastAPI server). Field names match models.py
// verbatim. Swapping USE_MOCK to false and pointing VITE_API_URL at a real
// backend requires no changes to any component.
//
// Built from the real seed.sql: M001 (TRACK), M002 (OHE), M003 (SIGNAL) are
// all on SEC001 with overlapping windows (90-180, 100-190, 105-200) — the
// backend's own native example of three departments that can share one
// block instead of three.
// ---------------------------------------------------------------------------

export const mockPlan = {
  plan_id: 'PLAN_001',
  plan_name: 'SEC001 Night Block Plan',
  objective_type: 'BALANCED',
  baseline_blocks_count: 3,
  total_blocks_count: 1,
  blocks_saved: 2,
  total_wait_time_min: 15,
  total_train_delay_min: 5,
  created_at: '2026-09-04T22:10:00',
}

export const mockBlocks = [
  {
    block_id: 'PLAN_001_B001',
    plan_id: 'PLAN_001',
    section_id: 'SEC001',
    block_start_min: 90,
    block_end_min: 200,
  },
]

export const mockScheduledTasks = [
  {
    id: 1,
    request_id: 'M001',
    block_id: 'PLAN_001_B001',
    scheduled_start_min: 90,
    scheduled_end_min: 135,
    duration_min: 45,
    start_deviation_min: 0,
  },
  {
    id: 2,
    request_id: 'M002',
    block_id: 'PLAN_001_B001',
    scheduled_start_min: 135,
    scheduled_end_min: 165,
    duration_min: 30,
    start_deviation_min: 35,
  },
  {
    id: 3,
    request_id: 'M003',
    block_id: 'PLAN_001_B001',
    scheduled_start_min: 165,
    scheduled_end_min: 190,
    duration_min: 25,
    start_deviation_min: 60,
  },
]

export const mockExplanations = [
  {
    id: 1,
    plan_id: 'PLAN_001',
    explanation_text:
      'TRACK, OHE and SIGNAL maintenance requests on SEC001 were bundled into a single block because their preferred windows overlap and their work does not physically conflict.',
  },
  {
    id: 2,
    plan_id: 'PLAN_001',
    explanation_text:
      'Bundling reduced total blocks on SEC001 from 3 separate closures to 1, saving 2 block windows and the duplicate occupancy time that would come with them.',
  },
  {
    id: 3,
    plan_id: 'PLAN_001',
    explanation_text:
      'The block was scheduled to start at minute 90, after Rajdhani Express (T001) clears SEC001 at minute 90, minimizing added train delay.',
  },
]

export function buildMockOptimizationResult() {
  return {
    plan: { ...mockPlan },
    blocks: mockBlocks.map((b) => ({ ...b })),
    scheduled_tasks: mockScheduledTasks.map((t) => ({ ...t })),
    explanations: mockExplanations.map((e) => ({ ...e })),
  }
}

// A second, older plan purely so GET /plans has more than one row to list.
export const mockPlanSummaries = [
  mockPlan,
  {
    plan_id: 'PLAN_000',
    plan_name: 'SEC003 Weekend Block Plan',
    objective_type: 'MIN_DELAY',
    baseline_blocks_count: 2,
    total_blocks_count: 2,
    blocks_saved: 0,
    total_wait_time_min: 20,
    total_train_delay_min: 12,
    created_at: '2026-08-30T21:00:00',
  },
]
