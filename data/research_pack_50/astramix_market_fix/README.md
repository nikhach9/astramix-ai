# AstraMix expanded market data pack

This update concentrates on data. It supplies **3,451 branch/contact locations** and **542 parent supplier/dealer/network entities** outside Cameroon, plus the retained 40-record Cameroon supplement. The former pack had 102 and 135 respectively. Counts describe different entity types and must not be combined as unique stores.

The 50 researched markets include Armenia, United States, Canada and Cameroon. There are **116 published price observations across 43 markets**, **30 scoped website availability observations outside Cameroon**, **2,231 physical map points**, and the retained **62,964 city/town suggestions across 100 countries**. No live inventory or verified customer review feed is connected. Publication snapshots were researched on 2026-10-18; this is not a promise of current supplier stock, price, service coverage or opening hours.

## Start here

1. Read `COUNTRY_COVERAGE_50.md` for every country's counts, source examples, limitations and corrections.
2. Give Antigravity `ANTIGRAVITY_FIX_PROMPT.md` with this complete folder/ZIP and access to the real repository. The localhost app was not modified in this workspace.
3. Import canonical data by stable IDs using an additive, repeatable migration/importer. Keep user reviews, orders and newer merchant confirmations outside the research seed namespace. Test the importer twice in the actual app.
4. Run the offline integrity check below, then the app's real integration checks.

```bash
python3 astramix_market_fix/validate_pack.py
```

## Files and relationships

| File | Purpose |
|---|---|
| `global_market_50.json` | Schema 2.1 suppliers, branches/contacts, prices, availability, 50-country counts and external Cameroon pointer |
| `market_depth_delta.json` | Canonical upsert IDs, former preserved IDs, reviewed old/new branch matches and corrected price IDs; references only, not duplicate records |
| `cameroon_market_supplement.json` | Retained 40 discovery records, seven numeric cement prices and seven unpriced/on-order catalog observations; import once |
| `sources_50.json` | 1,967 public source URLs for the global dataset, with source type and snapshot limitations |
| `research_sources.json` | Separate source registry for Cameroon |
| `coverage_summary.json` | Actual machine-readable counts and visible coverage gaps |
| `data_quality_actions.json` | Dufferin metadata correction, historical/retired/demo exclusions, future openings, coordinate quarantine and identity-review cases |
| `map_seed.geojson` | 2,231 published physical location points with canonical branch IDs and roles; no locality reference pins |
| `locations/index.json`, country JSONs, `location_lookup.py` | 100-country city/town data and tested Python autocomplete reference to port to the app's own stack |
| `country_discovery_manifest.json` | Distinguishes 50 researched markets from the other locality-supported countries |
| `GEONAMES_ATTRIBUTION.md` | Location dataset attribution/license and query instructions |
| `COUNTRY_COVERAGE_50.md` | Human-readable coverage, provenance, corrections and remaining gaps |
| `ANTIGRAVITY_FIX_PROMPT.md` | Updated data-focused implementation and acceptance prompt |
| `validate_pack.py`, `validate_global_data.py`, `validation_report.json` | Offline data/lookup checks and hashes; do not establish app import or deployment success |
| `input_bounds_reference.json`, `theme_tokens.css` | Retained earlier reference material; not an instruction to change working Mix Lab or UI now |

## Import and display rules

Supplier/network categories describe published assortment, not inventory in every branch. Some supplier entities are independent dealers listed by a manufacturer; they are not company-owned stores. Third-party business-directory contacts are labeled separately. Branch roles distinguish retail, plants, offices, warehouses and locality/postal-only contacts. Do not invent a missing street, GPS point, phone, price, review or service area.

All price observations preserve their source, original currency, mass/unit and any known grade, application, strength, exposure/test age, customer/quantity tier or payment condition. Arithmetic unit conversion is not proof of product equivalence. Unknown fees remain null. None of these observations currently qualifies as a confirmed cheapest delivered offer. Keep quote-only suppliers usable even when numeric prices or coordinates are absent.

Published availability is product/branch/channel specific and is not a live stock confirmation. Bricoma's repair-mortar table has 24 branch claims; online stock metadata is a separate context. A snapshot date is not a stock-confirmation date. Keep Cashbuild S286 prices scoped to that store. Never copy a parent merchant's price or stock to every location.

**Required corrective upsert:** existing Dufferin IDs `ca-price-019`, `ca-price-020`, `ca-price-021` had unsupported air-entrainment/intended-use labels in the earlier pack. Import the corrected null labels and notes using the same IDs. The newly added standard and CSA price-table entries remain separate, including the 56-day 50 MPa CXL specification.

Map points use actual published address/location tuples. Retail-role points still require material and access confirmation before a customer acts. Do not convert city/town coordinates into shop coordinates. Huaxin AMap tuples and Ghacem points of uncertain precision are retained separately and must not enter WGS84 exact-store distance ranking. Straight-line distance is not driving distance or a delivery commitment.

The 100-country autocomplete data does not imply equivalent supplier coverage in 100 countries. The 50-country expansion is still selected coverage, not a census; US coverage is regional/selected, and several smaller datasets remain contact/quote oriented. Analytics and click tracking are deferred at the user's request.
