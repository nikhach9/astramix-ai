# Portfolio Blurbs — AstraMix AI v0.1

This file contains three pre-written portfolio descriptions of AstraMix AI v0.1, tailored for resumes, personal websites, and professional networks.

---

## A. Short Version (2–3 Sentences)
> **Usage**: Resume project bulletins, portfolio subtitles, or quick intros.

AstraMix AI is an open-source, sustainable concrete mix design platform built with Next.js, FastAPI, and TypeScript. By coupling a trained XGBoost machine learning model with a Sequential Least Squares Programming (SLSQP) optimizer, it predicts compressive strength, estimates carbon and cost footprints, and solves for low-carbon recipe proportions under constraints. The platform is backed by a scientific trust layer that validates inputs against training boundaries to prevent extrapolation errors.

---

## B. Medium Version (~120 Words)
> **Usage**: Personal website project cards, application descriptions, or academic portfolios.

AstraMix AI is an interdisciplinary engineering software platform that leverages machine learning and mathematical optimization to design low-carbon concrete mixes. Built using FastAPI, Next.js, and TypeScript, it addresses the 8% global CO₂ emission footprint of concrete by replacing manual trial-and-error recipe casting with algorithmic optimization. AstraMix AI v0.1 uses a trained XGBoost regressor to predict compressive strength, estimates material costs and carbon emissions, and implements a bounded SLSQP solver to optimize mix ratios under target constraints. It distinguishes itself from typical CRUD apps by integrating a scientific trust layer, providing validation error reference metrics (RMSE = 4.62, MAE = 3.03) and training-envelope warnings to ensure engineering accountability.

---

## C. LinkedIn / GitHub Long Version (~190 Words)
> **Usage**: LinkedIn project showcase, GitHub repository header, or project pitch decks.

🚀 Excited to share **AstraMix AI v0.1** — an open-source, interdisciplinary engineering platform designed to accelerate sustainable concrete mix design!

Concrete production is responsible for roughly 8% of global CO₂ emissions. Designers are constantly balancing a three-way trade-off: structural strength requirements, environmental impact (CO₂), and raw material cost. AstraMix AI addresses this challenge by replacing slow, manual batch trials with predictive machine learning and mathematical optimization.

**Key Technical Highlights**:
- **ML Strength Prediction**: Uses a trained XGBoost regressor to predict compressive strength with an RMSE of 4.62 MPa, MAE of 3.03 MPa, and R² of 0.917.
- **Constrained Optimization**: Implements a Sequential Least Squares Programming (SLSQP) solver to search for mix recipes that minimize cost and carbon under target constraints.
- **Scientific Trust Layer**: Protects against extrapolation risk by validating input mixes against the model's training envelope boundaries and displaying validation error margins.
- **Modern Architecture**: Stateless FastAPI backend coupled with a Next.js (v14.2.35) and TypeScript frontend.

Check out the full repository to see how we are merging civil engineering material science with applied machine learning!
