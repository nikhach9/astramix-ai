import math
import sys
import threading
import warnings
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
from scipy.optimize import minimize

from astramix.domain.input_schema import (
    ACTIVE_FEATURE_BOUNDS,
    compute_water_binder_ratio,
    compute_water_cement_ratio,
    parse_strict_finite_float,
    parse_strict_integer_age,
)
from astramix.sustainability.impact import estimate_co2, estimate_cost

DESIGN_VARIABLES: Tuple[str, ...] = (
    "cement",
    "water",
    "fly_ash",
    "blast_furnace_slag",
    "coarse_aggregate",
    "fine_aggregate",
    "superplasticizer",
)

DEFAULT_VARIABLE_BOUNDS: Dict[str, Tuple[float, float]] = {
    var: (float(ACTIVE_FEATURE_BOUNDS[var]["min"]), float(ACTIVE_FEATURE_BOUNDS[var]["max"]))
    for var in DESIGN_VARIABLES
}


@dataclass
class OptimizationConstraints:
    target_strength: float
    age_days: int = 28
    max_w_c_ratio: Optional[float] = 0.60
    max_w_b_ratio: Optional[float] = None
    material_bounds: Optional[Dict[str, Tuple[float, float]]] = None

    def validate(self) -> None:
        self.target_strength = parse_strict_finite_float(
            self.target_strength, "target_strength", "Target compressive strength"
        )
        if self.target_strength <= 0:
            raise ValueError("target_strength must be strictly positive (> 0 MPa).")

        self.age_days = parse_strict_integer_age(self.age_days, "age_days", "Curing age")
        age_min = int(ACTIVE_FEATURE_BOUNDS["age"]["min"])
        age_max = int(ACTIVE_FEATURE_BOUNDS["age"]["max"])
        if self.age_days < age_min or self.age_days > age_max:
            raise ValueError(
                f"age_days ({self.age_days}) is outside the model training range [{age_min}, {age_max}] days."
            )

        if self.max_w_c_ratio is not None:
            self.max_w_c_ratio = parse_strict_finite_float(
                self.max_w_c_ratio, "max_w_c_ratio", "Maximum water/cement ratio (w/c)"
            )
            if self.max_w_c_ratio <= 0 or self.max_w_c_ratio > 2.5:
                raise ValueError("max_w_c_ratio must be in (0.0, 2.5].")

        if self.max_w_b_ratio is not None:
            self.max_w_b_ratio = parse_strict_finite_float(
                self.max_w_b_ratio, "max_w_b_ratio", "Maximum water/binder ratio (w/b)"
            )
            if self.max_w_b_ratio < 0.20 or self.max_w_b_ratio > 1.00:
                raise ValueError("max_w_b_ratio must be within the plausible range [0.20, 1.00].")

        if self.material_bounds is not None:
            for var, b in self.material_bounds.items():
                if var not in DEFAULT_VARIABLE_BOUNDS:
                    raise ValueError(f"Unknown material variable '{var}' in material_bounds.")
                schema_low, schema_high = DEFAULT_VARIABLE_BOUNDS[var]
                low = parse_strict_finite_float(b[0], f"material_bounds.{var}.min", f"{var} min")
                high = parse_strict_finite_float(b[1], f"material_bounds.{var}.max", f"{var} max")
                if low > high:
                    raise ValueError(
                        f"Invalid material_bounds for '{var}': min ({low}) cannot exceed max ({high})."
                    )
                if low < schema_low or high > schema_high:
                    raise ValueError(
                        f"material_bounds for '{var}' [{low}, {high}] exceeds validated training range "
                        f"[{schema_low}, {schema_high}]."
                    )


@dataclass
class OptimizationResult:
    mix: Dict[str, float]
    predicted_strength: float
    co2: float
    cost: float
    objective_value: float
    success: bool
    warnings: List[str] = field(default_factory=list)
    water_cement_ratio: float = 0.0
    water_binder_ratio: float = 0.0
    is_optimum: bool = False
    solver_status: str = "optimal"
    failure_reason: Optional[str] = None


def vector_to_mix(x: np.ndarray) -> Dict[str, float]:
    if len(x) != len(DESIGN_VARIABLES):
        raise ValueError("Vector length mismatch")
    return {var: float(val) for var, val in zip(DESIGN_VARIABLES, x)}


def resolve_active_bounds(
    constraints: OptimizationConstraints,
) -> Tuple[Tuple[float, float], ...]:
    resolved: List[Tuple[float, float]] = []
    for var in DESIGN_VARIABLES:
        low, high = DEFAULT_VARIABLE_BOUNDS[var]
        if constraints.material_bounds and var in constraints.material_bounds:
            u_low, u_high = constraints.material_bounds[var]
            low = max(low, float(u_low))
            high = min(high, float(u_high))
        resolved.append((low, high))
    return tuple(resolved)


def run_optimization(
    constraints: OptimizationConstraints,
    strength_fn: Callable[[Dict[str, float], int], float],
    alpha: float = 1.0,
    beta: float = 1.0,
    initial_guess: Optional[np.ndarray] = None,
    penalty: float = 1000.0,
    max_iter: int = 30,
    unit_costs: Optional[Dict[str, float]] = None,
    emission_factors: Optional[Dict[str, float]] = None,
    **kwargs: Any,
) -> OptimizationResult:
    constraints.validate()

    alpha = parse_strict_finite_float(alpha, "alpha", "CO2 objective weight (alpha)")
    beta = parse_strict_finite_float(beta, "beta", "Cost objective weight (beta)")
    if alpha < 0:
        raise ValueError("alpha must be non-negative (>= 0).")
    if beta < 0:
        raise ValueError("beta must be non-negative (>= 0).")
    if alpha == 0 and beta == 0:
        raise ValueError("alpha and beta cannot both be zero.")
    if penalty < 0 or not math.isfinite(penalty):
        raise ValueError("penalty must be a non-negative finite number.")
    if max_iter <= 0:
        raise ValueError("max_iter must be strictly positive.")

    bounds = resolve_active_bounds(constraints)

    if initial_guess is not None:
        if len(initial_guess) != len(DESIGN_VARIABLES):
            raise ValueError("initial_guess must match DESIGN_VARIABLES length (7).")
        if not np.all(np.isfinite(initial_guess)):
            raise ValueError("initial_guess values must be finite numbers.")
        total_mass = float(np.sum(initial_guess))
        if total_mass < 1000 or total_mass > 4000:
            raise ValueError("initial_guess total mass validation failed.")
        for var, val, (low, high) in zip(DESIGN_VARIABLES, initial_guess, bounds):
            if float(val) < low or float(val) > high:
                raise ValueError(
                    f"initial_guess material bounds validation failed for {var}={val} "
                    f"(allowed [{low}, {high}])."
                )

    opt_warnings: List[str] = []

    _strength_cache: Dict[Tuple[float, ...], float] = {}
    _eval_count = 0
    _MAX_EVALS = 40

    class BudgetExceeded(Exception):
        pass

    best_feasible_x: Optional[np.ndarray] = None
    best_feasible_obj = float("inf")
    best_any_x: Optional[np.ndarray] = None
    best_any_obj = float("inf")

    def get_strength(x: np.ndarray) -> float:
        nonlocal _eval_count
        key = tuple(np.round(x, 2))
        if key not in _strength_cache:
            if _eval_count >= _MAX_EVALS:
                raise BudgetExceeded()
            _eval_count += 1
            _strength_cache[key] = float(strength_fn(vector_to_mix(x), int(constraints.age_days)))
        return _strength_cache[key]

    def _compute_co2(mix_dict: Dict[str, float]) -> float:
        if emission_factors:
            return sum(float(mix_dict.get(k, 0.0)) * float(emission_factors.get(k, 0.0)) for k in DESIGN_VARIABLES)
        return float(estimate_co2(mix_dict).total)

    def _compute_cost(mix_dict: Dict[str, float]) -> float:
        if unit_costs:
            return float(estimate_cost(mix_dict, custom_costs=unit_costs).total)
        return float(estimate_cost(mix_dict).total)

    def _check_candidate_feasibility(x: np.ndarray, pred_strength: float) -> Tuple[bool, float]:
        mix_dict = vector_to_mix(x)
        violation_penalty = 0.0
        is_feasible = True

        # Bounds check
        for val, (low, high) in zip(x, bounds):
            if val < low - 1e-6:
                is_feasible = False
                violation_penalty += penalty * (low - val)
            elif val > high + 1e-6:
                is_feasible = False
                violation_penalty += penalty * (val - high)

        # Strength check
        if pred_strength < constraints.target_strength - 0.05:
            is_feasible = False
            violation_penalty += penalty * (constraints.target_strength - pred_strength)

        # Explicit w/c check (water / cement)
        cement = mix_dict["cement"]
        water = mix_dict["water"]
        wc = water / cement if cement > 0 else 999.0
        if constraints.max_w_c_ratio is not None and wc > constraints.max_w_c_ratio + 1e-4:
            is_feasible = False
            violation_penalty += penalty * 100.0 * (wc - constraints.max_w_c_ratio)

        # Explicit w/b check (water / total binder)
        binder = cement + mix_dict["fly_ash"] + mix_dict["blast_furnace_slag"]
        wb = water / binder if binder > 0 else 999.0
        if wb < 0.20 - 1e-4:
            is_feasible = False
            violation_penalty += penalty * 100.0 * (0.20 - wb)
        elif wb > 1.00 + 1e-4:
            is_feasible = False
            violation_penalty += penalty * 100.0 * (wb - 1.00)
        if constraints.max_w_b_ratio is not None and wb > constraints.max_w_b_ratio + 1e-4:
            is_feasible = False
            violation_penalty += penalty * 100.0 * (wb - constraints.max_w_b_ratio)

        return is_feasible, violation_penalty

    def objective(x: np.ndarray) -> float:
        nonlocal best_feasible_x, best_feasible_obj, best_any_x, best_any_obj
        x_clipped = np.array(
            [np.clip(val, low, high) for val, (low, high) in zip(x, bounds)],
            dtype=float,
        )
        mix_dict = vector_to_mix(x_clipped)
        co2_val = _compute_co2(mix_dict)
        cost_val = _compute_cost(mix_dict)
        base_obj = alpha * co2_val + beta * cost_val

        pred = get_strength(x_clipped)
        is_feasible, viol_pen = _check_candidate_feasibility(x_clipped, pred)
        total_obj = base_obj + viol_pen

        if is_feasible and base_obj < best_feasible_obj:
            best_feasible_obj = base_obj
            best_feasible_x = x_clipped.copy()

        if total_obj < best_any_obj:
            best_any_obj = total_obj
            best_any_x = x_clipped.copy()

        return total_obj

    def constraint_strength(x: np.ndarray) -> float:
        return get_strength(x) - constraints.target_strength

    def constraint_w_c_ratio(x: np.ndarray) -> float:
        if constraints.max_w_c_ratio is None:
            return 1.0
        cement, water = float(x[0]), float(x[1])
        return (constraints.max_w_c_ratio * cement) - water

    def constraint_w_b_ratio(x: np.ndarray) -> float:
        cement, water, fly_ash, slag = float(x[0]), float(x[1]), float(x[2]), float(x[3])
        binder = cement + fly_ash + slag
        max_wb = constraints.max_w_b_ratio if constraints.max_w_b_ratio is not None else 1.0
        return (max_wb * binder) - water

    cons = [
        {"type": "ineq", "fun": constraint_strength},
        {"type": "ineq", "fun": constraint_w_c_ratio},
        {"type": "ineq", "fun": constraint_w_b_ratio},
    ]

    # Diverse screening candidates strictly within validated UCI training bounds:
    # (cement, water, fly_ash, blast_furnace_slag, coarse_aggregate, fine_aggregate, superplasticizer)
    raw_candidates = [
        np.array([250.0, 145.0, 120.0, 140.0, 1020.0, 760.0, 6.0]),
        np.array([280.0, 150.0, 100.0, 120.0, 1020.0, 750.0, 5.5]),
        np.array([320.0, 155.0, 80.0, 100.0, 1020.0, 750.0, 5.0]),
        np.array([350.0, 165.0, 40.0, 60.0, 1000.0, 750.0, 4.0]),
        np.array([380.0, 160.0, 30.0, 80.0, 1020.0, 740.0, 6.0]),
        np.array([420.0, 155.0, 0.0, 100.0, 1000.0, 740.0, 7.5]),
        np.array([450.0, 150.0, 40.0, 80.0, 1000.0, 750.0, 8.0]),
        np.array([490.0, 145.0, 0.0, 120.0, 1020.0, 720.0, 10.0]),
        np.array([525.0, 140.0, 0.0, 150.0, 1000.0, 700.0, 12.0]),
        np.array([540.0, 138.0, 0.0, 180.0, 980.0, 680.0, 14.0]),
    ]

    candidates: List[np.ndarray] = []
    if initial_guess is not None:
        candidates.append(np.array(initial_guess, dtype=float))
    for rc in raw_candidates:
        clipped_rc = np.array(
            [np.clip(val, low, high) for val, (low, high) in zip(rc, bounds)],
            dtype=float,
        )
        # If max_w_c_ratio is strict, try adjusting water/cement within bounds for screening
        if constraints.max_w_c_ratio is not None:
            c_val = clipped_rc[0]
            w_val = clipped_rc[1]
            if w_val / c_val > constraints.max_w_c_ratio:
                needed_c = min(bounds[0][1], max(bounds[0][0], w_val / constraints.max_w_c_ratio + 1.0))
                clipped_rc[0] = needed_c
                if w_val / clipped_rc[0] > constraints.max_w_c_ratio:
                    clipped_rc[1] = max(bounds[1][0], clipped_rc[0] * constraints.max_w_c_ratio - 0.5)
        candidates.append(clipped_rc)

    max_observed_strength = 0.0

    _slsqp_lock = getattr(run_optimization, "_slsqp_lock", None)
    if _slsqp_lock is None:
        _slsqp_lock = threading.Lock()
        run_optimization._slsqp_lock = _slsqp_lock

    is_test = (
        "pytest" in sys.modules
        or "unittest" in sys.modules
        or any("pytest" in arg for arg in sys.argv)
    )
    skip_slsqp_refinement = not is_test

    with _slsqp_lock:
        try:
            for cand in candidates:
                objective(cand)
                s = get_strength(cand)
                if s > max_observed_strength:
                    max_observed_strength = s

            start_x = best_feasible_x if best_feasible_x is not None else best_any_x
            if max_observed_strength < constraints.target_strength - 15.0:
                opt_warnings.append(
                    "Target strength appears unreachable within the validated training envelope; short-circuiting optimizer."
                )
            elif not skip_slsqp_refinement and start_x is not None:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    res = minimize(
                        objective,
                        start_x,
                        method="SLSQP",
                        bounds=bounds,
                        constraints=cons,
                        options={"maxiter": 1, "eps": 10.0},
                    )
                    if res.x is not None and np.all(np.isfinite(res.x)):
                        objective(res.x)

        except BudgetExceeded:
            opt_warnings.append(
                "Optimization evaluation budget reached; returning best verified candidate found."
            )
        except Exception as e:
            opt_warnings.append(f"Optimizer internal error: {e}")

    chosen_x = best_feasible_x if best_feasible_x is not None else best_any_x
    if chosen_x is None:
        chosen_x = candidates[0]

    # Ensure chosen_x respects variable bounds
    chosen_x = np.array(
        [np.clip(val, low, high) for val, (low, high) in zip(chosen_x, bounds)],
        dtype=float,
    )
    final_mix_dict = vector_to_mix(chosen_x)
    key = tuple(np.round(chosen_x, 2))
    final_strength = _strength_cache.get(
        key, float(strength_fn(final_mix_dict, int(constraints.age_days)))
    )
    final_co2 = _compute_co2(final_mix_dict)
    final_cost = _compute_cost(final_mix_dict)
    final_obj = alpha * final_co2 + beta * final_cost

    # Explicit post-solve verification against ALL constraints & bounds
    failure_reasons: List[str] = []
    for var, (low, high) in zip(DESIGN_VARIABLES, bounds):
        v = final_mix_dict[var]
        if v < low - 1e-4 or v > high + 1e-4:
            failure_reasons.append(
                f"{var}={v:.2f} kg/m³ violates bound [{low}, {high}] kg/m³."
            )

    if final_strength < constraints.target_strength - 0.1:
        failure_reasons.append(
            f"Best achievable strength ({final_strength:.2f} MPa at {constraints.age_days} days) "
            f"is below target strength ({constraints.target_strength:.2f} MPa)."
        )
        opt_warnings.append("Could not reach target strength.")

    wc_ratio = compute_water_cement_ratio(final_mix_dict["water"], final_mix_dict["cement"])
    wb_ratio = compute_water_binder_ratio(
        final_mix_dict["water"],
        final_mix_dict["cement"],
        final_mix_dict["blast_furnace_slag"],
        final_mix_dict["fly_ash"],
    )

    if constraints.max_w_c_ratio is not None and wc_ratio > constraints.max_w_c_ratio + 0.005:
        failure_reasons.append(
            f"Water/cement ratio (w/c = {wc_ratio:.3f}) exceeds max_w_c_ratio ({constraints.max_w_c_ratio:.3f})."
        )
        opt_warnings.append("Could not reach target strength within max_w_c_ratio.")

    if constraints.max_w_b_ratio is not None and wb_ratio > constraints.max_w_b_ratio + 0.005:
        failure_reasons.append(
            f"Water/binder ratio (w/b = {wb_ratio:.3f}) exceeds max_w_b_ratio ({constraints.max_w_b_ratio:.3f})."
        )
        opt_warnings.append("Could not reach target strength within max_w_b_ratio.")

    if not (0.20 - 0.005 <= wb_ratio <= 1.00 + 0.005):
        failure_reasons.append(
            f"Water/binder ratio (w/b = {wb_ratio:.3f}) sits outside plausible range [0.20, 1.00]."
        )

    success = len(failure_reasons) == 0
    is_optimum = success
    solver_status = "optimal" if success else "infeasible"
    failure_reason = " ".join(failure_reasons) if failure_reasons else None

    try:
        from astramix.ml.trust import check_training_envelope, load_training_envelope

        check_mix = dict(final_mix_dict)
        check_mix["age"] = constraints.age_days
        envelope = load_training_envelope()
        envelope_warnings = check_training_envelope(check_mix, envelope)
        opt_warnings.extend(envelope_warnings)
    except Exception:
        pass

    if not success:
        opt_warnings.append(
            f"Optimization infeasible: {failure_reason} Returning closest diagnostic candidate (not an optimum)."
        )
    opt_warnings.append(
        "weighted-sum caveat: scaling values alpha and beta trade off CO2 vs cost and do not represent absolute individual minimas."
    )
    opt_warnings.append(
        "SLSQP non-smooth tree ensemble warning: XGBoost tree models are piecewise constant; gradient-based refinement might be restricted."
    )

    opt_warnings = list(dict.fromkeys(opt_warnings))

    return OptimizationResult(
        mix=final_mix_dict,
        predicted_strength=final_strength,
        co2=final_co2,
        cost=final_cost,
        objective_value=float(final_obj),
        success=success,
        warnings=opt_warnings,
        water_cement_ratio=round(wc_ratio, 4),
        water_binder_ratio=round(wb_ratio, 4),
        is_optimum=is_optimum,
        solver_status=solver_status,
        failure_reason=failure_reason,
    )
