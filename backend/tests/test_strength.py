from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_MIX = {
    "cement": 380,
    "water": 171,
    "fine_aggregate": 700,
    "coarse_aggregate": 1050,
    "fly_ash": 0,
    "blast_furnace_slag": 0,
    "superplasticizer": 3.8,
    "age": 28,
}


def test_predict_strength_fails_clearly_when_model_missing(monkeypatch):
    """
    A missing/unloadable trained model must surface as a hard 503 —
    never a silent fallback to a heuristic estimate.
    """
    def raise_missing(*args, **kwargs):
        raise RuntimeError("Model artifact missing or failed to load")
    monkeypatch.setattr("app.ml.strength_predictor.predict_strength", raise_missing)

    response = client.post("/api/v1/predict-strength", json={"mix": VALID_MIX})
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "ModelLoadError"


def test_predict_strength_rejects_implausible_water_binder_ratio():
    bad_mix = {**VALID_MIX, "water": 300, "cement": 280, "fly_ash": 0, "blast_furnace_slag": 0}
    response = client.post("/api/v1/predict-strength", json={"mix": bad_mix})
    assert response.status_code == 422


def test_predict_strength_rejects_legacy_slag_field_name():
    """
    The canonical field is `blast_furnace_slag`. Submitting the old
    `slag` name must fail fast (extra="forbid") rather than silently
    defaulting blast_furnace_slag to 0.
    """
    mix_with_legacy_field = {**VALID_MIX, "slag": 40}
    mix_with_legacy_field.pop("blast_furnace_slag", None)
    response = client.post("/api/v1/predict-strength", json={"mix": mix_with_legacy_field})
    assert response.status_code == 422
    body = response.json()
    assert "slag" in str(body).lower()


def test_predict_strength_rejects_legacy_curing_age_days_field_name():
    """
    The canonical field is `age` (matches the AstraMix dataset/core
    feature schema and what the frontend sends). The old
    `curing_age_days` name must fail fast, not be silently dropped.
    """
    mix_with_legacy_field = {**VALID_MIX, "curing_age_days": 28}
    mix_with_legacy_field.pop("age", None)
    response = client.post("/api/v1/predict-strength", json={"mix": mix_with_legacy_field})
    assert response.status_code == 422


def test_predict_strength_accepts_float_and_zero_values():
    mix_with_floats = {
        "cement": 350.0,
        "water": 177.45,
        "fine_aggregate": 750.5,
        "coarse_aggregate": 98.98,
        "fly_ash": 0.0,
        "blast_furnace_slag": 0.0,
        "superplasticizer": 0.0,
        "age": 28.5,
    }
    response = client.post("/api/v1/predict-strength", json={"mix": mix_with_floats})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["predicted_strength_mpa"] >= 0.0
    assert body["age"] == 28.5


def test_predict_strength_clamping_and_ood_flag():
    ood_mix = {
        "cement": 750.0,
        "water": 200.0,
        "fine_aggregate": 750.0,
        "coarse_aggregate": 1000.0,
        "fly_ash": 0.0,
        "blast_furnace_slag": 0.0,
        "superplasticizer": 0.0,
        "age": 28.0,
    }
    response = client.post("/api/v1/predict-strength", json={"mix": ood_mix})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["predicted_strength_mpa"] >= 0.0
    assert body["is_out_of_distribution"] is True
    assert len(body["warnings"]) > 0
