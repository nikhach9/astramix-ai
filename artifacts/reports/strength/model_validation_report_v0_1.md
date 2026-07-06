# Model Validation Report — AstraMix v0.1

This report details the training, validation, and performance evaluation of the concrete compressive strength prediction models for AstraMix v0.1.

## 1. Dataset Overview
- **Dataset Name**: UCI Concrete Compressive Strength Dataset
- **Row Count**: 1,030 instances
- **Target Column**: `compressive_strength_mpa` (Compressive Strength in MPa)

### Canonical Feature Columns
The models are trained using the following 8 canonical features (in the accepted order):
1. `cement` (kg/m³)
2. `blast_furnace_slag` (kg/m³)
3. `fly_ash` (kg/m³)
4. `water` (kg/m³)
5. `superplasticizer` (kg/m³)
6. `coarse_aggregate` (kg/m³)
7. `fine_aggregate` (kg/m³)
8. `age` (Curing Age in days)

---

## 2. Validation Methodology
- **Train/Test Split**: 80% train, 20% test
- **Random Seed**: 42 (ensuring reproducible evaluations)
- **Validation Execution**: Out-of-sample prediction performance evaluated on the 20% held-out test split.

---

## 3. Model Comparison
The following table summarizes the evaluation metrics for the models trained during baseline validation:

| Model | Root Mean Squared Error (RMSE) | Mean Absolute Error (MAE) | Coefficient of Determination ($R^2$) |
| ----- | ----------------------------- | ------------------------- | ------------------------------------- |
| Linear Regression | 9.80 MPa | 7.75 MPa | 0.628 |
| Random Forest | 5.46 MPa | 3.75 MPa | 0.884 |
| Gradient Boosting | 5.50 MPa | 4.14 MPa | 0.883 |
| **XGBoost (Selected)** | **4.62 MPa** | **3.03 MPa** | **0.917** |

---

## 4. Selected Model & Performance
- **Selected Model**: XGBoost Regressor (`xgboost.joblib`)
- **Key Metrics**:
  - **RMSE**: 4.62 MPa
  - **MAE**: 3.03 MPa
  - **$R^2$**: 0.917

---

## 5. Limitations & Engineering Disclaimer
1. **Scope Limit**: The v0.1 model is strictly limited to predicting compressive strength based on mix design. It does not predict slump, flow, durability, thermal cracking, or other physical/rheological properties.
2. **Material Uniformity**: The model assumes standard material characteristics. Chemical variants in cement type, aggregate size distribution, or local water impurities are not captured.
3. **Curing Environment**: The dataset reflects standard laboratory moist curing conditions. Field variables (varying temperature, humidity, wind) are not represented.

> [!IMPORTANT]
> **Engineering & Lab Validation Warning:** All model predictions are for preliminary recipe planning and optimization purposes only. They are not certified and **must** be validated by physical concrete trials and lab-based cylinder/cube breaks under local engineering supervision prior to structural deployment.
