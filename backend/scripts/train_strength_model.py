"""Train the grouped-v1 release; activation is a separate PHP-parity check."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend/src'))
from astramix.training.strength import train_strength_models


if __name__ == '__main__':
    comparison, metadata = train_strength_models(
        ROOT / 'data/processed/strength_dataset_v0_1.csv', ROOT / 'artifacts')
    print(comparison.to_string(index=False))
    print(f"Selected by grouped development CV: {metadata['best_model_name']}")
    print('Final holdout metrics:', metadata['validation_metrics'])
    print('This regenerates the existing release, not a new independent validation experiment.')
    print('Run python backend/scripts/activate_model.py --php <php-cli> to verify and activate.')
