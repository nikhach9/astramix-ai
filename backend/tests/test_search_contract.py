"""Independent fixtures for feasibility, scoring, and the declared search budget."""
import dataclasses
import json
import os
import subprocess
import sys

import pytest

from astramix.optimization.optimizer import (
    DESIGN_VARIABLES, OptimizationConstraints, run_optimization,
)


def two_recipes():
    fixed = dict(zip(DESIGN_VARIABLES, [250, 130, 0, 0, 1000, 750, 0]))
    bounds = {k: (v, v) for k, v in fixed.items()}
    bounds['cement'] = (250, 280)
    return OptimizationConstraints(target_strength=26, material_bounds=bounds)


def test_known_finite_fixture_filters_then_ranks():
    # The first two anchors become 250 and 280 kg cement. Strength is C/10:
    # only 280 passes 26 MPa. Hand score: (252/400 + 28/100)/2 = .455.
    costs = {k: 0. for k in DESIGN_VARIABLES}
    carbon = dict(costs)
    costs['cement'], carbon['cement'] = .1, .9
    result = run_optimization(two_recipes(), lambda mix, age: mix['cement'] / 10,
                              candidate_budget=2, unit_costs=costs, emission_factors=carbon)
    assert result.mix['cement'] == 280
    assert result.objective_value == pytest.approx(.455)
    assert result.success and not result.is_optimum
    assert result.search['evaluated'] == 2


def test_ties_are_stable_and_zero_quantity_does_not_require_a_factor():
    factors = {k: 0. for k in DESIGN_VARIABLES if k != 'superplasticizer'}
    constraints = two_recipes()
    constraints.target_strength = 20
    result = run_optimization(constraints, lambda m, a: 60., candidate_budget=2,
                              unit_costs=factors, emission_factors=factors)
    assert result.mix['cement'] == 250
    assert result.cost == result.co2 == 0


def test_missing_active_factor_never_creates_a_cheap_recommendation():
    with pytest.raises(ValueError, match='missing factors'):
        run_optimization(two_recipes(), lambda m, a: 60., unit_costs={'water': .002})


def test_only_one_prediction_per_unique_candidate_and_real_budget():
    calls = []
    def predict(mix, age):
        calls.append(tuple(mix[k] for k in DESIGN_VARIABLES))
        return 60.
    result = run_optimization(OptimizationConstraints(40), predict, candidate_budget=37)
    assert len(calls) == len(set(calls)) == result.search['evaluated'] == 37


def test_water_cement_and_binder_constraints_are_distinct():
    constraints = two_recipes()
    constraints.material_bounds['cement'] = (200, 200)
    constraints.material_bounds['blast_furnace_slag'] = (100, 100)
    constraints.max_w_c_ratio, constraints.max_w_b_ratio = .6, .5
    result = run_optimization(constraints, lambda m, a: 60.)
    assert result.water_binder_ratio == pytest.approx(130 / 300)
    assert result.water_cement_ratio == pytest.approx(.65)
    assert not result.success and not result.is_optimum
    assert result.solver_status == 'no_feasible_candidate_found'
    assert result.search['generated'] == 1


@pytest.mark.parametrize('options', [
    {'candidate_budget': True}, {'candidate_budget': 0}, {'seed': -1},
    {'alpha': -1}, {'alpha': 0, 'beta': 0}, {'cost_reference': 0},
    {'co2_reference': float('nan')},
])
def test_invalid_search_settings_are_rejected(options):
    with pytest.raises(ValueError):
        run_optimization(OptimizationConstraints(40), lambda m, a: 60., **options)


def test_currency_scale_with_matching_reference_preserves_ranking():
    costs = {k: .1 for k in DESIGN_VARIABLES}
    a = run_optimization(OptimizationConstraints(40), lambda m, a: 60., unit_costs=costs)
    b = run_optimization(OptimizationConstraints(40), lambda m, a: 60.,
                         unit_costs={k: v * 100 for k, v in costs.items()}, cost_reference=10000)
    assert a.mix == b.mix
    assert a.objective_value == pytest.approx(b.objective_value)


def test_imported_test_modules_do_not_change_the_algorithm():
    script = '''
import dataclasses,json,sys
if len(sys.argv)>1: import unittest
from astramix.optimization.optimizer import run_optimization,OptimizationConstraints
r=run_optimization(OptimizationConstraints(40),lambda mix,age:60.,candidate_budget=16)
print(json.dumps(dataclasses.asdict(r),sort_keys=True))
'''
    a = subprocess.check_output([sys.executable, '-c', script], text=True)
    b = subprocess.check_output([sys.executable, '-c', script, 'test-module-imported'], text=True)
    assert json.loads(a) == json.loads(b)


def test_nonfinite_prediction_is_an_error_not_a_success():
    with pytest.raises(ValueError, match='non-finite'):
        run_optimization(OptimizationConstraints(40), lambda m, a: float('nan'))
