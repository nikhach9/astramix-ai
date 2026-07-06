import os
import json
from pathlib import Path
import pandas as pd
import joblib
from typing import Dict, Any

from astramix.data.schema import STRENGTH_FEATURE_COLUMNS

_DEFAULT_MODEL_PATH_CACHE = None

def get_best_model_path(base_dir: Path) -> Path:
    """Read model_metadata.json to find the best model, falling back to xgboost."""
    global _DEFAULT_MODEL_PATH_CACHE
    if _DEFAULT_MODEL_PATH_CACHE is not None:
        return _DEFAULT_MODEL_PATH_CACHE

    metadata_path = base_dir / "model_metadata.json"
    if metadata_path.exists():
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            best = metadata.get("best_model_name", "xgboost").lower()
            _DEFAULT_MODEL_PATH_CACHE = base_dir / f"{best}.joblib"
            return _DEFAULT_MODEL_PATH_CACHE
        except Exception:
            pass
    _DEFAULT_MODEL_PATH_CACHE = base_dir / "xgboost.joblib"
    return _DEFAULT_MODEL_PATH_CACHE

_MODEL_CACHE = {}

def predict_strength(mix_input: Dict[str, float], model_path: str | Path = None) -> Dict[str, Any]:
    """
    Predicts concrete compressive strength from a mix design.
    """
    if "slag" in mix_input:
        raise ValueError("Invalid material name 'slag'. Use 'blast_furnace_slag'.")
        
    missing = [col for col in STRENGTH_FEATURE_COLUMNS if col not in mix_input]
    if missing:
        raise ValueError(f"Missing required mix inputs: {missing}")

    # Determine default path if not provided
    if model_path is None:
        # Assuming run from a typical FastAPI server in backend root
        backend_root = Path(__file__).resolve().parents[4]
        project_root = backend_root.parent
        base_dir = project_root / "artifacts" / "models" / "strength" / "baseline"
        model_path = get_best_model_path(base_dir)
    else:
        model_path = Path(model_path)
        
    if not model_path.exists():
        raise RuntimeError(f"Model artifact missing or failed to load: {model_path}")
        
    try:
        resolved_path = str(model_path.resolve())
        if resolved_path not in _MODEL_CACHE:
            loaded_model = joblib.load(model_path)
            try:
                if hasattr(loaded_model, "set_params"):
                    loaded_model.set_params(n_jobs=1)
            except Exception:
                pass
            _MODEL_CACHE[resolved_path] = loaded_model
        model = _MODEL_CACHE[resolved_path]
    except Exception as e:
        raise RuntimeError(f"Model artifact missing or failed to load: {e}") from e

    # Create canonical array using strict feature column order
    arr = [[mix_input[col] for col in STRENGTH_FEATURE_COLUMNS]]
    
    # Run prediction
    try:
        pred_value = float(model.predict(arr)[0])
    except Exception as e:
        raise RuntimeError(f"Model prediction failed: {e}") from e

    # Calculate derived stats for standard API response
    water = float(mix_input["water"])
    cement = float(mix_input["cement"])
    slag = float(mix_input["blast_furnace_slag"])
    ash = float(mix_input["fly_ash"])
    binder = cement + slag + ash
    
    age = float(mix_input["age"])
    
    water_cement_ratio = water / cement if cement > 0 else 0.0
    water_binder_ratio = water / binder if binder > 0 else 0.0
    
    from astramix.ml.trust import build_prediction_warnings
    trust_info = build_prediction_warnings(mix_input)
    
    return {
        "success": True,
        "predicted_strength_mpa": pred_value,
        "age": age,
        "water_cement_ratio": water_cement_ratio,
        "water_binder_ratio": water_binder_ratio,
        "model_version": "v0.1",
        **trust_info
    }
