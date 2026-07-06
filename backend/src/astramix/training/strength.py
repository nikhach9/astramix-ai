import os
import json
from datetime import datetime
import pandas as pd
import joblib
from pathlib import Path

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

from astramix.data.schema import STRENGTH_FEATURE_COLUMNS, STRENGTH_TARGET_COLUMN
from astramix.data.loader import load_processed_strength_dataset

def train_strength_models(dataset_path: str | Path, artifacts_dir: str | Path):
    """
    Trains strength prediction models using the centralized v0.1 data layer.
    """
    # Load dataset using the centralized loader
    df = load_processed_strength_dataset(dataset_path)
    
    # Use exact canonical constants instead of "all columns except target"
    X = df[STRENGTH_FEATURE_COLUMNS]
    y = df[STRENGTH_TARGET_COLUMN]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Existing model registry behavior
    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(random_state=42),
        "GradientBoosting": GradientBoostingRegressor(random_state=42)
    }
    
    if HAS_XGB:
        models["XGBoost"] = XGBRegressor(
            random_state=42,
            n_jobs=1,
            verbosity=0,
        )
        
    metrics = []
    trained_model_names = []
    
    # Existing artifact outputs
    models_dir = Path(artifacts_dir) / "models" / "strength" / "baseline"
    metrics_dir = Path(artifacts_dir) / "metrics" / "strength" / "baseline"
    
    models_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)
    
    best_rmse = float('inf')
    best_model_name = None

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        # Scikit-learn backwards compatibility for RMSE
        mse = mean_squared_error(y_test, y_pred)
        rmse = mse ** 0.5
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        metrics.append({
            "model": name,
            "rmse": rmse,
            "mae": mae,
            "r2": r2
        })
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_model_name = name
            
        trained_model_names.append(name)
        
        # Save model artifact
        joblib.dump(model, models_dir / f"{name.lower()}.joblib")
        
    metrics_df = pd.DataFrame(metrics)
    
    # Save metrics comparison file
    metrics_file = metrics_dir / "comparison.csv"
    metrics_df.to_csv(metrics_file, index=False)
    
    # Generate metadata file
    metadata = {
        "dataset_path": "data/processed/strength_dataset_v0_1.csv",
        "dataset_row_count": len(df),
        "feature_columns": STRENGTH_FEATURE_COLUMNS,
        "target_column": STRENGTH_TARGET_COLUMN,
        "trained_model_names": trained_model_names,
        "best_model_name": best_model_name,
        "metrics_path": "artifacts/metrics/strength/baseline/comparison.csv",
        "training_datetime": datetime.utcnow().isoformat() + "Z",
        "project_version": "v0.1"
    }
    
    metadata_file = models_dir / "model_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
        
    return metrics_df, metadata
