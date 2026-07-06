# Release Checklist — AstraMix v0.1

This checklist compiles all steps required to verify the integrity and stability of the AstraMix v0.1 release.

---

## 1. Automated Verification
- [ ] **Backend Tests**: Verify all unit, API, and trust tests pass:
  `PYTHONPATH=backend/src:backend pytest -q`
- [ ] **Frontend Linter**: Verify frontend is free of lint warnings:
  `npm run lint` (inside `frontend/`)
- [ ] **Frontend Type-check**: Verify zero TypeScript compile errors:
  `npx tsc --noEmit` (inside `frontend/`)
- [ ] **Frontend Build**: Verify Next.js production builds successfully:
  `npm run build` (inside `frontend/`)

---

## 2. Docker & Environment Orchestration
- [ ] **Docker Compose Build**: Verify containers build without errors:
  `docker compose build`
- [ ] **Docker Compose Local Execution**: Verify both frontend and backend containers boot correctly:
  `docker compose up`
- [ ] **Environment Templates**: Check that `.env.example` (backend) and `.env.example` / `.env.local.example` (frontend) exist and do not contain real keys or secrets.

---

## 3. Manual Endpoint & UI Audits
- [ ] **Health Endpoint**: `GET /api/v1/health` returns `200 OK`.
- [ ] **Predict Endpoint**: `POST /api/v1/predict-strength` returns `200 OK` and includes the scientific trust fields (`warnings`, `estimated_error_rmse_mpa`, `estimated_error_mae_mpa`, `confidence_note`).
- [ ] **Carbon Estimation**: `POST /api/v1/estimate-carbon` returns `200 OK`.
- [ ] **Cost Estimation**: `POST /api/v1/estimate-cost` returns `200 OK`.
- [ ] **Optimize Mix**: `POST /api/v1/optimize-mix` returns `200 OK` and propagates caveats.
- [ ] **Optimizer Stress Test**: Verify 50 repeated optimize API requests complete cleanly in sequence without hangs, deadlocks, or timeouts.

---

## 4. Documentation & Artifact Inventory
- [ ] **Model Card**: `artifacts/reports/strength/model_card_v0_1.md` exists.
- [ ] **Validation Report**: `artifacts/reports/strength/model_validation_report_v0_1.md` exists.
- [ ] **Feature Importances**: `artifacts/reports/strength/feature_importance_v0_1.csv` exists.
- [ ] **Training Envelope**: `artifacts/models/strength/baseline/training_envelope_v0_1.json` exists and matches the processed dataset.
- [ ] **Demo Script**: `demo_script_v0_1.md` exists.
- [ ] **Security Notes**: `SECURITY_NOTES.md` exists.
- [ ] **Release Checklist**: `release_checklist_v0_1.md` exists.

---

## 5. Release Packaging
- [ ] **Clean Package Zip**: Ensure the zipped artifact contains no build/test cache directories or dependencies:
  - No `.pytest_cache`
  - No `__pycache__`
  - No `.pyc` compiled files
  - No `tsconfig.tsbuildinfo`
  - No `node_modules`
  - No `.next` Next.js compiler artifacts
