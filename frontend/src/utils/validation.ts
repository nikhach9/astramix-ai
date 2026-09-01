import { ConcreteMixInput, MixValidation, ValidationRule, ValidationStatus } from "@/types/concrete";

/**
 * Validates Water-Cement Ratio (w/c) based on ACI 211 / GOST 27006.
 */
export function validateWaterCementRatio(wc: number): ValidationRule {
  if (wc < 0.30) {
    return {
      status: 'red',
      message: 'Unworkable Mix (w/c < 0.30)',
      tooltip: 'Water content is dangerously low. Cement cannot hydrate properly without aggressive superplasticizers.',
    };
  }
  if (wc < 0.40) {
    return {
      status: 'amber',
      message: 'Stiff Mix (0.35 ≤ w/c < 0.40)',
      tooltip: 'Low water content yields high strength but requires plasticizers or mechanical vibrators to place.',
    };
  }
  if (wc <= 0.55) {
    return {
      status: 'green',
      message: 'Optimal Ratio (0.40 ≤ w/c ≤ 0.55)',
      tooltip: 'Ideal balance between high 28-day compressive strength, low permeability, and good workability.',
    };
  }
  if (wc <= 0.65) {
    return {
      status: 'amber',
      message: 'High Permeability (0.56 < w/c ≤ 0.65)',
      tooltip: 'Excess water creates capillary pores, reducing compressive strength by ~25% and increasing freeze-thaw risks.',
    };
  }
  return {
    status: 'red',
    message: 'Structural Degradation (w/c > 0.68)',
    tooltip: 'Critically high water ratio causes severe bleeding, segregation, and structural failure risks under load.',
  };
}

/**
 * Validates Cement Content per m3 based on structural engineering standards.
 */
export function validateCementContent(cementKg: number): ValidationRule {
  if (cementKg < 220) {
    return {
      status: 'red',
      message: 'Under-Dosed Cement (< 220 kg/m³)',
      tooltip: 'Insufficient binder. Concrete will be porous, crumble under moderate loads, and fail structural safety inspection.',
    };
  }
  if (cementKg < 300) {
    return {
      status: 'amber',
      message: 'Lean Concrete (250–299 kg/m³)',
      tooltip: 'Suitable only for non-structural fill, sub-base blinding, or interior unreinforced floor leveling.',
    };
  }
  if (cementKg <= 450) {
    return {
      status: 'green',
      message: 'Standard Load-Bearing (300–450 kg/m³)',
      tooltip: 'Optimal dosage for reinforced foundations, columns, retaining walls, and monolithic slabs.',
    };
  }
  if (cementKg <= 550) {
    return {
      status: 'amber',
      message: 'High Cement / Shrinkage Risk (451–550 kg/m³)',
      tooltip: 'High early strength, but elevated thermal hydration heat creates micro-cracking and drying shrinkage risk.',
    };
  }
  return {
    status: 'red',
    message: 'Extreme Overheating & Cracking (> 600 kg/m³)',
    tooltip: 'Excessive cement causes thermal shock, severe cracking, and unnecessary financial and carbon waste.',
  };
}

/**
 * Validates Sand to Total Aggregate Ratio (S / (S + G)).
 */
export function validateSandRatio(sandKg: number, gravelKg: number): ValidationRule {
  const totalAgg = sandKg + gravelKg;
  if (totalAgg <= 0) {
    return {
      status: 'red',
      message: 'No Aggregates Specified',
      tooltip: 'Concrete requires coarse and fine aggregate matrix for load transfer.',
    };
  }

  const ratio = (sandKg / totalAgg) * 100;

  if (ratio < 25) {
    return {
      status: 'red',
      message: 'Severe Honeycombing (< 25% Sand)',
      tooltip: 'Lack of fine aggregate leaves void spaces between gravel, resulting in structural honeycombing.',
    };
  }
  if (ratio < 35) {
    return {
      status: 'amber',
      message: 'Harsh Aggregate Mix (30–34% Sand)',
      tooltip: 'Coarse mix with low workability. Hard to pump or finish smoothly without aggregate segregation.',
    };
  }
  if (ratio <= 45) {
    return {
      status: 'green',
      message: 'Ideal Grain Matrix (35–45% Sand)',
      tooltip: 'Perfect gradation packing fine sand into coarse aggregate voids for maximum dense strength.',
    };
  }
  if (ratio <= 55) {
    return {
      status: 'amber',
      message: 'Oversanded Mix (46–55% Sand)',
      tooltip: 'High fine aggregate increases water demand and paste requirement, slightly lowering strength.',
    };
  }
  return {
    status: 'red',
    message: 'Excessive Sand Matrix (> 60% Sand)',
    tooltip: 'Behaves like mortar rather than structural concrete. High paste shrinkage and reduced aggregate interlocking.',
  };
}

/**
 * Combines all rules to evaluate a complete concrete mix.
 */
export function validateConcreteMixInput(input: ConcreteMixInput): MixValidation {
  const wcRatio = input.cementKg > 0 ? input.waterLiters / input.cementKg : 0;
  const totalAgg = input.sandKg + input.gravelKg;
  const sandRatio = totalAgg > 0 ? (input.sandKg / totalAgg) * 100 : 0;

  const wcRule = validateWaterCementRatio(wcRatio);
  const cementRule = validateCementContent(input.cementKg);
  const sandRule = validateSandRatio(input.sandKg, input.gravelKg);

  // Overall status is the worst of the three rules
  let overallStatus: ValidationStatus = 'green';
  if (wcRule.status === 'red' || cementRule.status === 'red' || sandRule.status === 'red') {
    overallStatus = 'red';
  } else if (wcRule.status === 'amber' || cementRule.status === 'amber' || sandRule.status === 'amber') {
    overallStatus = 'amber';
  }

  const isExecutable = overallStatus !== 'red';

  return {
    overallStatus,
    waterCementRatio: parseFloat(wcRatio.toFixed(3)),
    waterCementValidation: wcRule,
    cementContentValidation: cementRule,
    sandRatio: parseFloat(sandRatio.toFixed(1)),
    sandRatioValidation: sandRule,
    isExecutable,
  };
}

/**
 * Tailwind styling helper for visual rings, borders, and status pills.
 */
export function getStatusStyle(status: ValidationStatus) {
  switch (status) {
    case 'green':
      return {
        border: 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500/20',
        bgGlow: 'bg-emerald-500/5',
        ring: 'ring-1 ring-emerald-500/30',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dotBg: 'bg-emerald-500',
        iconColor: 'text-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-400',
      };
    case 'amber':
      return {
        border: 'border-amber-500/80 focus:border-amber-500 focus:ring-amber-500/20',
        bgGlow: 'bg-amber-500/5',
        ring: 'ring-1 ring-amber-500/30',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dotBg: 'bg-amber-500',
        iconColor: 'text-amber-500',
        text: 'text-amber-700 dark:text-amber-400',
      };
    case 'red':
      return {
        border: 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20',
        bgGlow: 'bg-rose-500/5',
        ring: 'ring-1 ring-rose-500/30',
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotBg: 'bg-rose-500',
        iconColor: 'text-rose-500',
        text: 'text-rose-700 dark:text-rose-400',
      };
  }
}
