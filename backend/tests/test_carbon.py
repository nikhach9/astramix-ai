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


def test_estimate_carbon_success():
    response = client.post("/api/v1/estimate-carbon", json={"mix": VALID_MIX})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "total_co2_kg_per_m3" in body
    assert "breakdown_kg_per_m3" in body
    assert "blast_furnace_slag" in body["breakdown_kg_per_m3"]
    assert "slag" not in body["breakdown_kg_per_m3"]
    assert body["total_co2_kg_per_m3"] > 0


def test_estimate_carbon_wraps_astramix_failures(monkeypatch):
    def boom(material_quantities):
        raise RuntimeError("astramix internal failure")

    monkeypatch.setattr("app.services.carbon_service.astramix_estimate_co2", boom)

    response = client.post("/api/v1/estimate-carbon", json={"mix": VALID_MIX})
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "AstraMixError"


def test_estimate_carbon_rejects_invalid_mix():
    invalid_mix = {**VALID_MIX, "cement": -10}
    response = client.post("/api/v1/estimate-carbon", json={"mix": invalid_mix})
    assert response.status_code == 422
    assert response.json()["error"] == "ValidationError"
