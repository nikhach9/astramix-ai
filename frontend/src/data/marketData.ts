/**
 * Legacy static supplier ratings have been retired in favor of the audited
 * Materials Market database and `/api/v1/market/*` endpoints seeded from
 * `market_seed.json` and `sources.json`.
 *
 * Customer ratings start empty (0 fabricated ratings) and only reflect
 * verified, moderated customer reviews.
 */
export const DEPRECATED_STATIC_MARKET_NOTICE =
  "Use /api/v1/market/overview and /api/v1/market/search for verified supplier and price snapshot data.";

export const CARBON_TRANSPARENCY_META: Record<
  string,
  {
    material: string;
    factorKgCO2PerKg: number;
    unit: string;
    source: string;
    region: string;
    confidence: { lastUpdated: string };
  }
> = {
  cement: {
    material: "Portland Cement (CEM I / CEM II)",
    factorKgCO2PerKg: 0.9,
    unit: "kg CO₂e / kg",
    source: "ICE Database v3.0 & GCCA Cradle-to-Gate (A1–A3)",
    region: "Global / Regional Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  blast_furnace_slag: {
    material: "Ground Granulated Blast-Furnace Slag (GGBS)",
    factorKgCO2PerKg: 0.08,
    unit: "kg CO₂e / kg",
    source: "ICE Database v3.0 (A1–A3)",
    region: "Global / Regional Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  fly_ash: {
    material: "Fly Ash (Pulverised Fuel Ash)",
    factorKgCO2PerKg: 0.01,
    unit: "kg CO₂e / kg",
    source: "ICE Database v3.0 (A1–A3)",
    region: "Global / Regional Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  superplasticizer: {
    material: "Superplasticizer Admixture (EFCA Reference)",
    factorKgCO2PerKg: 1.88,
    unit: "kg CO₂e / kg",
    source: "EFCA Environmental Declaration (A1–A3)",
    region: "European / International Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  coarse_aggregate: {
    material: "Coarse Aggregate (Crushed Stone / Gravel)",
    factorKgCO2PerKg: 0.005,
    unit: "kg CO₂e / kg",
    source: "ICE Database v3.0 (A1–A3)",
    region: "Global / Regional Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  fine_aggregate: {
    material: "Fine Aggregate (Concrete Sand)",
    factorKgCO2PerKg: 0.005,
    unit: "kg CO₂e / kg",
    source: "ICE Database v3.0 (A1–A3)",
    region: "Global / Regional Reference",
    confidence: { lastUpdated: "2026-04" },
  },
  water: {
    material: "Mixing Water",
    factorKgCO2PerKg: 0.001,
    unit: "kg CO₂e / kg",
    source: "Municipal Supply Treatment & Pumping Reference (A1–A3)",
    region: "Global Reference",
    confidence: { lastUpdated: "2026-04" },
  },
};
