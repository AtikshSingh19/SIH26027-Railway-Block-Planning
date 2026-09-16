# main_pipeline.py

from typing import List, Optional, Dict
from models import MaintenanceRequest, TrainSchedule, Section, Disruption
from logic import EmergencyInsert
from ml_inference import apply_ml_predictions
from replanner import generate_fallback_plans_from_ml, FallbackOption


def run_full_rescheduling_pipeline(
    requests: List[MaintenanceRequest],
    trains: List[TrainSchedule],
    sections: List[Section],
    disruptions: Optional[List[Disruption]] = None,
    emergency_inserts: Optional[List[EmergencyInsert]] = None,
    external_delay_minutes_by_train: Optional[Dict[str, int]] = None,
    parallel: bool = False,
    sort_by_rank: bool = True,
) -> List[FallbackOption]:
    """
    Complete Pipeline Execution Flow:
    1. Parse Pydantic Models (models.py)
    2. Enrich Requests via ML Inference + Safety Buffers (ml_inference.py)
    3. Run Constraint Solvers & Robustness Ranking (logic.py + replanner.py)
    4. Return Ranked FallbackOption[]
    """
    # Step 1 & 2: Run ML Duration Prediction & Confidence Safety Scaling
    ml_enriched_requests = apply_ml_predictions(
        requests=requests,
        sections=sections
    )

    # Step 3, 4 & 5: Pass ML-enriched requests into multi-strategy replanner
    ranked_fallback_plans = generate_fallback_plans_from_ml(
        ml_requests=ml_enriched_requests,
        trains=trains,
        sections=sections,
        disruptions=disruptions,
        emergency_inserts=emergency_inserts,
        external_delay_minutes_by_train=external_delay_minutes_by_train,
        parallel=parallel,
        sort_by_rank=sort_by_rank,
    )

    return ranked_fallback_plans