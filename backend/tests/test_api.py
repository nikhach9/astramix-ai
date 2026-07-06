from fastapi.testclient import TestClient
from pathlib import Path
from astramix.api.main import app

client = TestClient(app)

def test_predict_strength_success():
    payload = {
        "mix": {
            "cement": 300.0,
            "blast_furnace_slag": 0.0,
            "fly_ash": 0.0,
            "water": 180.0,
            "superplasticizer": 5.0,
            "coarse_aggregate": 1000.0,
            "fine_aggregate": 700.0,
            "age": 28.0
        }
    }
    
    response = client.post("/api/v1/predict-strength", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert "predicted_strength_mpa" in data
    assert data["age"] == 28.0
    assert data["model_version"] == "v0.1"
    assert data["water_cement_ratio"] == 180.0 / 300.0
    assert data["water_binder_ratio"] == 180.0 / 300.0

def test_predict_strength_rejects_slag():
    payload = {
        "mix": {
            "cement": 300.0,
            "slag": 0.0,  # Invalid alias
            "fly_ash": 0.0,
            "water": 180.0,
            "superplasticizer": 5.0,
            "coarse_aggregate": 1000.0,
            "fine_aggregate": 700.0,
            "age": 28.0
        }
    }
    response = client.post("/api/v1/predict-strength", json=payload)
    assert response.status_code == 422 # Pydantic validation error for extra field or missing blast_furnace_slag

def test_predict_strength_missing_artifact(monkeypatch):
    import astramix.models.strength.predict as predict_mod
    monkeypatch.setattr(predict_mod, "get_best_model_path", lambda x: Path("invalid.joblib"))
    
    payload = {
        "mix": {
            "cement": 300.0,
            "blast_furnace_slag": 0.0,
            "fly_ash": 0.0,
            "water": 180.0,
            "superplasticizer": 5.0,
            "coarse_aggregate": 1000.0,
            "fine_aggregate": 700.0,
            "age": 28.0
        }
    }
    response = client.post("/api/v1/predict-strength", json=payload)
    assert response.status_code == 400
    assert "Model artifact missing or failed to load" in response.json()["detail"]
