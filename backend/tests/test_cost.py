from fastapi.testclient import TestClient

from app.main import app

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
        json={"mix": VALID_MIX, "unit_costs": {"cement": 1000.0}, "currency": "usd"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "USD"
    # the custom cement cost is huge so the breakdown will be large
    assert body["breakdown_per_m3"]["cement"] == 380 * 1000.0


def test_estimate_cost_rejects_invalid_mix():
    invalid_mix = {**VALID_MIX, "water": -5}
    response = client.post("/api/v1/estimate-cost", json={"mix": invalid_mix})
    assert response.status_code == 422


def test_partial_prices_cannot_relabel_usd_as_eur():
    response = client.post("/api/v1/estimate-cost", json={"mix":VALID_MIX,"currency":"EUR","unit_costs":{"cement":.12}})
    assert response.status_code == 422


def test_complete_foreign_currency_prices_and_zero_prices_are_supported():
    from astramix.domain.input_schema import MATERIAL_FEATURE_ORDER
    prices = dict.fromkeys(MATERIAL_FEATURE_ORDER, 1.)
    response = client.post("/api/v1/estimate-cost", json={"mix":VALID_MIX,"currency":"eur","unit_costs":prices})
    assert response.status_code == 200
    assert response.json()["total_cost_per_m3"] == 2354.8
    prices = dict.fromkeys(MATERIAL_FEATURE_ORDER, 0.)
    response = client.post("/api/v1/estimate-cost", json={"mix":VALID_MIX,"unit_costs":prices})
    assert response.status_code == 200
    assert response.json()["total_cost_per_m3"] == 0
