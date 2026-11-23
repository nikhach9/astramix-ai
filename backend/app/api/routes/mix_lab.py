"""
Routes for Mix Lab:
- GET /api/v1/schema/mix-input & GET /api/v1/mix-lab/schema
- POST /api/v1/mix-lab/evaluate
- POST /api/v1/mix-lab/optimize
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import MixComposition
from app.schemas.optimize import OptimizationConstraints, OptimizeMixRequest
from app.services.mix_lab_service import BASELINE_REFERENCE_MIX, evaluate_mix_lab
from app.services.optimize_service import optimize_mix
from astramix.domain.input_schema import (
    CANONICAL_FEATURE_ORDER,
    load_versioned_input_schema,
    parse_strict_finite_float,
)

router = APIRouter()


class MixLabEvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mix: MixComposition
    target_strength_mpa: Optional[Any] = None
    target_strength_class: Optional[str] = None
    comparison_mode: str = Field(
        "selected_reference",
        description="Comparison mode for cost and emissions: 'selected_reference' or 'market_cohort'",
    )
    tolerance_pct: Any = Field(
        5.0,
        description="Configurable percentage tolerance band for selected reference comparison",
    )
    currency: str = "USD"
    unit_costs: Optional[Dict[str, Optional[float]]] = None
    strict_custom_prices: bool = False
    emission_factors: Optional[Dict[str, Optional[float]]] = None
    strict_custom_factors: bool = False
    market_cohort_costs: Optional[List[float]] = None
    market_cohort_emissions: Optional[List[float]] = None
    reference_mix: Optional[Dict[str, Any]] = None
    reference_cost_per_m3: Optional[float] = None
    reference_co2_kg_per_m3: Optional[float] = None
    reference_label: str = "Baseline OPC 380 kg/m³ reference mix"
    price_source_id: str = "ASTRAMIX_ENGINEERING_REF_V1"
    emission_factor_set_id: str = "ICE_V3_CRADLE_TO_GATE_A1_A3"

    @field_validator("target_strength_mpa", mode="before")
    @classmethod
    def _val_target(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        val = parse_strict_finite_float(v, "target_strength_mpa", "Target compressive strength")
        if val <= 0 or val > 150.0:
            raise ValueError("Target compressive strength must be in (0, 150] MPa.")
        return float(val)

    @field_validator("tolerance_pct", mode="before")
    @classmethod
    def _val_tol(cls, v: Any) -> float:
        val = parse_strict_finite_float(v, "tolerance_pct", "Comparison tolerance (%)")
        if val < 0 or val > 50.0:
            raise ValueError("tolerance_pct must be between 0 and 50%.")
        return float(val)

    @field_validator("comparison_mode", mode="before")
    @classmethod
    def _val_comp_mode(cls, v: Any) -> str:
        mode = str(v or "selected_reference").strip().lower()
        if mode not in ("selected_reference", "market_cohort"):
            raise ValueError("comparison_mode must be 'selected_reference' or 'market_cohort'.")
        return mode


class MixLabOptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    constraints: OptimizationConstraints
    initial_guess: Optional[MixComposition] = None
    comparison_mode: str = "selected_reference"
    tolerance_pct: float = 5.0
    currency: str = "USD"
    unit_costs: Optional[Dict[str, Optional[float]]] = None
    strict_custom_prices: bool = False
    emission_factors: Optional[Dict[str, Optional[float]]] = None
    strict_custom_factors: bool = False
    market_cohort_costs: Optional[List[float]] = None
    market_cohort_emissions: Optional[List[float]] = None


@router.get("/schema/mix-input")
@router.get("/mix-lab/schema")
def get_mix_input_schema() -> Dict[str, Any]:
    """Return the versioned input-validation contract and training-envelope bounds."""
    return load_versioned_input_schema()


@router.post("/mix-lab/evaluate")
def post_mix_lab_evaluate(request: MixLabEvaluateRequest) -> Dict[str, Any]:
    """Evaluate a mix and return the 3 primary result cards and calculation provenance."""
    return evaluate_mix_lab(
        mix=request.mix,
        target_strength_mpa=request.target_strength_mpa,
        target_strength_class=request.target_strength_class,
        comparison_mode=request.comparison_mode,
        tolerance_pct=float(request.tolerance_pct),
        currency=request.currency,
        unit_costs=request.unit_costs,
        strict_custom_prices=request.strict_custom_prices,
        emission_factors=request.emission_factors,
        strict_custom_factors=request.strict_custom_factors,
        market_cohort_costs=request.market_cohort_costs,
        market_cohort_emissions=request.market_cohort_emissions,
        reference_mix=request.reference_mix,
        reference_cost_per_m3=request.reference_cost_per_m3,
        reference_co2_kg_per_m3=request.reference_co2_kg_per_m3,
        reference_label=request.reference_label,
        price_source_id=request.price_source_id,
        emission_factor_set_id=request.emission_factor_set_id,
    )


@router.post("/mix-lab/optimize")
def post_mix_lab_optimize(request: MixLabOptimizeRequest) -> Dict[str, Any]:
    """
    Run constrained multi-objective mix optimization and evaluate the returned
    candidate mix with the 3 primary result cards. Never labels a failed/infeasible
    solve as an optimum.
    """
    opt_req = OptimizeMixRequest(
        constraints=request.constraints,
        initial_guess=request.initial_guess,
    )
    opt_res = optimize_mix(opt_req)

    # Evaluate the candidate mix if it sits within valid bounds
    cand_dict = {f: getattr(opt_res.mix, f) for f in CANONICAL_FEATURE_ORDER}
    ref_mix_dict = (
        {f: getattr(request.initial_guess, f) for f in CANONICAL_FEATURE_ORDER}
        if request.initial_guess is not None
        else BASELINE_REFERENCE_MIX
    )
    ref_label = (
        "Initial starting mix"
        if request.initial_guess is not None
        else "Baseline OPC 380 kg/m³ reference mix"
    )

    cards_eval = None
    try:
        validated_cand = MixComposition(**cand_dict)
        cards_eval = evaluate_mix_lab(
            mix=validated_cand,
            target_strength_mpa=float(request.constraints.target_strength_mpa),
            comparison_mode=request.comparison_mode,
            tolerance_pct=float(request.tolerance_pct),
            currency=request.currency,
            unit_costs=request.unit_costs,
            strict_custom_prices=request.strict_custom_prices,
            emission_factors=request.emission_factors,
            strict_custom_factors=request.strict_custom_factors,
            market_cohort_costs=request.market_cohort_costs,
            market_cohort_emissions=request.market_cohort_emissions,
            reference_mix=ref_mix_dict,
            reference_label=ref_label,
        )
    except Exception:
        cards_eval = None

    return {
        "success": opt_res.success,
        "is_optimum": opt_res.is_optimum,
        "solver_status": opt_res.solver_status,
        "failure_reason": opt_res.failure_reason,
        "status_label": (
            "Verified Feasible Candidate"
            if opt_res.is_optimum
            else "Optimization Infeasible — Diagnostic Candidate Only (Not an Optimum)"
        ),
        "mix": cand_dict,
        "predicted_strength_mpa": opt_res.predicted_strength_mpa,
        "water_cement_ratio": opt_res.water_cement_ratio,
        "water_binder_ratio": opt_res.water_binder_ratio,
        "co2_kg_per_m3": opt_res.co2_kg_per_m3,
        "cost_per_m3": opt_res.cost_per_m3,
        "objective_value": opt_res.objective_value,
        "warnings": opt_res.warnings,
        "cards": cards_eval["cards"] if cards_eval else None,
        "provenance": cards_eval["provenance"] if cards_eval else None,
    }
