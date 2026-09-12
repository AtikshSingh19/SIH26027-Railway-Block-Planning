PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. STATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(name) >= 1)
);


-- =========================================================
-- 2. RAILWAY SECTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,

    source_station_id TEXT NOT NULL,
    target_station_id TEXT NOT NULL,

    length_km REAL NOT NULL
        CHECK(length_km > 0),

    track_type TEXT NOT NULL DEFAULT 'DOUBLE'
        CHECK(track_type IN ('SINGLE', 'DOUBLE', 'TRIPLE')),

    electrified INTEGER NOT NULL DEFAULT 1
        CHECK(electrified IN (0, 1)),

    max_speed INTEGER NOT NULL DEFAULT 110
        CHECK(max_speed > 0),

    FOREIGN KEY (source_station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (target_station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 3. TRAIN SCHEDULES
-- =========================================================
-- For our prototype, each row represents a train occupying
-- a particular railway section during a time interval.

CREATE TABLE IF NOT EXISTS train_schedules (
    train_id TEXT PRIMARY KEY,

    train_name TEXT NOT NULL
        CHECK(length(train_name) >= 1),

    priority INTEGER NOT NULL
        CHECK(priority IN (1, 2)),

    section_id TEXT NOT NULL,

    entry_time_min INTEGER NOT NULL
        CHECK(entry_time_min >= 0),

    exit_time_min INTEGER NOT NULL
        CHECK(exit_time_min > entry_time_min),

    delay_minutes INTEGER NOT NULL DEFAULT 0
        CHECK(delay_minutes >= 0),

    status TEXT NOT NULL DEFAULT 'ON_TIME'
        CHECK(status IN ('ON_TIME', 'DELAYED', 'CANCELLED')),

    FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 4. MAINTENANCE REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,

    department TEXT NOT NULL
        CHECK(department IN ('TRACK', 'OHE', 'SIGNAL')),

    section_id TEXT NOT NULL,

    asset_id TEXT,
    asset_type TEXT,

    window_start_min INTEGER NOT NULL
        CHECK(window_start_min >= 0),

    window_end_min INTEGER NOT NULL
        CHECK(window_end_min > window_start_min),

    base_duration_min INTEGER NOT NULL
        CHECK(base_duration_min > 0),

    predicted_duration_min INTEGER
        CHECK(
            predicted_duration_min IS NULL
            OR predicted_duration_min > 0
        ),

    crew_size INTEGER NOT NULL DEFAULT 5
        CHECK(crew_size >= 1),

    priority INTEGER NOT NULL DEFAULT 2
        CHECK(priority IN (1, 2)),

    is_night INTEGER NOT NULL DEFAULT 0
        CHECK(is_night IN (0, 1)),

    -- Request approval state
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),

    rejection_reason TEXT,

    -- Planning state
    planning_status TEXT NOT NULL DEFAULT 'UNPLANNED'
        CHECK(planning_status IN ('UNPLANNED', 'PLANNED')),

    -- Plan that eventually contains this request
    plan_id TEXT,

    FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE CASCADE,

    FOREIGN KEY (plan_id)
        REFERENCES block_plans(plan_id)
        ON DELETE SET NULL
);


-- =========================================================
-- 5. DISRUPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS disruptions (
    id TEXT PRIMARY KEY,

    section_id TEXT NOT NULL,

    disruption_type TEXT NOT NULL
        CHECK(
            disruption_type IN (
                'TRAIN_DELAY',
                'SECTION_BLOCKED',
                'EMERGENCY'
            )
        ),

    start_time_min INTEGER NOT NULL
        CHECK(start_time_min >= 0),

    end_time_min INTEGER,

    delay_minutes INTEGER NOT NULL DEFAULT 0
        CHECK(delay_minutes >= 0),

    severity INTEGER NOT NULL DEFAULT 1
        CHECK(severity IN (1, 2, 3)),

    description TEXT,

    FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 6. BLOCK PLANS
-- =========================================================

CREATE TABLE IF NOT EXISTS block_plans (
    plan_id TEXT PRIMARY KEY,

    plan_name TEXT NOT NULL,

    objective_type TEXT NOT NULL
        CHECK(
            objective_type IN (
                'MIN_DELAY',
                'MIN_BLOCKS',
                'BALANCED'
            )
        ),

    baseline_blocks_count INTEGER NOT NULL
        CHECK(baseline_blocks_count >= 0),

    total_blocks_count INTEGER NOT NULL
        CHECK(total_blocks_count >= 0),

    blocks_saved INTEGER NOT NULL
        CHECK(blocks_saved >= 0),

    total_wait_time_min INTEGER NOT NULL
        CHECK(total_wait_time_min >= 0),

    total_train_delay_min INTEGER NOT NULL DEFAULT 0
        CHECK(total_train_delay_min >= 0),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Human review state
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK(
            status IN (
                'PENDING_REVIEW',
                'APPROVED',
                'REJECTED'
            )
        )
);


-- =========================================================
-- 7. MAINTENANCE BLOCKS
-- =========================================================

CREATE TABLE IF NOT EXISTS maintenance_blocks (
    block_id TEXT PRIMARY KEY,

    plan_id TEXT NOT NULL,

    section_id TEXT NOT NULL,

    block_start_min INTEGER NOT NULL
        CHECK(block_start_min >= 0),

    block_end_min INTEGER NOT NULL
        CHECK(block_end_min > block_start_min),

    FOREIGN KEY (plan_id)
        REFERENCES block_plans(plan_id)
        ON DELETE CASCADE,

    FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 8. SCHEDULED TASKS
-- =========================================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    request_id TEXT NOT NULL,

    block_id TEXT NOT NULL,

    scheduled_start_min INTEGER NOT NULL
        CHECK(scheduled_start_min >= 0),

    scheduled_end_min INTEGER NOT NULL
        CHECK(scheduled_end_min > scheduled_start_min),

    duration_min INTEGER NOT NULL
        CHECK(duration_min > 0),

    -- Difference between requested window start and
    -- actual scheduled start.
    start_deviation_min INTEGER NOT NULL,

    FOREIGN KEY (request_id)
        REFERENCES maintenance_requests(id)
        ON DELETE CASCADE,

    FOREIGN KEY (block_id)
        REFERENCES maintenance_blocks(block_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 9. PLAN EXPLANATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS plan_explanations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    plan_id TEXT NOT NULL,

    explanation_text TEXT NOT NULL,

    FOREIGN KEY (plan_id)
        REFERENCES block_plans(plan_id)
        ON DELETE CASCADE
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_sections_source
ON sections(source_station_id);

CREATE INDEX IF NOT EXISTS idx_sections_target
ON sections(target_station_id);

CREATE INDEX IF NOT EXISTS idx_trains_section
ON train_schedules(section_id);

CREATE INDEX IF NOT EXISTS idx_trains_time
ON train_schedules(
    section_id,
    entry_time_min,
    exit_time_min
);

CREATE INDEX IF NOT EXISTS idx_requests_section
ON maintenance_requests(section_id);

CREATE INDEX IF NOT EXISTS idx_requests_window
ON maintenance_requests(
    section_id,
    window_start_min,
    window_end_min
);

CREATE INDEX IF NOT EXISTS idx_blocks_plan
ON maintenance_blocks(plan_id);

CREATE INDEX IF NOT EXISTS idx_blocks_section
ON maintenance_blocks(section_id);

CREATE INDEX IF NOT EXISTS idx_tasks_block
ON scheduled_tasks(block_id);

CREATE INDEX IF NOT EXISTS idx_disruptions_section
ON disruptions(
    section_id,
    start_time_min
);