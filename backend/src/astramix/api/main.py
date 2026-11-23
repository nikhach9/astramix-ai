from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from astramix.models.strength.predict import predict_strength
from astramix.domain.input_schema import (
    ACTIVE_FEATURE_BOUNDS,
    parse_strict_finite_float,
    parse_strict_integer_age,
)

app = FastAPI(title="AstraMix API", version="v0.1")


class ConcreteMixInputApi(BaseModel):
    cement: Any
    blast_furnace_slag: Any
    fly_ash: Any
    water: Any
    superplasticizer: Any
    coarse_aggregate: Any
    fine_aggregate: Any
    age: Any

    model_config = ConfigDict(extra="forbid")

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
    def _validate_material(cls, v: Any, info) -> float:
        field_name = info.field_name
        spec = ACTIVE_FEATURE_BOUNDS[field_name]
        val = parse_strict_finite_float(v, field_name, spec["label"])
        if val < float(spec["min"]) or val > float(spec["max"]):
            raise ValueError(
                f"{spec['label']} ({field_name}) = {val} is outside training bounds "
                f"[{spec['min']}, {spec['max']}]."
            )
        return float(val)

    @field_validator("age", mode="before")
    @classmethod
    def _validate_age(cls, v: Any) -> int:
        spec = ACTIVE_FEATURE_BOUNDS["age"]
        val = parse_strict_integer_age(v, "age", spec["label"])
        if val < int(spec["min"]) or val > int(spec["max"]):
            raise ValueError(
                f"Curing age (age) = {val} is outside training bounds [{spec['min']}, {spec['max']}]."
            )
        return int(val)


class PredictStrengthRequest(BaseModel):
    mix: ConcreteMixInputApi


class PredictStrengthResponse(BaseModel):
    success: bool
    predicted_strength_mpa: float
    age: float
    water_cement_ratio: float
    water_binder_ratio: float
    model_version: str


@app.post("/api/v1/predict-strength", response_model=PredictStrengthResponse)
def predict_strength_route(payload: PredictStrengthRequest):
    mix_dict = payload.mix.model_dump()
    try:
        result = predict_strength(mix_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
