import { CementType, ConcreteMixInput, ProjectPreset, SupplierOffer } from "@/types/concrete";

export interface MaterialMeta {
  name: string;
  unit: string;
  carbonKgPerUnit: number;
  bulkPriceAMD: number;
  baggedPriceAMD?: number;
  densityKgPerM3: number;
}

export const CEMENT_PROPERTIES: Record<CementType, {
  name: string;
  grade: string;
  origin: string;
  carbonKgPerKg: number;
  avgBagPriceAMD: number;
  avgBulkTonAMD: number;
  description: string;
}> = {
  ararat_m400: {
    name: 'Ararat M400',
    grade: 'M400 / CEM I 42.5N',
    origin: 'Armenia (Local)',
    carbonKgPerKg: 0.82,
    avgBagPriceAMD: 2800,
    avgBulkTonAMD: 52000,
    description: 'Local Armenian Portland cement from Ararat Cement Plant. Standard choice for housing & foundations.',
  },
  iranian_m500: {
    name: 'Iranian M500',
    grade: 'M500 / CEM I 52.5R',
    origin: 'Iran (Imported)',
    carbonKgPerKg: 0.91,
    avgBagPriceAMD: 3850,
    avgBulkTonAMD: 62000,
    description: 'High-grade rapid hardening imported Iranian cement. Preferred for high-load structural elements.',
  },
};

export const MATERIALS_DATA: Record<string, MaterialMeta> = {
  sand: {
    name: 'Sand (0–5mm / 0–8mm)',
    unit: 'kg',
    carbonKgPerUnit: 0.005,
    bulkPriceAMD: 8000 / 1500, // ~5.33 AMD/kg bulk (8,000 AMD per m3)
    baggedPriceAMD: 350 / 25,  // 14 AMD/kg bagged (350 AMD / 25kg bag)
    densityKgPerM3: 1500,
  },
  gravel: {
    name: 'Crushed Stone / Gravel (5–15mm)',
    unit: 'kg',
    carbonKgPerUnit: 0.008,
    bulkPriceAMD: 7500 / 1450, // ~5.17 AMD/kg bulk (7,500 AMD per m3)
    baggedPriceAMD: 250 / 25,  // 10 AMD/kg bagged (250 AMD / 25kg bag)
    densityKgPerM3: 1450,
  },
  water: {
    name: 'Water (Veolia Jur)',
    unit: 'L',
    carbonKgPerUnit: 0.0003,
    bulkPriceAMD: 0.2, // 200 AMD / 1,000 Liters
    densityKgPerM3: 1000,
  },
  rebar: {
    name: 'Steel Rebar (A500C/A3)',
    unit: 'kg',
    carbonKgPerUnit: 1.85,
    bulkPriceAMD: 340, // 340 AMD/kg
    densityKgPerM3: 7850,
  },
};

export const SUPPLIER_OFFERS: SupplierOffer[] = [
  {
    id: 'fastshin_ararat',
    name: 'FastShin (Արարատ Ցեմենտ)',
    cementType: 'ararat_m400',
    pricePerBagAMD: 2600,
    pricePerTonBulkAMD: 52000,
    deliveryFeeAMD: 5000,
    isLocal: true,
    rating: 4.9,
    inStock: true,
    location: 'Yerevan, Nor Nork',
  },
  {
    id: 'shinshin_ararat',
    name: 'ShinShin.am',
    cementType: 'ararat_m400',
    pricePerBagAMD: 2850,
    pricePerTonBulkAMD: 53500,
    deliveryFeeAMD: 4500,
    isLocal: true,
    rating: 4.7,
    inStock: true,
    location: 'Yerevan, Shengavit',
  },
  {
    id: 'domino_ararat',
    name: 'Domino.am Hardware',
    cementType: 'ararat_m400',
    pricePerBagAMD: 2900,
    pricePerTonBulkAMD: 54000,
    deliveryFeeAMD: 4000,
    isLocal: true,
    rating: 4.8,
    inStock: true,
    location: 'Yerevan, Davtashen',
  },
  {
    id: 'onlineshin_ararat',
    name: 'OnlineShinanyut.am',
    cementType: 'ararat_m400',
    pricePerBagAMD: 2900,
    pricePerTonBulkAMD: 54000,
    deliveryFeeAMD: 3500,
    isLocal: true,
    rating: 4.5,
    inStock: true,
    location: 'Yerevan, Malatia',
  },
  {
    id: 'shinshin_iran',
    name: 'ShinShin.am (Iranian M500)',
    cementType: 'iranian_m500',
    pricePerBagAMD: 3850,
    pricePerTonBulkAMD: 62000,
    deliveryFeeAMD: 4500,
    isLocal: false,
    rating: 4.9,
    inStock: true,
    location: 'Yerevan, Erebuni',
  },
  {
    id: 'ararat_trade_iran',
    name: 'Ararat Trade Importers (M500)',
    cementType: 'iranian_m500',
    pricePerBagAMD: 3700,
    pricePerTonBulkAMD: 60000,
    deliveryFeeAMD: 6000,
    isLocal: false,
    rating: 4.6,
    inStock: true,
    location: 'Megri / Yerevan Hub',
  },
];

export const PROJECT_PRESETS: Record<ProjectPreset, {
  name: string;
  description: string;
  recommendedGrade: string;
  input: ConcreteMixInput;
}> = {
  foundation: {
    name: 'Building Foundation / Slab',
    description: 'Heavy structural load. Requires high strength (B25 / M350) and low water permeability.',
    recommendedGrade: 'B25 / M350',
    input: {
      volumeM3: 10,
      cementKg: 360,
      waterLiters: 180,
      sandKg: 750,
      gravelKg: 1050,
      cementType: 'ararat_m400',
      packaging: 'bulk',
      rebarKgPerM3: 45,
    },
  },
  driveway: {
    name: 'Driveway & Yard Pavement',
    description: 'High freeze-thaw and abrasion resistance. Optimized for heavy vehicular traffic (B30 / M400).',
    recommendedGrade: 'B30 / M400',
    input: {
      volumeM3: 5,
      cementKg: 400,
      waterLiters: 180,
      sandKg: 700,
      gravelKg: 1080,
      cementType: 'iranian_m500',
      packaging: 'bulk',
      rebarKgPerM3: 25,
    },
  },
  retaining_wall: {
    name: 'Retaining Wall / Slope Support',
    description: 'Monolithic reinforced concrete resistant to lateral soil pressures and moisture.',
    recommendedGrade: 'B25 / M350',
    input: {
      volumeM3: 8,
      cementKg: 370,
      waterLiters: 185,
      sandKg: 740,
      gravelKg: 1040,
      cementType: 'ararat_m400',
      packaging: 'bulk',
      rebarKgPerM3: 50,
    },
  },
  interior_slab: {
    name: 'Interior Floor Screed / Non-Load Wall',
    description: 'Lightweight interior screed or walkway paving (B20 / M250).',
    recommendedGrade: 'B20 / M250',
    input: {
      volumeM3: 3,
      cementKg: 310,
      waterLiters: 170,
      sandKg: 800,
      gravelKg: 1000,
      cementType: 'ararat_m400',
      packaging: 'bagged',
      rebarKgPerM3: 10,
    },
  },
};

export const MARKET_BASELINE = {
  costPerM3AMD: 35500, // Average unoptimized retail mix cost in Armenia per m3
  co2PerM3Kg: 335,     // Average carbon footprint per m3
};
