"""Readiness checks use the same selected artifact as prediction."""
from app.core.exceptions import ModelLoadError
from astramix.models.strength.predict import MODEL_ROOT, _load_model, get_best_model_path, load_model_metadata


def get_model():
    try:
        path = get_best_model_path(MODEL_ROOT / 'baseline')
        stat = path.stat()
        metadata = load_model_metadata(path)
        return _load_model(str(path.resolve()), stat.st_mtime_ns, stat.st_size, metadata.get('model_sha256'))
    except (OSError, RuntimeError) as exc:
        raise ModelLoadError(str(exc)) from exc


def is_model_loaded():
    try:
        get_model()
        return True
    except ModelLoadError:
        return False
