import { CEMENT_PROPERTIES, MATERIALS_DATA } from "../data/marketData";
import {
  CementType,
  ConcreteMixInput,
  MixValidation,
  PriceUnit,
  SmartInputValidation,
  ValidationRule,
  ValidationStatus,
} from "../types/concrete";
import { normalizeCementPriceAMDPerKg } from "./units";

/**
 * Validates a single material price input in real time.
 * Enforces: Low price != good if it is suspiciously under market range.
 */
export function validateMaterialPrice(
  price: number,
  category: 'CEMENT' | 'SAND' | 'AGGREGATE' | 'WATER' | 'REBAR',
  unit: PriceUnit,
  cementType: CementType = 'ararat_m400'
): SmartInputValidation {
  if (price === undefined || price === null || isNaN(price)) {
    return {
      status: 'red',
      message: 'Empty or non-numeric price input.',
      suggestion: 'Enter a valid numeric price in AMD.',
    };
  }

  if (price <= 0) {
    return {
      status: 'red',
      message: 'Price must be greater than zero.',
      suggestion: 'Enter a positive price value.',
    };
  }

  if (category === 'CEMENT') {
    const props = CEMENT_PROPERTIES[cementType];
    const isBagged = unit === 'AMD/50kg' || unit === 'AMD/25kg' || unit === 'AMD/bag' as PriceUnit;
    const bounds = isBagged ? props.bagBounds : props.bulkBounds;

    if (price < bounds.hardMin) {
      return {
        status: 'red',
        message: '🔴 Suspiciously low price',
        suggestion: `Please verify the price and unit. Reference typical range is ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD.`,
        referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
      };
    }
    if (price < bounds.goodMin) {
      return {
        status: 'amber',
        message: '🟡 Below typical market range',
        suggestion: 'Verify if this is wholesale, promotional, or missing delivery charges.',
        referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
      };
    }
    if (price <= bounds.goodMax) {
      return {
        status: 'green',
        message: '🟢 Typical Armenian market value',
        referenceRangeText: `Reference: ~${props.avgBagPriceAMD.toLocaleString('en-US')} AMD / 50kg`,
      };
    }
    if (price <= bounds.hardMax) {
      return {
        status: 'amber',
        message: '🟡 Above typical market range',
        suggestion: 'Verify whether premium brand or rapid-delivery surcharge applies.',
        referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
      };
    }
    return {
      status: 'red',
      message: '🔴 Unusually high price',
      suggestion: `Significantly above standard Armenian retail reference. Typical range: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD.`,
      referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
    };
  }

  // General materials (sand, gravel, water, rebar)
  const matMeta = MATERIALS_DATA[category.toLowerCase()];
  if (!matMeta) {
    return { status: 'green', message: '🟢 Custom material price' };
  }

  const bounds = matMeta.bounds;
  if (price < bounds.hardMin) {
    return {
      status: 'red',
      message: '🔴 Suspiciously low price',
      suggestion: `Please verify the price and unit. Reference typical range: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD.`,
      referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
    };
  }
  if (price < bounds.goodMin) {
    return {
      status: 'amber',
      message: '🟡 Below typical market range',
      suggestion: 'Check if packaging unit or delivery fee was omitted.',
      referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
    };
  }
  if (price <= bounds.goodMax) {
    return {
      status: 'green',
      message: '🟢 Typical Armenian market value',
      referenceRangeText: `Typical range: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
    };
  }
  if (price <= bounds.hardMax) {
    return {
      status: 'amber',
      message: '🟡 Above typical market range',
      referenceRangeText: `Typical range: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
    };
  }
  return {
    status: 'red',
    message: '🔴 Unusually high price',
    suggestion: `Extremely high compared to reference dataset (${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD).`,
    referenceRangeText: `Typical: ${bounds.goodMin.toLocaleString('en-US')}–${bounds.goodMax.toLocaleString('en-US')} AMD`,
  };
}

/**
 * Validates Water-Cement Ratio (w/c) based on ACI 211 / GOST 27006.
 */
export function validateWaterCementRatio(wc: number): ValidationRule {
  if (isNaN(wc) || wc <= 0) {
    return {
      status: 'red',
      message: 'Invalid Water-Cement Ratio',
      tooltip: 'Water or cement content is zero or non-numeric.',
      code: 'ENGINEERING_ERROR',
    };
  }
  if (wc < 0.30) {
    return {
      status: 'red',
      message: 'Unworkable Mix (w/c < 0.30)',
      tooltip: 'Water content is dangerously low. Cement cannot hydrate properly without aggressive superplasticizers.',
      code: 'ENGINEERING_ERROR',
    };
  }
  if (wc < 0.40) {
    return {
      status: 'amber',
      message: 'Stiff Mix (0.30 ≤ w/c < 0.40)',
      tooltip: 'Low water content yields high strength but requires plasticizers or mechanical vibrators to place.',
      code: 'ENGINEERING_WARN',
    };
  }
  if (wc <= 0.55) {
    return {
      status: 'green',
      message: 'Optimal Ratio (0.40 ≤ w/c ≤ 0.55)',
      tooltip: 'Ideal balance between high 28-day compressive strength, low permeability, and good workability.',
      code: 'TYPICAL',
    };
  }
  if (wc <= 0.65) {
    return {
      status: 'amber',
      message: 'High Permeability (0.56 < w/c ≤ 0.65)',
      tooltip: 'Excess water creates capillary pores, reducing compressive strength by ~25% and increasing freeze-thaw risks.',
      code: 'ENGINEERING_WARN',
    };
  }
  return {
    status: 'red',
    message: 'Structural Degradation (w/c > 0.68)',
    tooltip: 'Critically high water ratio causes severe bleeding, segregation, and structural failure risks under load.',
    code: 'ENGINEERING_ERROR',
  };
}

/**
 * Validates Cement Content per m3 based on structural engineering standards.
 */
export function validateCementContent(cementKg: number): ValidationRule {
  if (isNaN(cementKg) || cementKg <= 0) {
    return {
      status: 'red',
      message: 'Invalid Cement Quantity',
      tooltip: 'Cement content must be greater than zero.',
      code: 'ENGINEERING_ERROR',
    };
  }
  if (cementKg < 220) {
    return {
      status: 'red',
      message: 'Under-Dosed Cement (< 220 kg/m³)',
      tooltip: 'Insufficient binder. Concrete will be porous, crumble under moderate loads, and fail structural safety inspection.',
      code: 'ENGINEERING_ERROR',
    };
  }
  if (cementKg < 300) {
    return {
      status: 'amber',
      message: 'Lean Concrete (220–299 kg/m³)',
      tooltip: 'Suitable only for non-structural fill, sub-base blinding, or interior unreinforced floor leveling.',
      code: 'ENGINEERING_WARN',
    };
  }
  if (cementKg <= 450) {
    return {
      status: 'green',
      message: 'Standard Load-Bearing (300–450 kg/m³)',
      tooltip: 'Optimal dosage for reinforced foundations, columns, retaining walls, and monolithic slabs.',
      code: 'TYPICAL',
    };
  }
  if (cementKg <= 550) {
    return {
      status: 'amber',
      message: 'High Cement / Shrinkage Risk (451–550 kg/m³)',
      tooltip: 'High early strength, but elevated thermal hydration heat creates micro-cracking and drying shrinkage risk.',
      code: 'ENGINEERING_WARN',
    };
  }
  return {
    status: 'red',
    message: 'Extreme Overheating & Cracking (> 600 kg/m³)',
    tooltip: 'Excessive cement causes thermal shock, severe cracking, and unnecessary financial and carbon waste.',
    code: 'ENGINEERING_ERROR',
  };
}

/**
 * Validates Sand to Total Aggregate Ratio (S / (S + G)).
 */
export function validateSandRatio(sandKg: number, gravelKg: number): ValidationRule {
  const totalAgg = sandKg + gravelKg;
  if (isNaN(totalAgg) || totalAgg <= 0) {
    return {
      status: 'red',
      message: 'No Aggregates Specified',
      tooltip: 'Concrete requires coarse and fine aggregate matrix for load transfer.',
      code: 'ENGINEERING_ERROR',
    };
  }

  const ratio = (sandKg / totalAgg) * 100;

  if (ratio < 25) {
    return {
      status: 'red',
      message: 'Severe Honeycombing (< 25% Sand)',
      tooltip: 'Lack of fine aggregate leaves void spaces between gravel, resulting in structural honeycombing.',
      code: 'ENGINEERING_ERROR',
    };
  }
  if (ratio < 35) {
    return {
      status: 'amber',
      message: 'Harsh Aggregate Mix (25–34% Sand)',
      tooltip: 'Coarse mix with low workability. Hard to pump or finish smoothly without aggregate segregation.',
      code: 'ENGINEERING_WARN',
    };
  }
  if (ratio <= 45) {
    return {
      status: 'green',
      message: 'Ideal Grain Matrix (35–45% Sand)',
      tooltip: 'Perfect grain matrix packing fine sand into coarse aggregate voids for maximum dense strength.',
      code: 'TYPICAL',
    };
  }
  if (ratio <= 55) {
    return {
      status: 'amber',
      message: 'Oversanded Mix (46–55% Sand)',
      tooltip: 'High fine aggregate increases water demand and paste requirement, slightly lowering strength.',
      code: 'ENGINEERING_WARN',
    };
  }
  return {
    status: 'red',
    message: 'Excessive Sand Matrix (> 60% Sand)',
    tooltip: 'Behaves like mortar rather than structural concrete. High paste shrinkage and reduced aggregate interlocking.',
    code: 'ENGINEERING_ERROR',
  };
}

/**
 * Validates project concrete volume.
 */
export function validateConcreteVolume(volumeM3: number): SmartInputValidation {
  if (isNaN(volumeM3) || volumeM3 <= 0) {
    return {
      status: 'red',
      message: '🔴 Invalid project volume (0 m³)',
      suggestion: 'Concrete volume must be greater than 0 m³.',
    };
  }
  if (volumeM3 < 0.5) {
    return {
      status: 'green',
      message: '🟢 Small DIY / Repair Volume',
      suggestion: 'Small volume batch (~0.1–0.5 m³). Consider bagged materials for ease of manual mixing.',
    };
  }
  if (volumeM3 <= 1000) {
    return {
      status: 'green',
      message: '🟢 Standard Project Volume',
      referenceRangeText: 'Commercial or residential scale estimate',
    };
  }
  return {
    status: 'amber',
    message: '🟡 Unusually Large Project Estimate (> 1,000 m³)',
    suggestion: 'Large volume project. Ensure bulk silo logistics and batch plant capacity are verified.',
  };
}

/**
 * Validates wastage percentage.
 */
export function validateWastage(wastagePercent: number): SmartInputValidation {
  if (isNaN(wastagePercent) || wastagePercent < 0) {
    return {
      status: 'red',
      message: '🔴 Invalid negative wastage',
      suggestion: 'Wastage percentage cannot be negative.',
    };
  }
  if (wastagePercent <= 5) {
    return {
      status: 'green',
      message: '🟢 Standard Site Wastage (0–5%)',
    };
  }
  if (wastagePercent <= 10) {
    return {
      status: 'amber',
      message: '🟡 Moderate Wastage Allowance (5–10%)',
      suggestion: 'Reasonable for complex formwork or remote pump pouring.',
    };
  }
  return {
    status: 'amber',
    message: '🟡 High Wastage Allowance (> 10%)',
    suggestion: 'High loss estimate. Inspect formwork integrity and site delivery conditions.',
  };
}

/**
 * Evaluates full concrete mix input and combines validation rules.
 */
export function validateConcreteMixInput(input: ConcreteMixInput): MixValidation {
  const wcRatio = input.cementKg > 0 ? input.waterLiters / input.cementKg : 0;
  const totalAgg = input.sandKg + input.gravelKg;
  const sandRatio = totalAgg > 0 ? (input.sandKg / totalAgg) * 100 : 0;

  const wcRule = validateWaterCementRatio(wcRatio);
  const cementRule = validateCementContent(input.cementKg);
  const sandRule = validateSandRatio(input.sandKg, input.gravelKg);
  const volumeVal = validateConcreteVolume(input.volumeM3);
  const wastageVal = validateWastage(input.wastagePercent);

  const warnings: string[] = [];

  if (wcRule.status !== 'green') warnings.push(wcRule.message);
  if (cementRule.status !== 'green') warnings.push(cementRule.message);
  if (sandRule.status !== 'green') warnings.push(sandRule.message);
  if (volumeVal.status !== 'green') warnings.push(volumeVal.message);
  if (wastageVal.status !== 'green') warnings.push(wastageVal.message);

  let overallStatus: ValidationStatus = 'green';
  if (
    wcRule.status === 'red' ||
    cementRule.status === 'red' ||
    sandRule.status === 'red' ||
    volumeVal.status === 'red' ||
    wastageVal.status === 'red'
  ) {
    overallStatus = 'red';
  } else if (
    wcRule.status === 'amber' ||
    cementRule.status === 'amber' ||
    sandRule.status === 'amber' ||
    volumeVal.status === 'amber' ||
    wastageVal.status === 'amber'
  ) {
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
    volumeValidation: volumeVal,
    wastageValidation: wastageVal,
    isExecutable,
    warnings,
  };
}

/**
 * Tailwind CSS styling helper for input borders, badges, and traffic lights.
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
