export type CementType = 'ararat_m400' | 'iranian_m500';

export type PackagingType = 'bulk' | 'bagged';

export type ProjectPreset = 'foundation' | 'driveway' | 'retaining_wall' | 'interior_slab';

export type SortMode = 'best_overall' | 'cheapest' | 'eco_greenest' | 'max_durability';

export type ValidationStatus = 'green' | 'amber' | 'red';

export interface ValidationRule {
  status: ValidationStatus;
  message: string;
  tooltip: string;
}

export interface MixValidation {
  overallStatus: ValidationStatus;
  waterCementRatio: number;
  waterCementValidation: ValidationRule;
  cementContentValidation: ValidationRule;
  sandRatio: number;
  sandRatioValidation: ValidationRule;
  isExecutable: boolean;
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
  cementBags50kg: number;
  sandBags25kg: number;
  gravelBags25kg: number;
  truckloads: number;
  volumeM3: number;
}

export interface StrengthForecast {
  strengthMPa: number;
  strengthPSI: number;
  gostClass: string; // e.g. "B25 / M350"
  description: string;
}

export interface ConcreteResult {
  supplier: SupplierOffer;
  cost: CostBreakdown;
  carbon: CarbonBreakdown;
  strength: StrengthForecast;
  order: OrderBreakdown;
  costTrafficLight: ValidationStatus;
  carbonTrafficLight: ValidationStatus;
  kayakScore: number; // 0 - 100
  badges: {
    isLowestPrice: boolean;
    isEcoFriendly: boolean;
    isTopStrength: boolean;
    isBestOverall: boolean;
  };
}

export interface MarketSavingsDelta {
  costSavedAMD: number;
  carbonSavedKg: number;
  percentCostSaved: number;
  percentCarbonSaved: number;
}
