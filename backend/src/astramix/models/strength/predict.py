"""Load a versioned model and predict using the canonical eight raw features."""
import json
import hashlib
import math
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd

from astramix.data.schema import STRENGTH_FEATURE_COLUMNS

MODEL_ROOT = Path(__file__).resolve().parents[5] / 'artifacts/models/strength'


def get_best_model_path(base_dir: Path) -> Path:
    active = base_dir.parent / 'active_model.json'
    if active.exists():
        try:
            manifest = json.loads(active.read_text())
            return base_dir.parent / manifest['model_path']
        except (OSError, ValueError, KeyError) as exc:
            raise RuntimeError(f'Model artifact missing or failed to load: invalid active manifest: {exc}') from exc
    metadata = json.loads((base_dir / 'model_metadata.json').read_text())
    return base_dir / (metadata['best_model_name'].lower() + '.joblib')


@lru_cache(maxsize=8)
def _read_metadata(path, modified_ns, size):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError) as exc:
        raise RuntimeError(f'Model artifact missing or failed to load: invalid metadata: {exc}') from exc


def load_model_metadata(model_path=None):
    path = Path(model_path) if model_path is not None else get_best_model_path(MODEL_ROOT / 'baseline')
    metadata_path = path.parent / 'model_metadata.json'
    if not metadata_path.exists():
        return {}  # Explicit external/test models have no asserted validation provenance.
    try:
        stat = metadata_path.stat()
        metadata = dict(_read_metadata(str(metadata_path.resolve()), stat.st_mtime_ns, stat.st_size))
    except OSError as exc:
        raise RuntimeError(f'Model artifact missing or failed to load: metadata unavailable: {exc}') from exc
    if 'validation_metrics' not in metadata:
        comparison_path = MODEL_ROOT.parents[2] / metadata.get('metrics_path', '')
        if comparison_path.is_file():
            records = pd.read_csv(comparison_path)
            match = records[records.model == metadata['best_model_name']]
            if not match.empty:
                metadata['validation_metrics'] = {k: float(match.iloc[0][k]) for k in ['rmse', 'mae', 'r2']}
    return metadata


@lru_cache(maxsize=4)
def _load_model(path, modified_ns, size, expected_sha256):
    try:
        if expected_sha256 and hashlib.sha256(Path(path).read_bytes()).hexdigest() != expected_sha256:
            raise ValueError('Model file does not match the SHA-256 in its validation metadata.')
        model = joblib.load(path)
        if 'n_jobs' in model.get_params():
            model.set_params(n_jobs=1)
        return model
    except Exception as exc:
        # Loading external serialized estimators has several library-specific
        # failure modes; preserve the original cause at this service boundary.
        raise RuntimeError(f'Model artifact missing or failed to load: {exc}') from exc


def predict_strength(mix_input: Dict[str, float], model_path=None) -> Dict[str, Any]:
    if 'slag' in mix_input:
        raise ValueError("Invalid material name 'slag'. Use 'blast_furnace_slag'.")
    missing = set(STRENGTH_FEATURE_COLUMNS) - mix_input.keys()
    extra = mix_input.keys() - set(STRENGTH_FEATURE_COLUMNS)
    if missing or extra:
        raise ValueError(f'Missing required mix inputs: {sorted(missing)}; unknown fields: {sorted(extra)}')
    path = Path(model_path) if model_path is not None else get_best_model_path(MODEL_ROOT / 'baseline')
    try:
        stat = path.stat()
    except OSError as exc:
        raise RuntimeError(f'Model artifact missing or failed to load: {path}') from exc
    metadata = load_model_metadata(path)
    model = _load_model(str(path.resolve()), stat.st_mtime_ns, stat.st_size, metadata.get('model_sha256'))
    features = pd.DataFrame([[mix_input[k] for k in STRENGTH_FEATURE_COLUMNS]], columns=STRENGTH_FEATURE_COLUMNS)
    try:
        predicted = float(model.predict(features)[0])
        if not math.isfinite(predicted):
            raise ValueError('Non-finite model prediction.')
    except (ValueError, TypeError) as exc:
        raise RuntimeError(f'Model prediction failed: {exc}') from exc
    water, cement = float(mix_input['water']), float(mix_input['cement'])
    binder = cement + float(mix_input['blast_furnace_slag']) + float(mix_input['fly_ash'])
    from astramix.ml.trust import build_prediction_warnings
    return {'success': True, 'predicted_strength_mpa': max(0., predicted), 'age': float(mix_input['age']),
        'water_cement_ratio': water / cement if cement > 0 else 0.,
        'water_binder_ratio': water / binder if binder > 0 else 0.,
        'model_version': metadata.get('model_version', metadata.get('project_version', 'unversioned')),
        'model_name': metadata.get('best_model_name', type(model).__name__),
        'model_sha256': metadata.get('model_sha256'),
        'validation_protocol': metadata.get('validation_protocol'),
        **build_prediction_warnings(mix_input, metadata=metadata)}
