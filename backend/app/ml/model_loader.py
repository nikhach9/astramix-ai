"""
Safe, cached loading of the trained strength-prediction model.

Swap `_load_model_from_disk` for your project's real deserialization
call (joblib, pickle, onnx, torch.load, etc.). This module only owns
the *lifecycle* — lazy load, in-memory caching, and error handling —
not the ML framework itself.
"""
import logging
import threading
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import ModelLoadError

logger = logging.getLogger(__name__)

_model_lock = threading.Lock()
_model: Any | None = None


def _load_model_from_disk() -> Any:
    settings = get_settings()
    model_path = settings.strength_model_path

    if not model_path.exists():
        raise ModelLoadError(
            f"Trained model file not found at '{model_path}'. "
            "Place the trained artifact there or set ASTRAMIX_STRENGTH_MODEL_FILENAME."
        )

    try:
        import joblib  # local import: kept optional until actually needed

        return joblib.load(model_path)
    except ModelLoadError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise ModelLoadError(
            f"Failed to load model from '{model_path}'.",
            details={"reason": str(exc)},
        ) from exc


def get_model() -> Any:
    """Return the cached model, loading it on first use (thread-safe)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:  # double-checked locking
                logger.info("Loading strength prediction model...")
                _model = _load_model_from_disk()
                logger.info("Model loaded successfully.")
    return _model


def is_model_loaded() -> bool:
    if _model is not None:
        return True
    try:
        from astramix.models.strength.predict import _MODEL_CACHE
        if len(_MODEL_CACHE) > 0:
            return True
    except Exception:
        pass
    return False
