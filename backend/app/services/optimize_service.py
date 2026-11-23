"""
Orchestration layer for mix optimization.
"""
import numpy as np
from astramix.optimization.optimizer import DESIGN_VARIABLES
from astramix.optimization.optimizer import OptimizationConstraints as AstraMixOptimizationConstraints
from astramix.optimization.optimizer import run_optimization

from app.core.exceptions import AstraMixError, OptimizationError
from app.ml import strength_predictor
from app.schemas.common import MixComposition
from app.schemas.optimize import OptimizeMixRequest, OptimizeMixResponse, OptimizedMixResult


def _strength_fn(material_quantities: dict, age_days: int) -> float:
    row = dict(material_quantities)
    row["age"] = int(age_days)
    return strength_predictor.predict_from_core_row(row)


def _initial_guess_vector(mix: MixComposition) -> np.ndarray:
    return np.array([float(getattr(mix, field)) for field in DESIGN_VARIABLES], dtype=float)


def optimize_mix(request: OptimizeMixRequest, unit_costs=None, emission_factors=None) -> OptimizeMixResponse:
    constraints = request.constraints

    mat_bounds = None
    if constraints.material_bounds:
        mat_bounds = {
            var: (float(rng.min), float(rng.max))
            for var, rng in constraints.material_bounds.items()
        }

    astramix_constraints = AstraMixOptimizationConstraints(
        target_strength=float(constraints.target_strength_mpa),
        age_days=int(constraints.age),
        max_w_c_ratio=float(constraints.max_w_c_ratio),
        max_w_b_ratio=float(constraints.max_w_b_ratio) if constraints.max_w_b_ratio is not None else None,
        material_bounds=mat_bounds,
    )

    initial_guess = (
        _initial_guess_vector(request.initial_guess)
        if request.initial_guess is not None
        else None
    )

    try:
        result = run_optimization(
            astramix_constraints,
            _strength_fn,
            alpha=float(constraints.alpha),
            beta=float(constraints.beta),
            initial_guess=initial_guess,
            candidate_budget=constraints.candidate_budget,
            seed=constraints.seed,
            cost_reference=constraints.cost_reference,
            co2_reference=constraints.co2_reference,
            unit_costs=unit_costs,
            emission_factors=emission_factors,
        )
    except AstraMixError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise OptimizationError(
            "Mix optimization failed.",
            details={"reason": str(exc)},
        ) from exc

    mix_dict = {k: float(v) for k, v in result.mix.items()}
    mix_dict["age"] = int(constraints.age)

    wc_ratio = getattr(result, "water_cement_ratio", None)
    if wc_ratio is None:
        wc_ratio = round(mix_dict["water"] / mix_dict["cement"], 4) if mix_dict["cement"] > 0 else 0.0
    wb_ratio = getattr(result, "water_binder_ratio", None)
    if wb_ratio is None:
        binder = mix_dict["cement"] + mix_dict["fly_ash"] + mix_dict["blast_furnace_slag"]
        wb_ratio = round(mix_dict["water"] / binder, 4) if binder > 0 else 0.0

    is_optimum = result.is_optimum
    solver_status = result.solver_status
    failure_reason = getattr(result, "failure_reason", None if result.success else "Target constraints could not be met.")

    return OptimizeMixResponse(
        success=bool(result.success),
        is_optimum=bool(is_optimum),
        solver_status=solver_status,
        failure_reason=failure_reason,
        mix=OptimizedMixResult(**mix_dict),
        predicted_strength_mpa=float(result.predicted_strength),
        water_cement_ratio=float(wc_ratio),
        water_binder_ratio=float(wb_ratio),
        co2_kg_per_m3=float(result.co2),
        cost_per_m3=float(result.cost),
        objective_value=float(result.objective_value),
        warnings=list(result.warnings),
        search=result.search,
    )
