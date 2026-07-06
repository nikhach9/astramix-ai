"""Aggregates all route modules into a single router mounted in main.py."""
from fastapi import APIRouter

from app.api.routes import carbon, cost, health, optimize, strength

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(strength.router, tags=["Strength"])
api_router.include_router(carbon.router, tags=["Carbon"])
api_router.include_router(cost.router, tags=["Cost"])
api_router.include_router(optimize.router, tags=["Optimization"])
