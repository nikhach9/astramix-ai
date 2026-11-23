"""Reproducible bounded candidate search; feasibility is not global optimality."""
import json
import math
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np

from astramix.domain.input_schema import (
    ACTIVE_FEATURE_BOUNDS, compute_water_binder_ratio, compute_water_cement_ratio,
    parse_strict_finite_float, parse_strict_integer_age,
)
from astramix.sustainability.impact import DEFAULT_CO2_FACTORS, DEFAULT_COST_FACTORS

CONTRACT = json.loads((Path(__file__).resolve().parents[4] / 'artifacts/search/contract_v1.json').read_text())
DESIGN_VARIABLES = tuple(CONTRACT['design_variables'])
DEFAULT_VARIABLE_BOUNDS = {k: (float(ACTIVE_FEATURE_BOUNDS[k]['min']), float(ACTIVE_FEATURE_BOUNDS[k]['max'])) for k in DESIGN_VARIABLES}
TOLERANCE = 1e-8


@dataclass
class OptimizationConstraints:
    target_strength: float
    age_days: int = 28
    max_w_c_ratio: Optional[float] = 0.60
    max_w_b_ratio: Optional[float] = None
    material_bounds: Optional[Dict[str, Tuple[float, float]]] = None

    def validate(self):
        self.target_strength = parse_strict_finite_float(self.target_strength, 'target_strength', 'Target strength')
        if not 0 < self.target_strength <= 150:
            raise ValueError('Target strength must be in (0, 150] MPa.')
        self.age_days = parse_strict_integer_age(self.age_days, 'age_days', 'Curing age')
        if not 1 <= self.age_days <= 365:
            raise ValueError('Curing age must be in [1, 365] days.')
        for key, low, high in [('max_w_c_ratio', TOLERANCE, 2.0), ('max_w_b_ratio', .20, 1.0)]:
            value = getattr(self, key)
            if value is not None:
                value = parse_strict_finite_float(value, key, key)
                if not low <= value <= high:
                    raise ValueError(f'{key} must be in [{low}, {high}].')
                setattr(self, key, value)
        for key, limits in (self.material_bounds or {}).items():
            if key not in DEFAULT_VARIABLE_BOUNDS or len(limits) != 2:
                raise ValueError(f'Invalid material bounds for {key}.')
            low, high = [parse_strict_finite_float(x, key, key) for x in limits]
            domain_low, domain_high = DEFAULT_VARIABLE_BOUNDS[key]
            if low > high or low < domain_low or high > domain_high:
                raise ValueError(f'Material bounds for {key} must be ordered and inside [{domain_low}, {domain_high}].')


@dataclass
class OptimizationResult:
    mix: Dict[str, float]
    predicted_strength: float
    co2: float
    cost: float
    objective_value: float
    success: bool
    warnings: List[str] = field(default_factory=list)
    water_cement_ratio: float = 0.
    water_binder_ratio: float = 0.
    is_optimum: bool = False
    solver_status: str = 'no_feasible_candidate_found'
    failure_reason: Optional[str] = None
    search: dict = field(default_factory=dict)


def vector_to_mix(values):
    if len(values) != len(DESIGN_VARIABLES):
        raise ValueError('Expected seven ingredient quantities.')
    return {key: float(value) for key, value in zip(DESIGN_VARIABLES, values)}


def resolve_active_bounds(constraints):
    return tuple(tuple(map(float, (constraints.material_bounds or {}).get(k, DEFAULT_VARIABLE_BOUNDS[k]))) for k in DESIGN_VARIABLES)


def generate_candidates(bounds, budget, seed, initial_guess=None):
    """LCG arithmetic is shared with PHP; round generated recipes before inference."""
    candidates, seen = [], set()

    def add(values, generated=True):
        if generated:
            # Clip internal anchors, never user input. Retain an exact boundary
            # if a narrow bound contains no point on the cent grid.
            values = [min(hi, max(lo, math.floor(float(v) * 100 + .5) / 100)) for v, (lo, hi) in zip(values, bounds)]
        row = tuple(float(x) for x in values)
        if row not in seen and len(candidates) < budget:
            seen.add(row)
            candidates.append(row)

    if initial_guess is not None:
        add(initial_guess, generated=False)
    for anchor in CONTRACT['anchors']:
        add(anchor)
    state = seed
    for _ in range(budget * 3):
        if len(candidates) >= budget or all(lo == hi for lo, hi in bounds):
            break
        values = []
        for lo, hi in bounds:
            state = (1664525 * state + 1013904223) % 4294967296
            values.append(lo + (hi - lo) * state / 4294967296)
        add(values)
    return candidates


def _factor_table(custom, defaults):
    if custom is None:
        return defaults
    for key, value in custom.items():
        if key not in DESIGN_VARIABLES:
            raise ValueError(f'Unknown factor material: {key}.')
        if value is not None:
            number = parse_strict_finite_float(value, key, key)
            if number < 0:
                raise ValueError(f'Negative factor for {key}.')
    return custom


def _total(mix, factors):
    if any(qty > 0 and factors.get(key) is None for key, qty in mix.items()):
        return None
    value = float(sum((Decimal(str(qty)) * Decimal(str(factors.get(key) or 0)) for key, qty in mix.items()), Decimal(0)))
    if not math.isfinite(value):
        raise ValueError('Factor calculation exceeds finite numeric range.')
    return value


def run_optimization(constraints, strength_fn: Callable, alpha=1., beta=1., initial_guess=None,
                     candidate_budget=512, seed=42, cost_reference=100., co2_reference=400.,
                     unit_costs=None, emission_factors=None):
    constraints.validate()
    for key, value, low, high in [('candidate_budget', candidate_budget, 1, 10000), ('seed', seed, 0, 4294967295)]:
        if isinstance(value, bool) or not isinstance(value, (int, np.integer)) or not low <= value <= high:
            raise ValueError(f'{key} must be an integer in [{low}, {high}].')
    alpha, beta, cost_reference, co2_reference = [parse_strict_finite_float(v, k, k) for k, v in
        [('alpha', alpha), ('beta', beta), ('cost_reference', cost_reference), ('co2_reference', co2_reference)]]
    if min(alpha, beta) < 0 or max(alpha, beta) == 0 or min(cost_reference, co2_reference) <= 0:
        raise ValueError('Weights must be non-negative with a positive sum; references must be positive.')
    scale = max(alpha, beta)
    a, b = alpha / scale, beta / scale
    a, b = a / (a + b), b / (a + b)
    bounds = resolve_active_bounds(constraints)
    if initial_guess is not None:
        if len(initial_guess) != 7:
            raise ValueError('Expected seven quantities in initial_guess.')
        initial_guess = [parse_strict_finite_float(v, k, k) for k, v in zip(DESIGN_VARIABLES, initial_guess)]
        if any(v < lo or v > hi for v, (lo, hi) in zip(initial_guess, bounds)):
            raise ValueError('Initial guess is outside the requested material bounds.')
    costs = _factor_table(unit_costs, DEFAULT_COST_FACTORS)
    emissions = _factor_table(emission_factors, DEFAULT_CO2_FACTORS)
    candidates = generate_candidates(bounds, int(candidate_budget), int(seed), initial_guess)
    ranked = []
    omitted = 0
    for vector in candidates:
        mix = vector_to_mix(vector)
        cost, co2 = _total(mix, costs), _total(mix, emissions)
        if cost is None or co2 is None:
            omitted += 1
            continue
        predicted = float(strength_fn(mix, constraints.age_days))
        if not math.isfinite(predicted):
            raise ValueError('Strength model returned a non-finite prediction.')
        wc = compute_water_cement_ratio(mix['water'], mix['cement'])
        wb = compute_water_binder_ratio(mix['water'], mix['cement'], mix['blast_furnace_slag'], mix['fly_ash'])
        violations = [max(0., constraints.target_strength - predicted), max(0., .20 - wb), max(0., wb - 1.)]
        if constraints.max_w_c_ratio is not None:
            violations.append(max(0., wc - constraints.max_w_c_ratio))
        if constraints.max_w_b_ratio is not None:
            violations.append(max(0., wb - constraints.max_w_b_ratio))
        feasible = all(value <= TOLERANCE for value in violations)
        score = a * co2 / co2_reference + b * cost / cost_reference
        if not math.isfinite(score):
            raise ValueError('Normalized objective exceeds finite numeric range.')
        ranked.append(((not feasible, 0. if feasible else sum(violations), score, vector), mix, predicted, co2, cost, wc, wb))
    if not ranked:
        raise ValueError('No rankable candidates: missing factors for active ingredients.')
    key, mix, predicted, co2, cost, wc, wb = min(ranked, key=lambda row: row[0])
    feasible = not key[0]
    warnings = ['Best candidate among the evaluated recipes; global optimality and physical suitability are not established.',
                'Normalized weighted-sum ranking uses the recorded cost and emissions references.']
    if omitted:
        warnings.append(f'{omitted} candidates excluded because active ingredient factors were missing.')
    search = {'method': CONTRACT['version'], 'seed': int(seed), 'candidate_budget': int(candidate_budget),
              'generated': len(candidates), 'evaluated': len(ranked), 'feasible': sum(not r[0][0] for r in ranked),
              'optimality_scope': 'best_evaluated_candidate', 'cost_reference': cost_reference,
              'co2_reference': co2_reference, 'alpha': alpha, 'beta': beta, 'constraint_tolerance': TOLERANCE}
    return OptimizationResult(mix=mix, predicted_strength=predicted, co2=co2, cost=cost,
        objective_value=key[2], success=feasible, warnings=warnings, water_cement_ratio=wc,
        water_binder_ratio=wb, solver_status='feasible_candidate_found' if feasible else 'no_feasible_candidate_found',
        failure_reason=None if feasible else 'No feasible candidate was found within the declared search budget.', search=search)
