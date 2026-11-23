"""Adapt validated API inputs to the canonical prediction service."""
from app.adapters import mix_to_core_feature_row
from app.core.exceptions import PredictionError, ModelLoadError
from astramix.models.strength.predict import predict_strength


def _predict(row):
    try:
        return predict_strength(row)
    except RuntimeError as exc:
        if 'missing or failed to load' in str(exc):
            raise ModelLoadError(str(exc)) from exc
        raise PredictionError('Strength prediction failed.', details={'reason': str(exc)}) from exc


def predict(mix):
    return predict_from_core_row(mix_to_core_feature_row(mix))


def predict_from_core_row(row):
    return _predict(row)['predicted_strength_mpa']


def predict_with_trust(mix):
    return _predict(mix_to_core_feature_row(mix))
