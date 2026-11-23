import { ConcreteMixInput, MIX_FIELD_LABELS, MIX_FIELD_ORDER, MIX_FIELD_UNITS } from "@/types/mix";

export interface FieldConstraint {
  min: number;
  max: number;
  step: number;
  isInteger?: boolean;
  presets?: number[];
  hint: string;
}

export const SCHEMA_VERSION = "1.0.0";
export const AGE_PRESETS = [1, 3, 7, 14, 28, 56, 90, 180, 365];

/**
 * A plausible starting mix within the validated UCI training envelope.
 */
export const DEFAULT_MIX: ConcreteMixInput = {
  cement: 350,
  blastFurnaceSlag: 0,
  flyAsh: 0,
  water: 175,
  superplasticizer: 3.5,
  coarseAggregate: 1020,
  fineAggregate: 760,
  ageDays: 28,
};

/**
 * Active training-data bounds from the versioned v1.0.0 input-validation contract
 * (1,030-row UCI Concrete Compressive Strength reference envelope).
 * Note: These limits represent the active prediction model's training-data range,
 * NOT structural engineering safety limits.
 */
export const MIX_FIELD_CONSTRAINTS: Record<keyof ConcreteMixInput, FieldConstraint> = {
  cement: {
    min: 102.0,
    max: 540.0,
    step: 1.0,
    hint: "Model training range: 102.0 – 540.0 kg/m³ (step 1.0)",
  },
  blastFurnaceSlag: {
    min: 0.0,
    max: 359.4,
    step: 1.0,
    hint: "Model training range: 0.0 – 359.4 kg/m³ (step 1.0)",
  },
  flyAsh: {
    min: 0.0,
    max: 200.1,
    step: 1.0,
    hint: "Model training range: 0.0 – 200.1 kg/m³ (step 1.0)",
  },
  water: {
    min: 121.75,
    max: 247.0,
    step: 0.5,
    hint: "Model training range: 121.75 – 247.0 kg/m³ (step 0.5)",
  },
  superplasticizer: {
    min: 0.0,
    max: 32.2,
    step: 0.1,
    hint: "Model training range: 0.0 – 32.2 kg/m³ (step 0.1)",
  },
  coarseAggregate: {
    min: 801.0,
    max: 1145.0,
    step: 1.0,
    hint: "Model training range: 801.0 – 1145.0 kg/m³ (step 1.0)",
  },
  fineAggregate: {
    min: 594.0,
    max: 992.6,
    step: 1.0,
    hint: "Model training range: 594.0 – 992.6 kg/m³ (step 1.0)",
  },
  ageDays: {
    min: 1,
    max: 365,
    step: 1,
    isInteger: true,
    presets: AGE_PRESETS,
    hint: "Model training range: 1 – 365 whole days (presets: 1, 3, 7, 14, 28, 56, 90, 180, 365)",
  },
};

export const CANONICAL_TO_FRONTEND_FIELD: Record<string, keyof ConcreteMixInput> = {
  cement: "cement",
  blast_furnace_slag: "blastFurnaceSlag",
  fly_ash: "flyAsh",
  water: "water",
  superplasticizer: "superplasticizer",
  coarse_aggregate: "coarseAggregate",
  fine_aggregate: "fineAggregate",
  age: "ageDays",
};

export const FRONTEND_TO_CANONICAL_FIELD: Record<keyof ConcreteMixInput, string> = {
  cement: "cement",
  blastFurnaceSlag: "blast_furnace_slag",
  flyAsh: "fly_ash",
  water: "water",
  superplasticizer: "superplasticizer",
  coarseAggregate: "coarse_aggregate",
  fineAggregate: "fine_aggregate",
  ageDays: "age",
};

/**
 * Compute water/cement ratio (Portland cement only, excludes SCMs).
 */
export function computeWaterCementRatio(water: number, cement: number): number {
  if (!Number.isFinite(water) || !Number.isFinite(cement) || cement <= 0) return 0;
  return Number((water / cement).toFixed(4));
}

/**
 * Compute water/binder ratio (water / (cement + slag + fly ash)).
 */
export function computeWaterBinderRatio(
  water: number,
  cement: number,
  blastFurnaceSlag: number,
  flyAsh: number
): number {
  const binder = cement + blastFurnaceSlag + flyAsh;
  if (!Number.isFinite(water) || !Number.isFinite(binder) || binder <= 0) return 0;
  return Number((water / binder).toFixed(4));
}

/**
 * Strict validation against the versioned v1.0.0 input contract.
 * Never silently clamps out-of-range user inputs.
 */
export function validateConcreteMix(
  mix: Partial<Record<keyof ConcreteMixInput, any>>,
  constraintsOverride?: Record<keyof ConcreteMixInput, FieldConstraint>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const activeConstraints = constraintsOverride ?? MIX_FIELD_CONSTRAINTS;

  for (const field of MIX_FIELD_ORDER) {
    const rawVal = mix[field];
    const constraint = activeConstraints[field];
    const label = MIX_FIELD_LABELS[field];
    const unit = MIX_FIELD_UNITS[field];

    if (
      rawVal === undefined ||
      rawVal === null ||
      (typeof rawVal === "string" && rawVal.trim() === "")
    ) {
      errors[field] = `${label} is required (allowed range: ${constraint.min}–${constraint.max} ${unit}).`;
      continue;
    }

    if (typeof rawVal === "boolean") {
      errors[field] = `${label} must be a valid finite number.`;
      continue;
    }

    const numVal = typeof rawVal === "number" ? rawVal : Number(String(rawVal).trim());
    if (!Number.isFinite(numVal)) {
      errors[field] = `${label} must be a valid finite number (NaN/Infinity not allowed).`;
      continue;
    }

    if (numVal < 0) {
      errors[field] = `${label} cannot be negative. Allowed model training range: ${constraint.min}–${constraint.max} ${unit}.`;
      continue;
    }

    if (constraint.isInteger && !Number.isInteger(numVal)) {
      errors[field] = `${label} must be a whole integer number of days (fractional days like ${rawVal} are not allowed).`;
      continue;
    }

    if (numVal < constraint.min || numVal > constraint.max) {
      errors[field] = `${label} (${numVal} ${unit}) is outside the model training range [${constraint.min}, ${constraint.max}] ${unit}. Inputs are not clamped.`;
      continue;
    }
  }

  if (!errors.cement && !errors.water && !errors.blastFurnaceSlag && !errors.flyAsh) {
    const cement = Number(mix.cement);
    const slag = Number(mix.blastFurnaceSlag);
    const ash = Number(mix.flyAsh);
    const water = Number(mix.water);
    const binder = cement + slag + ash;

    if (cement <= 0) {
      errors.cement = "Cement content must be > 0 kg/m³ to compute water/cement ratio.";
    } else if (binder <= 0) {
      errors.cement = "Total binder (Cement + Slag + Fly Ash) must be > 0 kg/m³.";
    } else {
      const wbRatio = water / binder;
      const wcRatio = water / cement;
      if (wbRatio < 0.20 || wbRatio > 1.00) {
        errors.water = `Water/binder ratio (w/b = ${wbRatio.toFixed(3)}, w/c = ${wcRatio.toFixed(3)}) is outside the plausible range [0.20, 1.00].`;
      }
    }
  }

  return errors;
}
