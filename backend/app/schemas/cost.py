"""Request/response schemas for POST /estimate-cost."""
from pydantic import BaseModel, Field

from app.schemas.common import MixComposition


class MaterialUnitCosts(BaseModel):
    """Optional cost overrides, in currency units per kg. Falls back to defaults if omitted."""

    cement: float | None = Field(None, gt=0)
    water: float | None = Field(None, gt=0)
    fine_aggregate: float | None = Field(None, gt=0)
    coarse_aggregate: float | None = Field(None, gt=0)
    fly_ash: float | None = Field(None, gt=0)
    blast_furnace_slag: float | None = Field(None, gt=0)
    superplasticizer: float | None = Field(None, gt=0)


class CostEstimationRequest(BaseModel):
    mix: MixComposition
    unit_costs: MaterialUnitCosts | None = Field(
        None, description="Optional per-kg cost overrides"
    )
    currency: str = Field("USD", min_length=3, max_length=3)


class CostEstimationResponse(BaseModel):
    success: bool = True
    total_cost_per_m3: float
    currency: str
    breakdown_per_m3: dict[str, float]
