from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional

from ortools.sat.python import cp_model
from pydantic import BaseModel, Field, model_validator

from models import (
    BlockPlan,
    Disruption,
    MaintenanceBlock,
    MaintenanceRequest,
    PlanExplanation,
    ScheduledTask,
    Section,
    TrainSchedule,
)


class EmergencyInsert(BaseModel):
    disruption: Disruption
    emergency_request: MaintenanceRequest

    @model_validator(mode="after")
    def validate_emergency(self):
        if self.disruption.disruption_type != "EMERGENCY":
            raise ValueError("EmergencyInsert requires an EMERGENCY disruption.")
        if self.emergency_request.priority != 1:
            raise ValueError("An emergency maintenance request must have priority 1.")
        return self


class TrainDelayDecision(BaseModel):
    train_id: str
    existing_delay_min: int
    optimizer_added_delay_min: int
    final_delay_min: int


class OptimizationResult(BaseModel):
    plan: BlockPlan
    blocks: List[MaintenanceBlock] = Field(default_factory=list)
    scheduled_tasks: List[ScheduledTask] = Field(default_factory=list)
    explanations: List[PlanExplanation] = Field(default_factory=list)
    train_delay_decisions: List[TrainDelayDecision] = Field(default_factory=list)


def solve_block_schedule(
    requests: List[MaintenanceRequest],
    trains: List[TrainSchedule],
    sections: List[Section],
    disruptions: Optional[List[Disruption]] = None,
    emergency_inserts: Optional[List[EmergencyInsert]] = None,
    external_delay_minutes_by_train: Optional[Dict[str, int]] = None,
    plan_id: str = "PLAN_001",
    plan_name: str = "Balanced Plan",
    objective_type: str = "BALANCED",
    safety_buffer_min: int = 15,
    planning_horizon_min: int = 5760,
    block_weight: int = 50,
    window_violation_weight: int = 10,
    train_delay_weight: int = 1,
    max_solver_time_seconds: int = 10,
) -> OptimizationResult:

    disruptions = disruptions or []
    emergency_inserts = emergency_inserts or []
    external_delay_minutes_by_train = external_delay_minutes_by_train or {}

    if safety_buffer_min < 0:
        raise ValueError("safety_buffer_min cannot be negative.")

    if max_solver_time_seconds <= 0:
        raise ValueError("max_solver_time_seconds must be positive.")

    section_by_id = {section.id: section for section in sections}
    train_by_id = {train.train_id: train for train in trains}

    if len(train_by_id) != len(trains):
        raise ValueError("Duplicate train_id values were supplied.")

    unknown_delay_trains = set(external_delay_minutes_by_train) - set(train_by_id)
    if unknown_delay_trains:
        raise ValueError(
            "Delay updates reference unknown train IDs: "
            + ", ".join(sorted(unknown_delay_trains))
        )

    if any(delay < 0 for delay in external_delay_minutes_by_train.values()):
        raise ValueError("External train delays cannot be negative.")

    all_requests = [*requests]
    emergency_severity_by_request: Dict[str, int] = {}
    for insert in emergency_inserts:
        all_requests.append(insert.emergency_request)
        emergency_severity_by_request[insert.emergency_request.id] = (
            insert.disruption.severity
        )

    request_ids = [request.id for request in all_requests]
    if len(request_ids) != len(set(request_ids)):
        raise ValueError("Duplicate maintenance request IDs were supplied.")

    for request in all_requests:
        section = section_by_id.get(request.section_id)
        if section is None:
            raise ValueError(
                f"Maintenance request {request.id} references an unknown section."
            )
        if request.department == "OHE" and not section.electrified:
            raise ValueError(
                f"OHE request {request.id} cannot be scheduled on non-electrified "
                f"section {request.section_id}."
            )

    for disruption in disruptions:
        if disruption.section_id not in section_by_id:
            raise ValueError(
                f"Disruption {disruption.id} references an unknown section."
            )

    if not all_requests:
        plan = BlockPlan(
            plan_id=plan_id,
            plan_name=plan_name,
            objective_type=objective_type,
            baseline_blocks_count=0,
            total_blocks_count=0,
            blocks_saved=0,
            total_wait_time_min=0,
            total_train_delay_min=0,
        )
        return OptimizationResult(
            plan=plan,
            explanations=[
                PlanExplanation(
                    plan_id=plan_id,
                    explanation_text="No maintenance requests were supplied.",
                )
            ],
        )

    max_train_time = max(
        (
            train.actual_exit_min
            + external_delay_minutes_by_train.get(train.train_id, 0)
            for train in trains
            if train.status != "CANCELLED"
        ),
        default=0,
    )
    max_request_time = max(
        request.window_end_min + request.effective_duration_min
        for request in all_requests
    )
    max_disruption_time = max(
        (disruption.end_time_min or disruption.start_time_min for disruption in disruptions),
        default=0,
    )
    horizon = max(
        planning_horizon_min,
        max_train_time + safety_buffer_min + 240,
        max_request_time + 240,
        max_disruption_time + 240,
    )

    model = cp_model.CpModel()

    # 1. INITIALIZE TRAIN DELAY VARIABLES & GROUPS
    optimizer_train_delay_vars: Dict[str, cp_model.IntVar] = {}
    for train in trains:
        if train.status != "CANCELLED":
            optimizer_train_delay_vars[train.train_id] = model.NewIntVar(
                0,
                horizon,
                f"optimizer_delay_{train.train_id}",
            )

    trains_by_section = defaultdict(list)
    for train in trains:
        if train.status != "CANCELLED":
            trains_by_section[train.section_id].append(train)

    # 2. SINGLE-TRACK TRAIN SEPARATION (FIFO ORDERING)
    for section_id, section_trains in trains_by_section.items():
        section = section_by_id.get(section_id)
        if not section or section.track_type != "SINGLE":
            continue

        ordered_trains = sorted(
            section_trains,
            key=lambda t: (
                t.actual_entry_min + external_delay_minutes_by_train.get(t.train_id, 0),
                t.train_id,
            ),
        )

        for first_train, second_train in zip(ordered_trains, ordered_trains[1:]):
            first_ext = external_delay_minutes_by_train.get(first_train.train_id, 0)
            second_ext = external_delay_minutes_by_train.get(second_train.train_id, 0)

            first_added = optimizer_train_delay_vars[first_train.train_id]
            second_added = optimizer_train_delay_vars[second_train.train_id]

            first_exit = first_train.actual_exit_min + first_ext + first_added
            second_entry = second_train.actual_entry_min + second_ext + second_added

            model.Add(first_exit + safety_buffer_min <= second_entry)

    # 3. MAINTENANCE REQUEST VARIABLES
    start_vars: Dict[str, cp_model.IntVar] = {}
    end_vars: Dict[str, cp_model.IntVar] = {}
    deviation_vars: Dict[str, cp_model.IntVar] = {}
    early_window_vars: Dict[str, cp_model.IntVar] = {}
    late_window_vars: Dict[str, cp_model.IntVar] = {}

    for request in all_requests:
        duration = request.effective_duration_min
        start = model.NewIntVar(0, horizon - duration, f"start_{request.id}")
        end = model.NewIntVar(duration, horizon, f"end_{request.id}")
        deviation = model.NewIntVar(0, horizon, f"deviation_{request.id}")
        early = model.NewIntVar(0, horizon, f"early_window_{request.id}")
        late = model.NewIntVar(0, horizon, f"late_window_{request.id}")

        start_vars[request.id] = start
        end_vars[request.id] = end
        deviation_vars[request.id] = deviation
        early_window_vars[request.id] = early
        late_window_vars[request.id] = late

        model.Add(end == start + duration)
        model.AddAbsEquality(deviation, start - request.window_start_min)
        model.AddMaxEquality(early, [request.window_start_min - start, 0])
        model.AddMaxEquality(late, [end - request.window_end_min, 0])

    # 4. MAINTENANCE vs. TRAIN CONSTRAINTS
    for request in all_requests:
        for train in trains_by_section[request.section_id]:
            before_train = model.NewBoolVar(f"{request.id}_before_{train.train_id}")
            after_train = model.NewBoolVar(f"{request.id}_after_{train.train_id}")
            added_delay = optimizer_train_delay_vars[train.train_id]
            observed_delay = external_delay_minutes_by_train.get(train.train_id, 0)

            model.Add(
                end_vars[request.id] + safety_buffer_min
                <= train.actual_entry_min + observed_delay + added_delay
            ).OnlyEnforceIf(before_train)

            model.Add(
                start_vars[request.id]
                >= train.actual_exit_min + observed_delay + added_delay + safety_buffer_min
            ).OnlyEnforceIf(after_train)

            model.AddBoolOr([before_train, after_train])

    # 5. SECTION_BLOCKED DISRUPTIONS
    for disruption in disruptions:
        if disruption.disruption_type != "SECTION_BLOCKED":
            continue

        block_end = disruption.end_time_min if disruption.end_time_min is not None else horizon

        for request in all_requests:
            if request.section_id != disruption.section_id:
                continue

            before_block = model.NewBoolVar(
                f"{request.id}_before_disruption_{disruption.id}"
            )
            after_block = model.NewBoolVar(
                f"{request.id}_after_disruption_{disruption.id}"
            )

            model.Add(end_vars[request.id] <= disruption.start_time_min).OnlyEnforceIf(
                before_block
            )
            model.Add(start_vars[request.id] >= block_end).OnlyEnforceIf(
                after_block
            )
            model.AddBoolOr([before_block, after_block])

    # 6. SAME-SECTION TASK BUNDLING & OVERLAP
    same_start_vars: Dict[tuple[str, str], cp_model.BoolVar] = {}
    for i, first in enumerate(all_requests):
        for second in all_requests[i + 1 :]:
            if first.section_id != second.section_id:
                continue

            same_start = model.NewBoolVar(f"same_start_{first.id}_{second.id}")
            first_before_second = model.NewBoolVar(
                f"{first.id}_before_{second.id}"
            )
            second_before_first = model.NewBoolVar(
                f"{second.id}_before_{first.id}"
            )

            model.Add(start_vars[first.id] == start_vars[second.id]).OnlyEnforceIf(
                same_start
            )
            model.Add(start_vars[first.id] != start_vars[second.id]).OnlyEnforceIf(
                same_start.Not()
            )
            model.Add(end_vars[first.id] <= start_vars[second.id]).OnlyEnforceIf(
                [same_start.Not(), first_before_second]
            )
            model.Add(end_vars[second.id] <= start_vars[first.id]).OnlyEnforceIf(
                [same_start.Not(), second_before_first]
            )
            model.AddBoolOr([same_start, first_before_second, second_before_first])
            same_start_vars[(first.id, second.id)] = same_start

    # 7. EXACT BLOCK COUNTING
    new_block_vars: List[cp_model.BoolVar] = []
    for i, request in enumerate(all_requests):
        new_block = model.NewBoolVar(f"new_block_{request.id}")
        prior_matches = []
        for prior in all_requests[:i]:
            if prior.section_id == request.section_id:
                prior_matches.append(same_start_vars[(prior.id, request.id)])

        if not prior_matches:
            model.Add(new_block == 1)
        else:
            model.AddBoolOr([new_block, *prior_matches])
            for match in prior_matches:
                model.AddImplication(match, new_block.Not())
                model.AddImplication(new_block, match.Not())
        new_block_vars.append(new_block)

    # 8. OBJECTIVE FUNCTION
    def maintenance_priority_weight(request: MaintenanceRequest) -> int:
        base = 8 if request.priority == 1 else 2
        severity = emergency_severity_by_request.get(request.id)
        return base + (severity * 12 if severity is not None else 0)

    total_blocks = sum(new_block_vars)
    total_maintenance_deviation = sum(
        deviation_vars[request.id] * maintenance_priority_weight(request)
        for request in all_requests
    )
    total_window_violation = sum(
        early_window_vars[request.id] + late_window_vars[request.id]
        for request in all_requests
    )
    total_weighted_train_delay = sum(
        delay_var
        * (120 if train_by_id[train_id].priority == 1 else 15)
        * train_delay_weight
        for train_id, delay_var in optimizer_train_delay_vars.items()
    )

    model.Minimize(
        block_weight * total_blocks
        + total_maintenance_deviation
        + window_violation_weight * total_window_violation
        + total_weighted_train_delay
    )

    # 9. SOLVE
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_solver_time_seconds
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("No feasible maintenance schedule found.")

    solved = [
        {
            "request": request,
            "start": solver.Value(start_vars[request.id]),
            "end": solver.Value(end_vars[request.id]),
        }
        for request in all_requests
    ]

    grouped_blocks = defaultdict(list)
    for item in solved:
        grouped_blocks[(item["request"].section_id, item["start"])].append(item)

    block_id_by_key: Dict[tuple[str, int], str] = {}
    blocks: List[MaintenanceBlock] = []
    for index, key in enumerate(sorted(grouped_blocks), start=1):
        section_id, start_time = key
        block_id = f"{plan_id}_B{index:03d}"
        block_id_by_key[key] = block_id
        blocks.append(
            MaintenanceBlock(
                block_id=block_id,
                plan_id=plan_id,
                section_id=section_id,
                block_start_min=start_time,
                block_end_min=max(item["end"] for item in grouped_blocks[key]),
            )
        )

    scheduled_tasks = [
        ScheduledTask(
            request_id=item["request"].id,
            block_id=block_id_by_key[(item["request"].section_id, item["start"])],
            scheduled_start_min=item["start"],
            scheduled_end_min=item["end"],
            duration_min=item["end"] - item["start"],
            start_deviation_min=item["start"] - item["request"].window_start_min,
        )
        for item in solved
    ]

    delay_decisions = []
    for train in trains:
        if train.status == "CANCELLED":
            continue
        added = solver.Value(optimizer_train_delay_vars[train.train_id])
        observed = train.delay_minutes + external_delay_minutes_by_train.get(train.train_id, 0)
        delay_decisions.append(
            TrainDelayDecision(
                train_id=train.train_id,
                existing_delay_min=observed,
                optimizer_added_delay_min=added,
                final_delay_min=observed + added,
            )
        )

    total_blocks_count = len(blocks)
    blocks_saved = len(all_requests) - total_blocks_count

    total_window_shift = sum(
        abs(task.start_deviation_min)
        for task in scheduled_tasks
    )

    total_wait_time = total_window_shift
    total_train_delay = sum(
        decision.optimizer_added_delay_min for decision in delay_decisions
    )
    bundled_count = sum(len(items) - 1 for items in grouped_blocks.values() if len(items) > 1)

    explanations = [
        PlanExplanation(
            plan_id=plan_id,
            explanation_text=(
                f"Generated {total_blocks_count} maintenance block(s) from "
                f"{len(all_requests)} request(s)."
            ),
        ),
        PlanExplanation(
            plan_id=plan_id,
            explanation_text=(
                f"Saved {blocks_saved} block(s) through same-section task bundling; "
                f"{bundled_count} task(s) share a block."
            ),
        ),
        PlanExplanation(
            plan_id=plan_id,
            explanation_text=(
                f"Total absolute start-time deviation is {total_wait_time} minute(s)."
            ),
        ),
        PlanExplanation(
            plan_id=plan_id,
            explanation_text=(
                f"Applied {len(disruptions)} disruption record(s) and "
                f"inserted {len(emergency_inserts)} emergency request(s)."
            ),
        ),
    ]

    plan = BlockPlan(
        plan_id=plan_id,
        plan_name=plan_name,
        objective_type=objective_type,
        baseline_blocks_count=len(all_requests),
        total_blocks_count=total_blocks_count,
        blocks_saved=blocks_saved,
        total_wait_time_min=total_wait_time,
        total_window_shift_min=total_window_shift,
        total_train_delay_min=total_train_delay,
    )

    return OptimizationResult(
        plan=plan,
        blocks=blocks,
        scheduled_tasks=scheduled_tasks,
        explanations=explanations,
        train_delay_decisions=delay_decisions,
    )