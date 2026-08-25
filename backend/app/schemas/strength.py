"""Request/response schemas for POST /predict-strength."""
from pydantic import BaseModel, Field

from app.schemas.common import MixComposition


class StrengthPredictionRequest(BaseModel):
    mix: MixComposition


class StrengthPredictionResponse(BaseModel):
    success: bool = True
    predicted_strength_mpa: float = Field(..., description="Predicted compressive strength (MPa)")
    age: float
    water_cement_ratio: float = Field(..., description="Water / cement ratio (excludes SCMs)")
    water_binder_ratio: float = Field(
        ..., description="Water / total binder ratio (cement + fly_ash + blast_furnace_slag)"
    )
    model_version: str
    warnings: list[str] = Field(default_factory=list)
    is_out_of_distribution: bool = Field(
        False, description="Flag indicating if feature vector falls outside standard training data bounds"
    )
    estimated_error_rmse_mpa: float | None = None
    estimated_error_mae_mpa: float | None = None
    confidence_note: str | None = None
