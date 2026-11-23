"""Training-range checks and validation context from the matching model metadata."""
import json
from pathlib import Path

from astramix.models.strength.predict import MODEL_ROOT, load_model_metadata

CONFIDENCE_DISCLAIMER = 'Aggregate validation error, not a per-mix prediction interval. Range checks do not establish joint distribution coverage.'


def get_default_envelope_path():
    active = MODEL_ROOT / 'active_model.json'
    if active.exists():
        return MODEL_ROOT / json.loads(active.read_text())['envelope_path']
    return MODEL_ROOT / 'baseline/training_envelope_v0_1.json'


def load_training_envelope(path=None):
    return json.loads(Path(path or get_default_envelope_path()).read_text())


def check_training_envelope(mix, envelope):
    values = dict(mix)
    if 'age' not in values and 'ageDays' in values:
        values['age'] = values['ageDays']
    return [f'Input value for {key}={values[key]} is outside the training range [{bounds["min"]}, {bounds["max"]}]. Prediction may be less reliable.'
            for key, bounds in envelope.items() if key in values and not bounds['min'] <= values[key] <= bounds['max']]


def build_prediction_warnings(mix, metadata=None):
    metadata = load_model_metadata() if metadata is None else metadata
    envelope = metadata.get('training_bounds')
    if envelope is None:
        envelope = load_training_envelope()
    warnings = check_training_envelope(mix, envelope)
    metrics = metadata.get('validation_metrics', {})
    return {'warnings': warnings, 'is_out_of_distribution': bool(warnings),
        'range_check_only': True, 'estimated_error_rmse_mpa': metrics.get('rmse'),
        'estimated_error_mae_mpa': metrics.get('mae'), 'confidence_note': CONFIDENCE_DISCLAIMER}
