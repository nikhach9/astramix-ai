"""Request/response schemas for POST /estimate-carbon."""
from pydantic import BaseModel, Field

from app.schemas.common import MixComposition


class CarbonEstimationRequest(BaseModel):
    mix: MixComposition


class CarbonEstimationResponse(BaseModel):
    success: bool = True
    total_co2_kg_per_m3: float = Field(..., description="Embodied CO2 (kg CO2e per m3)")
    breakdown_kg_per_m3: dict[str, float] = Field(
        ..., description="CO2 contribution per material component"
    )
