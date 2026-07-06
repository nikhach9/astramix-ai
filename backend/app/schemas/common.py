"""Shared schema components used across multiple endpoints."""
from pydantic import BaseModel, ConfigDict, Field, model_validator


class MixComposition(BaseModel):
    """
    Concrete mix design quantities, in kg per cubic meter (kg/m3),
    unless otherwise noted.

    Material names are canonical across the whole codebase and must
    match the AstraMix core package exactly (`blast_furnace_slag`,
    not `slag`). `extra="forbid"` makes any stale/incorrect field name
    fail fast with a clear 422 instead of silently being dropped.
    """

    model_config = ConfigDict(extra="forbid")

    cement: float = Field(..., gt=0, le=800, description="Cement content (kg/m3)")
    water: float = Field(..., gt=0, le=300, description="Water content (kg/m3)")
    fine_aggregate: float = Field(..., gt=0, le=1200, description="Fine aggregate / sand (kg/m3)")
    coarse_aggregate: float = Field(..., gt=0, le=1400, description="Coarse aggregate (kg/m3)")
    fly_ash: float = Field(0.0, ge=0, le=400, description="Fly ash / SCM content (kg/m3)")
    blast_furnace_slag: float = Field(
        0.0, ge=0, le=400, description="Ground granulated blast furnace slag (GGBS) content (kg/m3)"
    )
    superplasticizer: float = Field(0.0, ge=0, le=30, description="Superplasticizer (kg/m3)")
    age: int = Field(
        28, ge=1, le=365, description="Curing age at evaluation (days). Matches the AstraMix dataset/core feature schema."
    )

    @property
    def water_cement_ratio(self) -> float:
        """Classic water/cement ratio — cement only, excludes SCMs."""
        return round(self.water / self.cement, 4) if self.cement else 0.0

    @property
    def water_binder_ratio(self) -> float:
        """Water / total binder (cement + fly_ash + blast_furnace_slag)."""
        binder = self.cement + self.fly_ash + self.blast_furnace_slag
        return round(self.water / binder, 4) if binder else 0.0

    @model_validator(mode="after")
    def check_water_binder_ratio(self) -> "MixComposition":
        binder = self.cement + self.fly_ash + self.blast_furnace_slag
        if binder <= 0:
            raise ValueError(
                "Total binder content (cement + fly_ash + blast_furnace_slag) must be > 0."
            )
        wb_ratio = self.water / binder
        if not (0.2 <= wb_ratio <= 1.0):
            raise ValueError(
                f"Water/binder ratio {wb_ratio:.2f} is outside the plausible "
                "range (0.20 - 1.00). Check the input quantities."
            )
        return self
