"""POST /estimate-cost"""
from fastapi import APIRouter

from app.schemas.cost import CostEstimationRequest, CostEstimationResponse
from app.services import cost_service

router = APIRouter()


@router.post(
    "/estimate-cost",
    response_model=CostEstimationResponse,
    summary="Estimate material cost for a concrete mix",
)
def estimate_cost(payload: CostEstimationRequest) -> CostEstimationResponse:
    return cost_service.estimate_cost(payload)
