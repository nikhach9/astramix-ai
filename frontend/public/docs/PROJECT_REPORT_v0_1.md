# Project Report — AstraMix AI v0.1

---

## Abstract
AstraMix AI is an open-source, sustainable concrete mix design platform that integrates machine learning strength prediction with multi-objective optimization. By enabling civil engineers to input raw concrete mix proportions and curing age, the platform dynamically predicts compressive strength, estimates total CO₂ emission factors, and calculates raw material costs. Furthermore, it incorporates a Sequential Least Squares Programming (SLSQP) optimization solver to discover bounded recipe mixes that satisfy target strength criteria while minimizing economic and environmental costs. To bridge the gap between machine learning model outputs and real-world engineering accountability, AstraMix AI v0.1 implements a scientific trust layer featuring training-envelope validations, offline feature importance diagnostics, and detailed validation error references.

---

## 1. Problem Statement & Significance
Concrete is the second most consumed substance on Earth after water. Its primary binder, Portland cement, accounts for approximately 8% of global carbon dioxide (CO₂) emissions. Traditionally, concrete mix designs are formulated through empirical trial-and-error, which is slow and often results in over-dimensioned cement proportions to ensure safety margins.

Sustainable concrete mix design is a critical global challenge:
- **Carbon Footprint**: Displacing Portland cement with Supplementary Cementitious Materials (SCMs) like fly ash and blast furnace slag dramatically lowers CO₂ emissions.
- **Cost Constraints**: High-performance admixtures (superplasticizers) and SCMs have fluctuating regional costs that must be balanced.
- **Strength Validation**: High-binder substitution can reduce early-age strength, necessitating robust predictive tools to ensure structural reliability.

---

## 2. System Architecture & Overview
AstraMix AI is organized into a clean, decoupled client-server architecture.

### Backend Architecture
- **Web Layer**: FastAPI provides high-performance, asynchronous endpoints with automated OpenAPI documentation.
- **Model Inference**: Integrates a pre-trained XGBoost Regressor loaded via `joblib`.
- **Optimization Solver**: Implements SciPy's SLSQP algorithm protected by a global thread lock to prevent sequential memory corruption.
- **Sustainability & Cost Modules**: Physical models that compute total footprints using standardized raw material factors.

### Frontend Architecture
- **Web App**: Built with Next.js (version 14.2.35), TypeScript, and React.
- **Design System**: Responsive drafting-paper theme utilizing Vanilla CSS.
- **Visualization**: Chart.js monitors mix compositions.

---

## 3. Dataset & Machine Learning Model
The model is trained on the UCI Concrete Compressive Strength Dataset:
- **Row Count**: 1,030 instances of concrete recipes.
- **Target Variable**: Compressive strength (MPa).
- **Features (Canonical Order)**:
  1. `cement` (kg/m³)
  2. `blast_furnace_slag` (kg/m³)
  3. `fly_ash` (kg/m³)
  4. `water` (kg/m³)
  5. `superplasticizer` (kg/m³)
  6. `coarse_aggregate` (kg/m³)
  7. `fine_aggregate` (kg/m³)
  8. `age` (days)

### Performance Evaluation (Baseline vs. Selected)
AstraMix v0.1 selected XGBoost based on strict cross-validation performance:
- **RMSE**: 4.62 MPa
- **MAE**: 3.03 MPa
- **R²**: 0.917 (representing a major improvement over standard linear regressions).

---

## 4. API Endpoints & Core Modules

The backend exposes five REST endpoints under `/api/v1`:
- `GET /api/v1/health`: Monitors service state and model caching status.
- `POST /predict-strength`: Predicts compressive strength and returns trust metrics.
- `POST /estimate-carbon`: Computes total CO₂ (kg/m³) based on material factors.
- `POST /estimate-cost`: Computes raw mix cost ($/m³).
- `POST /optimize-mix`: Evaluates a single-objective weighted-sum optimizer ($f = \alpha \cdot \text{CO}_2 + \beta \cdot \text{Cost}$) under hard max W/C constraints.

---

## 5. Scientific Trust Layer
To prevent blind reliance on machine learning outputs, AstraMix v0.1 includes:
- **Estimated Error**: Exposes held-out validation metrics (RMSE/MAE) in predictions.
- **Training-Envelope Warnings**: Alerts users when input coordinates exceed the training boundaries (e.g. `cement` > 540 kg/m³).
- **Model Card**: Fully documents model limitations, missing physical parameters (curing humidity, cement type, test conditions), and intended uses.
- **Feature Importance**: Offline feature weights showing that `age` and `cement` dominate predictions.

---

## 6. Limitations & Future Work
While robust, version 0.1 has several limitations:
- **Stateless & Local**: No project saving database or multi-tenant user accounts.
- **Pareto Frontiers**: Optimization is limited to a single weighted-sum solver (no NSGA-II/Pareto set).
- **Physical Exclusions**: Does not predict concrete workability (slump) or long-term durability.

*Future work will implement Pareto set multi-objective optimization, slump prediction models, regional carbon-factor databases, and exportable PDF design sheets.*

---

## 7. Conclusion
AstraMix AI v0.1 demonstrates that combining machine learning prediction with mathematical optimization can significantly accelerate the design of low-carbon concrete mixes. By wrapping these algorithms in a transparent trust layer, it lays the groundwork for responsible, data-driven civil engineering software.
