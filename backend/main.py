import datetime
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from ml_inference import apply_ml_predictions
from replanner import generate_fallback_plans_from_ml

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database.connection import (
    get_connection,
    initialize_database,
    save_optimization_result,
)
from logic import solve_block_schedule, OptimizationResult
from models import (
    Disruption,
    MaintenanceRequest,
    Section,
    TrainSchedule,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Railway Block Planning System",
    description="AI-assisted railway maintenance block planning system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_station_map(connection) -> Dict[str, str]:
    rows = connection.execute("SELECT id, name FROM stations").fetchall()
    return {row["id"]: row["name"] for row in rows}


def get_section_map(connection) -> Dict[str, dict]:
    rows = connection.execute("SELECT * FROM sections").fetchall()
    stations = get_station_map(connection)
    result = {}
    for r in rows:
        d = dict(r)
        src = stations.get(d["source_station_id"], d["source_station_id"])
        tgt = stations.get(d["target_station_id"], d["target_station_id"])
        d["corridor_label"] = f"{src} → {tgt}"
        result[d["id"]] = d
    return result


def dept_to_label(code: str) -> str:
    mapping = {
        "TRACK": "Engineering",
        "SIGNAL": "S&T",
        "OHE": "Traction Distribution",
    }
    return mapping.get(code, code)


def label_to_dept(label: str) -> str:
    mapping = {
        "Engineering": "TRACK",
        "S&T": "SIGNAL",
        "Traction Distribution": "OHE",
        "TRACK": "TRACK",
        "SIGNAL": "SIGNAL",
        "OHE": "OHE",
    }
    return mapping.get(label, label)


class OptimizationRequest(BaseModel):
    trains: list[TrainSchedule]
    maintenance_requests: list[MaintenanceRequest]
    sections: list[Section]
    disruptions: list[Disruption] = Field(default_factory=list)
    objective_type: str = "BALANCED"


class ModifyMaintenanceRequest(BaseModel):
    request: dict = Field(default_factory=dict)
    meta: dict = Field(default_factory=dict)
    actor: Optional[str] = None


class DatabaseOptimizationRequest(BaseModel):
    request_ids: list[str] = Field(default_factory=list)
    objective_type: str = "BALANCED"


class RejectMaintenanceRequest(BaseModel):
    reason: str = Field(..., min_length=1)
    actor: Optional[str] = None


class RejectPlanRequest(BaseModel):
    reason: str = Field(default="Rejected by Planner")


class ModifyPlanRequest(BaseModel):
    changes: dict = Field(default_factory=dict)


class CreateDisruptionRequest(BaseModel):
    section_id: str
    type: Optional[str] = None
    disruption_type: Optional[str] = None
    start_time_min: int = 0
    end_time_min: Optional[int] = None
    delay_minutes: int = 0
    severity: int = 2
    description: Optional[str] = ""


class SimulationRequest(BaseModel):
    type: str = "train_delay"
    corridor: Optional[str] = None
    section_id: Optional[str] = None
    train_id: Optional[str] = None
    train_delay_min: Optional[int] = 30
    external_delays: Optional[Dict[str, int]] = None
    disruption_type: Optional[str] = None
    notes: Optional[str] = None
    minutes: Optional[int] = 15


@app.get("/")
def root():
    return {
        "message": "Railway Block Planning API is running",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/stations")
def get_stations():
    connection = get_connection()
    try:
        rows = connection.execute("SELECT * FROM stations ORDER BY id").fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@app.get("/sections")
def get_sections():
    connection = get_connection()
    try:
        rows = connection.execute("SELECT * FROM sections ORDER BY id").fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@app.get("/corridors")
def get_corridors():
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        corridors = list({s["corridor_label"] for s in sections.values()})
        return corridors
    finally:
        connection.close()


@app.get("/trains")
def get_trains():
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        rows = connection.execute(
            """
            SELECT
                train_id,
                train_name,
                priority,
                section_id,
                entry_time_min,
                exit_time_min,
                delay_minutes,
                status
            FROM train_schedules
            ORDER BY entry_time_min ASC
            """
        ).fetchall()

        now_date = datetime.date.today().isoformat()
        trains = []
        for r in rows:
            sec = sections.get(r["section_id"], {})
            corridor = sec.get("corridor_label", r["section_id"])

            entry_min = r["entry_time_min"]
            exit_min = r["exit_time_min"]
            start_dt = datetime.datetime.fromisoformat(f"{now_date}T00:00:00") + datetime.timedelta(minutes=entry_min)
            end_dt = datetime.datetime.fromisoformat(f"{now_date}T00:00:00") + datetime.timedelta(minutes=exit_min)

            train_type = "freight" if r["priority"] == 2 and ("Goods" in r["train_name"] or "Freight" in r["train_name"]) else "passenger"

            trains.append({
                "id": r["train_id"],
                "train_id": r["train_id"],
                "name": r["train_name"],
                "train_name": r["train_name"],
                "priority": "High" if r["priority"] == 1 else "Normal",
                "raw_priority": r["priority"],
                "type": train_type,
                "section_id": r["section_id"],
                "corridor": corridor,
                "entry_time_min": entry_min,
                "exit_time_min": exit_min,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "delay_minutes": r["delay_minutes"],
                "status": r["status"],
            })

        return trains
    finally:
        connection.close()


@app.get("/maintenance-requests")
def get_maintenance_requests():
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT
                mr.*,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM scheduled_tasks st
                        WHERE st.request_id = mr.id
                    )
                    THEN 'PLANNED'
                    ELSE 'UNPLANNED'
                END AS planning_status,
                (
                    SELECT mb.plan_id
                    FROM scheduled_tasks st
                    JOIN maintenance_blocks mb
                        ON st.block_id = mb.block_id
                    WHERE st.request_id = mr.id
                    ORDER BY mb.plan_id DESC
                    LIMIT 1
                ) AS plan_id
            FROM maintenance_requests mr
            ORDER BY mr.rowid DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


@app.post("/maintenance-requests")
def create_maintenance_request(request: MaintenanceRequest):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO maintenance_requests (
                id,
                department,
                section_id,
                asset_id,
                asset_type,
                window_start_min,
                window_end_min,
                base_duration_min,
                predicted_duration_min,
                crew_size,
                priority,
                is_night,
                status,
                planning_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'UNPLANNED')
            """,
            (
                request.id,
                request.department,
                request.section_id,
                request.asset_id,
                request.asset_type,
                request.window_start_min,
                request.window_end_min,
                request.base_duration_min,
                request.predicted_duration_min,
                request.crew_size,
                request.priority,
                1 if request.is_night else 0,
            ),
        )
        conn.commit()
        return {
            "message": "Maintenance request created successfully",
            "request": request.model_dump(),
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@app.post("/maintenance-requests/{request_id}/approve")
def approve_maintenance_request(request_id: str):
    connection = get_connection()
    try:
        request = connection.execute(
            "SELECT id, status FROM maintenance_requests WHERE id = ?",
            (request_id,),
        ).fetchone()

        if request is None:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        if request["status"] != "PENDING":
            raise HTTPException(
                status_code=400, detail=f"Request is already {request['status']}"
            )

        connection.execute(
            """
            UPDATE maintenance_requests
            SET status = 'APPROVED',
                rejection_reason = NULL
            WHERE id = ?
            """,
            (request_id,),
        )
        connection.commit()
        return {
            "message": "Maintenance request approved successfully",
            "request_id": request_id,
            "status": "APPROVED",
        }
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.post("/maintenance-requests/{request_id}/reject")
def reject_maintenance_request(request_id: str, rejection: RejectMaintenanceRequest):
    connection = get_connection()
    try:
        request = connection.execute(
            "SELECT id, status FROM maintenance_requests WHERE id = ?",
            (request_id,),
        ).fetchone()

        if request is None:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        if request["status"] != "PENDING":
            raise HTTPException(
                status_code=400, detail=f"Request is already {request['status']}"
            )

        connection.execute(
            """
            UPDATE maintenance_requests
            SET status = 'REJECTED',
                rejection_reason = ?
            WHERE id = ?
            """,
            (rejection.reason, request_id),
        )
        connection.commit()
        return {
            "message": "Maintenance request rejected successfully",
            "request_id": request_id,
            "status": "REJECTED",
            "rejection_reason": rejection.reason,
        }
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.patch("/maintenance-requests/{request_id}")
def modify_maintenance_request(request_id: str, changes: ModifyMaintenanceRequest):
    connection = get_connection()
    try:
        existing = connection.execute(
            "SELECT * FROM maintenance_requests WHERE id = ?",
            (request_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        if existing["status"] == "REJECTED":
            raise HTTPException(status_code=400, detail="Rejected requests cannot be modified")

        allowed_fields = {
            "department",
            "section_id",
            "asset_id",
            "asset_type",
            "window_start_min",
            "window_end_min",
            "base_duration_min",
            "predicted_duration_min",
            "crew_size",
            "priority",
            "is_night",
        }

        update_data = {
            key: value
            for key, value in changes.request.items()
            if key in allowed_fields
        }

        if not update_data:
            return {
                "message": "No maintenance request fields to modify",
                "request_id": request_id,
                "status": existing["status"],
                "actor": changes.actor,
            }

        current = dict(existing)
        current.update(update_data)

        if current["window_end_min"] <= current["window_start_min"]:
            raise HTTPException(
                status_code=422,
                detail="window_end_min must be greater than window_start_min",
            )
        if current["base_duration_min"] <= 0:
            raise HTTPException(
                status_code=422,
                detail="base_duration_min must be greater than 0",
            )
        if current["crew_size"] < 1:
            raise HTTPException(
                status_code=422,
                detail="crew_size must be at least 1",
            )

        set_clause = ", ".join(f"{field} = ?" for field in update_data)
        values = list(update_data.values())
        values.append(request_id)

        connection.execute(
            f"UPDATE maintenance_requests SET {set_clause} WHERE id = ?",
            values,
        )
        connection.commit()

        updated = connection.execute(
            "SELECT * FROM maintenance_requests WHERE id = ?",
            (request_id,),
        ).fetchone()

        return {
            "message": "Maintenance request modified successfully",
            "request_id": request_id,
            "status": updated["status"],
            "request": dict(updated),
            "actor": changes.actor,
        }
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.get("/block-requests")
def get_block_requests(
    department: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = None,
):
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        raw_dept = label_to_dept(department) if department else None

        rows = connection.execute(
            """
            SELECT
                mr.*,
                s.source_station_id,
                s.target_station_id,
                CASE
                    WHEN mr.status = 'REJECTED' THEN 'Rejected'
                    WHEN EXISTS (
                        SELECT 1 FROM scheduled_tasks st WHERE st.request_id = mr.id
                    ) THEN 'Planned'
                    WHEN mr.status = 'APPROVED' THEN 'Approved'
                    ELSE 'Pending Review'
                END AS planning_status
            FROM maintenance_requests mr
            LEFT JOIN sections s ON mr.section_id = s.id
            ORDER BY mr.rowid DESC
            """
        ).fetchall()

        now_date = datetime.date.today().isoformat()
        block_requests = []

        for row in rows:
            r = dict(row)
            sec = sections.get(r["section_id"], {})
            section_name = sec.get("corridor_label", r["section_id"])

            duration = (
                r["predicted_duration_min"]
                if r["predicted_duration_min"] is not None
                else r["base_duration_min"]
            )

            task_rows = connection.execute(
                "SELECT id FROM scheduled_tasks WHERE request_id = ?",
                (r["id"],),
            ).fetchall()
            task_ids = [str(t["id"]) for t in task_rows] or [r["id"]]

            frontend_status = r["planning_status"]
            if r["status"] == "APPROVED" and not task_rows:
                frontend_status = "Approved"
            elif r["status"] == "PENDING":
                frontend_status = "Pending Review"
            elif r["status"] == "REJECTED":
                frontend_status = "Rejected"
            elif task_rows:
                frontend_status = "Planned"

            start_dt = datetime.datetime.fromisoformat(f"{now_date}T00:00:00") + datetime.timedelta(minutes=r["window_start_min"])

            block_requests.append({
                "id": r["id"],
                "department": dept_to_label(r["department"]),
                "raw_department": r["department"],
                "sectionId": r["section_id"],
                "rawSectionId": r["section_id"],
                "corridor": section_name,
                "requestedStart": start_dt.isoformat(),
                "windowStartMin": r["window_start_min"],
                "windowEndMin": r["window_end_min"],
                "durationMins": duration,
                "priority": "High" if r["priority"] == 1 else "Normal",
                "status": frontend_status,
                "taskIds": task_ids,
                "bundleGroup": None,
                "conflictsWith": [],
                "source": "employee-workflow",
                "planningStatus": r["planning_status"],
                "assetId": r["asset_id"],
                "assetType": r["asset_type"],
                "crewSize": r["crew_size"],
                "description": f"{dept_to_label(r['department'])} maintenance work",
                "rejectionReason": r.get("rejection_reason"),
            })

        if raw_dept or department:
            block_requests = [
                b for b in block_requests
                if b["department"] == department or b["raw_department"] == raw_dept or b["department"] == dept_to_label(department)
            ]

        if status:
            block_requests = [
                b for b in block_requests
                if b["status"].lower() == status.lower() or b["planningStatus"].lower() == status.lower()
            ]

        if priority:
            p_val = "High" if str(priority) in ("1", "High") else "Normal"
            block_requests = [b for b in block_requests if b["priority"] == p_val]

        if search:
            q = search.lower()
            block_requests = [
                b for b in block_requests
                if (
                    q in b["id"].lower()
                    or q in b["department"].lower()
                    or q in b["corridor"].lower()
                )
            ]

        return block_requests
    finally:
        connection.close()


@app.get("/tasks")
def get_tasks(
    department: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    overdueOnly: Optional[bool] = None,
    search: Optional[str] = None,
):
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        rows = connection.execute(
            """
            SELECT
                mr.*,
                CASE
                    WHEN mr.status = 'REJECTED' THEN 'Rejected'
                    WHEN EXISTS (
                        SELECT 1 FROM scheduled_tasks st WHERE st.request_id = mr.id
                    ) THEN 'Scheduled'
                    WHEN mr.status = 'APPROVED' THEN 'Approved'
                    ELSE 'Pending'
                END AS computed_status
            FROM maintenance_requests mr
            ORDER BY mr.rowid DESC
            """
        ).fetchall()

        now_date = datetime.date.today().isoformat()
        tasks = []

        for row in rows:
            r = dict(row)
            sec = sections.get(r["section_id"], {})
            corridor = sec.get("corridor_label", r["section_id"])
            dept_name = dept_to_label(r["department"])

            duration = r["predicted_duration_min"] or r["base_duration_min"]
            sev = "Critical" if r["priority"] == 1 else "Medium"
            crit = 88 if r["priority"] == 1 else 62

            tasks.append({
                "id": r["id"],
                "department": dept_name,
                "raw_department": r["department"],
                "asset": r["asset_id"] or f"{dept_name} Asset",
                "asset_id": r["asset_id"],
                "asset_type": r["asset_type"],
                "location": r["section_id"],
                "section_id": r["section_id"],
                "corridor": corridor,
                "defect": f"Routine {dept_name} inspection & maintenance",
                "severity": sev,
                "criticality": crit,
                "dueDate": now_date,
                "predictedDurationMins": duration,
                "status": r["computed_status"],
                "source": "Employee request",
            })

        if department:
            tasks = [t for t in tasks if t["department"] == department or t["raw_department"] == department or t["department"] == dept_to_label(department)]

        if severity:
            tasks = [t for t in tasks if t["severity"].lower() == severity.lower()]

        if status:
            tasks = [t for t in tasks if t["status"].lower() == status.lower()]

        if overdueOnly:
            tasks = [t for t in tasks if t["status"] == "Pending"]

        if search:
            q = search.lower()
            tasks = [
                t for t in tasks
                if (
                    q in t["id"].lower()
                    or q in t["asset"].lower()
                    or q in t["location"].lower()
                    or q in t["corridor"].lower()
                    or q in t["defect"].lower()
                )
            ]

        return tasks
    finally:
        connection.close()


@app.get("/tasks/{task_id}")
def get_task_by_id(task_id: str):
    tasks = get_tasks(search=task_id)
    match = next((t for t in tasks if t["id"] == task_id), None)
    if match:
        return match
    raise HTTPException(status_code=404, detail="Task not found")


@app.get("/maintenance/bundling-opportunities")
def get_bundling_opportunities():
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        rows = connection.execute(
            """
            SELECT *
            FROM maintenance_requests
            WHERE status != 'REJECTED'
            ORDER BY section_id, window_start_min
            """
        ).fetchall()

        by_section = {}
        for r in rows:
            d = dict(r)
            by_section.setdefault(d["section_id"], []).append(d)

        opportunities = []
        opp_id = 1
        for sec_id, reqs in by_section.items():
            if len(reqs) < 2:
                continue
            depts = {r["department"] for r in reqs}
            if len(depts) >= 2:
                sec = sections.get(sec_id, {})
                corridor = sec.get("corridor_label", sec_id)
                min_start = min(r["window_start_min"] for r in reqs)
                max_end = max(r["window_end_min"] for r in reqs)
                saved_hrs = sum(r["base_duration_min"] for r in reqs) // 60

                opportunities.append({
                    "id": f"BND-{opp_id:03d}",
                    "corridor": corridor,
                    "sectionId": sec_id,
                    "taskIds": [r["id"] for r in reqs],
                    "departments": [dept_to_label(dept) for dept in depts],
                    "windowStartMin": min_start,
                    "windowEndMin": max_end,
                    "estimatedSavingsHours": max(1, saved_hrs),
                    "confidenceScore": 92,
                    "reasoning": f"Coordinating {len(reqs)} tasks across {len(depts)} departments on {sec_id} reduces total track possession time.",
                })
                opp_id += 1

        return opportunities
    finally:
        connection.close()


@app.post("/optimize")
def optimize(request: OptimizationRequest):
    connection = get_connection()
    try:
        request_ids = [r.id for r in request.maintenance_requests]

        if len(request_ids) != len(set(request_ids)):
            raise HTTPException(status_code=400, detail="Duplicate maintenance request IDs supplied.")

        if not request_ids:
            raise HTTPException(status_code=400, detail="No maintenance requests supplied.")

        placeholders = ",".join("?" for _ in request_ids)
        rows = connection.execute(
            f"SELECT id, status FROM maintenance_requests WHERE id IN ({placeholders})",
            request_ids,
        ).fetchall()

        status_by_id = {row["id"]: row["status"] for row in rows}

        missing_ids = [r_id for r_id in request_ids if r_id not in status_by_id]
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail={"message": "Maintenance request(s) not found.", "request_ids": missing_ids},
            )

        non_approved = [
            {"id": r_id, "status": status_by_id[r_id]}
            for r_id in request_ids
            if status_by_id[r_id] != "APPROVED"
        ]
        if non_approved:
            raise HTTPException(
                status_code=400,
                detail={"message": "Only APPROVED maintenance requests can be optimized.", "requests": non_approved},
            )

        ml_requests = apply_ml_predictions(
            requests=request.maintenance_requests,
            sections=request.sections,
        )

        result = solve_block_schedule(
            requests=ml_requests,
            trains=request.trains,
            sections=request.sections,
            disruptions=request.disruptions,
            objective_type=request.objective_type,
        )

        for ml_request in ml_requests:
            connection.execute(
                """
                UPDATE maintenance_requests
                SET predicted_duration_min = ?,
                    prediction_confidence = ?
                WHERE id = ?
                """,
                (
                    ml_request.predicted_duration_min,
                    ml_request.prediction_confidence,
                    ml_request.id,
                ),
            )

        connection.commit()

        save_optimization_result(connection, result)

        final_plan_id = result.plan.plan_id

        for block in result.blocks:
                block_number = block.block_id.split("_B")[-1]
                block.plan_id = final_plan_id
                block.block_id = f"{final_plan_id}_B{block_number}"

        for task in result.scheduled_tasks:
                task_block_number = task.block_id.split("_B")[-1]
                task.block_id = f"{final_plan_id}_B{task_block_number}"

        for explanation in result.explanations:
                explanation.plan_id = final_plan_id

        return result

    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.post("/optimize/database")
def optimize_from_database(payload: DatabaseOptimizationRequest = DatabaseOptimizationRequest()):
    connection = get_connection()
    try:
        train_rows = connection.execute("SELECT * FROM train_schedules").fetchall()

        if payload.request_ids:
            placeholders = ",".join("?" for _ in payload.request_ids)
            request_rows = connection.execute(
                f"""
                SELECT *
                FROM maintenance_requests
                WHERE status = 'APPROVED'
                  AND planning_status = 'UNPLANNED'
                  AND id IN ({placeholders})
                """,
                payload.request_ids,
            ).fetchall()
        else:
            request_rows = connection.execute(
                """
                SELECT *
                FROM maintenance_requests
                WHERE status = 'APPROVED'
                  AND planning_status = 'UNPLANNED'
                """
            ).fetchall()

        section_rows = connection.execute("SELECT * FROM sections").fetchall()
        disruption_rows = connection.execute("SELECT * FROM disruptions").fetchall()

        trains = [TrainSchedule(**dict(row)) for row in train_rows]
        maintenance_requests = [MaintenanceRequest(**dict(row)) for row in request_rows]
        sections = [Section(**dict(row)) for row in section_rows]
        disruptions = [Disruption(**dict(row)) for row in disruption_rows]

        ml_requests = apply_ml_predictions(
            requests=maintenance_requests,
            sections=sections,
        )

        for ml_request in ml_requests:
            connection.execute(
                """
                UPDATE maintenance_requests
                SET predicted_duration_min = ?,
                    prediction_confidence = ?
                WHERE id = ?
                """,
                (
                    ml_request.predicted_duration_min,
                    ml_request.prediction_confidence,
                    ml_request.id,
                ),
            )

        connection.commit()

        plans = generate_fallback_plans_from_ml(
            ml_requests=ml_requests,
            trains=trains,
            sections=sections,
            disruptions=disruptions,
            emergency_inserts=[],
            parallel=False,
            sort_by_rank=False,
        )

        return plans

    finally:
        connection.close()


@app.get("/plans")
def get_plans():
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT *
            FROM block_plans
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


@app.get("/plans/{plan_id}")
def get_plan(plan_id: str):
    connection = get_connection()
    try:
        plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        blocks = connection.execute(
            "SELECT * FROM maintenance_blocks WHERE plan_id = ? ORDER BY block_start_min",
            (plan_id,),
        ).fetchall()

        tasks = connection.execute(
            """
            SELECT st.*
            FROM scheduled_tasks st
            JOIN maintenance_blocks mb ON st.block_id = mb.block_id
            WHERE mb.plan_id = ?
            ORDER BY st.scheduled_start_min
            """,
            (plan_id,),
        ).fetchall()

        explanations = connection.execute(
            "SELECT * FROM plan_explanations WHERE plan_id = ? ORDER BY id",
            (plan_id,),
        ).fetchall()

        return {
            "plan": dict(plan),
            "blocks": [dict(row) for row in blocks],
            "scheduled_tasks": [dict(row) for row in tasks],
            "explanations": [dict(row) for row in explanations],
        }
    finally:
        connection.close()


@app.get("/plans/{plan_id}/dashboard")
def get_plan_dashboard(plan_id: str):
    connection = get_connection()
    try:
        plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        blocks = connection.execute(
            "SELECT * FROM maintenance_blocks WHERE plan_id = ? ORDER BY block_start_min",
            (plan_id,),
        ).fetchall()

        tasks = connection.execute(
            """
            SELECT st.*
            FROM scheduled_tasks st
            JOIN maintenance_blocks mb ON st.block_id = mb.block_id
            WHERE mb.plan_id = ?
            ORDER BY st.scheduled_start_min
            """,
            (plan_id,),
        ).fetchall()

        explanations = connection.execute(
            "SELECT * FROM plan_explanations WHERE plan_id = ? ORDER BY id",
            (plan_id,),
        ).fetchall()

        return {
            "plan": dict(plan),
            "summary": {
                "total_blocks": plan["total_blocks_count"],
                "baseline_blocks": plan["baseline_blocks_count"],
                "blocks_saved": plan["blocks_saved"],
                "total_wait_time_min": plan["total_wait_time_min"],
                "total_train_delay_min": plan["total_train_delay_min"],
            },
            "blocks": [dict(row) for row in blocks],
            "scheduled_tasks": [dict(row) for row in tasks],
            "explanations": [dict(row) for row in explanations],
        }
    finally:
        connection.close()


@app.post("/plans/{plan_id}/approve")
def approve_plan(plan_id: str):
    connection = get_connection()
    try:
        plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        connection.execute(
            "UPDATE block_plans SET status = 'APPROVED' WHERE plan_id = ?",
            (plan_id,),
        )

        connection.execute(
            """
            UPDATE maintenance_requests
            SET planning_status = 'PLANNED',
                plan_id = ?
            WHERE id IN (
                SELECT st.request_id
                FROM scheduled_tasks st
                JOIN maintenance_blocks mb ON st.block_id = mb.block_id
                WHERE mb.plan_id = ?
            )
            """,
            (plan_id, plan_id),
        )

        connection.commit()

        updated_plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        return {
            "message": "Plan approved successfully.",
            "plan": dict(updated_plan),
        }
    finally:
        connection.close()

@app.post("/plans/approve")
def approve_selected_plan(result: OptimizationResult):
    connection = get_connection()

    try:
        # Save ONLY the selected candidate
        save_optimization_result(
            connection,
            result,
        )

        # save_optimization_result() assigns the real database ID
        plan_id = result.plan.plan_id

        # Approve the saved plan
        connection.execute(
            """
            UPDATE block_plans
            SET status = 'APPROVED'
            WHERE plan_id = ?
            """,
            (plan_id,),
        )

        # Mark only requests belonging to this selected plan as planned
        connection.execute(
            """
            UPDATE maintenance_requests
            SET planning_status = 'PLANNED',
                plan_id = ?
            WHERE id IN (
                SELECT st.request_id
                FROM scheduled_tasks st
                JOIN maintenance_blocks mb
                    ON st.block_id = mb.block_id
                WHERE mb.plan_id = ?
            )
            """,
            (plan_id, plan_id),
        )

        connection.commit()

        updated_plan = connection.execute(
            """
            SELECT *
            FROM block_plans
            WHERE plan_id = ?
            """,
            (plan_id,),
        ).fetchone()

        return {
            "message": "Selected plan approved successfully.",
            "plan": dict(updated_plan),
        }

    finally:
        connection.close()

@app.post("/plans/{plan_id}/reject")
def reject_plan(plan_id: str, payload: RejectPlanRequest = RejectPlanRequest()):
    connection = get_connection()
    try:
        plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        connection.execute(
            "UPDATE block_plans SET status = 'REJECTED' WHERE plan_id = ?",
            (plan_id,),
        )
        connection.commit()

        updated_plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        return {
            "message": f"Plan {plan_id} rejected: {payload.reason}",
            "plan": dict(updated_plan),
        }
    finally:
        connection.close()


@app.post("/plans/{plan_id}/modify")
def modify_plan(plan_id: str, payload: ModifyPlanRequest = ModifyPlanRequest()):
    connection = get_connection()
    try:
        plan = connection.execute(
            "SELECT * FROM block_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail="Plan not found")

        return {
            "message": f"Plan {plan_id} updated.",
            "plan_id": plan_id,
            "status": "DRAFT",
            "changes": payload.changes,
        }
    finally:
        connection.close()


@app.post("/plans/{plan_id}/reoptimize")
def reoptimize_plan(plan_id: str):
    connection = get_connection()
    try:
        req_rows = connection.execute(
            """
            SELECT mr.*
            FROM maintenance_requests mr
            JOIN scheduled_tasks st ON mr.id = st.request_id
            JOIN maintenance_blocks mb ON st.block_id = mb.block_id
            WHERE mb.plan_id = ?
            """,
            (plan_id,),
        ).fetchall()

        if not req_rows:
            req_rows = connection.execute(
                "SELECT * FROM maintenance_requests WHERE status = 'APPROVED'"
            ).fetchall()

        train_rows = connection.execute("SELECT * FROM train_schedules").fetchall()
        section_rows = connection.execute("SELECT * FROM sections").fetchall()
        disruption_rows = connection.execute("SELECT * FROM disruptions").fetchall()

        trains = [TrainSchedule(**dict(row)) for row in train_rows]
        requests = [MaintenanceRequest(**dict(row)) for row in req_rows]
        sections = [Section(**dict(row)) for row in section_rows]
        disruptions = [Disruption(**dict(row)) for row in disruption_rows]

        result = solve_block_schedule(
            requests=requests,
            trains=trains,
            sections=sections,
            disruptions=disruptions,
            plan_name=f"Re-optimized Plan from {plan_id}",
        )

        save_optimization_result(connection, result)
        return result
    finally:
        connection.close()


@app.get("/dashboard/summary")
def get_dashboard_summary(department: Optional[str] = None):
    connection = get_connection()
    try:
        raw_dept = label_to_dept(department) if department else None

        req_query = "SELECT * FROM maintenance_requests"
        params = []
        if raw_dept:
            req_query += " WHERE department = ?"
            params.append(raw_dept)

        req_rows = connection.execute(req_query, params).fetchall()
        reqs = [dict(r) for r in req_rows]

        plans_count = connection.execute("SELECT COUNT(*) FROM block_plans").fetchone()[0]
        disruptions_count = connection.execute("SELECT COUNT(*) FROM disruptions").fetchone()[0]

        critical = len([r for r in reqs if r["priority"] == 1])
        pending = len([r for r in reqs if r["status"] == "PENDING"])
        approved = len([r for r in reqs if r["status"] == "APPROVED"])

        return {
            "assetAvailabilityPct": 88,
            "criticalTasks": critical,
            "overdueTasks": len([r for r in reqs if r["status"] == "PENDING" and r["priority"] == 1]),
            "blockUtilizationPct": 74,
            "trainConflicts": disruptions_count,
            "departmentTaskCount": len(reqs),
            "pendingBlockRequests": pending,
            "approvedBlockRequests": approved,
            "scopeDepartment": department,
            "activePlans": plans_count,
        }
    finally:
        connection.close()


@app.get("/blocks/recommended")
def get_recommended_block():
    connection = get_connection()
    try:
        sections = get_section_map(connection)
        rows = connection.execute(
            """
            SELECT *
            FROM maintenance_requests
            WHERE status = 'APPROVED'
            ORDER BY window_start_min ASC
            LIMIT 3
            """
        ).fetchall()

        if not rows:
            rows = connection.execute(
                "SELECT * FROM maintenance_requests LIMIT 2"
            ).fetchall()

        reqs = [dict(r) for r in rows]
        if reqs:
            first = reqs[0]
            sec = sections.get(first["section_id"], {})
            corridor = sec.get("corridor_label", first["section_id"])
            depts = list({dept_to_label(r["department"]) for r in reqs})
            task_ids = [r["id"] for r in reqs]
            start_min = min(r["window_start_min"] for r in reqs)
            duration = sum(r["base_duration_min"] for r in reqs)

            return {
                "id": f"REC-{first['section_id']}",
                "corridor": corridor,
                "sectionId": first["section_id"],
                "startMin": start_min,
                "durationMins": duration,
                "departments": depts,
                "taskIds": task_ids,
                "confidenceScore": 94,
                "reasoning": f"Optimal zero-conflict maintenance window identified for {corridor} bundling {len(task_ids)} tasks across {len(depts)} departments.",
            }

        return {
            "id": "REC-SEC001",
            "corridor": "New Delhi → Ghaziabad",
            "sectionId": "SEC001",
            "startMin": 90,
            "durationMins": 75,
            "departments": ["Engineering", "S&T"],
            "taskIds": ["M001", "M002"],
            "confidenceScore": 95,
            "reasoning": "Bundled track and signal maintenance during lowest train occupancy window.",
        }
    finally:
        connection.close()


@app.get("/data-sources")
def get_data_sources(department: Optional[str] = None):
    sources = [
        {"key": "tms", "label": "TMS", "fullName": "Train Management System", "owner": "Operations", "status": "active", "lastSyncMinutesAgo": 3, "recordCount": 11420},
        {"key": "smms", "label": "SMMS", "fullName": "Signal Maintenance Management System", "owner": "S&T", "status": "active", "lastSyncMinutesAgo": 7, "recordCount": 4210},
        {"key": "tdms", "label": "TDMS", "fullName": "Traction Distribution Management System", "owner": "Traction Distribution", "status": "active", "lastSyncMinutesAgo": 5, "recordCount": 3890},
        {"key": "tgc", "label": "Track Geometry", "fullName": "Track Geometry Car OMS Data", "owner": "Engineering", "status": "active", "lastSyncMinutesAgo": 12, "recordCount": 8950},
        {"key": "coa", "label": "COA", "fullName": "Control Office Application", "owner": "Operations", "status": "active", "lastSyncMinutesAgo": 2, "recordCount": 15600},
        {"key": "timetable", "label": "Timetable", "fullName": "Working Time Table & Freight Forecast", "owner": "Operations", "status": "active", "lastSyncMinutesAgo": 1, "recordCount": 670},
    ]
    if department:
        sources = [s for s in sources if s["owner"] == department or s["owner"] == "Operations"]
    return sources


@app.get("/data-processing/pipeline")
def get_processing_pipeline():
    now_iso = datetime.datetime.now().isoformat()
    return {
        "overallDataQualityScore": 96,
        "lastRunAt": now_iso,
        "lastRunDurationSec": 28,
        "stages": [
            {"id": "ingest", "name": "Multi-Source Ingestion", "status": "completed", "recordCount": 44740, "processingTimeSec": 4, "lastSuccessAt": now_iso},
            {"id": "validate", "name": "Schema & Integrity Validation", "status": "completed", "recordCount": 44740, "processingTimeSec": 5, "lastSuccessAt": now_iso},
            {"id": "dedup", "name": "Normalization & Deduplication", "status": "completed", "recordCount": 43910, "processingTimeSec": 6, "lastSuccessAt": now_iso},
            {"id": "ml", "name": "ML Duration & Criticality Scoring", "status": "completed", "recordCount": 43910, "processingTimeSec": 4, "lastSuccessAt": now_iso},
            {"id": "conflict", "name": "Spatio-Temporal Conflict Check", "status": "completed", "recordCount": 43910, "processingTimeSec": 5, "lastSuccessAt": now_iso},
            {"id": "unified", "name": "Unified Optimization Dataset", "status": "completed", "recordCount": 43910, "processingTimeSec": 4, "lastSuccessAt": now_iso},
        ],
    }


@app.get("/data-processing/quality-issues")
def get_data_quality_issues():
    return {
        "duplicates": {"count": 4, "severity": "warning", "label": "Duplicate defect entries merged across SMMS/TMS"},
        "missingFields": {"count": 2, "severity": "warning", "label": "Asset coordinates imputed from Section ID"},
        "timestampMismatch": {"count": 0, "severity": "healthy", "label": "Time synchronization within 50ms across SCADA/COA"},
        "formatAnomalies": {"count": 1, "severity": "warning", "label": "Standardized non-standard train number formats"},
    }


@app.get("/data-processing/unified-dataset")
def get_unified_dataset_summary():
    connection = get_connection()
    try:
        sections_count = connection.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
        trains_count = connection.execute("SELECT COUNT(*) FROM train_schedules").fetchone()[0]
        requests_count = connection.execute("SELECT COUNT(*) FROM maintenance_requests").fetchone()[0]

        return {
            "totalEntities": sections_count + trains_count + requests_count,
            "sectionsCovered": sections_count,
            "trainSchedulesLoaded": trains_count,
            "maintenanceRequestsActive": requests_count,
            "lastSyncedAt": datetime.datetime.now().isoformat(),
        }
    finally:
        connection.close()


@app.post("/data-processing/run")
def run_data_processing():
    return get_processing_pipeline()


@app.get("/disruptions")
def get_disruptions():
    connection = get_connection()
    try:
        rows = connection.execute("SELECT * FROM disruptions ORDER BY rowid DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        connection.close()


@app.post("/disruptions")
def create_disruption(payload: CreateDisruptionRequest):
    connection = get_connection()
    try:
        count = connection.execute("SELECT COUNT(*) FROM disruptions").fetchone()[0]
        disruption_id = f"D{count + 1:03d}"
        dtype = payload.disruption_type or payload.type or "SECTION_BLOCKED"

        connection.execute(
            """
            INSERT INTO disruptions (
                id,
                section_id,
                disruption_type,
                start_time_min,
                end_time_min,
                delay_minutes,
                severity,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                disruption_id,
                payload.section_id,
                dtype,
                payload.start_time_min,
                payload.end_time_min,
                payload.delay_minutes,
                payload.severity,
                payload.description or "",
            ),
        )
        connection.commit()

        row = connection.execute(
            "SELECT * FROM disruptions WHERE id = ?",
            (disruption_id,),
        ).fetchone()
        return dict(row)
    finally:
        connection.close()


@app.post("/simulation")
def run_simulation(scenario: SimulationRequest):
    connection = get_connection()
    try:
        req_rows = connection.execute(
            "SELECT * FROM maintenance_requests WHERE status = 'APPROVED'"
        ).fetchall()
        train_rows = connection.execute("SELECT * FROM train_schedules ORDER BY entry_time_min ASC").fetchall()
        section_rows = connection.execute("SELECT * FROM sections").fetchall()
        station_map = get_station_map(connection)
        section_map = get_section_map(connection)

        trains = [TrainSchedule(**dict(r)) for r in train_rows]
        requests = [MaintenanceRequest(**dict(r)) for r in req_rows]
        sections = [Section(**dict(r)) for r in section_rows]

        # 1. Baseline Solve (0 injected delay)
        baseline_result = solve_block_schedule(
            requests=requests,
            trains=trains,
            sections=sections,
            plan_name="Baseline Plan",
        )

        # 2. Build What-If parameters
        external_delays = {}
        if scenario.external_delays:
            external_delays.update(scenario.external_delays)
        if scenario.train_id and scenario.train_delay_min is not None:
            external_delays[scenario.train_id] = scenario.train_delay_min

        disruptions = []
        if scenario.type in ("section_blocked", "emergency") or scenario.disruption_type:
            dtype = "SECTION_BLOCKED" if "section" in scenario.type else "EMERGENCY"
            if scenario.disruption_type:
                dtype = scenario.disruption_type
            disruptions.append(
                Disruption(
                    id=f"SIM_D_{int(datetime.datetime.now().timestamp())}",
                    section_id=scenario.section_id or (trains[0].section_id if trains else "SEC001"),
                    disruption_type=dtype,
                    start_time_min=60,
                    end_time_min=60 + (scenario.minutes or 60),
                    delay_minutes=scenario.minutes or 30,
                    severity=3,
                    description=scenario.notes or f"Simulated {dtype}",
                )
            )

        # 3. What-If Solve
        sim_plan_name = f"What-If: {scenario.type.replace('_', ' ').title()}"
        if scenario.train_id:
            sim_plan_name += f" ({scenario.train_id} +{scenario.train_delay_min}m)"

        updated_result = solve_block_schedule(
            requests=requests,
            trains=trains,
            sections=sections,
            disruptions=disruptions,
            external_delay_minutes_by_train=external_delays if external_delays else None,
            plan_name=sim_plan_name,
        )

        # 4. Compute Cascade Delays & Differences
        train_lookup = {r["train_id"]: dict(r) for r in train_rows}
        cascade_delays = []
        for dec in updated_result.train_delay_decisions:
            t_info = train_lookup.get(dec.train_id, {})
            sec_info = section_map.get(t_info.get("section_id", ""), {})
            is_primary = dec.train_id == scenario.train_id
            cascade_delays.append({
                "train_id": dec.train_id,
                "train_name": t_info.get("train_name", dec.train_id),
                "section_id": t_info.get("section_id", ""),
                "corridor": sec_info.get("corridor_label", t_info.get("section_id", "")),
                "original_entry_min": t_info.get("entry_time_min", 0),
                "original_exit_min": t_info.get("exit_time_min", 0),
                "new_entry_min": t_info.get("entry_time_min", 0) + dec.final_delay_min,
                "new_exit_min": t_info.get("exit_time_min", 0) + dec.final_delay_min,
                "injected_delay_min": dec.existing_delay_min,
                "solver_added_delay_min": dec.optimizer_added_delay_min,
                "total_delay_min": dec.final_delay_min,
                "is_primary": is_primary,
                "impact_status": "Injected Delay" if is_primary else ("Cascade Delay" if dec.final_delay_min > 0 else "On-Time"),
            })

        # 5. Compute Maintenance Block Shifts
        base_block_map = {b.section_id: b for b in baseline_result.blocks}
        block_changes = []
        affected_block_ids = []
        for b in updated_result.blocks:
            base_b = base_block_map.get(b.section_id)
            orig_start = base_b.block_start_min if base_b else b.block_start_min
            orig_end = base_b.block_end_min if base_b else b.block_end_min
            shift = b.block_start_min - orig_start
            sec_info = section_map.get(b.section_id, {})
            if shift != 0 or not base_b:
                affected_block_ids.append(b.block_id)
            block_changes.append({
                "block_id": b.block_id,
                "section_id": b.section_id,
                "corridor": sec_info.get("corridor_label", b.section_id),
                "original_start_min": orig_start,
                "original_end_min": orig_end,
                "new_start_min": b.block_start_min,
                "new_end_min": b.block_end_min,
                "duration_min": b.block_end_min - b.block_start_min,
                "shift_min": shift,
                "status": f"Shifted {shift:+d}m" if shift != 0 else "Maintained Schedule",
                "is_shifted": shift != 0,
            })

        save_optimization_result(connection, updated_result)

        delayed_trains_count = len([d for d in cascade_delays if d["total_delay_min"] > 0])
        total_delay_minutes = sum(d["total_delay_min"] for d in cascade_delays)

        return {
            "scenario": scenario.model_dump(),
            "affectedBlocks": affected_block_ids,
            "affectedTrains": delayed_trains_count,
            "newConflicts": 0,
            "cascadeDelays": cascade_delays,
            "blockChanges": block_changes,
            "before": {
                "trainConflicts": 0,
                "tasksCompleted": len(baseline_result.scheduled_tasks),
                "totalTrainDelayMin": baseline_result.plan.total_train_delay_min,
                "totalWaitTimeMin": baseline_result.plan.total_wait_time_min,
                "blocksCount": len(baseline_result.blocks),
                "blockUtilizationPct": 78,
                "assetAvailabilityPct": 92,
            },
            "after": {
                "trainConflicts": 0,
                "tasksCompleted": len(updated_result.scheduled_tasks),
                "totalTrainDelayMin": total_delay_minutes,
                "totalWaitTimeMin": updated_result.plan.total_wait_time_min,
                "blocksCount": len(updated_result.blocks),
                "blockUtilizationPct": max(50, 78 - int(total_delay_minutes * 0.1)),
                "assetAvailabilityPct": max(70, 92 - int(total_delay_minutes * 0.08)),
            },
            "updatedPlan": updated_result.model_dump(),
            "baselinePlan": baseline_result.model_dump(),
            "explanations": [e.model_dump() for e in updated_result.explanations],
        }
    finally:
        connection.close()


@app.get("/analytics")
def get_analytics():
    return {
        "assetAvailability": [
            {"date": "2026-09-06", "value": 85},
            {"date": "2026-09-07", "value": 87},
            {"date": "2026-09-08", "value": 86},
            {"date": "2026-09-09", "value": 89},
            {"date": "2026-09-10", "value": 88},
            {"date": "2026-09-11", "value": 90},
            {"date": "2026-09-12", "value": 88},
        ],
        "blockUtilization": [
            {"date": "2026-09-06", "value": 68},
            {"date": "2026-09-07", "value": 72},
            {"date": "2026-09-08", "value": 70},
            {"date": "2026-09-09", "value": 76},
            {"date": "2026-09-10", "value": 74},
            {"date": "2026-09-11", "value": 78},
            {"date": "2026-09-12", "value": 74},
        ],
    }


@app.get("/alerts")
def get_alerts(department: Optional[str] = None):
    connection = get_connection()
    try:
        disruptions = connection.execute(
            "SELECT * FROM disruptions ORDER BY rowid DESC"
        ).fetchall()

        now_iso = datetime.datetime.now().isoformat()
        alerts = []

        for d in disruptions:
            row = dict(d)
            sev = "Critical" if row["severity"] >= 3 else ("High" if row["severity"] == 2 else "Medium")
            alerts.append({
                "id": row["id"],
                "severity": sev,
                "type": row["disruption_type"],
                "message": row["description"] or f"Active disruption on section {row['section_id']}",
                "department": None,
                "relatedId": row["section_id"],
                "timestamp": now_iso,
            })

        alerts.extend([
            {
                "id": "ALT-001",
                "severity": "Critical",
                "type": "Track Defect",
                "message": "Ultrasonic flaw detected on rail joint at SEC001 KM 14.2",
                "department": "Engineering",
                "relatedId": "SEC001",
                "timestamp": now_iso,
            },
            {
                "id": "ALT-002",
                "severity": "High",
                "type": "OHE Tension Alert",
                "message": "Catenary wire tension threshold anomaly at SEC002 mast 44",
                "department": "Traction Distribution",
                "relatedId": "SEC002",
                "timestamp": now_iso,
            },
            {
                "id": "ALT-003",
                "severity": "Medium",
                "type": "Signal Interlocking",
                "message": "Point machine 102-B operating cycle time exceeded nominal threshold",
                "department": "S&T",
                "relatedId": "SEC003",
                "timestamp": now_iso,
            },
        ])

        if department:
            alerts = [a for a in alerts if a["department"] == department or a["department"] is None]

        return alerts
    finally:
        connection.close()


@app.get("/activities")
def get_activities():
    now_iso = datetime.datetime.now().isoformat()
    return [
        {"id": "ACT-101", "type": "workflow", "text": "Database connected & verified with 7 railway sections and 11 trains", "timestamp": now_iso},
        {"id": "ACT-102", "type": "system", "text": "OR-Tools CP-SAT scheduler engine initialized", "timestamp": now_iso},
        {"id": "ACT-103", "type": "workflow", "text": "Maintenance requests synced with SQLite database", "timestamp": now_iso},
    ]


@app.get("/workflow-analytics")
def get_workflow_analytics():
    connection = get_connection()
    try:
        req_rows = connection.execute("SELECT status FROM maintenance_requests").fetchall()
        total = len(req_rows)
        pending = sum(1 for r in req_rows if r["status"] == "PENDING")
        approved = sum(1 for r in req_rows if r["status"] == "APPROVED")
        rejected = sum(1 for r in req_rows if r["status"] == "REJECTED")

        latest_plan = connection.execute(
            "SELECT * FROM block_plans ORDER BY created_at DESC LIMIT 1"
        ).fetchone()

        return {
            "workflow": {
                "totalRequests": total,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "scheduled": approved,
            },
            "latestPlan": dict(latest_plan) if latest_plan else None,
            "approvalRate": round((approved / total) * 100) if total else 0,
        }
    finally:
        connection.close()
