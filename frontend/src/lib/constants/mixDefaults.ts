import { ConcreteMixInput, MIX_FIELD_LABELS, MIX_FIELD_ORDER } from "@/types/mix";

export interface FieldConstraint {
  min: number;
  max: number;
  step?: number;
  hint: string;
}

/**
 * A plausible starting mix used to seed the form UI.
 */
export const DEFAULT_MIX: ConcreteMixInput = {
  cement: 350,
  blastFurnaceSlag: 0,
  flyAsh: 0,
  water: 175,
  superplasticizer: 5,
  coarseAggregate: 1000,
  fineAggregate: 750,
  ageDays: 28,
};

/**
 * Range hints and min/max constraints based on standard concrete mix design guidelines.
 */
export const MIX_FIELD_CONSTRAINTS: Record<keyof ConcreteMixInput, FieldConstraint> = {
  cement: {
    min: 0,
    max: 800,
    step: 1,
    hint: "Standard: 150–550 kg/m³ (max 800)",
  },
  blastFurnaceSlag: {
    min: 0,
    max: 400,
    step: 1,
    hint: "Standard: 0–300 kg/m³ (max 400)",
  },
  flyAsh: {
    min: 0,
    max: 400,
    step: 1,
    hint: "Standard: 0–200 kg/m³ (max 400)",
  },
  water: {
    min: 0,
    max: 300,
    step: 1,
    hint: "Standard: 120–250 kg/m³ (max 300)",
  },
  superplasticizer: {
    min: 0,
    max: 30,
    step: 0.1,
    hint: "Standard: 0–15 kg/m³ (max 30)",
  },
  coarseAggregate: {
    min: 0,
    max: 1400,
    step: 1,
    hint: "Standard: 700–1200 kg/m³ (max 1400)",
  },
  fineAggregate: {
    min: 0,
    max: 1200,
    step: 1,
    hint: "Standard: 500–950 kg/m³ (max 1200)",
  },
  ageDays: {
    min: 1,
    max: 365,
    step: 1,
    hint: "Standard: 1–365 days (typical: 28)",
  },
};

/**
 * Validates mix inputs against concrete design sanity rules.
 * Returns a record mapping field names to error messages if invalid.
 */
export function validateConcreteMix(mix: ConcreteMixInput): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of MIX_FIELD_ORDER) {
    const val = mix[field];
    const constraint = MIX_FIELD_CONSTRAINTS[field];

    if (val === undefined || val === null || isNaN(val)) {
      errors[field] = `${MIX_FIELD_LABELS[field]} is required.`;
    } else if (val < constraint.min) {
      errors[field] = `${MIX_FIELD_LABELS[field]} must be ≥ ${constraint.min}.`;
    } else if (val > constraint.max) {
      errors[field] = `${MIX_FIELD_LABELS[field]} must be ≤ ${constraint.max}.`;
    }
  }

  const binder = (mix.cement || 0) + (mix.flyAsh || 0) + (mix.blastFurnaceSlag || 0);
  if (binder <= 0) {
    errors.cement = "Total binder (Cement + Slag + Fly Ash) must be > 0 kg/m³.";
  } else {
    const wbRatio = (mix.water || 0) / binder;
    if (wbRatio < 0.20 || wbRatio > 1.00) {
      errors.water = `Water/binder ratio (${wbRatio.toFixed(2)}) is outside plausible range (0.20–1.00).`;
    }
  }

  return errors;
}
