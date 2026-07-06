"""
Application entrypoint.

Run with:
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
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
