# cPanel packaging

The frontend is a Next.js static export. The private PHP backend is `astramix_php/`. Build deployment copies from these canonical sources; do not edit previously generated copies.

Use PHP 8.2+ with `pdo_sqlite` and `mbstring`. Local verification for this repair used PHP 8.4.27. Keep backend source, model files and databases outside `public_html`.

1. From `frontend/`, run `npm ci` and `npm run build`. Leave `NEXT_PUBLIC_API_BASE_URL` unset for a same-origin PHP deployment. A localhost API address must never be included in a production build.
2. From the repository root, create a fresh database with `python backend/scripts/prepare_market_snapshot.py /tmp/astramix-market-release.db`.
3. Run `python create_final_packages.py --market-db /tmp/astramix-market-release.db`. This packages the specified snapshot and never overwrites an existing deployment database. Inspect generated archives before deployment.
4. Extract `ASTRAMIX_FRONTEND_FINAL.zip` inside `public_html` and `ASTRAMIX_PHP_BACKEND_FINAL.zip` inside a sibling private `astramix_php` folder. Archive contents use forward slashes. Preserve any existing user database and records when updating a deployed site.
5. Set `ASTRAMIX_PHP_ROOT` if the private backend is installed at a different location. Configure the production admin token outside the public document root.
6. Check `/api/v1/health`, `/api/v1/schema/mix-input`, a prediction, an incomplete-factor request and an optimization. The prediction should identify `grouped-v1`; search success means a feasible candidate found within its budget.

Packaging and local checks do not deploy the website. No production deployment has been performed by this repair. Prior fixed CSS hashes and archive sizes are historical observations, not checks of a new build.
