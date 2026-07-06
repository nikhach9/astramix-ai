/**
 * Frontend-facing concrete mix design input.
 * camelCase — this is the shape every component, hook, and form works with.
 * Units are kg/m³ unless noted otherwise.
 */
export interface ConcreteMixInput {
  cement: number;
  blastFurnaceSlag: number;
  flyAsh: number;
  water: number;
  superplasticizer: number;
  coarseAggregate: number;
  fineAggregate: number;
  ageDays: number;
}

/**
 * Wire-format concrete mix input. snake_case — matches the FastAPI/pydantic
 * schema exactly. Only `lib/api/*` and `lib/api/adapters.ts` should ever
 * see this type.
 */
export interface ConcreteMixInputApi {
  cement: number;
  blast_furnace_slag: number;
  fly_ash: number;
  water: number;
  superplasticizer: number;
  coarse_aggregate: number;
  fine_aggregate: number;
  age: number;
}

export const MIX_FIELD_ORDER: (keyof ConcreteMixInput)[] = [
  "cement",
  "blastFurnaceSlag",
  "flyAsh",
  "water",
  "superplasticizer",
  "coarseAggregate",
  "fineAggregate",
  "ageDays",
];

export const MATERIAL_FIELD_ORDER: (keyof ConcreteMixInput)[] = [
  "cement",
  "blastFurnaceSlag",
  "flyAsh",
  "water",
  "superplasticizer",
  "coarseAggregate",
  "fineAggregate",
];

export const MIX_FIELD_LABELS: Record<keyof ConcreteMixInput, string> = {
  cement: "Cement",
  blastFurnaceSlag: "Blast Furnace Slag",
  flyAsh: "Fly Ash",
  water: "Water",
  superplasticizer: "Superplasticizer",
  coarseAggregate: "Coarse Aggregate",
  fineAggregate: "Fine Aggregate",
  ageDays: "Curing Age",
};

export const MIX_FIELD_UNITS: Record<keyof ConcreteMixInput, string> = {
  cement: "kg/m³",
  blastFurnaceSlag: "kg/m³",
  flyAsh: "kg/m³",
  water: "kg/m³",
  superplasticizer: "kg/m³",
  coarseAggregate: "kg/m³",
  fineAggregate: "kg/m³",
  ageDays: "days",
};

/**
 * Bounds and weights passed to the optimizer.
 */
export interface OptimizationConstraints {
  targetStrengthMPa: number;
  ageDays: number;
  maxWCRatio: number;
  alpha: number;
  beta: number;
}

export interface OptimizationConstraintsApi {
  target_strength_mpa: number;
  age: number;
  max_w_c_ratio: number;
  alpha: number;
  beta: number;
}

export interface OptimizeMixRequest {
  constraints: OptimizationConstraints;
  initialGuess?: ConcreteMixInput;
}

export interface OptimizeMixRequestApi {
  constraints: OptimizationConstraintsApi;
  initial_guess?: ConcreteMixInputApi;
}
