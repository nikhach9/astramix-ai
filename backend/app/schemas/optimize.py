"""Request/response schemas for POST /optimize-mix.

v0.1 optimizer note: the accepted optimizer is a weighted-sum search
over strength/CO2/cost (via `alpha`/`beta` weights) with `max_w_c_ratio`
as its one *actually enforced* hard constraint (defaults to 0.60). It
does NOT enforce `max_co2_kg_per_m3` or `max_cost_per_m3` as hard
constraints, so those are intentionally not exposed here — only fields
the optimizer actually understands and enforces are.
"""
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import MixComposition


class OptimizationConstraints(BaseModel):
    target_strength_mpa: float = Field(..., gt=0, le=150)
    age: int = Field(28, ge=1, le=365, description="Curing age to optimize for (days)")
    max_w_c_ratio: float = Field(
        0.60, gt=0, le=2.0, description="Max water/cement ratio the optimizer must respect"
    )
    alpha: float = Field(1.0, ge=0, description="Weight on the CO2 term of the objective")
    beta: float = Field(1.0, ge=0, description="Weight on the cost term of the objective")


class OptimizeMixRequest(BaseModel):
    constraints: OptimizationConstraints
    initial_guess: MixComposition | None = Field(
        None, description="Optional starting point for the optimizer"
    )


class OptimizedMixResult(BaseModel):
    """Optimizer OUTPUT shape — deliberately NOT `MixComposition`.

    `MixComposition` is an API-*input* schema: `extra="forbid"` and,
    more importantly, a `model_validator` that rejects implausible
    water/binder ratios. Optimizer candidates are search output, not
    user-submitted requests — a non-converged best-effort mix can
    legitimately sit outside that plausible-input band, and that must
    still come back to the client as a normal `success: false` result,
    not fail with a 500 from response-model validation. This schema
    mirrors the same fields with no cross-field validation.
    """

    model_config = ConfigDict(extra="forbid")

    cement: float
    water: float
    fine_aggregate: float
    coarse_aggregate: float
    fly_ash: float = 0.0
    blast_furnace_slag: float = 0.0
    superplasticizer: float = 0.0
    age: int = 28


class OptimizeMixResponse(BaseModel):
    success: bool
    mix: OptimizedMixResult
    predicted_strength_mpa: float
    co2_kg_per_m3: float
    cost_per_m3: float
    objective_value: float
    warnings: list[str] = Field(default_factory=list)
