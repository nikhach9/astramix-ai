import pytest
import pandas as pd
import shutil
from pathlib import Path

from astramix.training.strength import train_strength_models
from astramix.data.schema import STRENGTH_REQUIRED_COLUMNS

@pytest.fixture
def temp_artifacts_dir(tmp_path):
    artifacts_dir = tmp_path / "artifacts"
    artifacts_dir.mkdir()
    yield artifacts_dir
    shutil.rmtree(artifacts_dir, ignore_errors=True)

@pytest.fixture
def valid_dataset_path(tmp_path):
    """Creates a valid v0.1 strength dataset CSV for testing."""
    df = pd.DataFrame({
        "cement": [300.0, 400.0, 350.0, 200.0, 450.0],
        "blast_furnace_slag": [0.0, 100.0, 50.0, 0.0, 120.0],
        "fly_ash": [50.0, 0.0, 0.0, 150.0, 0.0],
        "water": [180.0, 160.0, 175.0, 190.0, 150.0],
        "superplasticizer": [5.0, 10.0, 7.5, 3.0, 12.0],
        "coarse_aggregate": [1000.0, 950.0, 1050.0, 1100.0, 900.0],
        "fine_aggregate": [700.0, 800.0, 750.0, 650.0, 850.0],
        "age": [28, 56, 28, 14, 90],
        "compressive_strength_mpa": [40.5, 60.2, 45.0, 25.0, 70.0]
    })
    path = tmp_path / "valid_strength_dataset.csv"
    df.to_csv(path, index=False)
    return path

@pytest.fixture
def missing_col_dataset_path(tmp_path):
    """Creates a dataset missing 'cement'."""
    df = pd.DataFrame({
        "blast_furnace_slag": [0.0],
        "fly_ash": [50.0],
        "water": [180.0],
        "superplasticizer": [5.0],
        "coarse_aggregate": [1000.0],
        "fine_aggregate": [700.0],
        "age": [28],
        "compressive_strength_mpa": [40.5]
    })
    path = tmp_path / "missing_col.csv"
    df.to_csv(path, index=False)
    return path

@pytest.fixture
def extra_col_dataset_path(tmp_path):
    """Creates a dataset with an extra unknown column."""
    df = pd.DataFrame({
        "cement": [300.0],
        "blast_furnace_slag": [0.0],
        "fly_ash": [50.0],
        "water": [180.0],
        "superplasticizer": [5.0],
        "coarse_aggregate": [1000.0],
        "fine_aggregate": [700.0],
        "age": [28],
        "compressive_strength_mpa": [40.5],
        "extra_unknown": [1]
    })
    path = tmp_path / "extra_col.csv"
    df.to_csv(path, index=False)
    return path

def test_training_pipeline_success_and_artifacts(valid_dataset_path, temp_artifacts_dir):
    """Test that training runs successfully and creates the expected artifacts."""
    metrics_df, metadata = train_strength_models(valid_dataset_path, temp_artifacts_dir)
    
    # Verify generated metrics comparison file exists
    metrics_file = temp_artifacts_dir / "metrics" / "strength" / "baseline" / "comparison.csv"
    assert metrics_file.exists(), "Metrics comparison file was not created"
    
    # Verify metrics DF has expected models
    assert len(metrics_df) >= 3
    assert "LinearRegression" in metrics_df["model"].values
    
    # Verify saved model artifact exists
    models_dir = temp_artifacts_dir / "models" / "strength" / "baseline"
    assert (models_dir / "linearregression.joblib").exists(), "Model artifact not saved"
    assert (models_dir / "randomforest.joblib").exists(), "Model artifact not saved"
    
    # Verify model_metadata.json exists and contains correct info
    metadata_file = models_dir / "model_metadata.json"
    assert metadata_file.exists(), "Model metadata file was not created"
    
    import json
    with open(metadata_file, "r") as f:
        saved_metadata = json.load(f)
        
    assert saved_metadata["best_model_name"] == metadata["best_model_name"]
    assert saved_metadata["best_model_name"] in saved_metadata["trained_model_names"]
    assert saved_metadata["feature_columns"] == STRENGTH_REQUIRED_COLUMNS[:-1]
    from astramix.data.schema import STRENGTH_TARGET_COLUMN
    assert saved_metadata["target_column"] == STRENGTH_TARGET_COLUMN
    assert saved_metadata["project_version"] == "v0.1"

def test_missing_column_fails_before_training(missing_col_dataset_path, temp_artifacts_dir):
    """Test that missing required dataset columns fail before training."""
    with pytest.raises(ValueError, match="Schema validation failed"):
        train_strength_models(missing_col_dataset_path, temp_artifacts_dir)
        
    # Verify training didn't produce artifacts because it failed early
    assert not (temp_artifacts_dir / "metrics").exists()

def test_extra_column_fails_before_training(extra_col_dataset_path, temp_artifacts_dir):
    """Test that extra columns fail validation."""
    with pytest.raises(ValueError, match="Schema validation failed.*Extra unknown columns"):
        train_strength_models(extra_col_dataset_path, temp_artifacts_dir)
