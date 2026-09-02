import {
  CementType,
  ConcreteMixInput,
  EmissionFactorMeta,
  MaterialConfidence,
  ProjectPreset,
  SupplierOffer,
} from "@/types/concrete";

export interface MaterialMeta {
  id: string;
  name: string;
  category: 'CEMENT' | 'SAND' | 'AGGREGATE' | 'WATER' | 'REBAR';
  unit: string;
  carbonKgPerUnit: number;
  bulkPriceAMD: number;
  baggedPriceAMD?: number;
  densityKgPerM3: number;
  confidence: MaterialConfidence;
  bounds: {
    hardMin: number;
    goodMin: number;
    goodMax: number;
    hardMax: number;
  };
}

export const CEMENT_PROPERTIES: Record<
  CementType,
  {
    name: string;
    grade: string;
    origin: string;
    carbonKgPerKg: number;
    avgBagPriceAMD: number;
    avgBulkTonAMD: number;
    description: string;
    confidence: MaterialConfidence;
    bagBounds: { hardMin: number; goodMin: number; goodMax: number; hardMax: number };
    bulkBounds: { hardMin: number; goodMin: number; goodMax: number; hardMax: number };
  }
> = {
  ararat_m400: {
    name: "Ararat M400",
    grade: "M400 / CEM I 42.5N",
    origin: "Armenia (Local Ararat Cement Plant)",
    carbonKgPerKg: 0.82,
    avgBagPriceAMD: 2850,
    avgBulkTonAMD: 52000,
    description: "Standard local Armenian Portland cement. Excellent general-purpose strength for foundations and slabs.",
    confidence: {
      level: "high",
      label: "Reference Armenian Market Estimate",
      source: "Ararat Cement Price Survey Q3 2026",
      lastUpdated: "2026-08-15",
    },
    bagBounds: { hardMin: 1000, goodMin: 2200, goodMax: 3200, hardMax: 6000 },
    bulkBounds: { hardMin: 25000, goodMin: 45000, goodMax: 59000, hardMax: 90000 },
  },
  iranian_m500: {
    name: "Iranian M500",
    grade: "M500 / CEM I 52.5R",
    origin: "Iran (Imported via Megri Customs)",
    carbonKgPerKg: 0.91,
    avgBagPriceAMD: 3850,
    avgBulkTonAMD: 62000,
    description: "High-grade rapid hardening imported Iranian cement. Ideal for high-load structural columns and beams.",
    confidence: {
      level: "high",
      label: "Reference Armenian Market Estimate",
      source: "Armenian Construction Hardware Index 2026",
      lastUpdated: "2026-08-20",
    },
    bagBounds: { hardMin: 1500, goodMin: 3200, goodMax: 4300, hardMax: 7500 },
    bulkBounds: { hardMin: 30000, goodMin: 55000, goodMax: 68000, hardMax: 100000 },
  },
};

export const MATERIALS_DATA: Record<string, MaterialMeta> = {
  sand: {
    id: "sand",
    name: "Sand (0–5mm / 0–8mm)",
    category: "SAND",
    unit: "kg",
    carbonKgPerUnit: 0.005,
    bulkPriceAMD: 8000 / 1500, // ~5.33 AMD/kg bulk (8,000 AMD per m3)
    baggedPriceAMD: 350 / 25,  // 14 AMD/kg bagged (350 AMD / 25kg bag)
    densityKgPerM3: 1500,
    confidence: {
      level: "high",
      label: "Reference Armenian Market Estimate",
      source: "Ararat River Quarry Index 2026",
      lastUpdated: "2026-08-01",
    },
    bounds: { hardMin: 3000, goodMin: 6500, goodMax: 10000, hardMax: 20000 }, // per m3
  },
  gravel: {
    id: "gravel",
    name: "Crushed Stone / Gravel (5–15mm)",
    category: "AGGREGATE",
    unit: "kg",
    carbonKgPerUnit: 0.008,
    bulkPriceAMD: 7500 / 1450, // ~5.17 AMD/kg bulk (7,500 AMD per m3)
    baggedPriceAMD: 250 / 25,  // 10 AMD/kg bagged (250 AMD / 25kg bag)
    densityKgPerM3: 1450,
    confidence: {
      level: "high",
      label: "Reference Armenian Market Estimate",
      source: "Kotayk Quarry Survey 2026",
      lastUpdated: "2026-08-01",
    },
    bounds: { hardMin: 3000, goodMin: 6000, goodMax: 9500, hardMax: 18000 }, // per m3
  },
  water: {
    id: "water",
    name: "Water (Veolia Jur)",
    category: "WATER",
    unit: "L",
    carbonKgPerUnit: 0.0003,
    bulkPriceAMD: 0.2, // 200 AMD / 1,000 Liters (200 AMD/m3)
    densityKgPerM3: 1000,
    confidence: {
      level: "high",
      label: "Official Public Utility Tariff",
      source: "Veolia Jur Public Tariff 2026",
      lastUpdated: "2026-01-01",
    },
    bounds: { hardMin: 50, goodMin: 120, goodMax: 400, hardMax: 1500 }, // per m3
  },
  rebar: {
    id: "rebar",
    name: "Steel Rebar (A500C / A3)",
    category: "REBAR",
    unit: "kg",
    carbonKgPerUnit: 1.85,
    bulkPriceAMD: 340, // 340 AMD/kg
    densityKgPerM3: 7850,
    confidence: {
      level: "high",
      label: "Armenian Steel Import Survey",
      source: "Yerevan Hardware Index 2026",
      lastUpdated: "2026-08-10",
    },
    bounds: { hardMin: 150, goodMin: 290, goodMax: 420, hardMax: 800 }, // per kg
  },
};

export const CARBON_TRANSPARENCY_META: Record<string, EmissionFactorMeta> = {
  cement_ararat: {
    material: "Ararat M400 Cement",
    factorKgCO2PerKg: 0.82,
    unit: "kg CO₂e / kg cement",
    source: "Global Cement & Concrete Association (GCCA) Baseline calibrated for Caucasus regional grid",
    region: "Armenia / Caucasus",
    confidence: {
      level: "high",
      label: "Verified Industry Baseline",
      source: "GCCA / EPD Regional Estimate",
      lastUpdated: "2026-05-10",
    },
  },
  cement_iranian: {
    material: "Iranian M500 Cement",
    factorKgCO2PerKg: 0.91,
    unit: "kg CO₂e / kg cement",
    source: "Import transport footprint + natural gas kiln clinker intensity",
    region: "Iran / Import Border",
    confidence: {
      level: "estimated",
      label: "Estimated Import Profile",
      source: "LCA Literature for Middle East Clinker",
      lastUpdated: "2026-04-12",
    },
  },
  sand: {
    material: "River Sand Aggregate",
    factorKgCO2PerKg: 0.005,
    unit: "kg CO₂e / kg sand",
    source: "Quarry extraction & washing power baseline",
    region: "Armenia",
    confidence: {
      level: "high",
      label: "Standard Aggregate Factor",
      source: "ICE Inventory of Carbon and Energy v3.0",
      lastUpdated: "2026-01-15",
    },
  },
  gravel: {
    material: "Crushed Basalt Stone",
    factorKgCO2PerKg: 0.008,
    unit: "kg CO₂e / kg gravel",
    source: "Mechanical crushing & screening energy intensity",
    region: "Armenia",
    confidence: {
      level: "high",
      label: "Standard Aggregate Factor",
      source: "ICE Inventory of Carbon and Energy v3.0",
      lastUpdated: "2026-01-15",
    },
  },
  water: {
    material: "Municipal Water",
    factorKgCO2PerKg: 0.0003,
    unit: "kg CO₂e / L water",
    source: "Pumping & distribution power grid emission factor",
    region: "Armenia",
    confidence: {
      level: "high",
      label: "Public Grid Water LCA",
      source: "Veolia Sustainability Report",
      lastUpdated: "2026-02-01",
    },
  },
  rebar: {
    material: "Hot-Rolled Steel Rebar A500C",
    factorKgCO2PerKg: 1.85,
    unit: "kg CO₂e / kg rebar",
    source: "Electric Arc Furnace (EAF) steelmaking baseline with scrap recycle ratio",
    region: "Regional Imports",
    confidence: {
      level: "high",
      label: "World Steel Association Baseline",
      source: "WorldSteel EPD Database 2026",
      lastUpdated: "2026-03-20",
    },
  },
};

export const SUPPLIER_OFFERS: SupplierOffer[] = [
  {
    id: "fastshin_ararat",
    name: "FastShin (Արարատ Ցեմենտ)",
    cementType: "ararat_m400",
    pricePerBagAMD: 2600,
    pricePerTonBulkAMD: 51000,
    deliveryFeeAMD: 5000,
    isLocal: true,
    rating: 4.9,
    inStock: true,
    location: "Yerevan, Nor Nork",
  },
  {
    id: "shinshin_ararat",
    name: "ShinShin.am",
    cementType: "ararat_m400",
    pricePerBagAMD: 2850,
    pricePerTonBulkAMD: 53500,
    deliveryFeeAMD: 4500,
    isLocal: true,
    rating: 4.7,
    inStock: true,
    location: "Yerevan, Shengavit",
  },
  {
    id: "domino_ararat",
    name: "Domino.am Hardware",
    cementType: "ararat_m400",
    pricePerBagAMD: 2900,
    pricePerTonBulkAMD: 54000,
    deliveryFeeAMD: 4000,
    isLocal: true,
    rating: 4.8,
    inStock: true,
    location: "Yerevan, Davtashen",
  },
  {
    id: "onlineshin_ararat",
    name: "OnlineShinanyut.am",
    cementType: "ararat_m400",
    pricePerBagAMD: 2900,
    pricePerTonBulkAMD: 54000,
    deliveryFeeAMD: 3500,
    isLocal: true,
    rating: 4.5,
    inStock: true,
    location: "Yerevan, Malatia",
  },
  {
    id: "shinshin_iran",
    name: "ShinShin.am (Iranian M500)",
    cementType: "iranian_m500",
    pricePerBagAMD: 3850,
    pricePerTonBulkAMD: 62000,
    deliveryFeeAMD: 4500,
    isLocal: false,
    rating: 4.9,
    inStock: true,
    location: "Yerevan, Erebuni",
  },
  {
    id: "ararat_trade_iran",
    name: "Ararat Trade Importers (M500)",
    cementType: "iranian_m500",
    pricePerBagAMD: 3700,
    pricePerTonBulkAMD: 60000,
    deliveryFeeAMD: 6000,
    isLocal: false,
    rating: 4.6,
    inStock: true,
    location: "Megri / Yerevan Hub",
  },
];

export const PROJECT_PRESETS: Record<
  ProjectPreset,
  {
    name: string;
    description: string;
    recommendedGrade: string;
    targetStrengthMPa: number;
    input: ConcreteMixInput;
  }
> = {
  foundation: {
    name: "Building Foundation / Slab",
    description: "Heavy structural load. Requires high strength (B25 / M350) and low water permeability.",
    recommendedGrade: "B25 / M350",
    targetStrengthMPa: 35,
    input: {
      volumeM3: 24,
      cementKg: 360,
      waterLiters: 180,
      sandKg: 750,
      gravelKg: 1050,
      cementType: "ararat_m400",
      packaging: "bulk",
      rebarKgPerM3: 45,
      rebarDiameterMm: 12,
      wastagePercent: 5,
      targetStrengthMPa: 35,
      priority: "balanced",
      weights: { cost: 40, carbon: 30, consumption: 20, performance: 10 },
      prices: {
        cementType: "ararat_m400",
        cementPriceAMD: 2900,
        cementUnit: "AMD/50kg",
        sandPriceAMD: 8000,
        sandUnit: "AMD/m3",
        sandPackaging: "bulk",
        gravelPriceAMD: 7500,
        gravelUnit: "AMD/m3",
        gravelPackaging: "bulk",
        waterPriceAMD: 200,
        waterUnit: "AMD/m3",
        rebarPriceAMD: 340,
        rebarUnit: "AMD/kg",
        rebarDiameterMm: 12,
      },
    },
  },
  driveway: {
    name: "Driveway & Yard Pavement",
    description: "High freeze-thaw and abrasion resistance. Optimized for heavy vehicular traffic (B30 / M400).",
    recommendedGrade: "B30 / M400",
    targetStrengthMPa: 40,
    input: {
      volumeM3: 10,
      cementKg: 400,
      waterLiters: 180,
      sandKg: 700,
      gravelKg: 1080,
      cementType: "iranian_m500",
      packaging: "bulk",
      rebarKgPerM3: 25,
      rebarDiameterMm: 10,
      wastagePercent: 4,
      targetStrengthMPa: 40,
      priority: "balanced",
      weights: { cost: 40, carbon: 30, consumption: 20, performance: 10 },
      prices: {
        cementType: "iranian_m500",
        cementPriceAMD: 3850,
        cementUnit: "AMD/50kg",
        sandPriceAMD: 8000,
        sandUnit: "AMD/m3",
        sandPackaging: "bulk",
        gravelPriceAMD: 7500,
        gravelUnit: "AMD/m3",
        gravelPackaging: "bulk",
        waterPriceAMD: 200,
        waterUnit: "AMD/m3",
        rebarPriceAMD: 340,
        rebarUnit: "AMD/kg",
        rebarDiameterMm: 10,
      },
    },
  },
  retaining_wall: {
    name: "Retaining Wall / Slope Support",
    description: "Monolithic reinforced concrete resistant to lateral soil pressures and moisture.",
    recommendedGrade: "B25 / M350",
    targetStrengthMPa: 35,
    input: {
      volumeM3: 15,
      cementKg: 370,
      waterLiters: 185,
      sandKg: 740,
      gravelKg: 1040,
      cementType: "ararat_m400",
      packaging: "bulk",
      rebarKgPerM3: 50,
      rebarDiameterMm: 16,
      wastagePercent: 5,
      targetStrengthMPa: 35,
      priority: "cheapest",
      weights: { cost: 60, carbon: 20, consumption: 10, performance: 10 },
      prices: {
        cementType: "ararat_m400",
        cementPriceAMD: 2850,
        cementUnit: "AMD/50kg",
        sandPriceAMD: 8000,
        sandUnit: "AMD/m3",
        sandPackaging: "bulk",
        gravelPriceAMD: 7500,
        gravelUnit: "AMD/m3",
        gravelPackaging: "bulk",
        waterPriceAMD: 200,
        waterUnit: "AMD/m3",
        rebarPriceAMD: 340,
        rebarUnit: "AMD/kg",
        rebarDiameterMm: 16,
      },
    },
  },
  interior_slab: {
    name: "Interior Floor Screed / Non-Load Wall",
    description: "Lightweight interior screed or walkway paving (B20 / M250).",
    recommendedGrade: "B20 / M250",
    targetStrengthMPa: 25,
    input: {
      volumeM3: 5,
      cementKg: 310,
      waterLiters: 170,
      sandKg: 800,
      gravelKg: 1000,
      cementType: "ararat_m400",
      packaging: "bagged",
      rebarKgPerM3: 10,
      rebarDiameterMm: 8,
      wastagePercent: 3,
      targetStrengthMPa: 25,
      priority: "lowest_co2",
      weights: { cost: 20, carbon: 60, consumption: 10, performance: 10 },
      prices: {
        cementType: "ararat_m400",
        cementPriceAMD: 2900,
        cementUnit: "AMD/50kg",
        sandPriceAMD: 350,
        sandUnit: "AMD/25kg",
        sandPackaging: "bagged",
        gravelPriceAMD: 250,
        gravelUnit: "AMD/25kg",
        gravelPackaging: "bagged",
        waterPriceAMD: 200,
        waterUnit: "AMD/m3",
        rebarPriceAMD: 340,
        rebarUnit: "AMD/kg",
        rebarDiameterMm: 8,
      },
    },
  },
};

export const MARKET_BASELINE = {
  costPerM3AMD: 35500, // Average unoptimized retail ready-mix / manual jobsite mix cost in Armenia per m3
  co2PerM3Kg: 335,     // Average embodied carbon footprint per m3
};
