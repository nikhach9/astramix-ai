export type AppMode = 'quick' | 'optimizer';

export type CementType = 'ararat_m400' | 'iranian_m500';

export type PackagingType = 'bulk' | 'bagged';

export type MaterialCategory = 'CEMENT' | 'SAND' | 'AGGREGATE' | 'WATER' | 'REBAR' | 'ADMIXTURE';

export type RebarDiameter = 8 | 10 | 12 | 16 | 20 | 25 | 32;

export type PriceUnit =
  | 'AMD/50kg'
  | 'AMD/25kg'
  | 'AMD/kg'
  | 'AMD/tonne'
  | 'AMD/m3'
  | 'AMD/liter'
  | 'AMD/meter';

export type ProjectPreset = 'foundation' | 'driveway' | 'retaining_wall' | 'interior_slab';

export type OptimizationPriority = 'cheapest' | 'lowest_co2' | 'lowest_consumption' | 'balanced' | 'custom';

export type SortMode = 'best_overall' | 'cheapest' | 'eco_greenest' | 'max_durability';

export type ValidationStatus = 'green' | 'amber' | 'red';

export interface ValidationRule {
  status: ValidationStatus;
  message: string;
  tooltip: string;
  code?: 'SUSPICIOUS_LOW' | 'HIGH_PRICE' | 'TYPICAL' | 'ENGINEERING_WARN' | 'ENGINEERING_ERROR';
}

export interface SmartInputValidation {
  status: ValidationStatus;
  message: string;
  suggestion?: string;
  referenceRangeText?: string;
}

export interface MixValidation {
  overallStatus: ValidationStatus;
  waterCementRatio: number;
  waterCementValidation: ValidationRule;
  cementContentValidation: ValidationRule;
  sandRatio: number;
  sandRatioValidation: ValidationRule;
  volumeValidation: SmartInputValidation;
  wastageValidation: SmartInputValidation;
  isExecutable: boolean;
  warnings: string[];
}

export interface MaterialPriceConfig {
  cementType: CementType;
  cementPriceAMD: number;
  cementUnit: PriceUnit;
  sandPriceAMD: number;
  sandUnit: PriceUnit;
  sandPackaging: PackagingType;
  gravelPriceAMD: number;
  gravelUnit: PriceUnit;
  gravelPackaging: PackagingType;
  waterPriceAMD: number;
  waterUnit: PriceUnit;
  rebarPriceAMD: number;
  rebarUnit: PriceUnit;
  rebarDiameterMm: RebarDiameter;
}

export interface SupplierOffer {
  id: string;
  name: string;
  cementType: CementType;
  pricePerBagAMD: number; // 50kg bag
  pricePerTonBulkAMD: number;
  deliveryFeeAMD: number;
  isLocal: boolean;
  rating: number; // 1 - 5
  inStock: boolean;
  location: string;
}

export interface ConcreteMixInput {
  volumeM3: number;
  cementKg: number;
  waterLiters: number;
  sandKg: number;
  gravelKg: number;
  cementType: CementType;
  packaging: PackagingType;
  rebarKgPerM3: number;
  rebarDiameterMm: RebarDiameter;
  wastagePercent: number;
  prices: MaterialPriceConfig;
  targetStrengthMPa: number;
  maxCostPerM3AMD?: number;
  maxTotalBudgetAMD?: number;
  maxCO2PerM3Kg?: number;
  maxTotalCO2Kg?: number;
  weights: {
    cost: number;
    carbon: number;
    consumption: number;
    performance: number;
  };
  priority: OptimizationPriority;
}

export interface CostBreakdown {
  cementAMD: number;
  sandAMD: number;
  gravelAMD: number;
  waterAMD: number;
  rebarAMD: number;
  deliveryAMD: number;
  totalAMD: number;
  costPerM3AMD: number;
}

export interface CarbonBreakdown {
  cementCO2: number;
  sandCO2: number;
  gravelCO2: number;
  waterCO2: number;
  rebarCO2: number;
  totalCO2: number;
  co2PerM3: number;
}

export interface OrderBreakdown {
  calculatedCementKg: number;
  purchasableCementBags50kg: number;
  calculatedSandKg: number;
  purchasableSandBags25kg: number;
  sandVolumeM3: number;
  calculatedGravelKg: number;
  purchasableGravelBags25kg: number;
  gravelVolumeM3: number;
  waterLiters: number;
  calculatedRebarKg: number;
  rebarMeters: number;
  truckloads: number;
  volumeM3: number;
  effectiveVolumeM3: number;
}

export interface StrengthForecast {
  strengthMPa: number;
  strengthPSI: number;
  gostClass: string; // e.g. "B25 / M350"
  description: string;
}

export interface CandidateMix {
  id: string;
  title: string;
  supplierName: string;
  cementType: CementType;
  packaging: PackagingType;
  input: ConcreteMixInput;
  cost: CostBreakdown;
  carbon: CarbonBreakdown;
  strength: StrengthForecast;
  order: OrderBreakdown;
  validation: MixValidation;
  isFeasible: boolean;
  costTrafficLight: ValidationStatus;
  carbonTrafficLight: ValidationStatus;
  consumptionTrafficLight: ValidationStatus;
  feasibilityTrafficLight: ValidationStatus;
  score: number; // 0 - 100
  badges: {
    isBestOverall: boolean;
    isCheapest: boolean;
    isLowestCarbon: boolean;
    isLowestConsumption: boolean;
  };
  reasons: string[];
}

export interface ConcreteResult extends CandidateMix {
  supplier: SupplierOffer;
  kayakScore: number;
}

export interface MarketSavingsDelta {
  costSavedAMD: number;
  carbonSavedKg: number;
  percentCostSaved: number;
  percentCarbonSaved: number;
}

export interface MaterialConfidence {
  level: 'high' | 'estimated' | 'unverified';
  label: string;
  source: string;
  lastUpdated: string;
}

export interface EmissionFactorMeta {
  material: string;
  factorKgCO2PerKg: number;
  unit: string;
  source: string;
  region: string;
  confidence: MaterialConfidence;
}
