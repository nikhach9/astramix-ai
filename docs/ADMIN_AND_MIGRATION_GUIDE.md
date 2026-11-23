# AstraMix AI — Mix Lab & Materials Market Admin, Data Import, and Migration Guide

This guide documents the operational workflows, environment configuration, staged data import pipeline, 50-country refresh importer, GeoNames city autocomplete index, role-protected Admin CLI/API, and rollback procedures for the **AstraMix Mix Lab + Materials Market** (`feat/mix-lab-materials-market`).

---

## 1. System Overview

AstraMix AI is structured into two primary sections using the unified warm-light editorial engineering palette (`theme_tokens.css` — `#F7F5EF` background, `#172D44` text, `#176B65` primary teal, `#A65429` copper accent):

1. **Mix Lab (`/mix-lab`, `/mix-lab/predict`, `/mix-lab/optimize`, plus `/predict` and `/optimize`)**
   - `/mix-lab` serves as the dedicated choice hub separating **Predict Strength** (`/mix-lab/predict`) and **Optimize Mix** (`/mix-lab/optimize`), with a one-click **"Use this mix in prediction"** flow from Optimize to Predict.
   - Uses a single versioned input-validation contract ([`artifacts/models/strength/baseline/input_schema_v1.json`](file:///c:/Users/gdelt/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/AstraMix%20AI/artifacts/models/strength/baseline/input_schema_v1.json)) derived from the full 1,030-row UCI Concrete Compressive Strength dataset (`water.min = 121.75 kg/m³` in the full 1,030-row envelope vs `121.8 kg/m³` in the 824-row training split).
   - Rejects missing, `NaN`, `Infinity`, boolean, out-of-range, or non-integer curing age inputs on both client and server without silent clamping.
   - Separates water-to-cement ratio (`w/c = water / cement`) from water-to-binder ratio (`w/b = water / (cement + blast_furnace_slag + fly_ash)`).
   - Evaluates mixes across three primary cards (**Predicted strength**, **Estimated ingredient cost**, **Estimated embodied emissions**) with human-friendly rating badges (`"Good"`, `"Normal"`, `"Poor"`, or `"Not enough comparable data"`).

2. **Materials Market (`/materials-market`)**
   - Covers **100 indexed countries** (`50` countries in the 2026 verified refresh pack + `50` preserved countries from the original seed), **227 verified suppliers & channels**, **26 verified local branches/plants/stores**, **105 price snapshots**, and **62,964 GeoNames cities** (CC BY 4.0).
   - Country-scoped location autocomplete (`GET /api/v1/locations/suggest?country=<code>&q=<text>&limit=8`) with `AbortController` stale-response cancellation, keyboard navigation, and automatic reset when switching countries.
   - Strict category separation (`all`, `cement`, `ready_mix`, `dry_concrete`, `masonry_cement`, `repair_mortar`, `cement_adhesive`, `floor_hardener`, `aggregates`, `sand`, `mortar`) so cement searches never return ready-mix or repair mortar.
   - Progressive discovery tiers:
     1. **Matched Priced Offers & Published Snapshots** (with automatic bulk quantity tier discounts and whole-bag rounding).
     2. **Verified Local Branches, Plants & Retail Outlets** (`progressive_sections.local_branches`).
     3. **Verified Store Coordinate Map Layer** (`map_summary` / `GET /api/v1/market/map-seed`, plotting only verified store coordinates such as `ca-home-depot-7073` Home Depot #7073 Leaside in Toronto, Canada).
     4. **Service-Area Suppliers & Country Buying Channels** (`directory_lead_no_price`).
   - Separate controls for **Sort By** (`Recommended for your filters`, `Lowest published item price`, `Nearest mapped store`, `Highest reviewed`) and **Price Filter** (`All Verified Suppliers & Channels` vs `Published Prices Only`).

---

## 2. Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ASTRAMIX_MARKET_DB_PATH` | `data/market/astramix_market.db` | Path to the SQLite database file storing countries, suppliers, branches, price snapshots, benchmarks, reviews, staged imports, and audit logs. |
| `ASTRAMIX_ADMIN_TOKEN` | `astramix-dev-admin-token` | Secret token required in the `X-Admin-Token` or `Authorization: Bearer <token>` header for all `/api/v1/admin/*` endpoints. **Must be rotated in production.** |
| `ASTRAMIX_GEOCODING_PROVIDER` | `builtin_city_directory` | Pluggable geocoding adapter backed by the 100-country GeoNames city index (`data/research_pack_50/astramix_market_fix/locations/<CC>.json`). |
| `ASTRAMIX_ROUTING_PROVIDER` | `haversine_straight_line` | Pluggable routing distance adapter (`haversine_straight_line` clearly labels distances as straight-line estimates). |
| `ASTRAMIX_FX_PROVIDER` | `native_currency_only` | Preserves native supplier currency without unverified cross-currency rank mixing unless live FX rates are configured. |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend FastAPI base URL used by the Next.js frontend. |

---

## 3. Staged Research Data Import, 50-Country Refresh & Admin CLI

### CLI Commands ([`backend/scripts/market_admin_cli.py`](file:///c:/Users/gdelt/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/AstraMix%20AI/backend/scripts/market_admin_cli.py))

Run from the repository root using the backend virtual environment:

```powershell
# 1. Stage and approve the base research seed + 50-country refresh (idempotent)
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py bootstrap

# 2. Explicitly run or re-run the 50-country refresh importer (idempotent)
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py import-50

# 3. Inspect coverage counts (100 countries, 50 refreshed, 29 with snapshots, 227 suppliers, 26 branches, 105 snapshots)
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py overview

# 4. Add or update a verified supplier branch and complete live quote
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py upsert-quote `
  --supplier-id am_araratcement `
  --country AM `
  --name "AraratCement Yerevan Dispatch Depot" `
  --category cement `
  --product "CEM I 42.5N (50kg Bag)" `
  --amount 3100 `
  --currency AMD `
  --unit bag `
  --pack-kg 50 `
  --lat 40.1792 `
  --lon 44.4991 `
  --city Yerevan `
  --delivery included `
  --tax-included

# 5. Moderate a customer review (approve or reject after verifying order_reference)
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py moderate-review `
  --review-id <review_id> `
  --state approved `
  --verified-purchase `
  --reason "Verified invoice reference with batching plant"

# 6. View the admin audit log
.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py audit-logs --limit 25
```

---

## 4. Public & Role-Protected Admin REST Endpoints

### Public Location & Market Endpoints
- `GET /api/v1/locations/suggest?country=<ISO2>&q=<text>&limit=8` (and `/api/locations/suggest`) — Country-scoped GeoNames city autocomplete with CC BY 4.0 attribution.
- `GET /api/v1/market/overview` — Global coverage metrics, country list, and GeoNames attribution.
- `POST /api/v1/market/search` — Evaluates concrete ingredient and ready-mix offers, progressive discovery branches, quantity tiers, and distance.
- `GET /api/v1/market/map-seed?country=<ISO2>` — Returns GeoJSON FeatureCollection of branches with verified store coordinates (`ca-home-depot-7073`).

### Role-Protected Admin Endpoints
All admin endpoints require `X-Admin-Token: <ASTRAMIX_ADMIN_TOKEN>` or `Authorization: Bearer <ASTRAMIX_ADMIN_TOKEN>`. Unauthenticated requests return `403 Forbidden` (`AdminAuthError`).

- `POST /api/v1/admin/import/stage` — Stage `market_seed.json` and `sources.json` into `staged_import_batches`.
- `POST /api/v1/admin/import/{batch_id}/approve` — Approve a staged batch and commit records into live tables.
- `POST /api/v1/admin/import/refresh-50` — Idempotently import the 50-country refresh package (`data/research_pack_50/astramix_market_fix/`).
- `POST /api/v1/admin/suppliers/upsert-quote` — Upsert a verified supplier branch, delivery rule, and price quote.
- `POST /api/v1/admin/reviews/{review_id}/moderate` — Approve or reject a customer review and set `verified_purchase`.
- `GET /api/v1/admin/audit-logs` — Retrieve immutable audit log entries (`actor`, `action`, `target_type`, `target_id`, `details_json`, `created_at`).

---

## 5. Expanded 50-Country Refresh (18 October 2026 Snapshot)

The expanded 50-country dataset (`data/research_pack_50/astramix_market_fix/`) deepens physical location coverage, published pricing, and source provenance across all 50 researched markets while preserving prior leads outside the 50 countries.

### 5.1 Verification Metrics Comparison

| Measure | Previous Pack (Baseline) | Expanded Pack (Current) | Status |
| :--- | :--- | :--- | :--- |
| **Indexed Countries** | 100 (50 refreshed + 50 prior) | 100 (50 refreshed + 50 prior) | Preserved |
| **Refreshed Markets with Published Prices** | 29 | 43 | Expanded |
| **Refreshed Markets (Quote/Call Only)** | 21 | 7 | Refined |
| **Supplier / Network / Dealer Entities outside Cameroon** | 135 | **542** | +407 entities |
| **Branch / Plant / Office / Contact Locations outside Cameroon** | 102 | **3,451** | +3,349 locations |
| *— Retail / Distributor / Sales Outlets outside Cameroon* | 72 | **3,006** | Walk-in verified |
| *— Ready-Mix Plants & Cement Terminals outside Cameroon* | — | **301** | Production points |
| *— Other Offices, Service Centers & Directory Contacts* | — | **144** | Contact points |
| **Published Physical Coordinate Pairs (`map_seed.geojson`)** | 1 | **2,231** | +2,230 coords |
| **Coordinates Eligible for Nearest (`eligible_for_nearest: true`)** | 1 | **2,176** | Retail/sales pins |
| **Cameroon Discovery Records (`cameroon_market_supplement.json`)** | 40 | **40** | Retained (imported once) |
| *— Cameroon Directory-Listed Retail Branches* | 33 | **33** | Retained |
| *— Cameroon Non-Branch Suppliers / Manufacturers* | 7 | **7** | Retained |
| **Total Combined Published Price Observations** | 91 (84 global + 7 CM) | **116** (109 global + 7 CM) | +25 observations |
| *— Single Numeric Price Observations* | 89 (82 global + 7 CM) | **114** (107 global + 7 CM) | Direct rankable |
| *— Published Price Range Observations* | 2 | **2** | Preserved range |
| **Scoped Website Availability Observations** | 17 (10 global + 7 CM) | **37** (30 global + 7 CM) | Verified scope |
| **Research Sources (`sources_50.json` + `research_sources.json`)** | 233 (217 + 16) | **1,983** (1,967 + 16) | Provenance tracked |
| **GeoNames City / Town Suggestions** | 62,964 | **62,964** | CC BY 4.0 |
| **Data Quality Rules & Quarantines Applied** | 8 | **15** | Strict honesty |

> [!IMPORTANT]
> **Entity Separation Rule**: Supplier entities (`542`) and branch locations (`3,451`) are strictly distinct entities and must never be summed as though they were 3,993 individual retail stores.

### 5.2 Mandatory Corrections Applied
- **Dufferin Concrete Ontario Observations** (`ca-price-019`, `ca-price-020`, `ca-price-021`):
  Erroneous non-air-entrained and interior-only labels were cleared (`air_entrainment: null`, `intended_use_claim: null`), correctly aligning with the source 2026 Dufferin Concrete standard price table.
- **Idempotency Guarantee**:
  Executing `.\backend\.venv\Scripts\python.exe backend/scripts/market_admin_cli.py import-50` produces identical counts across successive executions with zero duplicated records or leaked test rows.
