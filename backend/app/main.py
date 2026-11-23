"""
Application entrypoint.

Run with:
    uvicorn app.main:app --reload
"""
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

_SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if _SRC_DIR.exists() and str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

from app.api.router import api_router
from app.api.routes.market import route_locations_suggest
from app.core.config import get_settings
from app.core.exceptions import (
    AstraMixError,
    astramix_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging_config import configure_logging

settings = get_settings()
configure_logging(debug=settings.debug)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend API for AstraMix AI — concrete mix strength, carbon, "
        "cost prediction and optimization."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Domain errors -> clean JSON envelope; validation errors -> the same
# envelope shape (instead of FastAPI's default 422 format); unexpected
# errors -> generic 500 (no raw tracebacks ever leak to the client).
app.add_exception_handler(AstraMixError, astramix_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(api_router)
app.add_api_route("/api/locations/suggest", route_locations_suggest, methods=["GET"], tags=["Market"])

