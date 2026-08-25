"""
Custom exceptions and their FastAPI exception handlers.

Business/service code raises these instead of raw HTTPException so that
logic stays framework-agnostic and easy to unit test in isolation.
"""
from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AstraMixError(Exception):
    """Base class for all domain-level errors in this application."""

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ModelLoadError(AstraMixError):
    """Raised when the trained ML model cannot be loaded from disk."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class InvalidMixError(AstraMixError):
    """Raised when a mix composition fails domain-level validation."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class PredictionError(AstraMixError):
    """Raised when feature engineering or model inference fails."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class OptimizationError(AstraMixError):
    """Raised when the mix optimizer cannot find a feasible solution."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


async def astramix_exception_handler(request: Request, exc: AstraMixError) -> JSONResponse:
    """Convert any AstraMixError into a consistent JSON error envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
        },
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert FastAPI/Pydantic 422 validation errors into the same
    envelope used by every other error in this API, while also
    maintaining standard `detail` field compatibility for clients."""
    err_list = jsonable_encoder(exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "ValidationError",
            "message": "Request validation failed.",
            "details": err_list,
            "detail": err_list,
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all safety net so raw tracebacks never reach the client."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later.",
            "details": {},
        },
    )
