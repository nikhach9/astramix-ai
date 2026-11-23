# AstraMix AI — Production Deployment Guide for cPanel (Pure PHP 8.2+)

This guide documents the complete deployment of AstraMix AI on standard cPanel hosting with Apache or LiteSpeed Web Server.

**Key Architecture Guarantee:**
- **Zero Python Runtime**: No Python, FastAPI, Uvicorn, Gunicorn, Passenger, pip, virtual environments, shell execution, background workers, or external prediction APIs.
- **100% Native PHP 8.2+**: Native XGBoost tree traversal, constrained multi-objective mix optimizer, Mix Lab evaluation engine, Materials Market directory (100 countries, 542 suppliers, 3,451 branches, 62,964 cities), and role-protected administration.
- **Identical Product Experience**: Preserves all frontend workspaces (`/mix-lab`, `/predict`, `/optimize`, `/materials-market`), design tokens, cards, calculations, and exact numerical outputs ($0.00$ discrepancy).

---

## 1. Release Artifacts

Two self-contained zip archives are prepared in the repository root:

| Archive Name | Target Server Location | Purpose & Contents |
| :--- | :--- | :--- |
| `astramix_php_private.zip` | `/home/username/astramix_php/` | **Private Application Core** (outside `public_html`): PHP classes, autoloader, native XGBoost model JSON, SQLite database (`astramix_market.db`), and GeoNames location records. |
| `public_html_php.zip` | `/home/username/public_html/` | **Public Web Document Root**: API front controller (`api/index.php`), Apache `.htaccess`, visual preflight tool (`preflight.php`), static workspace pages, and Next.js CSS/JS assets. |

---

## 2. Server Requirements

Configure your cPanel account with the following settings (accessible in **cPanel > Select PHP Version** or **MultiPHP Manager**):

1. **PHP Version**: `8.2`, `8.3`, or `8.4`
2. **PHP Extensions**:
   - `pdo` (core data objects)
   - `pdo_sqlite` (for built-in SQLite market database) *or* `pdo_mysql` (if using cPanel MySQL)
   - `json` (fast payload encoding/decoding)
   - `mbstring` (multibyte Unicode locality search & diacritic folding)
   - `bcmath` (high-precision money and unit conversions)
   - `curl` & `openssl` (standard network security)
3. **Memory Limit**: `memory_limit = 256M` (minimum 128M)
4. **Max Execution Time**: `max_execution_time = 60` (predictions execute in ~10 ms; optimizations in ~5 ms)

---

## 3. Recommended Directory Structure on cPanel

```text
/home/username/
├── astramix_php/                        <-- PRIVATE ROOT (Not publicly accessible)
│   ├── config/
│   ├── data/
│   │   ├── models/
│   │   │   ├── xgboost_model.json       <-- Native exported XGBoost booster
│   │   │   ├── model_metadata.json
│   │   │   ├── input_schema_v1.json
│   │   │   └── training_envelope_v0_1.json
│   │   ├── market/
│   │   │   ├── astramix_market.db       <-- Full 50-country refresh market database
│   │   │   └── country_discovery_manifest.json
│   │   └── locations/                   <-- 100 country GeoNames cities datasets
│   │       ├── index.json
│   │       ├── AM.json
│   │       └── ...
│   ├── src/
│   │   ├── Core/                        <-- App, Router, Request, Response, Exceptions
│   │   ├── Domain/                      <-- InputSchema, Trust envelope
│   │   ├── ML/                          <-- TreeEnsemble, StrengthPredictor
│   │   ├── Sustainability/              <-- CarbonEstimator, CostEstimator
│   │   ├── Optimization/                <-- Optimizer (candidate screening & feasibility)
│   │   ├── MixLab/                      <-- MixLabService (Strength, Cost, Emissions cards)
│   │   ├── Market/                      <-- Database, Locations, Units, MarketService
│   │   ├── Controllers/                 <-- Route handlers
│   │   └── autoload.php
│   └── tests/
│       └── run_tests.php
│
└── public_html/                         <-- PUBLIC WEB ROOT
    ├── .htaccess                        <-- Routes /api/ to api/index.php; clean URLs
    ├── index.html                       <-- AstraMix AI Homepage
    ├── mix-lab.html                     <-- Mix Lab Workspace
    ├── predict.html                     <-- Predict Strength Workspace
    ├── optimize.html                    <-- Mix Optimization Workspace
    ├── materials-market.html            <-- Materials Market Workspace
    ├── compare.html
    ├── report.html
    ├── about.html
    ├── 404.html
    ├── preflight.php                    <-- In-browser server readiness diagnostic tool
    ├── api/
    │   ├── .htaccess
    │   └── index.php                    <-- Front Controller for all /api/v1/ endpoints
    └── _next/
        └── static/                      <-- Frontend styling, icons, and client scripts
```

---

## 4. Step-by-Step Deployment Instructions

### Step 1: Upload and Extract Private Package
1. Log in to your cPanel File Manager.
2. Navigate to your user home directory (one level above `public_html`, e.g. `/home/username/`).
3. Upload `astramix_php_private.zip`.
4. Right-click and choose **Extract** into `/home/username/astramix_php/`.
5. Verify permissions: Ensure the folder `/home/username/astramix_php/data/market/` and the file `astramix_market.db` have write permissions (`0755` for directories, `0644` or `0664` for the `.db` file) so user reviews and quote updates can be saved.

### Step 2: Upload and Extract Public Web Package
1. Navigate into `/home/username/public_html/`.
2. (Optional: Backup any old files before overwriting).
3. Upload `public_html_php.zip`.
4. Right-click and choose **Extract** directly into `/home/username/public_html/`.
5. Ensure hidden files (`.htaccess`) are visible in File Manager settings.

### Step 3: Run the Visual Preflight Diagnostic
Open your browser and navigate to:
```text
https://astramix-ai.com/preflight.php
```
You should see a clean green dashboard confirming:
- PHP version >= 8.2.0
- All required extensions loaded
- Private backend files detected outside `public_html`
- Native XGBoost model loaded and benchmarked ($55.99$ MPa in ~10 ms)

*(Optional: Once verified, you may delete `public_html/preflight.php` or leave it in place for monitoring).*

### Step 4: Verify Live Application Workspaces
Test the primary product endpoints:
1. **Homepage**: `https://astramix-ai.com/`
2. **Mix Lab**: `https://astramix-ai.com/mix-lab`
   - Adjust cement, water, or SCM inputs and click **Predict**. Confirm predicted strength, RMSE margin, cost, and A1-A3 embodied emissions cards appear immediately.
3. **Mix Optimizer**: `https://astramix-ai.com/optimize`
   - Enter a target compressive strength (e.g. $35$ MPa) and click **Optimize Mix**. Verify that feasible candidate mixes are screened and returned with verified constraints.
4. **Materials Market**: `https://astramix-ai.com/materials-market`
   - Test country switching (e.g., Armenia, Cameroon, Canada, France, USA).
   - Test locality autocomplete search (e.g., "Yerevan", "Douala", "Montreal").
   - Filter by material category (Cement, Ready-Mix, Aggregates) and test whole-bag rounding and delivery surcharge calculations.
5. **Legacy Redirects**:
   - `https://astramix-ai.com/predict.php` redirects seamlessly to `/predict`.
   - `https://astramix-ai.com/optimize.php` redirects seamlessly to `/optimize`.
   - `https://astramix-ai.com/materials-market.php` redirects seamlessly to `/materials-market`.

---

## 5. Optional: Switching from SQLite to cPanel MySQL

By default, AstraMix AI operates on the included high-performance SQLite database (`astramix_market.db`), which requires zero configuration and zero daemon processes.

If your hosting environment prefers cPanel MySQL / MariaDB:
1. In cPanel, create a new database (e.g. `cpaneluser_astramix`) and database user with full privileges.
2. In cPanel File Manager, edit `/home/username/astramix_php/config/env.php` (or add environment variables in `.htaccess` / Apache configuration):
   ```php
   putenv("ASTRAMIX_DB_DRIVER=mysql");
   putenv("MYSQL_HOST=127.0.0.1");
   putenv("MYSQL_PORT=3306");
   putenv("MYSQL_DATABASE=cpaneluser_astramix");
   putenv("MYSQL_USER=cpaneluser_dbuser");
   putenv("MYSQL_PASSWORD=YourSecurePassword123!");
   ```
3. AstraMix AI will automatically connect using `pdo_mysql`.

---

## 6. Administration & Security

1. **Admin Token**:
   Role-protected administrative actions (review moderation, quote upserts, audit log inspection) require an administrator bearer token.
   - Default dev token: `astramix-dev-admin-token`
   - To customize, set the environment variable in `/home/username/astramix_php/config/env.php`:
     ```php
     putenv("ASTRAMIX_ADMIN_TOKEN=YourProductionSecretAdminToken");
     ```
2. **Database Security**:
   The database `astramix_market.db` is stored in the private directory `/home/username/astramix_php/data/market/`, completely outside `public_html`. Even if Apache directory listing is misconfigured, public visitors cannot download the database file.
   Additionally, `.htaccess` in `public_html` explicitly blocks any `.db`, `.sqlite`, or `.env` file requests.

---

## 7. Rollback Protocol

If you ever need to revert to a prior state:
1. Replace `public_html` contents with your previous backup.
2. Remove or rename `/home/username/astramix_php/`.
3. No lingering background processes, Python virtualenvs, or Passenger apps need to be killed because pure PHP runs statelessly on-demand via Apache/LiteSpeed.
