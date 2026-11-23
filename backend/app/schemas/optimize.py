"""Request/response schemas for POST /optimize-mix."""
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import MixComposition
from astramix.domain.input_schema import (
    ACTIVE_FEATURE_BOUNDS,
    MATERIAL_FEATURE_ORDER,
    parse_strict_finite_float,
    parse_strict_integer_age,
)


class MaterialBoundRange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min: Any
    max: Any

    @field_validator("min", "max", mode="before")
    @classmethod
    def _validate_bound_num(cls, v: Any, info) -> float:
        return parse_strict_finite_float(v, info.field_name, f"Material bound {info.field_name}")


class OptimizationConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_strength_mpa: Any = Field(..., description="Target compressive strength in MPa (> 0)")
    age: Any = Field(28, description="Curing age to optimize for (integer days, 1 to 365)")
    max_w_c_ratio: Any = Field(
        0.60, description="Maximum water/cement ratio (water / cement)"
    )
    max_w_b_ratio: Optional[Any] = Field(
        None, description="Optional maximum water/binder ratio (water / total binder, 0.20 to 1.00)"
    )
    alpha: Any = Field(1.0, description="Weight on the CO2 term of the objective (>= 0)")
    beta: Any = Field(1.0, description="Weight on the cost term of the objective (>= 0)")
    candidate_budget: int = Field(512, ge=1, le=10000, strict=True)
    seed: int = Field(42, ge=0, le=4294967295, strict=True)
    cost_reference: Any = Field(100.0, description="Cost normalization reference, in the same currency per m3 as the factor table")
    co2_reference: Any = Field(400.0, description="Emissions normalization reference in kg CO2e per m3")
    material_bounds: Optional[Dict[str, MaterialBoundRange]] = Field(
        None, description="Optional narrower per-material bounds within the active schema limits"
    )

    @field_validator("target_strength_mpa", mode="before")
    @classmethod
    def _validate_target_strength(cls, v: Any) -> float:
        val = parse_strict_finite_float(v, "target_strength_mpa", "Target compressive strength")
        if val <= 0 or val > 150.0:
            raise ValueError("Target compressive strength (target_strength_mpa) must be in (0, 150] MPa.")
        return float(val)

    @field_validator("age", mode="before")
    @classmethod
    def _validate_age(cls, v: Any) -> int:
        val = parse_strict_integer_age(v, "age", "Curing age")
        min_age = int(ACTIVE_FEATURE_BOUNDS["age"]["min"])
        max_age = int(ACTIVE_FEATURE_BOUNDS["age"]["max"])
        if val < min_age or val > max_age:
            raise ValueError(f"Curing age (age) must be an integer between {min_age} and {max_age} days.")
        return int(val)

    @field_validator("max_w_c_ratio", mode="before")
    @classmethod
    def _validate_max_wc(cls, v: Any) -> float:
        val = parse_strict_finite_float(v, "max_w_c_ratio", "Max water/cement ratio")
        if val <= 0 or val > 2.0:
            raise ValueError("max_w_c_ratio must be in (0.0, 2.0].")
        return float(val)

    @field_validator("max_w_b_ratio", mode="before")
    @classmethod
    def _validate_max_wb(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        val = parse_strict_finite_float(v, "max_w_b_ratio", "Max water/binder ratio")
        if val < 0.20 or val > 1.00:
            raise ValueError("max_w_b_ratio must be within the plausible range [0.20, 1.00].")
        return float(val)

    @field_validator("alpha", "beta", mode="before")
    @classmethod
    def _validate_weight(cls, v: Any, info) -> float:
        val = parse_strict_finite_float(v, info.field_name, f"Objective weight {info.field_name}")
        if val < 0:
            raise ValueError(f"Objective weight '{info.field_name}' cannot be negative.")
        return float(val)

    @field_validator("cost_reference", "co2_reference", mode="before")
    @classmethod
    def _validate_reference(cls, v: Any, info) -> float:
        val = parse_strict_finite_float(v, info.field_name, info.field_name)
        if val <= 0:
            raise ValueError(f"{info.field_name} must be positive.")
        return val

    @model_validator(mode="after")
    def _validate_weights_and_bounds(self) -> "OptimizationConstraints":
        if float(self.alpha) == 0.0 and float(self.beta) == 0.0:
            raise ValueError("Objective weights alpha and beta cannot both be zero.")
        if self.material_bounds:
            for var, rng in self.material_bounds.items():
                if var not in MATERIAL_FEATURE_ORDER:
                    raise ValueError(f"Unknown material '{var}' in material_bounds.")
                spec = ACTIVE_FEATURE_BOUNDS[var]
                s_min = float(spec["min"])
                s_max = float(spec["max"])
                u_min = float(rng.min)
                u_max = float(rng.max)
                if u_min > u_max:
                    raise ValueError(
                        f"Material bound for '{var}' has min ({u_min}) > max ({u_max})."
                    )
                if u_min < s_min or u_max > s_max:
                    raise ValueError(
                        f"Material bound for '{var}' [{u_min}, {u_max}] is outside the validated "
                        f"training range [{s_min}, {s_max}] {spec['unit']}."
                    )
        return self


class OptimizeMixRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    constraints: OptimizationConstraints
    initial_guess: Optional[MixComposition] = Field(
        None, description="Optional starting point for the optimizer"
    )


class OptimizedMixResult(BaseModel):
    """Optimizer output mix composition."""

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
    is_optimum: bool = False
    solver_status: str = "no_feasible_candidate_found"
    failure_reason: Optional[str] = None
    mix: OptimizedMixResult
    predicted_strength_mpa: float
    water_cement_ratio: float = 0.0
    water_binder_ratio: float = 0.0
    co2_kg_per_m3: float
    cost_per_m3: float
    objective_value: float
    warnings: list[str] = Field(default_factory=list)
    search: dict = Field(default_factory=dict)
