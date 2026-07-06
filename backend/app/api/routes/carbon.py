"""POST /estimate-carbon"""
from fastapi import APIRouter

from app.schemas.carbon import CarbonEstimationRequest, CarbonEstimationResponse
from app.services import carbon_service

router = APIRouter()


@router.post(
    "/estimate-carbon",
    response_model=CarbonEstimationResponse,
    summary="Estimate embodied CO2 for a concrete mix",
)
def estimate_carbon(payload: CarbonEstimationRequest) -> CarbonEstimationResponse:
    return carbon_service.estimate_carbon(payload.mix)
