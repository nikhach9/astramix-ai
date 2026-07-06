import pytest
from pathlib import Path
from astramix.models.strength.predict import predict_strength

def test_prediction_uses_saved_model(tmp_path):
    # We will create a dummy model to verify joblib loading works
    import joblib
    from sklearn.linear_model import LinearRegression
    import pandas as pd
    from astramix.data.schema import STRENGTH_FEATURE_COLUMNS
    
    # Train dummy model
    dummy = LinearRegression()
    dummy_df = pd.DataFrame([[1]*8, [2]*8], columns=STRENGTH_FEATURE_COLUMNS)
    dummy.fit(dummy_df, [10.0, 20.0])
    
    model_path = tmp_path / "xgboost.joblib"
    joblib.dump(dummy, model_path)
    
    input_data = {
        "cement": 1.0,
        "blast_furnace_slag": 1.0,
        "fly_ash": 1.0,
        "water": 1.0,
        "superplasticizer": 1.0,
        "coarse_aggregate": 1.0,
        "fine_aggregate": 1.0,
        "age": 1.0
    }
    
    res = predict_strength(input_data, model_path)
    assert res["success"] is True
    assert "predicted_strength_mpa" in res
    assert res["predicted_strength_mpa"] == pytest.approx(10.0)

def test_prediction_response_matches_contract(tmp_path):
    import joblib
    from sklearn.linear_model import LinearRegression
    import pandas as pd
    from astramix.data.schema import STRENGTH_FEATURE_COLUMNS
    
    dummy = LinearRegression()
    dummy_df = pd.DataFrame([[1]*8, [2]*8], columns=STRENGTH_FEATURE_COLUMNS)
    dummy.fit(dummy_df, [10.0, 20.0])
    
    model_path = tmp_path / "dummy.joblib"
    joblib.dump(dummy, model_path)
    
    input_data = {
        "cement": 300.0,
        "blast_furnace_slag": 100.0,
        "fly_ash": 0.0,
        "water": 200.0,
        "superplasticizer": 5.0,
        "coarse_aggregate": 1000.0,
        "fine_aggregate": 800.0,
        "age": 28.0
    }
    
    res = predict_strength(input_data, model_path)
    legacy_fields = {
        "success", 
        "predicted_strength_mpa", 
        "age", 
        "water_cement_ratio", 
        "water_binder_ratio", 
        "model_version"
    }
    assert legacy_fields.issubset(res.keys())
    assert "warnings" in res
    assert "estimated_error_rmse_mpa" in res
    assert "estimated_error_mae_mpa" in res
    assert "confidence_note" in res
    assert res["age"] == 28.0
    assert res["water_cement_ratio"] == 200.0 / 300.0
    assert res["water_binder_ratio"] == 200.0 / 400.0
    assert res["model_version"] == "v0.1"

def test_missing_model_fails_clearly(tmp_path):
    input_data = {
        "cement": 1.0,
        "blast_furnace_slag": 1.0,
        "fly_ash": 1.0,
        "water": 1.0,
        "superplasticizer": 1.0,
        "coarse_aggregate": 1.0,
        "fine_aggregate": 1.0,
        "age": 1.0
    }
    with pytest.raises(RuntimeError, match="Model artifact missing or failed to load"):
        predict_strength(input_data, tmp_path / "does_not_exist.joblib")

def test_wrong_input_fails_clearly(tmp_path):
    input_data = {
        "cement": 1.0,
        "blast_furnace_slag": 1.0,
        "fly_ash": 1.0,
        # missing water
        "superplasticizer": 1.0,
        "coarse_aggregate": 1.0,
        "fine_aggregate": 1.0,
        "age": 1.0
    }
    with pytest.raises(ValueError, match="Missing required mix inputs"):
        predict_strength(input_data, tmp_path / "dummy.joblib")

def test_slag_is_rejected():
    input_data = {
        "cement": 1.0,
        "slag": 1.0, # invalid name
        "fly_ash": 1.0,
        "water": 1.0,
        "superplasticizer": 1.0,
        "coarse_aggregate": 1.0,
        "fine_aggregate": 1.0,
        "age": 1.0
    }
    with pytest.raises(ValueError, match="Invalid material name 'slag'"):
        predict_strength(input_data, "dummy.joblib")
