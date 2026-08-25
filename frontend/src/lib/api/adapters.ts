import {
  ConcreteMixInput,
  ConcreteMixInputApi,
  OptimizationConstraints,
  OptimizationConstraintsApi,
  OptimizeMixRequest,
  OptimizeMixRequestApi,
} from "@/types/mix";
import {
  StrengthPrediction,
  StrengthPredictionApi,
  CO2Estimate,
  CO2EstimateApi,
  CostEstimate,
  CostEstimateApi,
  OptimizedMixResult,
  OptimizedMixResultApi,
} from "@/types/predictions";

// ---------------------------------------------------------------------------
// Mix input
// ---------------------------------------------------------------------------

export function frontendToApiMix(mix: ConcreteMixInput): ConcreteMixInputApi {
  return {
    cement: mix.cement,
    blast_furnace_slag: mix.blastFurnaceSlag,
    fly_ash: mix.flyAsh,
    water: mix.water,
    superplasticizer: mix.superplasticizer,
    coarse_aggregate: mix.coarseAggregate,
    fine_aggregate: mix.fineAggregate,
    age: mix.ageDays,
  };
}

export function apiToFrontendMix(mix: ConcreteMixInputApi): ConcreteMixInput {
  return {
    cement: mix.cement,
    blastFurnaceSlag: mix.blast_furnace_slag,
    flyAsh: mix.fly_ash,
    water: mix.water,
    superplasticizer: mix.superplasticizer,
    coarseAggregate: mix.coarse_aggregate,
    fineAggregate: mix.fine_aggregate,
    ageDays: mix.age,
  };
}

// ---------------------------------------------------------------------------
// Mix constraints (optimizer input)
// ---------------------------------------------------------------------------

export function frontendToApiOptimizationConstraints(constraints: OptimizationConstraints): OptimizationConstraintsApi {
  return {
    target_strength_mpa: constraints.targetStrengthMPa,
    age: constraints.ageDays,
    max_w_c_ratio: constraints.maxWCRatio,
    alpha: constraints.alpha,
    beta: constraints.beta,
  };
}

export function apiToFrontendOptimizationConstraints(constraints: OptimizationConstraintsApi): OptimizationConstraints {
  return {
    targetStrengthMPa: constraints.target_strength_mpa,
    ageDays: constraints.age,
    maxWCRatio: constraints.max_w_c_ratio,
    alpha: constraints.alpha,
    beta: constraints.beta,
  };
}

export function frontendToApiOptimizeRequest(req: OptimizeMixRequest): OptimizeMixRequestApi {
  const apiReq: OptimizeMixRequestApi = {
    constraints: frontendToApiOptimizationConstraints(req.constraints),
  };
  if (req.initialGuess) {
    apiReq.initial_guess = frontendToApiMix(req.initialGuess);
  }
  return apiReq;
}

// ---------------------------------------------------------------------------
// Strength prediction
// ---------------------------------------------------------------------------

export function apiToFrontendStrengthPrediction(
  res: StrengthPredictionApi,
  originalMix: ConcreteMixInput
): StrengthPrediction {
  return {
    mix: originalMix,
    predictedStrengthMPa: res.predicted_strength_mpa,
    modelUsed: res.model_version,
    warnings: res.warnings,
    isOutOfDistribution: res.is_out_of_distribution,
    estimatedErrorRMSEMPa: res.estimated_error_rmse_mpa,
    estimatedErrorMAEMPa: res.estimated_error_mae_mpa,
    confidenceNote: res.confidence_note,
  };
}

// ---------------------------------------------------------------------------
// CO2 / carbon estimate
// ---------------------------------------------------------------------------

export function apiToFrontendCO2Estimate(
  res: CO2EstimateApi,
  originalMix: ConcreteMixInput
): CO2Estimate {
  return {
    mix: originalMix,
    totalCO2KgPerM3: res.total_co2_kg_per_m3,
    breakdown: res.breakdown_kg_per_m3,
  };
}

// ---------------------------------------------------------------------------
// Cost estimate
// ---------------------------------------------------------------------------

export function apiToFrontendCostEstimate(
  res: CostEstimateApi,
  originalMix: ConcreteMixInput
): CostEstimate {
  return {
    mix: originalMix,
    totalCostPerM3: res.total_cost_per_m3,
    currency: res.currency,
    breakdown: res.breakdown_per_m3,
  };
}

// ---------------------------------------------------------------------------
// Optimized mix result (single result — see types/predictions.ts)
// ---------------------------------------------------------------------------

export function apiToFrontendOptimizedResult(
  res: OptimizedMixResultApi
): OptimizedMixResult {
  return {
    mix: apiToFrontendMix(res.mix),
    predictedStrengthMPa: res.predicted_strength_mpa,
    co2KgPerM3: res.co2_kg_per_m3,
    costPerM3: res.cost_per_m3,
    objectiveValue: res.objective_value,
    success: res.success,
    warnings: res.warnings,
  };
}
