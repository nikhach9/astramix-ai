from fastapi.testclient import TestClient

from app.main import app
from astramix.sustainability.impact import EstimationResult

client = TestClient(app)

VALID_MIX = {
    "cement": 380,
    "water": 171,
    "fine_aggregate": 700,
    "coarse_aggregate": 1050,
    "fly_ash": 20,
    "blast_furnace_slag": 30,
    "superplasticizer": 3.8,
    "age": 28,
}


def test_estimate_cost_success():
    response = client.post("/api/v1/estimate-cost", json={"mix": VALID_MIX})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["currency"] == "USD"
    assert "total_cost_per_m3" in body
    assert "blast_furnace_slag" in body["breakdown_per_m3"]
    assert "slag" not in body["breakdown_per_m3"]
    assert body["total_cost_per_m3"] > 0


def test_estimate_cost_passes_unit_cost_overrides():
    response = client.post(
        "/api/v1/estimate-cost",
        json={"mix": VALID_MIX, "unit_costs": {"cement": 1000.0}, "currency": "eur"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "EUR"
    # the custom cement cost is huge so the breakdown will be large
    assert body["breakdown_per_m3"]["cement"] == 380 * 1000.0


def test_estimate_cost_rejects_invalid_mix():
    invalid_mix = {**VALID_MIX, "water": -5}
    response = client.post("/api/v1/estimate-cost", json={"mix": invalid_mix})
    assert response.status_code == 422
