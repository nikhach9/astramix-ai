# AstraMix AI — Pure PHP 8.2+ Backend Application

This package contains the complete, production-ready backend for AstraMix AI rewritten in pure PHP 8.2+ without any Python runtime dependencies.

## Key Capabilities

1. **Native XGBoost Inference Engine** (`src/ML/TreeEnsemble.php`):
   - Pure PHP tree traversal over native exported booster (`data/models/xgboost_model.json`).
   - Bit-for-bit numerical parity ($0.00$ discrepancy) with `xgboost.predict`.
   - Sub-15ms execution time on standard web hosting.

2. **Constrained Multi-Objective Optimizer** (`src/Optimization/Optimizer.php`):
   - Fast deterministic candidate screening across diverse validated mix recipes and custom starting guesses.
   - Enforces strength, maximum w/c ratio, maximum w/b ratio, and material bound constraints.
   - Never outputs infeasible solutions as false optimums.

3. **Mix Lab Evaluation Engine** (`src/MixLab/MixLabService.php`):
   - Three primary result cards: Strength (with RMSE uncertainty), Cost, and Embodied Emissions (A1-A3 cradle-to-gate).
   - Selected reference and market cohort percentile comparisons.
   - Provenance tracking with dataset and price source identifiers.

4. **Materials Market Service** (`src/Market/`):
   - 100 countries directory coverage (50 refreshed markets + 50 prior leads).
   - 62,964 cities GeoNames locality suggestions with Unicode diacritic folding.
   - Whole-bag rounding, unit conversions, and ready-mix dispatch order calculation (anti double-counting of VAT and delivery).
   - Customer review submission and moderation.

5. **Role-Protected Admin Management** (`src/Controllers/AdminController.php`):
   - Administrator token authentication (`X-Admin-Token` or `Authorization: Bearer ...`).
   - Quote upserts and review moderation with audit logging.

## Verification

To run the automated test suite locally:
```bash
php tests/run_tests.php
```

To run the environment diagnostic check:
```bash
php preflight.php
```
