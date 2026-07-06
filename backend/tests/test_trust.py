import pytest
from fastapi.testclient import TestClient
from app.main import app
from astramix.ml.trust import load_training_envelope, check_training_envelope

client = TestClient(app)

VALID_MIX_DICT = {
    "cement": 350.0,
    "blast_furnace_slag": 50.0,
    "fly_ash": 50.0,
    "water": 160.0,
    "superplasticizer": 5.0,
    "coarse_aggregate": 1000.0,
    "fine_aggregate": 750.0,
    "age": 28
}

def test_training_envelope_loads_correctly():
    envelope = load_training_envelope()
    assert "cement" in envelope
    assert "water" in envelope
    assert "age" in envelope
    assert envelope["cement"]["min"] == 102.0
    assert envelope["cement"]["max"] == 540.0

def test_in_range_mix_produces_no_warning():
    envelope = load_training_envelope()
    warnings = check_training_envelope(VALID_MIX_DICT, envelope)
    assert len(warnings) == 0

def test_out_of_range_produces_warnings():
    envelope = load_training_envelope()
    
    # Out of range cement
    mix_bad_cement = {**VALID_MIX_DICT, "cement": 1000.0}
    warnings = check_training_envelope(mix_bad_cement, envelope)
    assert any("cement" in w for w in warnings)
    
    # Out of range age
    mix_bad_age = {**VALID_MIX_DICT, "age": 500}
    warnings = check_training_envelope(mix_bad_age, envelope)
    assert any("age" in w for w in warnings)

def test_predict_strength_preserves_legacy_and_adds_trust():
    response = client.post(
        "/api/v1/predict-strength",
        json={"mix": VALID_MIX_DICT}
    )
    assert response.status_code == 200
    body = response.json()
    
    # Legacy fields
    assert "success" in body
    assert "predicted_strength_mpa" in body
    assert "age" in body
    assert "water_cement_ratio" in body
    assert "water_binder_ratio" in body
    assert "model_version" in body
    
    # New trust fields
    assert "warnings" in body
    assert "estimated_error_rmse_mpa" in body
    assert "estimated_error_mae_mpa" in body
    assert "confidence_note" in body
    assert isinstance(body["warnings"], list)
    assert body["estimated_error_rmse_mpa"] == 4.62

def test_predict_strength_out_of_envelope_returns_warning():
    mix_bad_cement = {**VALID_MIX_DICT, "cement": 600.0}
    response = client.post(
        "/api/v1/predict-strength",
        json={"mix": mix_bad_cement}
    )
    assert response.status_code == 200
    body = response.json()
    assert "warnings" in body
    assert len(body["warnings"]) > 0
    assert any("cement" in w for w in body["warnings"])

def test_optimize_mix_returns_warnings():
    response = client.post(
        "/api/v1/optimize-mix",
        json={
            "constraints": {
                "target_strength_mpa": 40.0,
                "age": 28,
                "max_w_c_ratio": 0.5
            }
        }
    )
    assert response.status_code == 200
    body = response.json()
    assert "warnings" in body
    assert isinstance(body["warnings"], list)
    assert len(body["warnings"]) > 0
    # Checks that it includes tree model / weighted-sum caveats
    assert any("weighted-sum" in w for w in body["warnings"])
