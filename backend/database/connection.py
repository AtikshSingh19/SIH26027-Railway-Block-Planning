import os
import uuid

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Please add it to your .env file."
    )


def get_connection():
    """Create and return a PostgreSQL connection to Supabase."""
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
    )


def initialize_database():
    """Verify that the Supabase PostgreSQL database is reachable."""
    with get_connection() as connection:
        connection.execute("SELECT 1")


def save_optimization_result(connection, result, plan_id=None):
    plan = result.plan
    blocks = getattr(result, "blocks", []) or []
    scheduled_tasks = getattr(result, "scheduled_tasks", []) or []
    explanations = getattr(result, "explanations", []) or []

    with connection.transaction():
        # 1. Determine Plan ID
        new_plan_id = (
            plan_id
            if plan_id is not None
            else f"PLAN_{uuid.uuid4().hex[:12].upper()}"
        )

        plan.plan_id = new_plan_id

        # 2. Insert Block Plan
        connection.execute(
            """
            INSERT INTO block_plans (
                plan_id,
                plan_name,
                objective_type,
                baseline_blocks_count,
                total_blocks_count,
                blocks_saved,
                total_wait_time_min,
                total_train_delay_min,
                total_window_shift_min,
                status
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            """,
            (
                plan.plan_id,
                getattr(plan, "plan_name", f"Plan {plan.plan_id}"),
                plan.objective_type,
                getattr(plan, "baseline_blocks_count", 0),
                getattr(plan, "total_blocks_count", len(blocks)),
                getattr(plan, "blocks_saved", 0),
                plan.total_wait_time_min,
                plan.total_train_delay_min,
                plan.total_window_shift_min,
                getattr(plan, "status", "PENDING_REVIEW"),
            ),
        )

        # 3. Insert Maintenance Blocks
        for block in blocks:
            connection.execute(
                """
                INSERT INTO maintenance_blocks (
                    block_id,
                    plan_id,
                    section_id,
                    block_start_min,
                    block_end_min
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    block.block_id,
                    plan.plan_id,
                    block.section_id,
                    block.block_start_min,
                    block.block_end_min,
                ),
            )

        # 4. Insert Scheduled Tasks
        for task in scheduled_tasks:
            duration = getattr(task, "duration_min", None)

            if duration is None:
                duration = (
                    task.scheduled_end_min
                    - task.scheduled_start_min
                )

            deviation = getattr(
                task,
                "start_deviation_min",
                0,
            )

            connection.execute(
                """
                INSERT INTO scheduled_tasks (
                    request_id,
                    block_id,
                    scheduled_start_min,
                    scheduled_end_min,
                    duration_min,
                    start_deviation_min
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    task.request_id,
                    task.block_id,
                    task.scheduled_start_min,
                    task.scheduled_end_min,
                    duration,
                    deviation,
                ),
            )

        # 5. Insert Plan Explanations
        for explanation in explanations:
            connection.execute(
                """
                INSERT INTO plan_explanations (
                    plan_id,
                    explanation_text
                )
                VALUES (%s, %s)
                """,
                (
                    plan.plan_id,
                    explanation.explanation_text,
                ),
            )


def migrate_database():
    """Apply small schema updates to the existing Supabase PostgreSQL database."""
    connection = get_connection()

    try:
        connection.autocommit = True

        # Check maintenance_requests columns
        maintenance_columns = {
            row["column_name"]
            for row in connection.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'maintenance_requests'
                """
            ).fetchall()
        }

        if "status" not in maintenance_columns:
            connection.execute(
                """
                ALTER TABLE maintenance_requests
                ADD COLUMN status VARCHAR(50)
                """
            )

        if "rejection_reason" not in maintenance_columns:
            connection.execute(
                """
                ALTER TABLE maintenance_requests
                ADD COLUMN rejection_reason TEXT
                """
            )

        if "prediction_confidence" not in maintenance_columns:
            connection.execute(
                """
                ALTER TABLE maintenance_requests
                ADD COLUMN prediction_confidence REAL
                """
            )

        # Check block_plans columns
        block_plan_columns = {
            row["column_name"]
            for row in connection.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'block_plans'
                """
            ).fetchall()
        }

        if "total_window_shift_min" not in block_plan_columns:
            connection.execute(
                """
                ALTER TABLE block_plans
                ADD COLUMN total_window_shift_min REAL
                NOT NULL DEFAULT 0.0
                """
            )

    finally:
        connection.close()