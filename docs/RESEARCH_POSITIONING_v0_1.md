# Research Positioning — AstraMix AI v0.1

This document outlines the scientific rationale and research positioning of AstraMix AI as a interdisciplinary engineering project bridging **civil engineering material science** and **applied machine learning**.

---

## 1. The Civil Engineering & Machine Learning Connection
Concrete formulation is historically empirical, relying heavily on conservative design guides (such as ACI 211) and slow laboratory batch trials. Because cement hydration is a highly non-linear chemical and physical process, linear regression models fail to accurately predict strength across varied mixture spaces. 

By applying an XGBoost tree-ensemble regression model, AstraMix AI captures complex interactions between water/binder ratios, chemical admixtures (superplasticizers), mineral binders (fly ash and slag), and aggregate packing geometries. This allows for rapid simulation of mix properties without costly and time-consuming physical cylinder casts.

---

## 2. Bounded Multi-Objective Optimization
Rather than simply predicting strength, AstraMix couples the prediction model with a Sequential Least Squares Programming (SLSQP) solver. 
- **Physical Constraints**: Enforces physical boundaries such as water-to-cement ratio limits ($W/C \le 0.50$).
- **Weighted-Sum Objective**: Optimizes a trade-off function ($f = \alpha \cdot \text{CO}_2 + \beta \cdot \text{Cost}$) to locate mix proportions that are both cost-effective and environmentally friendly.
- **Solver Safety**: The solver uses sequential refinement steps protected by thread locks to avoid numerical overflows, creating a robust, safe pipeline for automated recipe selection.

---

## 3. Beyond Simple CRUD Apps
Most standard portfolio projects are database-centric CRUD (Create, Read, Update, Delete) applications. AstraMix AI is structurally different:
1. **Mathematical Solvers**: It embeds non-linear optimizers (SLSQP) directly in the execution loop.
2. **ML Pipeline Execution**: It manages a real serialized machine learning pipeline with strict feature alignment and preprocessing validation rules.
3. **Scientific Trust Integration**: Rather than claiming perfect prediction capabilities, it implements an explainable trust layer that flags boundaries and error factors, simulating a real industrial tool.

---

## 4. Path to v0.2 Research-Grade Capabilities
To advance AstraMix to a publication-ready academic or industrial research platform, the next iteration will focus on:
- **Pareto Frontiers (NSGA-II)**: Replacing the weighted-sum approach with evolutionary multi-objective algorithms to compute and visualize a true Pareto frontier of non-dominated concrete mixes.
- **Probabilistic Uncertainty**: Replacing pointwise error predictions with Gaussian Processes or Quantile Regression Forests to output certified confidence intervals.
- **Physical Additions**: Training models to predict concrete durability (chloride permeability, shrinkage) and fresh properties (slump/workability) simultaneously.
