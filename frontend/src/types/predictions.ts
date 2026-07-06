import { ConcreteMixInput, ConcreteMixInputApi } from "./mix";

// ---------------------------------------------------------------------------
// Strength prediction
// ---------------------------------------------------------------------------

export interface StrengthPrediction {
  mix: ConcreteMixInput;
  predictedStrengthMPa: number;
  modelUsed: string;
  warnings?: string[];
  estimatedErrorRMSEMPa?: number;
  estimatedErrorMAEMPa?: number;
  confidenceNote?: string;
}

export interface StrengthPredictionApi {
  success: boolean;
  predicted_strength_mpa: number;
  age: number;
  water_cement_ratio: number;
  water_binder_ratio: number;
  model_version: string;
  warnings?: string[];
  estimated_error_rmse_mpa?: number;
  estimated_error_mae_mpa?: number;
  confidence_note?: string;
}

// ---------------------------------------------------------------------------
// CO2 / carbon estimation
// ---------------------------------------------------------------------------

export interface CO2Estimate {
  mix: ConcreteMixInput;
  totalCO2KgPerM3: number;
  breakdown: Record<string, number>;
}

export interface CO2EstimateApi {
  success: boolean;
  total_co2_kg_per_m3: number;
  breakdown_kg_per_m3: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

export interface CostEstimate {
  mix: ConcreteMixInput;
  totalCostPerM3: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface CostEstimateApi {
  success: boolean;
  total_cost_per_m3: number;
  currency: string;
  breakdown_per_m3: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Mix optimization — v0.1: single weighted-sum SLSQP result, not a Pareto set
// ---------------------------------------------------------------------------

export interface OptimizedMixResult {
  mix: ConcreteMixInput;
  predictedStrengthMPa: number;
  co2KgPerM3: number;
  costPerM3: number;
  objectiveValue: number;
  success: boolean;
  warnings: string[];
}

export interface OptimizedMixResultApi {
  mix: ConcreteMixInputApi;
  predicted_strength_mpa: number;
  co2_kg_per_m3: number;
  cost_per_m3: number;
  objective_value: number;
  success: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Model comparison — type reserved for a future /models/compare endpoint.
// Nothing in this scaffold calls it or renders it with placeholder data;
// see app/compare/page.tsx for the honest "not available yet" state.
// ---------------------------------------------------------------------------

export interface ModelComparisonEntry {
  modelName: string;
  rmse: number;
  mae: number;
  r2: number;
}

export interface ModelComparisonEntryApi {
  model_name: string;
  rmse: number;
  mae: number;
  r2: number;
}
