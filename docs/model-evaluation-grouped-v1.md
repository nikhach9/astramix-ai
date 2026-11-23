# grouped-v1 evaluation

The source dataset has 1,030 rows. Only 25 exact complete-row duplicates were removed. Distinct measured strengths for repeated inputs remain. The resulting 1,005 rows contain 427 distinct ingredient recipes. Recipe groups use seven material quantities and exclude age and measured strength.

A locked `GroupShuffleSplit` seed of 20261123 allocates 849 rows from 341 recipes to development and 156 rows from 86 recipes to the internal test partition. No recipe occurs in both partitions. Five `GroupKFold` folds within development produce pooled out-of-fold predictions. Selection uses development RMSE alone. The selected XGBoost model and linear baseline are then evaluated on the held-out partition. Other candidates have no reported final-test scores.

| Candidate | Development CV RMSE (MPa) |
| --- | ---: |
| LinearRegression | 10.4975 |
| RandomForest | 6.1671 |
| GradientBoosting | 6.6459 |
| XGBoost | 6.1166 |

| Final evaluation | RMSE (MPa) | MAE (MPa) | R² |
| --- | ---: | ---: | ---: |
| Selected XGBoost | 5.4913 | 3.9764 | 0.8809 |
| Linear baseline | 9.7735 | 7.9647 | 0.6229 |

An earlier diagnostic used seed 42; it was retired before fitting this release. This dataset has been used in previous experiments, so this is internal held-out validation, not independent external validation. Do not adjust the model after inspecting this test result and then describe the same result as a new independent test. The original row-split v0.1 artifacts remain under `baseline/` for historical comparison; their scores use a different evaluation protocol.

The fitted model uses the development partition. Test rows are not added back before deployment. Artifacts include the deduplicated rows, per-row recipe groups, partition and CV-fold assignments, estimator parameters, package versions and SHA-256 hashes. The complete parameter record includes XGBoost defaults; no additional tuning was performed for this release.

Python predictions are checked against PHP on 13 reference mixes plus all 1,030 source rows. The latest activation report is `artifacts/models/strength/grouped_v1/php_parity.json`; the allowed absolute difference is 0.0001 MPa. Native XGBoost inputs and thresholds use float32 semantics in PHP. A bit-for-bit numerical guarantee is not claimed.

## Regenerate and activate

From the root, with the pinned ML dependencies and PHP CLI installed:

```bash
python backend/scripts/train_strength_model.py
python backend/scripts/activate_model.py --php php
```

Training regenerates this version's artifacts; it is not a new validation experiment. Activation checks the model hash and Python/PHP parity, then copies manifests, schema, reference fixtures and frontend validation metadata. Do not activate manually edited or mismatched artifacts.

## Interpretation limits

The model predicts laboratory cylinder compressive strength. It does not model basalt fibers, flexural/tensile strength, workability, durability, curing conditions beyond age or structural-code compliance. Per-feature range checks cannot establish coverage of the joint recipe distribution. Neither RMSE nor MAE is a calibrated per-recipe interval. Physical trial batches are still required.

Cost factors are ingredient-only engineering references. Emissions describe constituent ingredient scope. Missing active factors block complete totals and rankings. Cohort comparisons require matching declared currency, region, m³ basis and ingredient scope, with unique observation IDs; this validates the supplied contract, not the real-world independence or truth of caller-supplied observations. Materials directory listings are dated source observations, not live stock or binding quotes.
