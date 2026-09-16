from concurrent.futures import ProcessPoolExecutor
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from models import Disruption, MaintenanceRequest, Section, TrainSchedule
from logic import EmergencyInsert, OptimizationResult, solve_block_schedule


class RobustnessBreakdown(BaseModel):
    total_score: float
    train_delay_penalty: float
    wait_time_penalty: float
    window_shift_penalty: float
    unscheduled_task_penalty: float
    completion_rate_pct: float


class FallbackOption(BaseModel):
    plan_id: str
    plan_name: str
    objective_type: str
    robustness_score: float
    breakdown: RobustnessBreakdown
    result: OptimizationResult


class StrategyConfig(BaseModel):
    plan_id: str
    plan_name: str
    objective_type: str = Field(
        ...,
        description="Must be MIN_DELAY, MIN_BLOCKS, or BALANCED"
    )
    block_weight: Optional[float] = None
    window_violation_weight: Optional[float] = None
    train_delay_weight: Optional[float] = None


DEFAULT_STRATEGIES = [
    StrategyConfig(
        plan_id="PLAN_PRIMARY",
        plan_name="Primary Balanced Plan",
        objective_type="BALANCED",
        block_weight=10,
        window_violation_weight=10,
        train_delay_weight=1,
    ),
    StrategyConfig(
        plan_id="PLAN_FALLBACK_A",
        plan_name="Fallback A: Train Punctuality Focus",
        objective_type="MIN_DELAY",
        block_weight=1,
        window_violation_weight=2,
        train_delay_weight=10,
    ),
    StrategyConfig(
        plan_id="PLAN_FALLBACK_B",
        plan_name="Fallback B: Maintenance Window Focus",
        objective_type="MIN_BLOCKS",
        block_weight=50,
        window_violation_weight=2,
        train_delay_weight=1,
    ),
]


def _extract_task_request_id(task) -> Optional[str]:
    for field in ("request_id", "maintenance_request_id"):
        val = getattr(task, field, None)
        if val is not None:
            return str(val)
    return None


def calculate_robustness(
    result: OptimizationResult, requests: List[MaintenanceRequest]
) -> RobustnessBreakdown:
    total_requested_tasks = len(requests)

    if total_requested_tasks == 0:
        return RobustnessBreakdown(
            total_score=100.0,
            train_delay_penalty=0.0,
            wait_time_penalty=0.0,
            window_shift_penalty=0.0,
            unscheduled_task_penalty=0.0,
            completion_rate_pct=100.0,
        )

    requested_ids = {str(r.id) for r in requests}
    if len(requested_ids) != total_requested_tasks:
        raise ValueError("Maintenance request IDs must be unique across input requests.")

    scheduled_ids = set()
    for task in result.scheduled_tasks:
        req_id = _extract_task_request_id(task)
        if req_id is not None:
            if req_id not in requested_ids:
                raise ValueError(f"Scheduled task contains unknown request ID '{req_id}' not in input requests.")
            scheduled_ids.add(req_id)

    unscheduled_ids = requested_ids - scheduled_ids
    scheduled_count = len(requested_ids) - len(unscheduled_ids)
    completion_rate = round((scheduled_count / total_requested_tasks) * 100.0, 1)

    total_delay = getattr(result.plan, "total_train_delay_min", 0.0)
    window_shifts = getattr(result.plan, "total_window_shift_min", 0.0)

    delay_penalty = (total_delay * 0.75) / total_requested_tasks
    shift_penalty = (window_shifts * 0.25) / total_requested_tasks
    wait_penalty = 0.0
    unscheduled_penalty = (100.0 - completion_rate) * 0.5

    raw_score = 100.0 - (delay_penalty + wait_penalty + shift_penalty + unscheduled_penalty)
    final_score = round(max(0.0, min(100.0, raw_score)), 1)

    return RobustnessBreakdown(
        total_score=final_score,
        train_delay_penalty=round(delay_penalty, 1),
        wait_time_penalty=round(wait_penalty, 1),
        window_shift_penalty=round(shift_penalty, 1),
        unscheduled_task_penalty=round(unscheduled_penalty, 1),
        completion_rate_pct=completion_rate,
    )


def _resolve_objective_weights(objective_type: str) -> Dict[str, float]:
    if objective_type == "MIN_DELAY":
        return {
            "block_weight": 0.5,
            "window_violation_weight": 2.0,
        }

    elif objective_type == "MIN_BLOCKS":
        return {
            "block_weight": 50.0,
            "window_violation_weight": 2.0,
        }

    elif objective_type == "BALANCED":
        return {
            "block_weight": 10.0,
            "window_violation_weight": 10.0,
        }

    else:
        raise ValueError(f"Invalid objective_type: '{objective_type}'.")


def _solve_single_plan(
    config: StrategyConfig,
    requests: List[MaintenanceRequest],
    trains: List[TrainSchedule],
    sections: List[Section],
    disruptions: Optional[List[Disruption]],
    emergency_inserts: Optional[List[EmergencyInsert]],
    external_delay_minutes_by_train: Optional[Dict[str, int]],
) -> FallbackOption:
    scaled_weights = _resolve_objective_weights(config.objective_type)

    kwargs = {
        "requests": requests,
        "trains": trains,
        "sections": sections,
        "disruptions": disruptions,
        "emergency_inserts": emergency_inserts,
        "external_delay_minutes_by_train": external_delay_minutes_by_train,
        "plan_id": config.plan_id,
        "plan_name": config.plan_name,
        "objective_type": config.objective_type,
        "block_weight": (
            config.block_weight
            if config.block_weight is not None
            else scaled_weights["block_weight"]
        ),
        "window_violation_weight": (
            config.window_violation_weight
            if config.window_violation_weight is not None
            else scaled_weights["window_violation_weight"]
        ),
        "train_delay_weight": (
            config.train_delay_weight
            if config.train_delay_weight is not None
            else 1
        ),
    }

    result = solve_block_schedule(**kwargs)
    breakdown = calculate_robustness(result, requests=requests)

    return FallbackOption(
        plan_id=config.plan_id,
        plan_name=config.plan_name,
        objective_type=config.objective_type,
        robustness_score=breakdown.total_score,
        breakdown=breakdown,
        result=result,
    )


def generate_fallback_plans_from_ml(
    ml_requests: Optional[List[MaintenanceRequest]] = None,
    trains: Optional[List[TrainSchedule]] = None,
    sections: Optional[List[Section]] = None,
    disruptions: Optional[List[Disruption]] = None,
    emergency_inserts: Optional[List[EmergencyInsert]] = None,
    external_delay_minutes_by_train: Optional[Dict[str, int]] = None,
    custom_strategies: Optional[List[StrategyConfig]] = None,
    parallel: bool = False,
    sort_by_rank: bool = True,
    requests: Optional[List[MaintenanceRequest]] = None,
) -> List[FallbackOption]:
    """Generates multi-objective strategy plans using pre-enriched ML requests."""
    active_requests = ml_requests if ml_requests is not None else requests

    if active_requests is None:
        raise ValueError(
            "Must provide either 'ml_requests' or 'requests' to generate_fallback_plans."
        )

    strategies = custom_strategies or DEFAULT_STRATEGIES

    if parallel:
        with ProcessPoolExecutor() as executor:
            futures = [
                executor.submit(
                    _solve_single_plan,
                    strat,
                    active_requests,
                    trains or [],
                    sections or [],
                    disruptions,
                    emergency_inserts,
                    external_delay_minutes_by_train,
                )
                for strat in strategies
            ]
            options = [f.result() for f in futures]
    else:
        options = [
            _solve_single_plan(
                strat,
                active_requests,
                trains or [],
                sections or [],
                disruptions,
                emergency_inserts,
                external_delay_minutes_by_train,
            )
            for strat in strategies
        ]

    if sort_by_rank:
        options.sort(
            key=lambda x: (
                x.breakdown.completion_rate_pct,
                x.robustness_score,
            ),
            reverse=True,
        )

    return options


# Single Backward-Compatible Alias
generate_fallback_plans = generate_fallback_plans_from_ml