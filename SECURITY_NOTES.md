# Security Notes — AstraMix v0.1

This document outlines the security posture, dependency audits, and safety configurations of the AstraMix v0.1 release prior to its public demo and GitHub publication.

---

## 1. Dependency Audit Summary

### Frontend (npm audit)
- **Status**: Audit reports 5 vulnerabilities (1 moderate, 4 high). All critical vulnerability entries have been resolved.
- **Remediation**: Locked Next.js and eslint-config-next to version 14.2.35 and fixed the previous package-lock mismatch. npm audit may still report remaining advisories, so this v0.1 release is intended for local/demo/sandbox use rather than public production deployment.
- **Vulnerability Breakdown**:
  - The critical cache-poisoning and server-side request deserialization issues in Next.js 14.2.3 have been resolved by upgrading to version `14.2.35`.
  - Remaining high/moderate warnings belong to `glob` (in eslint-plugin-next dev dependencies) and `postcss` (bundled in next). Resolving these requires upgrading to Next.js 16/React 19, which represents a major breaking change.
- **Production/Demo Impact**: The release is restricted to **local demo and development use only** in isolated sandbox environments. Public production deployments should not be attempted without fronting reverse proxies.

### Backend (Python dependencies)
- **Status**: Standard stack components (`fastapi>=0.110`, `uvicorn>=0.29`, `pydantic>=2.6`, `xgboost>=2.0.0`) are clean and free of severe CVE notices.
- **System Hardening**: The Dockerfile builds on `python:3.11-slim` to minimize the attack surface of unused OS-level packages.

---

## 2. Secrets & Credentials Validation
- **No Hardcoded Secrets**: A thorough validation check confirms that zero API keys, database credentials, JWT private keys, or passwords are committed to the codebase or artifacts.
- **Config Drive**: All environment-specific variables are driven via `.env.example` templates and loaded using Pydantic Settings (`ASTRAMIX_` prefix) or Next.js build-time properties (`NEXT_PUBLIC_`).

---

## 3. Storage and User Privacy
- **Stateless Architecture**: AstraMix v0.1 stores no persistent user data, session state, or cookies. All calculation endpoints (`/api/v1/predict-strength`, `/api/v1/estimate-carbon`, `/api/v1/estimate-cost`, `/api/v1/optimize-mix`) are completely stateless.
- **Authentication**: There is no login, registration, or user database in v0.1.

---

## 4. Production Deployment Recommendations
Prior to deploying AstraMix to a public production domain, the following steps are highly recommended:
1. **CORS Restrictions**: Narrow down `ASTRAMIX_CORS_ORIGINS` to the exact production domain (rather than localhost wildcards).
2. **Rate Limiting**: Implement a reverse proxy (e.g. Nginx or Cloudflare) with rate limiting rules around `/api/v1/optimize-mix` to prevent CPU exhaustion via repeated solver requests.
3. **Non-Root Docker Execution**: Modify backend and frontend Dockerfiles to run as a non-privileged user (e.g., `nobody` or `nextjs` user profiles).
4. **Input Sanitization**: Add strict request sanitization layers to restrict model inputs from passing arbitrary numeric payloads to ML models.
