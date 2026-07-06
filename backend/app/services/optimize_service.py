"""
Orchestration layer for mix optimization.

Delegates the actual search to the real AstraMix package
(`astramix.optimization.optimizer.run_optimization`) — this backend
does not run its own placeholder grid search. This module only adapts
between our API schemas and that package's contract.

CONTRACT:
    DESIGN_VARIABLES: tuple[str, ...]
        The canonical material-quantity order the optimizer's internal
        vector representation uses: (cement, water, fly_ash,
        blast_furnace_slag, coarse_aggregate, fine_aggregate,
        superplasticizer). `initial_guess` must be encoded as a NumPy
        array in exactly this order — the optimizer works on raw
        vectors internally, not dicts.

    OptimizationConstraints(
        target_strength: float,
        age_days: int,
        max_w_c_ratio: float,
    )

    run_optimization(
        constraints: OptimizationConstraints,
        strength_fn: Callable[[dict[str, float], int], float],
        alpha: float,
        beta: float,
        initial_guess: np.ndarray | None = None,
        **kwargs,
    ) -> OptimizationResult

    `strength_fn(material_quantities, age_days)` receives a dict of the
    7 canonical material quantities AND the curing age as a separate
    argument. We supply a closure around our own trained model here,
    since the strength model lives in this backend, not in the
    astramix core package — candidates are evaluated via
    `strength_predictor.predict_from_core_row`, which does NOT go
    through MixComposition/Pydantic API validation (candidates are
    searched, not user-submitted requests).

    `OptimizationResult` exposes:
        .mix                  dict[str, float] of material quantities
        .predicted_strength   float (MPa)
        .co2                  float (kg CO2e / m3)
        .cost                 float (currency / m3)
        .objective_value      float
        .success              bool — whether the search converged to a
                               satisfactory candidate. `success=False`
                               is a normal, well-formed result (not an
                               exception) and is returned to the client
                               as HTTP 200 with `success: false` and
                               `warnings` explaining why, so the caller
                               can inspect the best-effort mix found.
        .warnings             list[str]

    Domain errors raised deeper in the call (e.g. `ModelLoadError` or
    `PredictionError` surfacing from `strength_fn` ->
    `predict_from_core_row`) are `AstraMixError` subclasses and already
    carry their own precise status code/message — they propagate
    as-is rather than being flattened into a generic
    `OptimizationError`/422. Only non-domain exceptions (bugs, truly
    unexpected failures) get wrapped as `OptimizationError`.
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
    """Adapt our trained-model predictor into the shape the optimizer
    expects, without instantiating MixComposition (no API-level
    Pydantic validation for search candidates)."""
    row = dict(material_quantities)
    row["age"] = age_days
    return strength_predictor.predict_from_core_row(row)


def _initial_guess_vector(mix: MixComposition) -> np.ndarray:
    """Encode a validated MixComposition as a NumPy vector in
    DESIGN_VARIABLES order — the optimizer's internal representation,
    not a dict."""
    return np.array([getattr(mix, field) for field in DESIGN_VARIABLES], dtype=float)


def optimize_mix(request: OptimizeMixRequest) -> OptimizeMixResponse:
    constraints = request.constraints

    astramix_constraints = AstraMixOptimizationConstraints(
        target_strength=constraints.target_strength_mpa,
        age_days=constraints.age,
        max_w_c_ratio=constraints.max_w_c_ratio,
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
            alpha=constraints.alpha,
            beta=constraints.beta,
            initial_guess=initial_guess,
            max_iter=5,  # Cap iterations for fast API response
        )
    except AstraMixError:
        # A domain error raised deeper in the call (e.g. ModelLoadError
        # or PredictionError from strength_fn -> predict_from_core_row)
        # already carries its own precise status code and message —
        # re-raise it as-is rather than flattening it into a generic
        # OptimizationError/422.
        raise
    except Exception as exc:  # noqa: BLE001
        raise OptimizationError(
            "Mix optimization failed.",
            details={"reason": str(exc)},
        ) from exc

    # A search that completes but doesn't converge to a satisfactory
    # mix is a normal, informative result — not an HTTP error. The
    # client gets the best-effort mix, success=False, and warnings.
    # `OptimizedMixResult` (not `MixComposition`) is used here on
    # purpose: a non-converged candidate must not fail response
    # validation just for sitting outside the plausible-input
    # water/binder ratio band.
    mix_dict = dict(result.mix)
    mix_dict.setdefault("age", constraints.age)

    return OptimizeMixResponse(
        success=result.success,
        mix=OptimizedMixResult(**mix_dict),
        predicted_strength_mpa=round(result.predicted_strength, 2),
        co2_kg_per_m3=round(result.co2, 3),
        cost_per_m3=round(result.cost, 2),
        objective_value=round(result.objective_value, 4),
        warnings=list(result.warnings),
    )
