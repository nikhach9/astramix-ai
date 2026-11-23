"""Exercise the actual PHP implementation against the Python model and search."""
import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest

from astramix.models.strength.predict import predict_strength
from astramix.optimization.optimizer import OptimizationConstraints, run_optimization

ROOT = Path(__file__).resolve().parents[2]
PHP = os.environ.get('ASTRAMIX_PHP_BINARY') or shutil.which('php')
pytestmark = pytest.mark.skipif(not PHP, reason='PHP CLI is not installed')
MIX = dict(cement=350., water=175., fly_ash=0., blast_furnace_slag=0.,
           coarse_aggregate=1040., fine_aggregate=760., superplasticizer=2.5, age=28)


def php_eval(code, payload):
    script = 'require $argv[2]; $data=json_decode($argv[1],true,512,JSON_THROW_ON_ERROR);' + code
    return json.loads(subprocess.check_output([PHP, '-r', script, json.dumps(payload),
                      str(ROOT / 'astramix_php/src/autoload.php')], text=True))


@pytest.mark.parametrize('changes', [{}, {'age': 7}, {'blast_furnace_slag': 80., 'fly_ash': 50., 'age': 90}])
def test_saved_model_prediction_parity(changes):
    mix = {**MIX, **changes}
    actual = php_eval('$p=new AstraMix\\ML\\StrengthPredictor(); echo json_encode($p->predict($data));', mix)
    expected = predict_strength(mix)
    assert actual['raw_prediction'] == pytest.approx(expected['predicted_strength_mpa'], abs=1e-4)


def test_search_result_and_metadata_parity():
    actual = php_eval('$o=new AstraMix\\Optimization\\Optimizer(); echo json_encode($o->optimize(35.,28,.6,null,1.,1.,null,null,null,null,64,43));', {})
    expected = run_optimization(OptimizationConstraints(35), lambda m, a: predict_strength({**m, 'age': a})['predicted_strength_mpa'], candidate_budget=64, seed=43)
    assert {k: v for k, v in actual['mix'].items() if k != 'age'} == expected.mix
    assert actual['predicted_strength_mpa'] == pytest.approx(expected.predicted_strength, abs=1e-4)
    assert actual['objective_value'] == pytest.approx(expected.objective_value, abs=1e-10)
    assert actual['search'] == expected.search


def php_request(path, payload):
    code = '$a=new AstraMix\\Core\\App(); $r=$a->handle(new AstraMix\\Core\\Request("POST",$data["path"],null,null,json_encode($data["body"])));echo json_encode(["status"=>$r->getStatusCode(),"body"=>json_decode($r->getBody(),true)]);'
    return php_eval(code, {'path': path, 'body': payload})


def test_hand_calculated_php_totals_and_missing_factor_coverage():
    # Independent arithmetic: 350*.12 + 175*.002 + 1040*.015 + 760*.020 + 2.5*2.5.
    result = php_request('/api/v1/mix-lab/evaluate', {'mix': MIX})
    assert result['status'] == 200
    cards = result['body']['cards']
    assert result['body']['cost']['total'] == pytest.approx(79.4)
    # 350*.90 + 175*.0003 + 1040*.005 + 760*.005 + 2.5*.70.
    assert result['body']['co2']['total'] == pytest.approx(325.8025)
    incomplete = php_request('/api/v1/mix-lab/evaluate', {'mix': MIX,
        'unit_costs': {'cement': None}, 'emission_factors': {'cement': None}})
    assert incomplete['status'] == 200
    for key, total_key, expected in [('estimated_ingredient_cost', 'total_per_m3', 37.4),
                                      ('estimated_embodied_emissions', 'total_kg_co2e_per_m3', 10.8)]:
        card = incomplete['body']['cards'][key]
        assert card[total_key] is None and card['status'] == 'incomplete'
        assert card['known_subtotal_per_m3' if key == 'estimated_ingredient_cost' else 'known_subtotal_co2_kg_per_m3'] == pytest.approx(expected)
        assert card['coverage']['missing_ingredients'] == ['cement']
    zero = php_request('/api/v1/mix-lab/evaluate', {'mix': MIX,
        'unit_costs': {'fly_ash': None}, 'emission_factors': {'fly_ash': None}})
    assert zero['body']['cards']['estimated_ingredient_cost']['status'] != 'incomplete'


@pytest.mark.parametrize('changes', [{'age':28.5}, {'cement':True}, {'water':'NaN'},
    {'unknown':1}, {'cement':102.,'water':247.}])
def test_php_rejects_invalid_public_predictions(changes):
    result = php_request('/api/v1/predict-strength', {'mix': {**MIX, **changes}})
    assert result['status'] == 422, result


def test_legacy_estimate_response_fields_match_the_python_contract():
    cost = php_request('/api/v1/estimate-cost', {'mix':MIX})
    assert cost['status'] == 200
    assert cost['body']['total_cost_per_m3'] == pytest.approx(79.4)
    assert cost['body']['breakdown_per_m3']['cement'] == 42
    carbon = php_request('/api/v1/estimate-carbon', {'mix':MIX})
    assert carbon['status'] == 200
    assert carbon['body']['total_co2_kg_per_m3'] == pytest.approx(325.803)
