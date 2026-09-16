from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

# =========================================================
# FIXED VALUE TYPES
# =========================================================

Department = Literal["TRACK", "OHE", "SIGNAL"]
TrackType = Literal["SINGLE", "DOUBLE", "TRIPLE"]
TrainStatus = Literal["ON_TIME", "DELAYED", "CANCELLED"]
DisruptionType = Literal[
    "TRAIN_DELAY",
    "SECTION_BLOCKED",
    "EMERGENCY",
]
ObjectiveType = Literal["MIN_DELAY", "MIN_BLOCKS", "BALANCED"]


# =========================================================
# 1. stations
# =========================================================

class Station(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)


# =========================================================
# 2. sections
# =========================================================

class Section(BaseModel):
    id: str = Field(..., min_length=1)

    source_station_id: str = Field(..., min_length=1)
    target_station_id: str = Field(..., min_length=1)

    length_km: float = Field(..., gt=0.0)
    track_type: TrackType = "DOUBLE"

    # SQLite stores this as 1 / 0.
    # Pydantic accepts True/False and converts 1/0 when reading.
    electrified: bool = True

    max_speed: int = Field(default=110, gt=0)


# =========================================================
# 3. train_schedules
# =========================================================

class TrainSchedule(BaseModel):
    train_id: str = Field(..., min_length=1)
    train_name: str = Field(..., min_length=1)

    # 1 = High priority / Express
    # 2 = Normal priority / Freight
    priority: int = Field(..., ge=1, le=2)

    section_id: str = Field(..., min_length=1)

    # Minutes from the beginning of the planning period.
    entry_time_min: int = Field(..., ge=0)
    exit_time_min: int = Field(..., ge=0)

    delay_minutes: int = Field(default=0, ge=0)
    status: TrainStatus = "ON_TIME"

    @model_validator(mode="after")
    def validate_train_time_order(self):
        if self.exit_time_min <= self.entry_time_min:
            raise ValueError(
                "exit_time_min must be later than entry_time_min."
            )
        return self

    @property
    def actual_entry_min(self) -> int:
        """Entry time after applying the live delay."""
        return self.entry_time_min + self.delay_minutes

    @property
    def actual_exit_min(self) -> int:
        """Exit time after applying the live delay."""
        return self.exit_time_min + self.delay_minutes


# =========================================================
# 4. maintenance_requests
# =========================================================

class MaintenanceRequest(BaseModel):
    id: str = Field(..., min_length=1)

    department: Department
    section_id: str = Field(..., min_length=1)

    asset_id: Optional[str] = None
    asset_type: Optional[str] = None

    # Preferred/allowed maintenance window.
    # They do not mean that the work lasts for the entire window.
    window_start_min: int = Field(..., ge=0)
    window_end_min: int = Field(..., ge=0)

    base_duration_min: int = Field(..., gt=0)
    predicted_duration_min: Optional[int] = Field(
        default=None,
        gt=0,
    )

    prediction_confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0
    )

    crew_size: int = Field(..., ge=1)

    # 1 = High / critical
    # 2 = Normal / routine
    priority: int = Field(..., ge=1, le=2)

    is_night: bool = False

    @model_validator(mode="after")
    def validate_maintenance_window(self):
        if self.window_end_min <= self.window_start_min:
            raise ValueError(
                "window_end_min cannot be earlier than "
                "window_start_min."
            )
        return self

    @property
    def effective_duration_min(self) -> int:
        """
        Duration the optimizer should use.
        ML prediction takes precedence when available.
        """
        if self.predicted_duration_min is not None:
            return self.predicted_duration_min

        return self.base_duration_min


# =========================================================
# 5. disruptions
# =========================================================

class Disruption(BaseModel):
    id: str = Field(..., min_length=1)
    section_id: str = Field(..., min_length=1)

    disruption_type: DisruptionType

    start_time_min: int = Field(..., ge=0)
    end_time_min: Optional[int] = Field(default=None, ge=0)

    delay_minutes: int = Field(default=0, ge=0)
    severity: int = Field(..., ge=1, le=3)

    description: str = Field(default="")

    @model_validator(mode="after")
    def validate_disruption_time_order(self):
        if (
            self.end_time_min is not None
            and self.end_time_min <= self.start_time_min
        ):
            raise ValueError(
                "end_time_min must be later than start_time_min."
            )
        return self


# =========================================================
# 6. block_plans
# =========================================================

class BlockPlan(BaseModel):
    plan_id: str = Field(..., min_length=1)
    plan_name: str = Field(..., min_length=1)

    objective_type: ObjectiveType

    baseline_blocks_count: int = Field(..., ge=0)
    total_blocks_count: int = Field(..., ge=0)
    blocks_saved: int = Field(..., ge=0)

    total_wait_time_min: int = Field(..., ge=0)
    total_window_shift_min: int = Field(default=0, ge=0)
    total_train_delay_min: int = Field(..., ge=0)

    created_at: datetime = Field(default_factory=datetime.now)

    @model_validator(mode="after")
    def validate_blocks_saved(self):
        expected_saved = (
            self.baseline_blocks_count - self.total_blocks_count
        )

        if self.blocks_saved != expected_saved:
            raise ValueError(
                "blocks_saved must equal baseline_blocks_count "
                "minus total_blocks_count."
            )

        return self


# =========================================================
# 7. maintenance_blocks
# =========================================================

class MaintenanceBlock(BaseModel):
    block_id: str = Field(..., min_length=1)
    plan_id: str = Field(..., min_length=1)
    section_id: str = Field(..., min_length=1)

    block_start_min: int = Field(..., ge=0)
    block_end_min: int = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_block_time_order(self):
        if self.block_end_min <= self.block_start_min:
            raise ValueError(
                "block_end_min must be later than block_start_min."
            )
        return self

    @property
    def duration_min(self) -> int:
        return self.block_end_min - self.block_start_min


# =========================================================
# 8. scheduled_tasks
# =========================================================

class ScheduledTask(BaseModel):
    # Database-generated SQLite integer primary key.
    # None before insertion; populated after insertion.
    id: Optional[int] = Field(default=None, ge=1)

    request_id: str = Field(..., min_length=1)
    block_id: str = Field(..., min_length=1)

    scheduled_start_min: int = Field(..., ge=0)
    scheduled_end_min: int = Field(..., ge=0)
    duration_min: int = Field(..., gt=0)

    # Negative = scheduled early.
    # Positive = scheduled late.
    start_deviation_min: int = Field(
        ...,
        description=(
            "Scheduled start minus requested window start. "
            "Negative = early; positive = late."
        ),
    )

    @model_validator(mode="after")
    def validate_task_duration(self):
        actual_duration = (
            self.scheduled_end_min - self.scheduled_start_min
        )

        if self.scheduled_end_min <= self.scheduled_start_min:
            raise ValueError(
                "scheduled_end_min must be later than "
                "scheduled_start_min."
            )

        if self.duration_min != actual_duration:
            raise ValueError(
                "duration_min must equal scheduled_end_min "
                "minus scheduled_start_min."
            )

        return self


# =========================================================
# 9. plan_explanations
# =========================================================

class PlanExplanation(BaseModel):
    # Database-generated SQLite integer primary key.
    id: Optional[int] = Field(default=None, ge=1)

    plan_id: str = Field(..., min_length=1)
    explanation_text: str = Field(..., min_length=1)