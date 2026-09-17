import uuid

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Railway Block Planning API is running"


def test_corridors_and_sections():
    res_sec = client.get("/sections")
    assert res_sec.status_code == 200
    assert len(res_sec.json()) >= 7

    res_cor = client.get("/corridors")
    assert res_cor.status_code == 200
    assert len(res_cor.json()) >= 1


def test_trains():
    response = client.get("/trains")
    assert response.status_code == 200
    trains = response.json()
    assert len(trains) >= 11
    assert "corridor" in trains[0]
    assert "start" in trains[0]
    assert "end" in trains[0]


def test_maintenance_and_block_requests():
    res_mr = client.get("/maintenance-requests")
    assert res_mr.status_code == 200
    assert len(res_mr.json()) >= 10

    res_br = client.get("/block-requests")
    assert res_br.status_code == 200
    assert len(res_br.json()) >= 10


def test_tasks_and_bundling():
    res_tasks = client.get("/tasks")
    assert res_tasks.status_code == 200
    assert len(res_tasks.json()) >= 10

    res_bnd = client.get("/maintenance/bundling-opportunities")
    assert res_bnd.status_code == 200
    assert isinstance(res_bnd.json(), list)


def test_dashboard_and_recommendation():
    res_dash = client.get("/dashboard/summary")
    assert res_dash.status_code == 200
    data = res_dash.json()
    assert "assetAvailabilityPct" in data
    assert "blockUtilizationPct" in data

    res_rec = client.get("/blocks/recommended")
    assert res_rec.status_code == 200
    assert "corridor" in res_rec.json()


def test_data_processing():
    assert client.get("/data-sources").status_code == 200
    assert client.get("/data-processing/pipeline").status_code == 200
    assert client.get("/data-processing/quality-issues").status_code == 200
    assert client.get("/data-processing/unified-dataset").status_code == 200
    assert client.post("/data-processing/run").status_code == 200


def test_disruptions_and_alerts():
    assert client.get("/disruptions").status_code == 200
    assert client.get("/alerts").status_code == 200
    assert client.get("/activities").status_code == 200
    assert client.get("/workflow-analytics").status_code == 200


def test_plans():
    response = client.get("/plans")
    assert response.status_code == 200
    plans = response.json()
    assert isinstance(plans, list)

    if plans:
        plan_id = plans[0]["plan_id"]
        res_detail = client.get(f"/plans/{plan_id}")
        assert res_detail.status_code == 200
        assert "plan" in res_detail.json()
        assert "blocks" in res_detail.json()

        res_dash = client.get(f"/plans/{plan_id}/dashboard")
        assert res_dash.status_code == 200


def test_simulation():
    res = client.post("/simulation", json={
        "type": "section_blocked",
        "section_id": "SEC001",
        "notes": "Emergency maintenance simulation"
    })
    assert res.status_code == 200
    data = res.json()
    assert "affectedBlocks" in data
    assert "before" in data
    assert "after" in data


def test_simulation_train_delay():
    res = client.post("/simulation", json={
        "type": "train_delay",
        "train_id": "T001",
        "train_delay_min": 45,
        "notes": "Shatabdi Express signal delay"
    })
    assert res.status_code == 200
    data = res.json()
    assert "cascadeDelays" in data
    assert "blockChanges" in data
    assert "updatedPlan" in data
    assert len(data["cascadeDelays"]) > 0


# =========================================================
# Plan approval / rejection lifecycle (Audit #4)
# =========================================================

def _ensure_one_approved_maintenance_request():
    """
    The plan lifecycle only needs at least one APPROVED maintenance
    request to exist so a plan can be generated. Approves one PENDING
    request if available; otherwise relies on requests approved by
    earlier tests/seed data already being present.
    """
    reqs = client.get("/maintenance-requests").json()
    pending = next((r for r in reqs if r["status"] == "PENDING"), None)
    if pending is not None:
        approve_res = client.post(
            f"/maintenance-requests/{pending['id']}/approve"
        )
        assert approve_res.status_code == 200


def _create_pending_review_plan():
    """
    Creates a fresh block_plans row via the existing reoptimize path
    (which already saves a new plan as PENDING_REVIEW), so lifecycle
    tests have a plan to drive through approve/reject without touching
    optimizer logic. The plan_id passed in doesn't need to already
    exist: reoptimize_plan() falls back to all APPROVED maintenance
    requests when no blocks are found for it.
    """
    _ensure_one_approved_maintenance_request()

    res = client.post("/plans/PLAN_LIFECYCLE_SEED/reoptimize")
    assert res.status_code == 200

    plan_id = res.json()["plan"]["plan_id"]

    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "PENDING_REVIEW"

    return plan_id


def test_approve_plan_persists_and_survives_refresh():
    plan_id = _create_pending_review_plan()

    approve_res = client.post(f"/plans/{plan_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["plan"]["status"] == "APPROVED"

    # Fresh GET simulates a browser refresh / re-fetch.
    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "APPROVED"


def test_reject_plan_persists_and_survives_refresh():
    plan_id = _create_pending_review_plan()

    reject_res = client.post(
        f"/plans/{plan_id}/reject",
        json={"reason": "Not suitable for this corridor."},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["plan"]["status"] == "REJECTED"

    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "REJECTED"


def test_approve_after_reject_is_rejected_with_conflict():
    plan_id = _create_pending_review_plan()

    reject_res = client.post(f"/plans/{plan_id}/reject")
    assert reject_res.status_code == 200
    assert reject_res.json()["plan"]["status"] == "REJECTED"

    approve_res = client.post(f"/plans/{plan_id}/approve")
    assert approve_res.status_code == 409

    # The terminal REJECTED decision must not have been overwritten.
    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "REJECTED"


def test_reject_after_approve_is_rejected_with_conflict():
    plan_id = _create_pending_review_plan()

    approve_res = client.post(f"/plans/{plan_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["plan"]["status"] == "APPROVED"

    reject_res = client.post(f"/plans/{plan_id}/reject")
    assert reject_res.status_code == 409

    # The terminal APPROVED decision must not have been overwritten.
    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "APPROVED"


def test_plans_approve_endpoint_persists_and_enforces_transition():
    """
    Covers the newer POST /plans/approve path introduced by the ML
    merge: it accepts a full candidate OptimizationResult (as produced
    by /optimize/database), persists it, and approves it in one step.
    """
    _ensure_one_approved_maintenance_request()

    candidates_res = client.post("/optimize/database")
    assert candidates_res.status_code == 200
    candidates = candidates_res.json()
    assert isinstance(candidates, list)
    assert len(candidates) > 0

    candidate_result = candidates[0]["result"]

    approve_res = client.post("/plans/approve", json=candidate_result)
    assert approve_res.status_code == 200
    approved_plan = approve_res.json()["plan"]
    assert approved_plan["status"] == "APPROVED"

    plan_id = approved_plan["plan_id"]

    # Fresh GET retains APPROVED.
    fetched = client.get(f"/plans/{plan_id}").json()
    assert fetched["plan"]["status"] == "APPROVED"

    # An already-approved plan cannot be rejected afterwards.
    reject_res = client.post(f"/plans/{plan_id}/reject")
    assert reject_res.status_code == 409

    fetched_again = client.get(f"/plans/{plan_id}").json()
    assert fetched_again["plan"]["status"] == "APPROVED"


def test_new_request_becomes_planned_and_linked_after_plan_approval():
    """
    Regression test for the reported bug: a newly created request could end
    up with status=APPROVED but planning_status left at UNPLANNED, plan_id
    still null, and no scheduled_tasks row, because it was never actually
    included in the plan that got approved. This drives one request through
    the full real lifecycle (create -> approve request -> generate a plan
    that includes it -> approve that plan) and asserts the request comes out
    fully linked, so "My Requests" has correct backend state to reflect.
    """
    existing = client.get("/maintenance-requests").json()
    assert len(existing) > 0
    reference_section_id = existing[0]["section_id"]

    new_id = f"TEST-LINKAGE-{uuid.uuid4().hex[:10]}"
    create_res = client.post("/maintenance-requests", json={
        "id": new_id,
        "department": "TRACK",
        "section_id": reference_section_id,
        "window_start_min": 60,
        "window_end_min": 300,
        "base_duration_min": 60,
        "crew_size": 2,
        "priority": 2,
        "is_night": False,
    })
    assert create_res.status_code == 200

    # Starts out PENDING / UNPLANNED / unlinked, as expected.
    fetched = next(
        r for r in client.get("/maintenance-requests").json() if r["id"] == new_id
    )
    assert fetched["status"] == "PENDING"
    assert fetched["planning_status"] == "UNPLANNED"
    assert fetched["plan_id"] is None

    approve_req_res = client.post(f"/maintenance-requests/{new_id}/approve")
    assert approve_req_res.status_code == 200

    # Generate a plan that explicitly includes this request.
    candidates_res = client.post(
        "/optimize/database", json={"request_ids": [new_id]}
    )
    assert candidates_res.status_code == 200
    candidates = candidates_res.json()
    assert len(candidates) > 0

    candidate_result = candidates[0]["result"]
    scheduled_ids = {t["request_id"] for t in candidate_result["scheduled_tasks"]}
    assert new_id in scheduled_ids, (
        "The new request was not scheduled into its own candidate plan; "
        "cannot verify the approval-linking fix without it."
    )

    approve_plan_res = client.post("/plans/approve", json=candidate_result)
    assert approve_plan_res.status_code == 200
    plan_id = approve_plan_res.json()["plan"]["plan_id"]

    # Fresh GET (what "My Requests" and a page refresh rely on) must show
    # the fully linked, persisted state.
    refreshed = next(
        r for r in client.get("/maintenance-requests").json() if r["id"] == new_id
    )
    assert refreshed["status"] == "APPROVED"
    assert refreshed["planning_status"] == "PLANNED"
    assert refreshed["plan_id"] == plan_id

