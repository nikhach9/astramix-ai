# Model Card — AstraMix Concrete Strength Predictor (v0.1)

A baseline model card detailing the capabilities, training inputs, limitations, and engineering constraints of the AstraMix v0.1 concrete strength prediction model.

## 1. Model Details
- **Model Name**: AstraMix Concrete Strength Predictor
- **Version**: v0.1 (Baseline Release)
- **Model Type**: XGBoost Regressor (`xgboost.joblib`)
- **Developer**: AstraMix AI Engineering Team

---

## 2. Intended & Unintended Use

### Intended Use Cases
- Preliminary estimation of 28-day (and general age) concrete compressive strength during design phases.
- Screen and sort candidate recipe mixes based on cost and CO₂ constraints.
- Rapid optimization search space exploration to locate high-potential concrete mixes.

### Out-of-Scope & Unintended Use Cases
- Direct ready-mix plant control system integration.
- Structural safety certifications and building permit approvals.
- Predictions for self-consolidating concrete, high-volume fiber concrete, or non-Portland cement variants.
- Replacing physical mockups and trial batches.

---

## 3. Inputs & Outputs

### Input Features (Canonical Order)
1. `cement` (kg/m³) — Portland cement content
2. `blast_furnace_slag` (kg/m³) — Blast furnace slag binder content
3. `fly_ash` (kg/m³) — Fly ash binder content
4. `water` (kg/m³) — Water content
5. `superplasticizer` (kg/m³) — Superplasticizer content
6. `coarse_aggregate` (kg/m³) — Coarse aggregate content
7. `fine_aggregate` (kg/m³) — Fine aggregate content
8. `age` (days) — Curing age duration

### Output
- Predicted concrete compressive strength (MPa) at the specified age.

---

## 4. Training Data & Parameters
- **Dataset**: UCI Concrete Compressive Strength Dataset (1,030 rows).
- **Training Parameters**: XGBoost Regressor with 80/20 train/test split.
- **Envelope Ranges**:
  - `cement`: [102.0, 540.0] kg/m³
  - `blast_furnace_slag`: [0.0, 359.4] kg/m³
  - `fly_ash`: [0.0, 200.1] kg/m³
  - `water`: [121.8, 247.0] kg/m³
  - `superplasticizer`: [0.0, 32.2] kg/m³
  - `coarse_aggregate`: [801.0, 1145.0] kg/m³
  - `fine_aggregate`: [594.0, 992.6] kg/m³
  - `age`: [1.0, 365.0] days

---

## 5. Known Limitations & Extrapolation Risks

### Extrapolation Risks
The model uses decision trees (XGBoost) which split on thresholds. Therefore, XGBoost is mathematically incapable of extrapolating beyond the min/max values of the training data. If you pass an input value outside the training envelope, the model will clamp its prediction to the nearest terminal tree leaf, making prediction error extremely high and unreliable.

### Missing Physical Variables
The model lacks critical chemical, mineral, and environmental variables that govern real-world concrete hydration, including:
- **Cement Chemistry**: Cement type (e.g. Type I, II, III, V) and fineness.
- **Aggregate Properties**: Shape, texture, grading curves, and absorption capacity.
- **Environmental Parameters**: Curing temperature, humidity, and wind conditions.
- **Admixture Chemistry**: Chemical families of water reducers or retarders.
- **Testing Standard**: Testing specimen size (100x200mm vs 150x300mm cylinders) and loading rate.

---

## 6. Engineering Review Disclaimer
> [!WARNING]
> **Required Engineering Review Disclaimer:** All predictions provided by the v0.1 model must be reviewed and approved by a licensed professional civil/structural engineer. The predictions are not a substitute for physical laboratory trials.
