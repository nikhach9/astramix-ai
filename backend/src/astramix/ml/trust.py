import json
from pathlib import Path
from typing import Dict, List, Any

# Root metrics/envelope parameters
RMSE_METRIC = 4.62
MAE_METRIC = 3.03
CONFIDENCE_DISCLAIMER = "Approximate error estimate based on held-out validation metrics; not a certified confidence interval."

def get_default_envelope_path() -> Path:
    """Resolve the default path to training_envelope_v0_1.json."""
    astramix_root = Path(__file__).resolve().parents[1]  # src/astramix/
    # If run in development, go up to workspace root
    project_root = astramix_root.parents[2]  # AstraMix-v0.1/
    return project_root / "artifacts" / "models" / "strength" / "baseline" / "training_envelope_v0_1.json"

def load_training_envelope(path: Path | str = None) -> Dict[str, Dict[str, float]]:
    """Loads the training envelope JSON metadata file."""
    if path is None:
        path = get_default_envelope_path()
    else:
        path = Path(path)

    if not path.exists():
        # Safe fallback defaults matching v0_1 processed dataset
        return {
            "cement": { "min": 102.0, "max": 540.0 },
            "blast_furnace_slag": { "min": 0.0, "max": 359.4 },
            "fly_ash": { "min": 0.0, "max": 200.1 },
            "water": { "min": 121.8, "max": 247.0 },
            "superplasticizer": { "min": 0.0, "max": 32.2 },
            "coarse_aggregate": { "min": 801.0, "max": 1145.0 },
            "fine_aggregate": { "min": 594.0, "max": 992.6 },
            "age": { "min": 1.0, "max": 365.0 }
        }

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def check_training_envelope(mix: Dict[str, float], envelope: Dict[str, Dict[str, float]]) -> List[str]:
    """
    Compares mix properties (including 'age' or 'ageDays') against training boundaries.
    Returns a list of explicit warnings for any out-of-range features.
    """
    warnings = []
    # Support both API 'age' and internal 'ageDays'
    mix_normalized = dict(mix)
    if "age" in mix_normalized:
        mix_normalized["age"] = mix_normalized["age"]
    elif "ageDays" in mix_normalized:
        mix_normalized["age"] = mix_normalized["ageDays"]

    for feature, range_bounds in envelope.items():
        val = mix_normalized.get(feature)
        if val is not None:
            min_val = range_bounds["min"]
            max_val = range_bounds["max"]
            if val < min_val or val > max_val:
                warnings.append(
                    f"Input value for {feature}={val} is outside the training range [{min_val}, {max_val}]. "
                    f"Prediction may be less reliable."
                )
    return warnings

def build_prediction_warnings(mix: Dict[str, float]) -> Dict[str, Any]:
    """Builds warning list, OOD status flag, and estimated validation error properties."""
    envelope = load_training_envelope()
    warnings = check_training_envelope(mix, envelope)
    is_ood = len(warnings) > 0
    return {
        "warnings": warnings,
        "is_out_of_distribution": is_ood,
        "estimated_error_rmse_mpa": RMSE_METRIC,
        "estimated_error_mae_mpa": MAE_METRIC,
        "confidence_note": CONFIDENCE_DISCLAIMER
    }
