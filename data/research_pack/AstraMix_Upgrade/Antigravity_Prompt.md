# Antigravity implementation prompt: AstraMix Mix Lab + Materials Market

Work on my existing AstraMix AI project at **https://astramix-ai.com/**. Implement the changes below in the actual repository. The supplied research package is part of the specification: read `Research_Brief.md`, `market_seed.json`, `sources.json`, and `input_bounds_reference.json` before importing data.

The goal is two clear website sections:

1. **Mix Lab**: the existing strength prediction and mix optimization tools, with allowed input ranges and understandable comparisons for strength, cost and emissions.
2. **Materials Market**: a useful directory and comparison tool for buying concrete ingredients or ready-mixed concrete, with local suppliers, actual order costs, distance, genuine customer reviews, and a transparent recommended option.

## 1. Inspect the repository and preserve working behavior

Read repository instructions and inspect the frontend, backend, model files, data, tests and deployment configuration first. The public site currently shows PHP pages such as `predict.php` and `optimize.php`, with a FastAPI prediction backend, XGBoost model and SLSQP optimizer. Confirm the repository rather than assuming it uses React or replacing the application framework.

Keep the current predictions, model column order, units, endpoints and optimizer functional. Add backward-compatible fields or a versioned API where needed. Work in a feature branch, preserve unrelated changes, and provide a reviewable implementation. Do not deploy to production or change DNS as part of this task.

Add two main navigation entries, **Mix Lab** and **Materials Market**, and a homepage that explains both in plain language. Keep direct access to existing prediction and optimization URLs. Use responsive layouts, keyboard-accessible controls and readable labels. A result must not depend on color alone.

## 2. Mix Lab: one shared input-validation contract

Inspect the actual model training pipeline and its metadata. Generate a versioned feature schema from the deployed model's validated training support, and expose it through the backend. Both the form and server validation must use the same schema, including unit, minimum, maximum, precision, optionality and feature order. The optimizer must respect the same validated bounds.

The original UCI reference workbook was downloaded and checked for this research. Its full 1,030-row input bounds are:

| Feature | Minimum | Maximum | Unit |
|---|---:|---:|---|
| Cement | 102 | 540 | kg/m³ |
| Blast furnace slag | 0 | 359.4 | kg/m³ |
| Fly ash | 0 | 200.1 | kg/m³ |
| Water | 121.75 | 247 | kg/m³ |
| Superplasticizer | 0 | 32.2 | kg/m³ |
| Coarse aggregate | 801 | 1145 | kg/m³ |
| Fine aggregate | 594 | 992.6 | kg/m³ |
| Curing age | 1 | 365 | integer days |

Use these as a checked reference, not proof of the deployed training split. If the deployed pipeline uses a different validated envelope, use that and document the reason. If no model metadata exists, add the original-data schema as an explicitly identified reference policy until training provenance is reconstructed. Never describe these limits as engineering safety limits. An arbitrary combination of individually allowed values can still be outside the combinations represented in training.

Requirements:

- Display allowed ranges beside the fields; support typed numeric input. Use bounded steppers/sliders where helpful without making decimal entry difficult.
- Reject missing required values, non-finite values, negative ingredient amounts, fractional ages and values outside the active allowed schema on the server. Do not silently clamp or round invalid input into acceptance.
- Return actionable field-level errors; preserve the user's entries and focus the first invalid field. Validate direct API requests as strictly as the form.
- Check nonzero binder and finite, explicitly defined water/cement and water/binder ratios. Do not change one definition into the other silently.
- Preserve documented engineering constraints separately from statistical training bounds. Do not invent a universally valid water/binder ratio, aggregate density or one-cubic-metre yield rule. Where absolute-volume validation is implemented, it needs appropriate material densities and air content.
- Treat chemical admixture product dosage, solids content and cement/SCM substitutions as material-specific. Do not map any generic retail additive or mortar product into the model's superplasticizer feature automatically.
- Validate optimization constraints and weights independently. Report infeasibility and solver failure honestly, and recheck the returned mix against all constraints. Do not label a failed solve as an optimum. Existing weighted-sum output is not a Pareto frontier or proof of a global minimum.
- Show that strength is predicted for the selected curing age. Do not label every age as a 28-day prediction.

## 3. Keep the result numbers; explain what they mean

Keep the existing numeric result fields. Present three primary cards: **Predicted strength**, **Estimated ingredient cost**, and **Estimated embodied emissions**. Price and cost are the same economic metric unless there is a separately defined delivered selling price; do not invent a duplicate fourth metric.

Each card needs the value, unit, comparison label, reference basis, source/date, sample size where applicable, and an expandable explanation. Preserve raw numbers for exports and APIs. Avoid unsupported decimal precision and invented confidence percentages.

Use **green / yellow / red** for valid favorable / typical-or-borderline / unfavorable comparisons. Add a neutral **Insufficient comparison data** state whenever the basis is missing or incompatible. Do not manufacture a green result just because a benchmark is unavailable.

### Strength

Ask for an optional user-specified target and compare the prediction at the selected age and test basis with that target. A predicted value meeting the target may have a green **Predicted to meet target** label; a prediction below target is red. Use yellow **Borderline prediction** only with a documented model-error or calibrated-uncertainty rule. If no credible uncertainty rule exists, do not invent a numerical confidence margin or confidence interval. With no target, show the prediction and any supported distribution context without claiming structural suitability.

Higher strength is not automatically a better mix: excess strength can carry extra cost and emissions. Do not automatically map an unqualified UCI prediction to a certified EN 206 strength class. Cement grade 32.5/42.5, concrete C25/30, Armenian M/B grades and US supplier mix IDs are different things; preserve their definitions, specimen basis and curing age.

### Ingredient cost and emissions

Filter reference mixes by relevant geography, period, currency, strength/test basis, age, exposure class and cost or life-cycle scope. Never compare ingredient-only cost to a delivered ready-mix selling price. Never treat a sum of ingredient emission factors as a verified whole-product A1-A3 EPD unless the declared boundary, transport and production contributions actually match.

Support two explicit modes:

1. **Market comparison**: with at least 10 independent, compatible, sufficiently recent reference observations, use documented configurable percentile bands: below the 25th percentile green, 25th through 75th yellow, above the 75th red, because lower cost/emissions are favorable. De-duplicate repeated mixes/offers and related observations. These are UI policy choices, not engineering standards. Show the cohort and actual count. If insufficient, return neutral.
2. **Selected reference comparison**: compare with a named user baseline or an appropriate published benchmark using a transparent configurable tolerance. Label it **Compared with selected reference**, not “the market”. Do not automatically substitute a global or foreign baseline for a missing local one.

If any required ingredient price is missing, show **Incomplete ingredient cost estimate** and the known subtotal/coverage; do not price the missing ingredient at zero or display a green cost badge. Apply the same rule to missing emission factors. A US regional emissions benchmark is not an Armenian or worldwide emissions benchmark.

Keep calculation provenance: model version, input-schema version, recipe, price/factor versions, comparison method, cohort filters and benchmark IDs. Genuine uncertainty must be explained without an invented confidence score.

## 4. Materials Market: search the customer's actual order

Provide separate search tabs/categories for:

- **Ingredients**: cement, suitable fine/coarse aggregates, slag, fly ash and suitable admixtures.
- **Ready-mixed concrete**: concrete supplied to the requested grade, volume and delivery conditions.

Bagged concrete, mortar, plaster, cement and ready-mix are distinct product types. Do not fill missing ingredient prices from bagged concrete or a finished ready-mix quote.

Inputs: country, city/postcode or jobsite location, product/specification, required quantities or concrete volume, delivery/pickup preference, and requested date. Offer optional device location with explicit consent; manual location entry must work. Infer neither a store coordinate nor a service radius from a country name.

Allow **Use this mix** from prediction/optimization to generate an ingredient basket: ingredient kg/m³ multiplied by project m³, with user-selected compatible products. Account for complete bags, minimum quantities, stock, truck capacity and dispatch rules. Never silently substitute another cement, SCM, aggregate grading or admixture chemistry. Show purchased quantity, required quantity and surplus separately.

Supplier cards should show:

- Actual sales branch or batching plant, address, product specification and source link.
- Original unit price and its date/status; compatible normalized units when valid.
- Order quantity and complete delivered total when known; otherwise an explicitly incomplete estimate and **Request a quote**.
- Delivery/pickup availability for the jobsite, minimum order and relevant fees.
- Route distance/travel time when supported; label straight-line distance as an approximation when that is all that is available.
- Genuine rating, review count and review source when available; otherwise **No reviews yet**.
- Clear actions such as supplier website, contact details, save comparison, and prepare a quote request. No automatic supplier outreach is required or authorized by this build instruction.

Treat corporate headquarters, national networks and manufacturer country offices as **Supplier leads**, not nearby shops. The research seed deliberately contains no geocoded branches. Without verified branch locations, show source/contact listings and omit the nearest badge. Do not put all suppliers at a capital-city coordinate.

## 5. Order pricing and normalization

Use decimal money arithmetic. Preserve original currency, unit, packaging, product grade and commercial terms. Support kg, metric tonne, 20/25/40/50-kg bags, lb, yd³ and m³ as appropriate. Explicit conversions include 1 yd³ = 0.764554857984 m³ and 1 lb = 0.45359237 kg. Distinguish metric tonnes from US short tons and UK long tons. Converting a cubic metre of loose aggregate to mass needs a product-specific bulk density; do not invent one.

Calculate the payable order with explicit supplier rules: complete pack quantities, volume/weight minimums, per-order or per-truck delivery, travel basis, small-load charges, fuel and other mandatory surcharges, pumping where requested, unloading allowances, applicable taxes and eligible discounts. Keep each fee's inclusion status so it is counted once. If quotes are already gross, do not add tax again. A quote with an unknown mandatory component is not a confirmed complete total.

Compare the same basket and compatible specs. A multi-supplier basket needs separate dispatch fees for each supplier and a supported delivery plan; do not call a greedy per-item selection globally optimal. If full basket optimization is implemented, account for fixed dispatch and pack constraints and distinguish an exact solution from a heuristic.

Keep original local-currency values; optional display-currency conversion requires an actual dated FX source. If FX is unavailable, keep separate currencies. Research timestamps are not price-validity dates. Expired quotations and historical/guide prices remain visible as clearly labelled references and cannot win a confirmed-price badge.

## 6. Cheapest, nearest and recommended are different results

Add sorting controls: **Recommended**, **Lowest delivered total**, **Nearest**, and **Highest reviewed**.

- **Lowest delivered total**: among the compared offers that match the order and have confirmed complete costs. Use precise text such as **Lowest confirmed delivered total among matched offers**. Published price estimates can be compared in a separately labelled estimate mode only when their full basis is compatible.
- **Nearest**: among verified branches that can supply the requested product and serve the jobsite. Use route distance where possible; do not claim route-based ordering from straight-line distances.
- **Recommended**: choose among eligible, compatible offers with a complete known order cost, confirmed serviceability and sufficient data. Start with configurable weights of 65% delivered cost, 20% travel, 10% genuine review evidence, and 5% quote freshness. Normalize consistently within the same candidate cohort, handle ties deterministically and return the score breakdown. These weights are product policy, not external facts. If a component is unavailable for any candidate, use a consistent reduced-component comparison for the cohort and disclose it; do not silently give one new supplier a zero-star penalty. With too little evidence, omit the recommendation.

For ranking reviews, support a documented Bayesian adjustment using a real cohort prior; show the actual public mean and count separately. Do not invent prior customer reviews or expose the adjusted score as the observed customer rating.

Explain the recommendation in concrete terms drawn from real data, such as lower delivered cost, shorter supported route or stronger review evidence. Cheapest and nearest can be different suppliers. A lone compatible result is **Only matched offer**, not proof of the cheapest or best national option. Sponsored placement, if added later, must be visibly separate from this ranking.

## 7. Genuine reviews and material information

Implement authenticated AstraMix reviews with separate **Service experience** and **Material experience** scores, a review count, timestamp, moderation state and anti-duplicate controls. Mark **Verified purchase** only when an actual order or manually validated purchase reference supports it. Do not expose private purchase evidence publicly. Material experience ratings do not certify strength, standards compliance or safety; show technical datasheets/certificates separately.

Start with an empty review table. Do not seed random stars, AI-written customer testimonials, user counts or “verified supplier” badges. If external ratings are connected through a supported API, label the provider, preserve required attribution, respect current caching/display terms and keep that provider's store rating separate from AstraMix service/material ratings. Do not scrape Google Maps reviews or present an overall shop rating as a concrete-material quality rating.

## 8. Import the research honestly and build a maintainable data path

Load the supplied JSON into a staging/import workflow. The country registry is a sourced starting directory with partial price coverage. It does not establish current prices, local branches or independent competitors throughout every listed country. Preserve all source IDs, status flags, caveats and nulls. Country-count marketing must distinguish directory coverage, public price coverage and connected live offers.

Model at least: countries/regions, suppliers, actual branches, products/specifications, price observations, supplier quotations, delivery rules, review records, material emission factors, reference cohorts and audit/version records. Country leads and historical benchmark rows must have distinct types from active purchasable offers. Never create a supplier record from a government cost schedule.

Provide a protected administrator workflow or CLI to import/update supplier data, confirm branches, attach supplier quotes with validity periods, record original units/tax/fees, map compatible materials, add delivery areas and approve reviews. Restrict all writes by role and validate uploaded/imported data. Do not expose an unauthenticated administrative endpoint. Add import deduplication and updates without silently overwriting provenance.

Add provider adapters for optional geocoding/routes/business listings and supplier feeds. Reuse existing supported providers when possible. API keys belong in server-side environment variables, with quotas, timeouts and useful error states. Do not hardcode secrets or assume paid APIs are configured. The source-linked directory, manual location entry, price observations and quote workflow must remain usable when external providers are unavailable. Obey source/API access terms; public visibility alone does not establish bulk scraping permission.

Do not fetch all countries on every customer page load. Index/filter locally, paginate results, and refresh feeds through an explicit job mechanism. Prioritize deeper branch/catalogue coverage for Armenia, then selected US and Canadian cities. Never silently fill gaps with another country's prices or worldwide random multipliers.

## 9. Acceptance checks

Add meaningful automated checks appropriate to the implementation and run the repository's required validation. At minimum demonstrate:

1. The old prediction/optimization flows still work; canonical model feature order and units remain correct.
2. Boundary inputs work; just-outside values, NaN/infinity, missing required inputs and fractional days fail through both form and direct API calls.
3. Optimizer failure/infeasibility and returned-constraint failures never appear as a successful optimum.
4. No compatible reference yields neutral comparison; incompatible ready-mix/ingredient or emissions boundaries are rejected; percentile comparison requires enough independent data.
5. A missing ingredient price produces an incomplete estimate, not a zero or green badge.
6. US per-yard conversion, whole-bag rounding and multi-dispatch fees calculate correctly; taxes or delivery cannot be counted twice.
7. Unknown mandatory fees, expired quotes and unconfirmed research snapshots cannot win the confirmed-cheapest badge.
8. A more distant supplier can beat a nearer one on complete delivered cost; nearest sorting uses only appropriate verified branches.
9. Country offices have no shop marker or distance rank. Location/API denial produces a useful manual/directory fallback.
10. Empty reviews remain empty; external store ratings do not populate product-quality stars; unverified purchases cannot receive a verified-purchase label.
11. Recommendation rules handle missing reviews, tied offers and one/no offer without fabricated certainty.
12. Administrative writes, quote confirmation and review moderation are protected; untrusted text is escaped; supplier links and API inputs are validated.

Keep test fixtures clearly separate from public production data. Provide mobile and desktop screenshots of the implemented UI, the commands/checks run, a concise change summary, and any remaining credential/data dependencies. Complete what can be implemented with the repository and supplied data; do not hide missing integrations behind fake live results.

## 10. Deliver the implementation

Implement this end to end in reviewable increments: repository inspection and data schema; shared validation and result cards; staged country/price import; marketplace search and honest price calculation; branch/provider integration; genuine reviews and recommendation logic; regression and acceptance validation. Include migration/rollback instructions and a short administrator guide for adding real supplier quotes and branches. Clearly distinguish a tested implementation from the extra commercial data needed to populate it. Leave production deployment for separate authorization.
