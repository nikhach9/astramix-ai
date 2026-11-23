"""Recipe-grouped model selection with an untouched final test partition."""
import hashlib
import json
import math
import platform
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_predict
from xgboost import XGBRegressor
import xgboost

from astramix.data.loader import load_processed_strength_dataset
from astramix.data.schema import STRENGTH_FEATURE_COLUMNS, STRENGTH_TARGET_COLUMN

VERSION = 'grouped-v1'
HOLDOUT_SEED = 20261123  # Locked before fitting this release; seed 42 was an earlier diagnostic.


def regression_metrics(actual, predicted):
    return {'rmse': float(mean_squared_error(actual, predicted) ** .5),
            'mae': float(mean_absolute_error(actual, predicted)),
            'r2': float(r2_score(actual, predicted)) if len(actual) > 1 else None}


def portable_model(model):
    """Export the existing fitted sklearn regressors for the PHP tree evaluator."""
    result = {'format': 'astramix-regression-v1', 'feature_order': STRENGTH_FEATURE_COLUMNS,
              'input_dtype': 'float32', 'comparison': 'less_or_equal', 'base_score': 0., 'trees': []}
    if isinstance(model, LinearRegression):
        result.update(input_dtype='float64', base_score=float(model.intercept_), coefficients=model.coef_.tolist())
        return result

    if isinstance(model, RandomForestRegressor):
        estimators, scale = model.estimators_, 1 / len(model.estimators_)
    else:
        estimators, scale = model.estimators_[:, 0], model.learning_rate
        result['base_score'] = float(model.init_.constant_[0, 0])
    for estimator in estimators:
        tree = estimator.tree_
        result['trees'].append({'left_children': tree.children_left.tolist(), 'right_children': tree.children_right.tolist(),
            'split_indices': tree.feature.tolist(), 'split_conditions': tree.threshold.tolist(),
            'base_weights': (tree.value[:, 0, 0] * scale).tolist()})
    return result


def train_strength_models(dataset_path, artifacts_dir):
    path, artifacts = Path(dataset_path), Path(artifacts_dir)
    original = load_processed_strength_dataset(path)
    # Only exact complete rows are deduplicated. Distinct replicate outcomes stay.
    df = original.drop_duplicates().reset_index(drop=True)
    recipe_columns = STRENGTH_FEATURE_COLUMNS[:-1]
    groups = pd.factorize(pd.MultiIndex.from_frame(df[recipe_columns]))[0]
    if len(set(groups)) < 4:
        raise ValueError('At least four distinct ingredient recipes are needed for grouped evaluation.')
    train, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=HOLDOUT_SEED).split(df, groups=groups))
    folds = GroupKFold(n_splits=min(5, len(set(groups[train]))))
    X, y = df[STRENGTH_FEATURE_COLUMNS], df[STRENGTH_TARGET_COLUMN]
    models = {'LinearRegression': LinearRegression(),
              'RandomForest': RandomForestRegressor(random_state=42, n_jobs=1),
              'GradientBoosting': GradientBoostingRegressor(random_state=42),
              'XGBoost': XGBRegressor(random_state=42, n_jobs=1, verbosity=0)}
    rows = []
    for name, model in models.items():
        predictions = cross_val_predict(model, X.iloc[train], y.iloc[train], groups=groups[train], cv=folds, n_jobs=1)
        metrics = regression_metrics(y.iloc[train], predictions)
        rows.append({'model': name, **{'cv_' + key: value for key, value in metrics.items()}})
    selected = min(rows, key=lambda row: (row['cv_rmse'], row['model']))['model']
    folder = artifacts / 'models/strength/grouped_v1'
    folder.mkdir(parents=True, exist_ok=True)
    for name, model in models.items():
        model.fit(X.iloc[train], y.iloc[train])
        joblib.dump(model, folder / (name.lower() + '.joblib'))
    # Selection is complete before any final test outcome is evaluated.
    final = regression_metrics(y.iloc[test], models[selected].predict(X.iloc[test]))
    baseline = regression_metrics(y.iloc[test], models['LinearRegression'].predict(X.iloc[test]))
    for row in rows:
        if row['model'] in (selected, 'LinearRegression'):
            row.update({'test_' + k: v for k, v in (final if row['model'] == selected else baseline).items()})
    comparison = pd.DataFrame(rows)
    comparison.to_csv(folder / 'comparison.csv', index=False)
    bounds = {key: {'min': float(X.iloc[train][key].min()), 'max': float(X.iloc[train][key].max())} for key in STRENGTH_FEATURE_COLUMNS}
    (folder / 'training_envelope.json').write_text(json.dumps(bounds, indent=2) + '\n')
    split_rows = pd.DataFrame({'row': np.arange(len(df)), 'recipe_group': groups, 'partition': 'development'})
    split_rows.loc[test, 'partition'] = 'test'
    split_rows['cv_fold'] = -1
    for fold_index, (_, valid) in enumerate(folds.split(X.iloc[train], y.iloc[train], groups[train])):
        split_rows.loc[train[valid], 'cv_fold'] = fold_index
    split_rows.to_csv(folder / 'split_assignments.csv', index=False)
    df.to_csv(folder / 'deduplicated_dataset.csv', index=False)
    native = folder / 'model.json'
    if selected == 'XGBoost':
        models[selected].get_booster().save_model(native)
    else:
        native.write_text(json.dumps(portable_model(models[selected]), separators=(',', ':')))
    metadata = {'model_version': VERSION, 'project_version': VERSION, 'best_model_name': selected,
        'selection_rule': 'Lowest pooled out-of-fold development RMSE; five recipe-grouped folds where available.',
        'dataset_path': str(path.name), 'dataset_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'dataset_row_count': len(original), 'exact_duplicates_removed': len(original) - len(df),
        'deduplicated_row_count': len(df), 'feature_columns': STRENGTH_FEATURE_COLUMNS, 'target_column': STRENGTH_TARGET_COLUMN,
        'trained_model_names': list(models), 'validation_metrics': final, 'baseline_test_metrics': baseline,
        'validation_protocol': 'recipe-grouped holdout after grouped cross-validation; exact complete-row deduplication',
        'evaluation_scope': 'Internal holdout for this release; this dataset was used in earlier diagnostic experiments. No independent external validation is claimed.',
        'split': {'seed': HOLDOUT_SEED, 'group_columns': recipe_columns, 'training_rows': len(train), 'test_rows': len(test),
                  'training_groups': len(set(groups[train])), 'test_groups': len(set(groups[test])),
                  'cv_folds': folds.n_splits, 'test_groups_overlap_training': False},
        'development_comparison': rows, 'training_bounds': bounds,
        'model_parameters': {key: ('NaN' if isinstance(value, float) and math.isnan(value) else value) for key, value in models[selected].get_params().items()},
        'dependencies': {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__,
                         'scikit_learn': sklearn.__version__, 'xgboost': xgboost.__version__},
        'model_sha256': hashlib.sha256((folder / (selected.lower() + '.joblib')).read_bytes()).hexdigest(),
        'portable_model_sha256': hashlib.sha256(native.read_bytes()).hexdigest(),
        'metrics_path': str(folder / 'comparison.csv'), 'training_datetime': datetime.now(timezone.utc).isoformat()}
    (folder / 'model_metadata.json').write_text(json.dumps(metadata, indent=2, allow_nan=False) + '\n')
    return comparison, metadata
