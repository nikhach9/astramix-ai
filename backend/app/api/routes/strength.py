"""POST /predict-strength"""
from fastapi import APIRouter

from app.schemas.strength import StrengthPredictionRequest, StrengthPredictionResponse
from app.services import strength_service

router = APIRouter()


@router.post(
    "/predict-strength",
    response_model=StrengthPredictionResponse,
    summary="Predict compressive strength for a concrete mix",
)
def predict_strength(payload: StrengthPredictionRequest) -> StrengthPredictionResponse:
    return strength_service.predict_strength(payload.mix)
