"""Check Python/PHP parity before publishing a versioned model manifest."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend/src'))
from astramix.data.schema import STRENGTH_FEATURE_COLUMNS


def publish(php):
    folder = ROOT / 'artifacts/models/strength/grouped_v1'
    metadata = json.loads((folder / 'model_metadata.json').read_text())
    model_path = folder / (metadata['best_model_name'].lower() + '.joblib')
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != metadata['model_sha256']:
        raise ValueError('The selected model does not match its metadata.')
    model = joblib.load(model_path)
    fixtures_path = ROOT / 'astramix_php/tests/fixtures/reference_predictions.json'
    fixtures = json.loads(fixtures_path.read_text())
    # Include reference mixtures and all unique feature rows, including exact
    # split thresholds, to catch float32/float64 traversal differences.
    inputs = [row['input'] for row in fixtures['mixes']]
    dataset = pd.read_csv(ROOT / 'data/processed/strength_dataset_v0_1.csv')
    rows = pd.DataFrame(inputs, columns=STRENGTH_FEATURE_COLUMNS)
    rows = pd.concat([rows, dataset[STRENGTH_FEATURE_COLUMNS]], ignore_index=True)
    expected = model.predict(rows)
    php_code = 'require $argv[2]; $m=new AstraMix\\ML\\TreeEnsemble($argv[1]); $rows=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR); echo json_encode(array_map(fn($r)=>$m->predict($r),$rows));'
    raw = subprocess.check_output([php, '-r', php_code, str(folder / 'model.json'),
        str(ROOT / 'astramix_php/src/autoload.php')], input=rows.to_json(orient='values'), text=True)
    actual = np.array(json.loads(raw))
    difference = float(np.max(np.abs(actual - expected)))
    if difference > 1e-4:
        raise ValueError(f'PHP prediction parity failed: maximum difference {difference} MPa.')
    php_root = ROOT / 'astramix_php/data/models'
    shutil.copy2(folder / 'model.json', php_root / 'model_grouped_v1.json')
    shutil.copy2(folder / 'model_metadata.json', php_root / 'model_metadata_grouped_v1.json')
    shutil.copy2(folder / 'training_envelope.json', php_root / 'training_envelope_grouped_v1.json')
    schema = json.loads((ROOT / 'artifacts/models/strength/baseline/input_schema_v1.json').read_text())
    schema.update(model_version=metadata['model_version'], best_model_name=metadata['best_model_name'])
    for key, spec in schema['features'].items():
        bounds = metadata['training_bounds'][key]
        spec['train_split_bounds'] = bounds
        spec['split_differs_from_reference'] = bounds != spec.get('uci_reference_bounds')
        spec['split_difference_note'] = f"Model development partition has {metadata['split']['training_rows']} rows; recipe-grouped holdout uses seed {metadata['split']['seed']}."
    (folder / 'input_schema_v1.json').write_text(json.dumps(schema, indent=2) + '\n')
    shutil.copy2(folder / 'input_schema_v1.json', php_root / 'input_schema_v1.json')
    reference_mixes = []
    for row in fixtures['mixes']:
        prediction = float(model.predict(pd.DataFrame([row['input']], columns=STRENGTH_FEATURE_COLUMNS))[0])
        reference_mixes.append({'id': row['id'], 'input': row['input'], 'prediction': {
            'predicted_strength_mpa': prediction, 'model_version': metadata['model_version'],
            'model_sha256': metadata['model_sha256']}})
    fixtures = {'description': 'Reference model predictions for cross-language translation checks; arithmetic oracles live in separate tests.',
        'generated_at': datetime.now(timezone.utc).isoformat(), 'model_version': metadata['model_version'], 'mixes': reference_mixes}
    fixtures_path.write_text(json.dumps(fixtures, indent=2) + chr(10))
    frontend = {key: metadata[key] for key in ['model_version','best_model_name','validation_metrics',
        'baseline_test_metrics','validation_protocol','development_comparison','split','model_sha256']}
    (ROOT / 'frontend/src/data/modelValidation.json').write_text(json.dumps(frontend, indent=2) + '\n')
    manifest = {'model_path': 'grouped_v1/' + model_path.name, 'metadata_path': 'grouped_v1/model_metadata.json',
                'envelope_path': 'grouped_v1/training_envelope.json', 'schema_path': 'grouped_v1/input_schema_v1.json'}
    php_manifest = {'model_file':'model_grouped_v1.json', 'metadata_file':'model_metadata_grouped_v1.json'}
    for target, value in [(ROOT / 'artifacts/models/strength/active_model.json', manifest), (php_root / 'active_model.json', php_manifest)]:
        temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(value, indent=2) + '\n')
        temporary.replace(target)
    report = {'model_version': metadata['model_version'], 'model_name': metadata['best_model_name'],
              'parity_rows': len(rows), 'maximum_absolute_error_mpa': difference, 'checked_at': datetime.now(timezone.utc).isoformat()}
    (folder / 'php_parity.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--php', default=os.environ.get('ASTRAMIX_PHP_BINARY') or shutil.which('php'))
    args = parser.parse_args()
    if not args.php:
        parser.error('PHP CLI is required to verify parity before activation.')
    publish(args.php)
