# AstraMix AI

AstraMix estimates laboratory concrete compressive strength from seven ingredient quantities and curing age. It also calculates ingredient cost and embodied emissions, searches bounded candidate recipes, and provides a materials directory. Results support preliminary planning and academic work. Physical trial batches remain necessary.

Python is the reference implementation for training and development. The PHP backend supports static cPanel hosting. Both load the selected model through versioned manifests, use the same bounded-search contract, and report incomplete factor coverage explicitly.

## Run locally

Use Python 3.12 and Node.js 22. Run backend commands from this repository root.

```bash
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
PYTHONPATH=backend/src:backend .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

On Windows, activate the virtual environment, use its `Scripts` directory, and set `PYTHONPATH` to `backend/src;backend` before running Uvicorn. Public API examples are available at `http://localhost:8000/docs`.

## Verify

PHP CLI needs `pdo_sqlite` and `mbstring`. The Python suite runs PHP parity checks when PHP is available; CI installs PHP and runs those checks.

```bash
PYTHONPATH=backend/src:backend .venv/bin/python -m pytest -q backend/tests
.venv/bin/python backend/scripts/prepare_market_snapshot.py /tmp/astramix-test.db
ASTRAMIX_MARKET_DB_PATH=/tmp/astramix-test.db php astramix_php/tests/run_tests.php
cd frontend
npm run test:reports
npm run typecheck
npm run lint
npm run build
```

Choose a new path for each market snapshot. The snapshot command refuses to overwrite existing files. The PHP test suite writes fixture records and requires an explicit disposable database path.

## Current model and search

The active `grouped-v1` XGBoost release has internal held-out recipe RMSE **5.49 MPa**, MAE **3.98 MPa** and R² **0.881**. The linear baseline has RMSE **9.77 MPa** on the same held-out recipes. These are aggregate evaluation errors, not per-recipe prediction intervals. See [model evaluation](docs/model-evaluation-grouped-v1.md) for the split and limitations.

The search evaluates up to 512 unique candidates by default, with a recorded seed and cost/carbon normalization references. A successful response means a feasible candidate was found. It does not establish a global optimum. See [the search contract](docs/search-algorithm.md).

## Saved reports and deployment

Saved reports retain the request, selected-model hash, effective price/emission tables and search settings. Reports persist in this browser, can be downloaded as JSON, and identify missing historical provenance. Incomplete estimates retain labeled known subtotals and cannot receive cheap/green rankings.

See [cPanel packaging](README_CPANEL_DEPLOYMENT.md) for static hosting. Dependency directories, runtime databases, build output and ZIP deliveries are generated locally and excluded from Git. Historical files named `v0_1` describe the earlier release; their metrics and SLSQP descriptions do not describe the active release.

## Development history

The original six commits remain intact. The uploaded source snapshot and assisted repairs have genuine current timestamps. The September cutoff and grouped graph labels are explained in [the history audit](docs/git-history-audit.md). Export precise dates with:

```bash
python backend/scripts/export_git_history.py /tmp/astramix-history.csv
```

Code cleanup addresses observable problems such as unused configuration, duplicate wrappers, silent failures and unsupported claims. It does not establish human authorship or erase assistance. The IA should explain the student's own decisions, evidence and acknowledged assistance.
