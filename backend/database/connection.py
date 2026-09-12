import sqlite3
from pathlib import Path


# database folder
BASE_DIR = Path(__file__).resolve().parent

# SQLite database file
DATABASE_PATH = BASE_DIR / "railway.db"

# SQL files
SCHEMA_PATH = BASE_DIR / "schema.sql"
SEED_PATH = BASE_DIR / "seed.sql"


def get_connection():
    """
    Create and return a connection to the SQLite database.
    """

    connection = sqlite3.connect(DATABASE_PATH)

    # Return rows that can be accessed by column name
    connection.row_factory = sqlite3.Row

    # Enable foreign key constraints
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def initialize_database():
    """
    Create database tables and insert initial seed data.
    """

    connection = get_connection()

    try:
        # Create tables
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        connection.executescript(schema_sql)

        # Check whether seed data already exists
        cursor = connection.execute(
            "SELECT COUNT(*) FROM stations"
        )

        station_count = cursor.fetchone()[0]

        # Insert seed data only if database is empty
        if station_count == 0:
            seed_sql = SEED_PATH.read_text(encoding="utf-8")
            connection.executescript(seed_sql)

        connection.commit()

    finally:
        connection.close()

    migrate_database()



def save_optimization_result(connection, result):

    plan = result.plan

    # Generate unique plan ID
    existing_count = connection.execute(
        "SELECT COUNT(*) FROM block_plans"
    ).fetchone()[0]

    new_plan_id = f"PLAN_{existing_count + 1:03d}"

    # IMPORTANT:
    # Make response plan ID match database plan ID
    plan.plan_id = new_plan_id

    # Save plan as awaiting human review
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
            created_at,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_plan_id,
            plan.plan_name,
            plan.objective_type.value
            if hasattr(plan.objective_type, "value")
            else plan.objective_type,
            plan.baseline_blocks_count,
            plan.total_blocks_count,
            plan.blocks_saved,
            plan.total_wait_time_min,
            plan.total_train_delay_min,
            plan.created_at,
            "PENDING_REVIEW",
        )
    )

    # Save blocks
    for block in result.blocks:

        block_number = block.block_id.split("_B")[-1]
        new_block_id = f"{new_plan_id}_B{block_number}"

        connection.execute(
            """
            INSERT INTO maintenance_blocks (
                block_id,
                plan_id,
                section_id,
                block_start_min,
                block_end_min
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                new_block_id,
                new_plan_id,
                block.section_id,
                block.block_start_min,
                block.block_end_min,
            )
        )

    # Save scheduled tasks
    for task in result.scheduled_tasks:

        task_block_number = task.block_id.split("_B")[-1]
        new_task_block_id = f"{new_plan_id}_B{task_block_number}"

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
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                task.request_id,
                new_task_block_id,
                task.scheduled_start_min,
                task.scheduled_end_min,
                task.duration_min,
                task.start_deviation_min,
            )
        )

    # Save explanations
    for explanation in result.explanations:

        connection.execute(
            """
            INSERT INTO plan_explanations (
                plan_id,
                explanation_text
            )
            VALUES (?, ?)
            """,
            (
                new_plan_id,
                explanation.explanation_text,
            )
        )

    connection.commit()
    


def migrate_database():
    """
    Apply small schema updates to an existing database.
    Safe to run repeatedly.
    """
    connection = get_connection()

    try:
        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(maintenance_requests)"
            ).fetchall()
        }

        if "status" not in columns:
            connection.execute(
                """
                ALTER TABLE maintenance_requests
                ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED'))
                """
            )

        if "rejection_reason" not in columns:
            connection.execute(
                """
                ALTER TABLE maintenance_requests
                ADD COLUMN rejection_reason TEXT
                """
            )

        connection.commit()

    finally:
        connection.close()