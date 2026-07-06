# AstraMix AI — Backend

FastAPI backend for concrete mix strength prediction, CO₂ estimation,
cost estimation, and mix optimization. All core ML/engineering logic
lives in the internal `astramix` package (`src/astramix/`) — this
backend is a thin, validated HTTP layer on top of it, not a
reimplementation.

All routes are mounted under the `/api/v1` prefix to match the
frontend contract (e.g. `POST /api/v1/predict-strength`).

## Project structure

```
astramix_backend/
├── app/
│   ├── main.py                  # FastAPI app creation, CORS, exception handlers, router mount
│   ├── adapters.py              # Mix -> astramix shape adapters (material quantities / feature rows)
│   ├── core/
│   │   ├── config.py            # Settings (env-driven, cached), incl. CORS origins
│   │   ├── exceptions.py        # Domain exceptions + JSON error handlers (incl. validation errors)
│   │   └── logging_config.py    # Logging setup
│   ├── api/
│   │   ├── router.py            # Aggregates all route modules under /api/v1
│   │   └── routes/
│   │       ├── health.py        # GET /health
│   │       ├── strength.py      # POST /predict-strength
│   │       ├── carbon.py        # POST /estimate-carbon
│   │       ├── cost.py          # POST /estimate-cost
│   │       └── optimize.py      # POST /optimize-mix
│   ├── schemas/                 # Pydantic request/response models + validation
│   │   ├── common.py            # Shared MixComposition (canonical material names + `age`)
│   │   ├── strength.py
│   │   ├── carbon.py
│   │   ├── cost.py
│   │   └── optimize.py
│   ├── services/                # Business logic / orchestration (routes call these)
│   │   ├── strength_service.py
│   │   ├── carbon_service.py    # calls astramix.sustainability.impact.estimate_co2
│   │   ├── cost_service.py      # calls astramix.sustainability.impact.estimate_cost
│   │   └── optimize_service.py  # calls astramix.optimization.optimizer.run_optimization
│   └── ml/                      # Backend-owned model lifecycle only — no business logic
│       ├── model_loader.py      # Safe, cached loading of the trained strength model
│       └── strength_predictor.py# Uses astramix.features.engineering.engineer_features + the loaded model
├── models/                      # Trained model artifacts (e.g. strength_model.pkl)
├── tests/
│   ├── conftest.py              # Falls back to a test-only astramix stub if the real package is absent
│   └── _astramix_stub/          # Minimal shape-only stub of astramix, for test collection only
├── requirements.txt
├── .env.example
└── .gitignore
```

**Layering rule:** `routes/` only parse requests and call `services/`.
`services/` own error translation and call directly into the real
`astramix` package for feature engineering, CO₂, cost, and
optimization — this backend does **not** keep its own copies of that
logic. `app/adapters.py` is the single place that translates our
`MixComposition` schema into the shapes astramix expects. `app/ml/` is
intentionally thin: it only owns the trained model's lifecycle (safe
loading/caching) and the final inference call.

## AstraMix package dependency

This backend imports:

```python
from astramix.features.engineering import engineer_features
from astramix.sustainability.impact import estimate_co2, estimate_cost
from astramix.optimization.optimizer import (
    OptimizationConstraints,
    OptimizationResult,
    run_optimization,
)
```

`astramix` isn't on PyPI — run with its `src/` directory added to `PYTHONPATH`.

```bash
# Add src/ to PYTHONPATH when running
PYTHONPATH=src:backend uvicorn app.main:app
```

### Confirmed contracts

- `engineer_features(df: pandas.DataFrame) -> pandas.DataFrame`
  Takes a DataFrame of raw feature rows (material quantities + `age`),
  not a dict. We build that row via `app.adapters.mix_to_core_feature_row`.

- `estimate_co2(material_quantities: dict) -> EstimationResult` and
  `estimate_cost(material_quantities: dict, unit_costs: dict | None) -> EstimationResult`
  Take ONLY the 7 canonical material fields — never `age` — via
  `app.adapters.mix_to_material_quantities`. `EstimationResult` exposes
  `.total`, `.breakdown`, and `.unit`.

- `run_optimization(constraints: OptimizationConstraints, strength_fn, alpha: float, beta: float, initial_guess: numpy.ndarray | None = None, **kwargs) -> OptimizationResult`
  `astramix.optimization.optimizer.OptimizationConstraints` uses the
  package's own field names — `target_strength`, `age_days`,
  `max_w_c_ratio` — which differ from our API-facing
  `OptimizationConstraints` schema (`target_strength_mpa`, `age`); the
  service adapts between them. `strength_fn(material_quantities, age_days)`
  is a callable we inject (backed by our trained model, via
  `app.ml.strength_predictor.predict_from_core_row`) that takes a dict
  of material quantities **and** curing age as a separate argument and
  returns predicted strength in MPa. Candidates are evaluated through
  `predict_from_core_row` directly — never through
  `MixComposition`/Pydantic validation, since search candidates are
  not user-submitted API requests.

  `initial_guess`, when provided, must be a **NumPy array**, not a
  dict — the optimizer works on raw vectors internally. It must be
  encoded in exactly `astramix.optimization.optimizer.DESIGN_VARIABLES`
  order: `(cement, water, fly_ash, blast_furnace_slag,
  coarse_aggregate, fine_aggregate, superplasticizer)`.

  `OptimizationResult` exposes `.mix`, `.predicted_strength`,
  `.co2`, `.cost`, `.objective_value`, `.success`, `.warnings`.
  `success=False` is a normal, well-formed result — not an
  exception — and is returned as HTTP `200` with `success: false` and
  `warnings`, not converted into an error. The response's `mix` field
  uses `OptimizedMixResult` (schemas/optimize.py), a validator-free
  mirror of `MixComposition` — a non-converged best-effort candidate
  can legitimately sit outside the plausible-input water/binder ratio
  band, and that must not fail response-model validation.

If any of these differ from the real implementation, the fix is
isolated to `app/adapters.py` and the small adapter code in
`app/services/*.py` — not the routes or schemas.

## Canonical material names

`blast_furnace_slag` is the only accepted name (not `slag`), matching
the `astramix` package. `MixComposition` uses `extra="forbid"`, so
sending an old/incorrect field name returns a `422` instead of being
silently ignored.

## Canonical age field

The API wire format uses `age` (not `curing_age_days`) on
`MixComposition`, matching the AstraMix dataset/core feature schema
and what the frontend already sends (`ageDays -> age`). `age` is never
passed to the CO2/cost estimators — only to strength prediction and
optimization, where curing time is actually relevant.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -e ../astramix      # required — see "AstraMix package dependency" above
cp .env.example .env
```

Place your trained model at `models/strength_model.pkl` (or update
`ASTRAMIX_STRENGTH_MODEL_FILENAME` in `.env`). If it's missing or
fails to load, `/api/v1/predict-strength` returns a hard `503` — it
never falls back to a fabricated estimate.

### CORS

Allowed frontend origins are read from `ASTRAMIX_CORS_ORIGINS` (comma
separated) in `.env`, defaulting to common localhost dev origins. See
`.env.example`.

## Run

```bash
uvicorn app.main:app --reload
```

Interactive docs: http://127.0.0.1:8000/docs

## Test

```bash
pip install -e ../astramix   # preferred: run tests against the real package
pytest
```

If `astramix` isn't installed (e.g. this repo is checked out on its
own), `tests/conftest.py` automatically falls back to a minimal
shape-only stub in `tests/_astramix_stub/` so collection doesn't fail
on import. Every test that exercises astramix-backed behavior still
monkeypatches the specific function it needs — the stub only prevents
`ModuleNotFoundError` at collection time, it never supplies real logic.

Covers: health check, error envelope format (domain errors *and*
request-validation 422s), strength prediction (missing-model 503,
invalid water/binder ratio, legacy `slag`/`curing_age_days` field
rejection), carbon estimation (success, failure wrapping, validation,
`age` excluded from material quantities), cost estimation (success,
unit-cost overrides, validation, `age` excluded), and mix optimization
(success, infeasible → 422, no hard co2/cost constraint required).

## Endpoints

| Method | Path                       | Purpose                                                  |
|--------|----------------------------|-----------------------------------------------------------|
| GET    | `/api/v1/health`           | Service + model-load status                                |
| POST   | `/api/v1/predict-strength` | Predict compressive strength (MPa) for a mix; 503 if model unavailable |
| POST   | `/api/v1/estimate-carbon`  | Estimate embodied CO₂ (kg/m³) for a mix                     |
| POST   | `/api/v1/estimate-cost`    | Estimate material cost per m³ for a mix                     |
| POST   | `/api/v1/optimize-mix`     | Find a mix meeting a target strength (weighted-sum objective) |

### Example: `POST /api/v1/predict-strength`

```json
{
  "mix": {
    "cement": 380,
    "water": 171,
    "fine_aggregate": 700,
    "coarse_aggregate": 1050,
    "fly_ash": 0,
    "blast_furnace_slag": 0,
    "superplasticizer": 3.8,
    "age": 28
  }
}
```

Response includes both `water_cement_ratio` (cement only) and
`water_binder_ratio` (cement + fly_ash + blast_furnace_slag) — these
are different numbers and both are returned rather than conflated.

### Example: `POST /api/v1/optimize-mix`

The v0.1 optimizer is a **weighted-sum** search (minimizing a
combination of distance-from-target-strength, CO2, and cost via
`alpha`/`beta` weights) with `max_w_c_ratio` as its one actually
*enforced* hard constraint (defaults to `0.60` if omitted) — it does
**not** enforce `max_co2_kg_per_m3` or `max_cost_per_m3`, so the
request no longer pretends they are:

```json
{
  "constraints": {
    "target_strength_mpa": 40,
    "age": 28,
    "max_w_c_ratio": 0.6,
    "alpha": 1.0,
    "beta": 1.0
  }
}
```

Response:

```json
{
  "success": true,
  "mix": { "...": "..." },
  "predicted_strength_mpa": 42.5,
  "co2_kg_per_m3": 310.2,
  "cost_per_m3": 78.4,
  "objective_value": 12.3,
  "warnings": []
}
```

`success: false` means the search completed but didn't converge to a
satisfactory mix — this is still HTTP `200`, with the best-effort mix
and explanatory `warnings`. An HTTP `422`/`OptimizationError` means the
optimizer itself raised an unexpected exception. Domain errors
originating deeper in the call — e.g. `ModelLoadError` (503) or
`PredictionError` (500) from the injected `strength_fn` — propagate
unchanged instead of being flattened into `OptimizationError`, since
they already carry the correct, more specific status code.

## Error format

All errors — validation failures, domain errors, and unexpected
exceptions — return a consistent JSON shape, including FastAPI/Pydantic
`422` request-validation errors (handled explicitly via a
`RequestValidationError` handler, not FastAPI's default `{"detail": [...]}`):

```json
{
  "success": false,
  "error": "PredictionError",
  "message": "Failed to predict strength for the given mix.",
  "details": { "reason": "..." }
}
```

A missing/unavailable trained model specifically returns:

```json
{
  "success": false,
  "error": "ModelLoadError",
  "message": "Trained model file not found at 'models/strength_model.pkl'. ...",
  "details": {}
}
```
with HTTP status `503`.

A request-validation failure returns:

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Request validation failed.",
  "details": [ { "loc": ["body", "mix", "cement"], "msg": "...", "type": "..." } ]
}
```
with HTTP status `422`.
