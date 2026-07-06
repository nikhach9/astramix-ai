from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["status"] == "ok"
    assert "model_loaded" in body


def test_error_envelope_format_on_missing_model(monkeypatch):
    """
    No trained model artifact exists in this test environment, so
    /predict-strength must fail with the standard error envelope
    rather than a raw traceback or a fabricated prediction.
    """
    def raise_missing(*args, **kwargs):
        raise RuntimeError("Model artifact missing or failed to load")
    monkeypatch.setattr("app.ml.strength_predictor.predict_strength", raise_missing)

    response = client.post(
        "/api/v1/predict-strength",
        json={
            "mix": {
                "cement": 380,
                "water": 171,
                "fine_aggregate": 700,
                "coarse_aggregate": 1050,
                "age": 28,
            }
        },
    )
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "ModelLoadError"
    assert "message" in body
    assert "details" in body


def test_validation_error_uses_standard_envelope():
    """422s from Pydantic/FastAPI request validation must use the same
    envelope as every other error, not FastAPI's default {"detail": [...]}."""
    response = client.post(
        "/api/v1/predict-strength",
        json={"mix": {"cement": -10}},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "ValidationError"
    assert "message" in body
    assert isinstance(body["details"], list)
