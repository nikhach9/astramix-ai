# Antigravity prompt — expand AstraMix Materials Market data

Work in the existing **Astramis / AstraMix AI** repository serving `http://localhost:3001/`. First inspect the actual application, database/schema, market search and import logic, and follow its AGENTS.md instructions. Implement and verify the changes in that repository. This supplied package is research data, not evidence that the app has already been changed.

**Current priority: expand market data across the same 50 countries.** Preserve working Mix Lab prediction/optimization behaviour, navigation and current visual design during this data update. Do not start a redesign or analytics rollout. Visitor counts and click analytics will be a later task.

Use the files in the attached `AstraMix_Market_and_UI_Fix_Pack.zip`, under `astramix_market_fix/`. Read `README.md`, `COUNTRY_COVERAGE_50.md`, `data_quality_actions.json` and `market_depth_delta.json` before coding. Do not use older 80/93-country estimates or fabricate missing branches, prices, ratings or stock to achieve a target count.

## 1. Import the expanded data using stable identities

The canonical `global_market_50.json` schema 2.1 contains:

- 542 supplier/network/independent dealer entities outside Cameroon;
- 3,451 branch/contact records: 3,006 retail/distributor/sales outlets, 301 plants/terminals and 144 other contacts;
- 109 price observations outside Cameroon and 30 scoped website availability observations.

Keep `cameroon_market_supplement.json` as the single retained import for its 40 discovery records, seven prices and seven unpriced/on-order catalog observations. Across both files there are 116 price observations in 43 markets. The same 50 markets must include AM, US, CA and CM. The separate location dataset supports 100 countries; do not claim all 100 have the same market-research depth.

Use separate entities/tables for suppliers, physical branches or contact locations, product/price observations, availability observations, sources, reviews and merchant confirmations. Adapt the existing schema with an additive migration if necessary. Preserve original published names, addresses, country code, source branch ID, role, publication/update dates, source links, currencies, units, material categories and price conditions.

Implement a real server/admin import command with a dry-run report and a transaction or safe batch strategy. Upsert research records by `supplier_id`, `branch_id`, `observation_id`, `source_id`; retain the old IDs. Importing this pack twice must produce the same canonical records. `market_depth_delta.json` contains ID references and reviewed matches into the complete canonical dataset; it is not a second set of suppliers or branches. Do not import it as duplicate listings. Do not reset the database, delete user records, or discard unmatched existing merchant records. Keep independently collected stock, orders, reviews and newer merchant confirmations outside the seed namespace, and never overwrite them with null research values.

Before upserting, check for an existing internal record corresponding to a supplied canonical ID or an earlier installed alias. Use source ID plus country and physical address for reconciliation; names alone and shared phone numbers are insufficient. Preserve distinct shops with identical display names at different addresses, and distinct companies/facilities sharing an address. Produce a collision/reconciliation report for uncertain matches.

**Mandatory correction:** update existing Dufferin observations `ca-price-019`, `ca-price-020`, `ca-price-021`. The older pack incorrectly assigned non-air-entrained/interior-only restrictions. Set `air_entrainment` and `intended_use_claim` to null and import the corrected notes/table metadata. Do not leave the old labels visible or create duplicate prices. Preserve separate CSA exposure mixes and the 56-day 50 MPa CXL entry; keep the 50 MPa standard mix's HSF/superplasticizer footnote. Per-volume prices do not imply an order minimum.

## 2. Make discovery use the larger data

Country is the hard geographic boundary. Reset incompatible selected city/branch state when the country changes. Match on structured country codes; a Canaima branch in the city Armenia, Quindío belongs to **CO**, not AM. Do not select a country by a substring in a city name.

For each selected country/material, search actual branches, relevant supplier catalogs and published quote/service leads. Retain contacts without coordinates or prices in list results. Make broad country discovery the initial state; numeric-price, confirmed-stock, distance and city filters must not accidentally hide every quote-only result. A city choice is a search origin/locality preference, not an unsupported merchant service-area assertion. When there is no exact city match, show relevant country-level contacts with a clear “Confirm service to [city]” explanation. Never display a guessed distance.

Treat retail stores, independent dealers, concrete plants, cement terminals, offices, warehouses and third-party directory contacts differently. A ready-mix plant is a quote/dispatch option, not automatically a walk-in store. Use product-family data to match the request. Tile adhesive, masonry cement, repair mortar, floor hardener, precast products and structural concrete ingredients are separate categories. Network catalog evidence allows a “May supply this material — confirm with branch” lead; it does not establish inventory in every outlet. For hardware-only or unspecified-assortment networks, use a separately labeled related-contact fallback rather than claiming they sell the requested raw cement/sand.

Keep quote/contact actions usable for all 50 countries. Provide the actual official branch/supplier link, a valid phone action where published, and “Price on request” when no numeric offer exists. Do not send messages or place orders automatically. Debounce search, paginate results and use server-side country/material indexes so thousands of records do not make the UI sluggish. Show counts after the actual filters, distinguishing physical locations from network leads.

## 3. Prices, availability and recommendation ranking

Retain the original currency and unit. Only normalize explicit compatible mass/volume quantities; do not compare a 25 kg bag to a 50 kg bag without conversion, or cement to ready mix. Preserve strength/grade, exposure class, test age, bag mass, brand where published, region, quantity tier, customer tier, payment terms and purchase conditions. Numeric conversion is not proof of product equivalence. MM Leader's volume unit remains unknown; Senegal's ranges remain ranges. Do not invent exchange rates or country-average prices.

Unknown delivery, tax, handling, stock quantity, route/service area and ratings remain null. Unknown fees must never become zero. These observations currently cannot establish “Cheapest delivered.” A provisional sort may say “Lowest published material price among comparable listings” with the observation date and unresolved costs shown; hide that comparison when units/specifications are unresolved. Do not spread Gehring/Dufferin regional prices across a whole country or assign Cashbuild S286 prices to all Cashbuild stores.

Availability is an observation scoped to one product, branch or online fulfillment context. Bricoma's 24 branch-specific claims for one repair-mortar SKU coexist with an online out-of-stock claim; one channel cannot override the others. Plomerama's website quantity has no named branch and must remain unassigned. `source_checked_at` / `observed_at` is a research snapshot date, not `stock_confirmed_at`. No live merchant inventory connection is present. Show “Website reported available — confirm” or “Availability unknown,” never “Verified in stock” from these seeds.

“Recommended” must be explainable and require a relevant material match. Prefer meaningful confirmed offer completeness and service eligibility when available; use published source quality and relevant proximity only where supported. Missing ratings or price are unknown, not zero and not automatic exclusion. Do not invent customer reviews, star ratings or a universal best option. Show a short reason and a confidence/source label. Keep unknown-cost results outside a delivered-cost winner until the missing inputs are confirmed.

## 4. Map and autocomplete

Import `map_seed.geojson`: 2,231 published physical location points, of which 2,176 have retail/sales roles. Cluster markers, filter by selected country/material and expose separate retail, plant and other-contact layers. Link a marker to the exact canonical branch, address and source. Map failure must preserve list results. `eligible_for_nearest` signals sufficient coordinate/retail-role data, not confirmation that the material is in stock or the store serves the customer.

Use GeoJSON longitude/latitude order. A straight-line distance must be labeled as such; do not call it driving distance without routing. Do not draw city-centre, page-centre or default-selected-store points as stores. China Huaxin's unconfirmed AMap CRS tuples and Ghana's uncertain-precision tuples remain outside the WGS84 store-pin/nearest layer. Geocode unresolved addresses only through an approved configured provider, storing provider, confidence and address-match provenance; ambiguous/locality-only results stay unpinned. Do not expose keys in browser bundles.

Reuse `locations/index.json` and country files or port the behaviour of `location_lookup.py` for country-scoped autocomplete: native aliases, diacritics, blank-query suggestions, bounds, keyboard navigation and clear loading/error states. The reference is Python; port it to the app's actual stack rather than assuming a Python server exists. Keep IDs and country codes with selected places. GeoNames CC BY 4.0 attribution is supplied and must remain visible where required.

## 5. Verify the actual app and report evidence

Run the supplied `python3 astramix_market_fix/validate_pack.py` for package integrity, then add/run the repository checks needed for the migration/import and real search behaviour. Do not report package validation as proof that the app works. Verify:

1. Import twice: supplier, branch, price and source counts stay stable; old IDs, user reviews and newer merchant-confirmed stock survive.
2. All 50 researched markets return relevant physical or quote/contact discovery in broad country mode, with no false empty state caused by missing price/coordinates. Test material filtering with honest related-contact fallback.
3. AM shows its retail and directory contacts separately; US distinguishes its selected 43 Ernst plants from the four retained retail branches; CA has 182 distinct Home Depot store IDs plus RONA. These are not nationwide censuses.
4. Nigeria approved dealers and South Africa's 291 locator stores appear without fake inventory. Senegal retains quote/service leads despite sparse street-address data.
5. Same-name BigMat Albert outlets, the two San Luis Potosi Home Depot addresses, separate Korean material facilities and multiple Polpaico Santiago plants survive deduplication.
6. Future-opening CAINZ entries remain excluded even if the source says OPEN; permanent-closure and specialist-format exclusions remain effective. “Closed today” is not permanent closure.
7. Colombia's Armenia locations stay CO. Native Yerevan, Yaoundé, Douala, Toronto and New York autocomplete is country-scoped.
8. Toronto Leaside's source coordinates and Australia's actual Belconnen store coordinates are preserved. China's AMap and Ghana's uncertain points do not enter exact-store distance ranking.
9. Dufferin corrected labels, CSA/56-day details, regional prices, material categories, unknown fees and Bricoma branch/channel availability remain accurate in rendered results.
10. Map/provider failures and mobile interactions preserve usable list/quote results. Existing prediction/optimization flows still work.

Finish with a concise actual before/after database coverage table for all 50 countries, changed files/migrations, commands/checks run, source/provenance examples and remaining coverage gaps. Provide screenshots of the real running market results for Armenia, US, Canada, Nigeria and one quote-only market. Do not claim live stock, verified reviews, complete country coverage or deployment unless those were actually implemented and tested.
