# Use this package in Antigravity

1. Open the actual AstraMix source repository in Antigravity.
2. Attach this folder's files or give the agent access to the extracted folder.
3. Copy the complete contents of `Antigravity_Prompt.md` into its task prompt.
4. Ask it to read the research files before implementation and keep its work reviewable.

`market_seed.json` is importable research data, with supplier leads and explicitly unconfirmed price observations. `sources.json` holds the evidence and limitations. `Research_Brief.md` lists the countries and prices in readable tables. `input_bounds_reference.json` contains calculated ranges from the original UCI reference dataset. `validation_report.json` checks data integrity.

This package does not contain a website implementation. Production supplier feeds, branch coordinates, stock, real reviews and supplier-confirmed delivered quotations still need to be connected. Nothing in these files turns a prediction into a certified construction specification.

Research date: 2026-10-17. Keep the source dates, original units/currencies, uncertainty flags, and nulls when importing. Shared price conditions are stored in each supplier's `shared_pricing_notes` where several products use them.
