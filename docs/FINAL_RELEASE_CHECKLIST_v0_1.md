# Final Release Checklist — AstraMix AI v0.1

This document outlines the final checklist verified prior to zipping and releasing AstraMix AI v0.1.

---

## 1. Automated Quality Assurance

- [ ] **Backend Tests**: Run `PYTHONPATH=backend/src:backend pytest -q` and verify all 48 tests pass cleanly.
- [ ] **Frontend Dependencies**: Run `npm ci` inside `frontend/` to confirm that `package-lock.json` successfully resolves all locked dependencies (including Next.js 14.2.35).
- [ ] **Frontend Linter**: Run `npm run lint` and verify zero ESLint errors.
- [ ] **Frontend Type-check**: Run `npx tsc --noEmit` to verify full TypeScript compilation safety.
- [ ] **Frontend Production Build**: Run `npm run build` to verify the production compiler generates optimized pages.

---

## 2. Docker & Compose Orchestration

- [ ] **Backend Dockerfile**: Verify `/app/backend` container layout loads the XGBoost model path cleanly.
- [ ] **Frontend Dockerfile**: Verify dependencies are installed using `npm ci`.
- [ ] **Docker Compose**: Verify `docker compose build` and `docker compose up` launch the services on ports 8000 and 3000.

---

## 3. Security & Scientific Documentation

- [ ] **Security Review**: Verify `SECURITY_NOTES.md` documents npm audit status honestly (5 vulnerabilities: 1 moderate, 4 high; 0 critical).
- [ ] **Model Card**: Confirm `artifacts/reports/strength/model_card_v0_1.md` exists.
- [ ] **Validation Report**: Confirm `artifacts/reports/strength/model_validation_report_v0_1.md` exists.
- [ ] **Feature Importances**: Confirm `artifacts/reports/strength/feature_importance_v0_1.csv` exists.
- [ ] **Training Envelope**: Confirm `artifacts/models/strength/baseline/training_envelope_v0_1.json` exists.
- [ ] **Demo Presentation Script**: Confirm `docs/DEMO_VIDEO_SCRIPT_v0_1.md` exists.

---

## 4. Package Hygiene (Wiped Directories)

Ensure the final `astramix-v0.1-final.zip` does not contain any of the following:
- [ ] No `node_modules` folders
- [ ] No `.next` compilation folders
- [ ] No `__pycache__` folders
- [ ] No `.pytest_cache` folders
- [ ] No compiled `.pyc` files
- [ ] No `tsconfig.tsbuildinfo` files
- [ ] No system junk files (e.g. `.DS_Store`, thumbs.db)
- [ ] No local `.env` files (only `.env.example` templates)
