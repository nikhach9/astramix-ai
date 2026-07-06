"""
Compressive strength prediction.

Feature engineering is delegated entirely to the AstraMix core
package — this module never re-implements or duplicates it.

`engineer_features` expects a pandas DataFrame of raw feature rows
(material quantities + `age`), not a dict, so we build that DataFrame
before calling it.

Two entry points:
    predict(mix)              For the /predict-strength API route —
                               takes a validated MixComposition.
    predict_from_core_row(row) For internal callers (the optimizer)
                               that generate candidate rows directly
                               and must NOT be routed through
                               MixComposition/Pydantic API validation
                               (candidates are searched, not
                               user-submitted requests, and may
                               transiently violate API-level bounds
                               mid-search).

If the trained model isn't loaded, or inference fails for any reason,
this raises. There is no fallback to a fabricated/heuristic estimate:
for research-grade output, a missing model must surface as a clear
503 (ModelLoadError), not a silently-wrong number.
"""
import pandas as pd

from app.adapters import mix_to_core_feature_row
from app.core.exceptions import PredictionError, ModelLoadError
from astramix.models.strength.predict import predict_strength

MODEL_VERSION = "v0.1"


def predict(mix) -> float:
    row = mix_to_core_feature_row(mix)
    return predict_from_core_row(row)


def predict_from_core_row(row: dict) -> float:
    """Predict strength directly from a core feature row."""
    try:
        result = predict_strength(row)
        return result["predicted_strength_mpa"]
    except RuntimeError as exc:
        msg = str(exc)
        if "missing or failed to load" in msg:
            raise ModelLoadError(msg) from exc
        raise PredictionError(
            "Strength prediction failed during model inference.",
            details={"reason": msg},
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(
            "Strength prediction failed.",
            details={"reason": str(exc)},
        ) from exc


def predict_with_trust(mix) -> dict:
    """Predict strength and return full metadata including trust warnings and errors."""
    row = mix_to_core_feature_row(mix)
    try:
        return predict_strength(row)
    except RuntimeError as exc:
        msg = str(exc)
        if "missing or failed to load" in msg:
            raise ModelLoadError(msg) from exc
        raise PredictionError(
            "Strength prediction failed during model inference.",
            details={"reason": msg},
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(
            "Strength prediction failed.",
            details={"reason": str(exc)},
        ) from exc

