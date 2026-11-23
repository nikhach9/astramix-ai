"""Shared schema components used across multiple endpoints (v1.0.0 strict contract)."""
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from astramix.domain.input_schema import (
    ACTIVE_FEATURE_BOUNDS,
    compute_water_binder_ratio,
    compute_water_cement_ratio,
    parse_strict_finite_float,
    parse_strict_integer_age,
)


class MixComposition(BaseModel):
    """
    Concrete mix design quantities, in kg per cubic meter (kg/m³),
    and curing age in whole days.

    Uses the versioned v1.0.0 input-validation contract derived from the
    model's validated UCI training envelope. All 8 canonical features are
    required; out-of-range values, NaN/Infinity, negative values, and
    fractional curing ages are rejected without silent clamping.
    """

    model_config = ConfigDict(extra="forbid")

    cement: Any = Field(
        ...,
        description="Cement content (kg/m³), allowed training range 102.0 to 540.0",
    )
    blast_furnace_slag: Any = Field(
        ...,
        description="Blast furnace slag content (kg/m³), allowed training range 0.0 to 359.4",
    )
    fly_ash: Any = Field(
        ...,
        description="Fly ash content (kg/m³), allowed training range 0.0 to 200.1",
    )
    water: Any = Field(
        ...,
        description="Mixing water content (kg/m³), allowed training range 121.75 to 247.0",
    )
    superplasticizer: Any = Field(
        ...,
        description="Superplasticizer content (kg/m³), allowed training range 0.0 to 32.2",
    )
    coarse_aggregate: Any = Field(
        ...,
        description="Coarse aggregate content (kg/m³), allowed training range 801.0 to 1145.0",
    )
    fine_aggregate: Any = Field(
        ...,
        description="Fine aggregate content (kg/m³), allowed training range 594.0 to 992.6",
    )
    age: Any = Field(
        ...,
        description="Curing age at evaluation (integer days), allowed training range 1 to 365",
    )

    @field_validator(
        "cement",
        "blast_furnace_slag",
        "fly_ash",
        "water",
        "superplasticizer",
        "coarse_aggregate",
        "fine_aggregate",
        mode="before",
    )
    @classmethod
    def _validate_material_field(cls, v: Any, info) -> float:
        field_name = info.field_name
        spec = ACTIVE_FEATURE_BOUNDS[field_name]
        label = spec["label"]
        unit = spec["unit"]
        min_val = float(spec["min"])
        max_val = float(spec["max"])

        val = parse_strict_finite_float(v, field_name, label)
        if val < 0:
            raise ValueError(
                f"{label} ({field_name}) cannot be negative (received {val}). "
                f"Allowed model training range: {min_val} to {max_val} {unit}."
            )
        if val < min_val or val > max_val:
            raise ValueError(
                f"{label} ({field_name}) = {val} {unit} is outside the model training range "
                f"[{min_val}, {max_val}] {unit}. Out-of-range inputs are not silently clamped."
            )
        return float(val)

    @field_validator("age", mode="before")
    @classmethod
    def _validate_age_field(cls, v: Any) -> int:
        spec = ACTIVE_FEATURE_BOUNDS["age"]
        label = spec["label"]
        min_val = int(spec["min"])
        max_val = int(spec["max"])

        val = parse_strict_integer_age(v, "age", label)
        if val < 0:
            raise ValueError(
                f"{label} (age) cannot be negative (received {val}). "
                f"Allowed model training range: {min_val} to {max_val} days."
            )
        if val < min_val or val > max_val:
            raise ValueError(
                f"{label} (age) = {val} days is outside the model training range "
                f"[{min_val}, {max_val}] days."
            )
        return int(val)

    @property
    def water_cement_ratio(self) -> float:
        """Classic water/cement ratio — cement only, excludes SCMs."""
        return round(compute_water_cement_ratio(float(self.water), float(self.cement)), 4)

    @property
    def water_binder_ratio(self) -> float:
        """Water / total binder (cement + fly_ash + blast_furnace_slag)."""
        return round(
            compute_water_binder_ratio(
                float(self.water),
                float(self.cement),
                float(self.blast_furnace_slag),
                float(self.fly_ash),
            ),
            4,
        )

    @model_validator(mode="after")
    def check_water_ratios(self) -> "MixComposition":
        wc_ratio = compute_water_cement_ratio(float(self.water), float(self.cement))
        wb_ratio = compute_water_binder_ratio(
            float(self.water),
            float(self.cement),
            float(self.blast_furnace_slag),
            float(self.fly_ash),
        )
        if not (0.2 <= wb_ratio <= 1.0):
            raise ValueError(
                f"Water/binder ratio {wb_ratio:.2f} (w/c = {wc_ratio:.2f}) is outside the plausible "
                "range (0.20 - 1.00). Check the input quantities."
            )
        return self
