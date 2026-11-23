"""POST /optimize-mix"""
from fastapi import APIRouter

from app.schemas.optimize import OptimizeMixRequest, OptimizeMixResponse
from app.services import optimize_service

router = APIRouter()


@router.post(
    "/optimize-mix",
    response_model=OptimizeMixResponse,
    summary="Search for a feasible mix under strength, cost and CO2 constraints",
)
def optimize_mix(payload: OptimizeMixRequest) -> OptimizeMixResponse:
    return optimize_service.optimize_mix(payload)
