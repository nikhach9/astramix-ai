"""Request/response schemas for POST /estimate-cost."""
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from astramix.domain.input_schema import MATERIAL_FEATURE_ORDER, parse_strict_finite_float

from app.schemas.common import MixComposition


class MaterialUnitCosts(BaseModel):
    """Optional cost overrides, in currency units per kg. Falls back to defaults if omitted."""

    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def finite_price(cls, value, info):
        return None if value is None else parse_strict_finite_float(value, info.field_name, "Unit price")

    cement: float | None = Field(None, ge=0)
    water: float | None = Field(None, ge=0)
    fine_aggregate: float | None = Field(None, ge=0)
    coarse_aggregate: float | None = Field(None, ge=0)
    fly_ash: float | None = Field(None, ge=0)
    blast_furnace_slag: float | None = Field(None, ge=0)
    superplasticizer: float | None = Field(None, ge=0)


class CostEstimationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mix: MixComposition
    unit_costs: MaterialUnitCosts | None = Field(
        None, description="Optional per-kg cost overrides"
    )
    currency: str = Field("USD", min_length=3, max_length=3)


    @model_validator(mode="after")
    def currency_matches_prices(self):
        self.currency = self.currency.strip().upper()
        if len(self.currency) != 3 or not self.currency.isascii() or not self.currency.isalpha():
            raise ValueError("Currency must be a three-letter code.")
        prices = self.unit_costs.model_dump(exclude_none=True) if self.unit_costs else {}
        if self.currency != "USD" and any(getattr(self.mix, key) > 0 and key not in prices for key in MATERIAL_FEATURE_ORDER):
            raise ValueError("Non-USD estimates require prices in that currency for every active ingredient.")
        return self


class CostEstimationResponse(BaseModel):
    success: bool = True
    total_cost_per_m3: float
    currency: str
    breakdown_per_m3: dict[str, float]
