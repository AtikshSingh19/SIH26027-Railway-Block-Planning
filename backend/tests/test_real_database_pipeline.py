from database.connection import get_connection

from models import (
    MaintenanceRequest,
    TrainSchedule,
    Section,
    Disruption,
)

from ml_inference import apply_ml_predictions
from replanner import generate_fallback_plans_from_ml


print("\n========== REAL DATABASE PIPELINE TEST ==========\n")


connection = get_connection()

try:
    train_rows = connection.execute(
        "SELECT * FROM train_schedules"
    ).fetchall()

    request_rows = connection.execute(
        """
        SELECT *
        FROM maintenance_requests
        WHERE status = 'APPROVED'
          AND planning_status = 'UNPLANNED'
        """
    ).fetchall()

    section_rows = connection.execute(
        "SELECT * FROM sections"
    ).fetchall()

    disruption_rows = connection.execute(
        "SELECT * FROM disruptions"
    ).fetchall()

finally:
    connection.close()


print("Database records loaded:")
print("  Trains:", len(train_rows))
print("  Approved + Unplanned Requests:", len(request_rows))
print("  Sections:", len(section_rows))
print("  Disruptions:", len(disruption_rows))


trains = [
    TrainSchedule(**dict(row))
    for row in train_rows
]

requests = [
    MaintenanceRequest(**dict(row))
    for row in request_rows
]

sections = [
    Section(**dict(row))
    for row in section_rows
]

disruptions = [
    Disruption(**dict(row))
    for row in disruption_rows
]


print("\n========== ML PREDICTIONS ==========\n")


ml_requests = apply_ml_predictions(
    requests=requests,
    sections=sections,
)


for request in ml_requests:
    print(
        f"{request.id}: "
        f"base={request.base_duration_min} min, "
        f"predicted={request.predicted_duration_min} min, "
        f"confidence={request.prediction_confidence}"
    )


print("\n========== FALLBACK PLANS ==========\n")


plans = generate_fallback_plans_from_ml(
    ml_requests=ml_requests,
    trains=trains,
    sections=sections,
    disruptions=disruptions,
    emergency_inserts=[],
    parallel=False,
    sort_by_rank=False,
)


print("Number of plans:", len(plans))


for i, option in enumerate(plans, start=1):

    print(f"\nPLAN {i}")
    print("--------------------------------")
    print("Plan ID:", option.plan_id)
    print("Plan Name:", option.plan_name)
    print("Objective:", option.objective_type)
    print("Robustness:", option.robustness_score)

    print("\nBreakdown:")
    print(
        "  Train Delay Penalty:",
        option.breakdown.train_delay_penalty
    )
    print(
        "  Window Shift Penalty:",
        option.breakdown.window_shift_penalty
    )
    print(
        "  Unscheduled Penalty:",
        option.breakdown.unscheduled_task_penalty
    )
    print(
        "  Completion:",
        option.breakdown.completion_rate_pct,
        "%"
    )

    print("\nPlan Metrics:")
    print(
        "  Blocks:",
        option.result.plan.total_blocks_count
    )
    print(
        "  Blocks Saved:",
        option.result.plan.blocks_saved
    )
    print(
        "  Window Shift:",
        option.result.plan.total_window_shift_min
    )
    print(
        "  Train Delay:",
        option.result.plan.total_train_delay_min
    )

    print("\nScheduled Tasks:")

    for task in option.result.scheduled_tasks:
        print(
            f"  {task.request_id}: "
            f"{task.scheduled_start_min} -> "
            f"{task.scheduled_end_min} "
            f"(duration={task.duration_min}, "
            f"shift={task.start_deviation_min})"
        )

    print("\nTrain Decisions:")

    for decision in option.result.train_delay_decisions:
        print(
            f"  {decision.train_id}: "
            f"existing={decision.existing_delay_min}, "
            f"added={decision.optimizer_added_delay_min}, "
            f"final={decision.final_delay_min}"
        )


print("\n========== TEST COMPLETE ==========\n")