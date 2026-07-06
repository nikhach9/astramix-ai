# Technical Summary — AstraMix AI v0.1

A technical guide summarizing the stack, folder structure, deployment commands, API examples, and testing protocols of AstraMix AI v0.1.

---

## 1. Technology Stack
- **Backend**: FastAPI, Uvicorn, Pydantic v2, Pydantic Settings
- **Machine Learning**: XGBoost, Scikit-Learn, Joblib, Pandas, NumPy
- **Optimization**: SciPy (SLSQP optimization)
- **Frontend**: Next.js (v14.2.35), React, TypeScript, TailwindCSS
- **Orchestration / CI**: Docker, Docker Compose, GitHub Actions

---

## 2. Directory Layout
```
AstraMix-v0.1/
├── .github/workflows/    # CI pipelines (ci.yml)
├── artifacts/
│   ├── models/strength/  # Trained model artifacts & envelopes
│   └── reports/strength/ # Validation reports, cards, feature importances
├── backend/
│   ├── app/              # FastAPI route handling & schemas
│   ├── src/astramix/     # ML pipeline, optimizer, and sustainability core
│   ├── tests/            # PyTest backend suites
│   ├── Dockerfile
│   └── requirements.txt
├── data/                 # Raw datasets & emission/cost CSVs
├── docs/                 # Research and portfolio markdown files
├── frontend/
│   ├── src/              # Next.js app pages, hooks, and adapters
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml    # Multi-service composition definitions
```

---

## 3. Deployment & Execution Commands

### Local Backend Execution (without Docker)
```bash
cd backend
PYTHONPATH=src:. uvicorn app.main:app --reload
```

### Local Frontend Execution (without Docker)
```bash
cd frontend
npm ci
npm run dev
```

### Docker Compose local execution
```bash
docker compose build
docker compose up
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API Prefix: `/api/v1`

---

## 4. API request/response examples

### POST /api/v1/predict-strength
**Request**:
```json
{
  "mix": {
    "cement": 350.0,
    "blast_furnace_slag": 50.0,
    "fly_ash": 50.0,
    "water": 160.0,
    "superplasticizer": 5.0,
    "coarse_aggregate": 1000.0,
    "fine_aggregate": 750.0,
    "age": 28
  }
}
```

**Response**:
```json
{
  "success": true,
  "predicted_strength_mpa": 52.83,
  "age": 28,
  "water_cement_ratio": 0.457,
  "water_binder_ratio": 0.356,
  "model_version": "v0.1",
  "warnings": [],
  "estimated_error_rmse_mpa": 4.62,
  "estimated_error_mae_mpa": 3.03,
  "confidence_note": "Approximate error estimate based on held-out validation metrics; not a certified confidence interval."
}
```

---

## 5. Artifacts and Datasets
- **XGBoost Model Path**: `artifacts/models/strength/baseline/xgboost.joblib`
- **Training Envelope**: `artifacts/models/strength/baseline/training_envelope_v0_1.json`
- **Processed Dataset**: `data/processed/strength_dataset_v0_1.csv`

---

## 6. Testing & CI Summary
- **Backend Tests**: Run `PYTHONPATH=backend/src:backend pytest -q` to execute 48 unit tests verifying envelope bounds, schema mappings, predictions, and optimizer locks.
- **CI Pipeline**: GitHub Actions automatically spins up Ubuntu instances to install dependencies, execute Python unit tests, lint frontend code, and compile Next.js production builds.

---

## 7. Known Non-Blocking Issues in v0.1
- **Health Check Model Cache Latency**: On server startup, `GET /api/v1/health` may report `"model_loaded": false`. This is a non-blocking lifecycle behavior: once the first prediction or optimization call is run, the model cache gets populated and subsequent health queries correctly return `true`.
