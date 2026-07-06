"""
Orchestration layer for strength prediction.

Routes call this module; this module calls app.ml.strength_predictor
(model lifecycle + inference, which itself delegates feature
engineering to the real AstraMix package) and shapes the result into
the response schema. Model-load or inference failures are NOT caught
here — they propagate as AstraMixError subclasses and are converted
to a clean JSON error by the global handlers in app.main.
"""
from app.ml import strength_predictor
from app.schemas.common import MixComposition
from app.schemas.strength import StrengthPredictionResponse


def predict_strength(mix: MixComposition) -> StrengthPredictionResponse:
    result = strength_predictor.predict_with_trust(mix)

    return StrengthPredictionResponse(
        success=True,
        predicted_strength_mpa=round(result["predicted_strength_mpa"], 2),
        age=mix.age,
        water_cement_ratio=mix.water_cement_ratio,
        water_binder_ratio=mix.water_binder_ratio,
        model_version=result["model_version"],
        warnings=result.get("warnings", []),
        estimated_error_rmse_mpa=result.get("estimated_error_rmse_mpa"),
        estimated_error_mae_mpa=result.get("estimated_error_mae_mpa"),
        confidence_note=result.get("confidence_note"),
    )
