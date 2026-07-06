from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from astramix.models.strength.predict import predict_strength

app = FastAPI(title="AstraMix API", version="v0.1")

class ConcreteMixInputApi(BaseModel):
    cement: float
    blast_furnace_slag: float
    fly_ash: float
    water: float
    superplasticizer: float
    coarse_aggregate: float
    fine_aggregate: float
    age: float
    
    model_config = ConfigDict(extra="forbid")

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
        # If the model artifact is missing or cannot load, do not use heuristic fallback.
        # Raise the existing model-load/prediction error.
        raise HTTPException(status_code=400, detail=str(e))
