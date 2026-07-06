# AstraMix AI — Sustainable Concrete Design & Optimization Platform

AstraMix AI is an end-to-end web application and machine learning platform designed to predict concrete compressive strength, estimate environmental footprint (CO₂ emissions), estimate manufacturing costs, and perform multi-objective mix design optimization. 

Built at the intersection of **civil engineering material science** and **applied machine learning**, the system replaces empirical trial-and-error recipe casting with algorithmic optimization while wrapping predictions in a transparent, scientific trust layer.

---

## 🚀 Key Features
1. **Compressive Strength Prediction**: Evaluates raw concrete recipe formulations utilizing a trained XGBoost tree-ensemble regression model.
2. **CO₂ Emission Estimation**: Computes the carbon footprint (kg/m³) of mix designs using standard environmental emission factors.
3. **Material Cost Estimation**: Estimates raw material costs ($/m³) using physical price factor databases.
4. **Constrained Multi-Objective Optimization**: Employs a Sequential Least Squares Programming (SLSQP) solver to search for mix recipes that meet target strength constraints while minimizing weighted cost and carbon.
5. **Scientific Trust Layer**: Implements input boundaries validation, offline feature importance diagnostics, model limitations card, and validation error margins (RMSE/MAE).

---

## 🛠️ Technology Stack
- **Backend API**: FastAPI (Python 3.11), Uvicorn, Pydantic v2
- **Machine Learning**: XGBoost, Scikit-Learn, Joblib, Pandas, NumPy
- **Optimization Solver**: SciPy (SLSQP solver)
- **Frontend App**: Next.js (v14.2.35), React, TypeScript, TailwindCSS
- **Orchestration / CI**: Docker, Docker Compose, GitHub Actions

---

## 📂 Project Architecture

```
AstraMix-v0.1/
├── .github/workflows/    # CI pipelines (ci.yml)
├── artifacts/
│   ├── models/strength/  # Trained model files, metadata, and envelope limits
│   └── reports/strength/ # Model cards, validation reports, feature importances
├── backend/
│   ├── app/              # FastAPI routers, middleware, and schemas
│   ├── src/astramix/     # ML predict, optimizer, and sustainability core
│   ├── tests/            # PyTest backend unit suites
│   ├── Dockerfile
│   └── requirements.txt
├── data/                 # UCI Concrete datasets and emission/price factor databases
├── docs/                 # Research reports, summaries, and demo scripts
├── frontend/
│   ├── src/              # Next.js UI pages, state hooks, and API adapters
│   ├── Dockerfile
│   └── package.json      # Node dependencies and scripts
└── docker-compose.yml    # Docker container composition definitions
```

---

## 📖 Presentation & Research Documentation
Detailed reports and portfolio assets are available in the [docs/](docs/) folder:
- **Project Report**: [PROJECT_REPORT_v0_1.md](docs/PROJECT_REPORT_v0_1.md)
- **Technical Summary**: [TECHNICAL_SUMMARY_v0_1.md](docs/TECHNICAL_SUMMARY_v0_1.md)
- **Research Positioning**: [RESEARCH_POSITIONING_v0_1.md](docs/RESEARCH_POSITIONING_v0_1.md)
- **Limitations & Future Work**: [LIMITATIONS_AND_FUTURE_WORK.md](docs/LIMITATIONS_AND_FUTURE_WORK.md)
- **Demo Script**: [DEMO_VIDEO_SCRIPT_v0_1.md](docs/DEMO_VIDEO_SCRIPT_v0_1.md)
- **Portfolio Blurbs**: [PORTFOLIO_BLURB_v0_1.md](docs/PORTFOLIO_BLURB_v0_1.md)
- **Final Release Checklist**: [FINAL_RELEASE_CHECKLIST_v0_1.md](docs/FINAL_RELEASE_CHECKLIST_v0_1.md)

---

## ⚡ Quickstart

### 1. Local Backend Setup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
3. Run the development server (from the project root directory):
   ```bash
   PYTHONPATH=backend/src:backend uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
4. Run tests:
   ```bash
   PYTHONPATH=backend/src:backend pytest -q
   ```

### 2. Local Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm ci
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env.local
   ```
3. Start the client:
   ```bash
   npm run dev
   ```

### 3. Docker Compose Orchestration
Start both frontend (port 3000) and backend (port 8000) inside isolated containers:
```bash
docker compose build
docker compose up
```

## 📡 API Endpoint Examples

AstraMix AI backend runs by default on `http://localhost:8000`. You can query the REST endpoints using standard `curl` commands:

### 1. Health Status Check
```bash
curl -X GET http://localhost:8000/api/v1/health
```

### 2. Compressive Strength Prediction
```bash
curl -X POST http://localhost:8000/api/v1/predict-strength \
  -H "Content-Type: application/json" \
  -d '{
    "mix": {
      "cement": 350,
      "blast_furnace_slag": 0,
      "fly_ash": 0,
      "water": 175,
      "superplasticizer": 5,
      "coarse_aggregate": 1000,
      "fine_aggregate": 750,
      "age": 28
    }
  }'
```

### 3. CO₂ Impact Estimation
```bash
curl -X POST http://localhost:8000/api/v1/estimate-carbon \
  -H "Content-Type: application/json" \
  -d '{
    "mix": {
      "cement": 350,
      "blast_furnace_slag": 0,
      "fly_ash": 0,
      "water": 175,
      "superplasticizer": 5,
      "coarse_aggregate": 1000,
      "fine_aggregate": 750,
      "age": 28
    }
  }'
```

### 4. Cost Footprint Estimation
```bash
curl -X POST http://localhost:8000/api/v1/estimate-cost \
  -H "Content-Type: application/json" \
  -d '{
    "mix": {
      "cement": 350,
      "blast_furnace_slag": 0,
      "fly_ash": 0,
      "water": 175,
      "superplasticizer": 5,
      "coarse_aggregate": 1000,
      "fine_aggregate": 750,
      "age": 28
    }
  }'
```

### 5. Mix Design Optimization
```bash
curl -X POST http://localhost:8000/api/v1/optimize-mix \
  -H "Content-Type: application/json" \
  -d '{
    "constraints": {
      "target_strength_mpa": 40,
      "age": 28,
      "max_w_c_ratio": 0.6,
      "alpha": 1.0,
      "beta": 1.0
    },
    "initial_guess": null
  }'
```

---

## 📊 Model Performance Metrics
The selected XGBoost Regressor model (`xgboost.joblib`) was evaluated on a 20% held-out test split of the UCI Concrete Strength dataset (1,030 total rows):
- **Root Mean Squared Error (RMSE)**: 4.62 MPa
- **Mean Absolute Error (MAE)**: 3.03 MPa
- **R² Score**: 0.917

---

## 🛡️ Scientific Trust Layer & Verification
Machine learning models based on decision trees cannot extrapolate safely outside their training bounds. AstraMix AI v0.1 mitigates this risk by:
- **Envelope Validation**: Checking inputs against the min/max limits of the dataset (e.g. `cement` range: `[102.0, 540.0] kg/m³`) and returning non-blocking extrapolation warnings.
- **Explainability**: Offering feature weights in `artifacts/reports/strength/feature_importance_v0_1.csv` showing factors influencing hydration strength.

---

## ⚠️ Limitations Disclaimer
AstraMix AI predictions are intended for preliminary mixture recipe planning and academic research demonstrations only. All concrete mixture designs **must** undergo physical laboratory trial batches and cylinder compressive breaks under the supervision of a licensed professional engineer before structural field placement.
