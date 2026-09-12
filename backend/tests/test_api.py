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

