# Limitations & Future Work — AstraMix AI v0.1

This document provides an honest assessment of the limitations in AstraMix AI v0.1 and outlines the development roadmap for future iterations.

---

## 1. Known Limitations in v0.1

### Dataset & ML Restrictions
- **UCI Dataset Bounds**: The strength prediction model is strictly bounded by the 1,030 samples in the UCI Concrete Compressive Strength dataset. Extrapolating beyond these material proportions will trigger warnings.
- **Testing Standard**: The model is based on standard test specimen data (mostly 150x300mm cylinders). High discrepancies may occur when comparing against different test specimen geometries (e.g. cube breaks).

### Scientific Trust Limitations
- **Validation Metrics**: Pointwise error predictions are based on held-out test splits (RMSE = 4.62, MAE = 3.03). This is a static validation reference rather than a formal, real-time confidence interval.
- **Physical Exclusions**: Fresh properties like slump (workability) or durability (sulfate resistance, chloride penetration) are not modeled.

### Optimizer Limitations
- **Weighted-Sum Limitations**: The current optimizer uses a weighted-sum objective function. It does not calculate a true Pareto frontier of non-dominated mix configurations.
- **Simplified Parameters**: Carbon coefficients and economic costs are static, linear averages that do not reflect volatile regional market prices or custom supply chain emission factors.

### Operational & API Limitations
- **Health Check Model Cache Latency**: On server startup, the health check route `/api/v1/health` will report `"model_loaded": false`. This is a non-blocking lifecycle behavior: once the first prediction or optimization call is run, the model cache gets populated and subsequent health queries return `true`.

---

## 2. Future Work Roadmap

1. **Multi-Objective Optimization (v0.2)**:
   - Integrate evolutionary algorithms (e.g. NSGA-II) to compute and display a true multi-objective Pareto frontier of optimal mixes.
2. **Durability & Rheology Models**:
   - Train sibling models to predict concrete slump (workability) and durability metrics to ensure recipes are usable on-site.
3. **Certified Uncertainty Estimation**:
   - Implement Conformal Prediction or Gaussian Process models to output rigorous, mathematically sound confidence intervals for each prediction.
4. **Regional Customization Databases**:
   - Add configurable regional profiles to allow companies to upload custom cement types, local aggregates, and regional cost/carbon indexes.
5. **Production Hardening**:
   - Set up API rate-limiting, user authentication, and exportable PDF mix report generators for structural submittals.
