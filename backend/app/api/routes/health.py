"""GET /health"""
from fastapi import APIRouter

from app.core.config import get_settings
from app.ml.model_loader import is_model_loaded

router = APIRouter()


@router.get("/health", summary="Service health check")
def health_check() -> dict:
    settings = get_settings()
    return {
        "success": True,
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "model_loaded": is_model_loaded(),
    }
