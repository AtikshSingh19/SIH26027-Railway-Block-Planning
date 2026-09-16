# ml_inference.py

from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from models import MaintenanceRequest, Section

_pipeline = None
MODEL_PATH = Path(__file__).with_name("duration_model.pkl")


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(MODEL_PATH)
    return _pipeline


def predict_duration(
    department: str,
    crew_size: int,
    length_km: float,
    is_night: bool,
    priority: int = 2,
) -> Tuple[int, float]:
    """Predicts maintenance duration and calculates confidence score from ensemble tree spread."""
    if department not in {"TRACK", "OHE", "SIGNAL"}:
        raise ValueError("department must be TRACK, OHE, or SIGNAL.")

    if crew_size < 1:
        raise ValueError("crew_size must be at least 1.")

    if length_km <= 0:
        raise ValueError("length_km must be greater than 0.")

    if priority not in {1, 2}:
        raise ValueError("priority must be 1 or 2.")

    pipeline = _get_pipeline()

    input_dataframe = pd.DataFrame(
        [
            {
                "department": department,
                "crew_size": crew_size,
                "length_km": length_km,
                "is_night": int(is_night),
                "priority": priority,
            }
        ]
    )

    transformed_input = pipeline.named_steps["preprocessor"].transform(
        input_dataframe
    )
    regressor = pipeline.named_steps["model"]

    tree_predictions = [
        tree.predict(transformed_input)[0] for tree in regressor.estimators_
    ]

    mean_prediction = float(np.mean(tree_predictions))
    standard_deviation = float(np.std(tree_predictions))

    if mean_prediction <= 0:
        confidence_score = 0.0
    else:
        relative_spread = standard_deviation / mean_prediction
        confidence_score = max(
            0.0,
            min(1.0, 1.0 - relative_spread),
        )

    return (
        int(round(mean_prediction)),
        round(confidence_score, 2),
    )


def apply_ml_predictions(
    requests: List[MaintenanceRequest],
    sections: List[Section],
    confidence_threshold_high: float = 0.85,
    confidence_threshold_med: float = 0.60,
) -> List[MaintenanceRequest]:
    """Extracts features, runs model inference, applies safety scaling based on confidence,

    and updates both predicted_duration_min AND prediction_confidence on the request models.
    """
    section_map: Dict[str, Section] = {s.id: s for s in sections}
    updated_requests: List[MaintenanceRequest] = []

    for req in requests:
        section = section_map.get(req.section_id)
        if not section:
            raise ValueError(
                f"MaintenanceRequest '{req.id}' references unknown section_id '{req.section_id}'."
            )

        raw_duration, confidence = predict_duration(
            department=req.department,
            crew_size=req.crew_size,
            length_km=section.length_km,
            is_night=req.is_night,
            priority=req.priority,
        )

        # Confidence Safety Buffer Strategy
        if confidence >= confidence_threshold_high:
            safety_factor = 1.00
        elif confidence >= confidence_threshold_med:
            safety_factor = 1.15
        else:
            safety_factor = 1.35

        adjusted_duration = max(1, int(round(raw_duration * safety_factor)))

        # Return model copy with updated predictions & confidence
        updated_requests.append(
            req.model_copy(
                update={
                    "predicted_duration_min": adjusted_duration,
                    "prediction_confidence": confidence,
                }
            )
        )

    return updated_requests