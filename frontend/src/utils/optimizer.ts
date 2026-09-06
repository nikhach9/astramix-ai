import { MARKET_BASELINE, SUPPLIER_OFFERS } from "../data/marketData";
import {
  CandidateMix,
  ConcreteMixInput,
  ConcreteResult,
  MarketSavingsDelta,
  OptimizationPriority,
  SortMode,
  ValidationStatus,
} from "../types/concrete";
import {
  calculateCarbonBreakdown,
  calculateCostBreakdown,
  calculateOrderBreakdown,
  calculateStrengthForecast,
} from "./calculator";
import { validateConcreteMixInput } from "./validation";

/**
 * Normalizes optimization weights so they sum to 100%.
 */
export function normalizeWeights(w: { cost: number; carbon: number; consumption: number; performance: number }) {
  const sum = (w.cost || 0) + (w.carbon || 0) + (w.consumption || 0) + (w.performance || 0);
  if (sum <= 0) return { cost: 40, carbon: 30, consumption: 20, performance: 10 };
  return {
    cost: Math.round((w.cost / sum) * 100),
    carbon: Math.round((w.carbon / sum) * 100),
    consumption: Math.round((w.consumption / sum) * 100),
    performance: Math.round((w.performance / sum) * 100),
  };
}

/**
 * Evaluates traffic lights for individual metrics.
 */
export function getMetricTrafficLights(costPerM3AMD: number, co2PerM3Kg: number, cementKgPerM3: number, isFeasible: boolean) {
  const costLight: ValidationStatus = costPerM3AMD <= 32000 ? "green" : costPerM3AMD <= 42000 ? "amber" : "red";
  const carbonLight: ValidationStatus = co2PerM3Kg <= 260 ? "green" : co2PerM3Kg <= 360 ? "amber" : "red";
  const consumptionLight: ValidationStatus = cementKgPerM3 <= 340 ? "green" : cementKgPerM3 <= 420 ? "amber" : "red";
  const feasibilityLight: ValidationStatus = isFeasible ? "green" : "red";

  return { costLight, carbonLight, consumptionLight, feasibilityLight };
}

/**
 * Generates dynamic, data-driven explanations ("WHY THIS OPTION?").
 */
export function generateMixReasons(
  candidate: {
    cost: { costPerM3AMD: number };
    carbon: { co2PerM3: number };
    strength: { strengthMPa: number; gostClass: string };
    input: ConcreteMixInput;
    isFeasible: boolean;
  },
  baselineCostPerM3: number,
  baselineCarbonPerM3: number
): string[] {
  const reasons: string[] = [];

  if (!candidate.isFeasible) {
    reasons.push("⚠️ Fails structural engineering constraints or user limit caps.");
    return reasons;
  }

  const costDiffPercent = Math.round(((baselineCostPerM3 - candidate.cost.costPerM3AMD) / baselineCostPerM3) * 100);
  if (costDiffPercent > 0) {
    reasons.push(`💰 ${costDiffPercent}% cheaper per m³ than market baseline.`);
  } else if (costDiffPercent < 0) {
    reasons.push(`💵 Premium grade pricing (${Math.abs(costDiffPercent)}% above baseline).`);
  } else {
    reasons.push("💰 Matches reference market price baseline.");
  }

  const carbonDiffPercent = Math.round(((baselineCarbonPerM3 - candidate.carbon.co2PerM3) / baselineCarbonPerM3) * 100);
  if (carbonDiffPercent > 0) {
    reasons.push(`🌱 ${carbonDiffPercent}% lower embodied CO₂ emissions.`);
  } else if (carbonDiffPercent < 0) {
    reasons.push(`💨 Higher carbon intensity due to rapid-hardening cement.`);
  }

  if (candidate.input.cementKg <= 350) {
    reasons.push(`📦 Efficient cement usage (${candidate.input.cementKg} kg/m³).`);
  }

  reasons.push(`🏗 Achieves ${candidate.strength.strengthMPa} MPa 28-day strength (${candidate.strength.gostClass}).`);
  reasons.push("🟢 Passes all structural engineering safety constraints.");

  return reasons;
}

/**
 * Generates feasible candidate mixes across supplier and mix options.
 */
export function generateCandidateMixes(userInput: ConcreteMixInput): CandidateMix[] {
  const candidates: CandidateMix[] = [];
  const baselineCostPerM3 = MARKET_BASELINE.costPerM3AMD;
  const baselineCarbonPerM3 = MARKET_BASELINE.co2PerM3Kg;

  // Define 5 distinct material mix recipes
  const recipes = [
    {
      id: "user_mix",
      title: "Current User Selection",
      cementType: userInput.cementType,
      packaging: userInput.packaging,
      cementKg: userInput.cementKg,
      waterLiters: userInput.waterLiters,
      sandKg: userInput.sandKg,
      gravelKg: userInput.gravelKg,
      deliveryFeeAMD: 4500,
    },
    {
      id: "ararat_bulk_opt",
      title: "Ararat M400 Bulk (Optimized)",
      cementType: "ararat_m400" as const,
      packaging: "bulk" as const,
      cementKg: Math.max(300, Math.min(420, userInput.cementKg * 0.94)),
      waterLiters: Math.max(160, Math.min(195, userInput.waterLiters * 0.96)),
      sandKg: 750,
      gravelKg: 1050,
      deliveryFeeAMD: 3500,
    },
    {
      id: "ararat_bagged",
      title: "Ararat M400 Bagged (Standard)",
      cementType: "ararat_m400" as const,
      packaging: "bagged" as const,
      cementKg: Math.max(320, userInput.cementKg),
      waterLiters: userInput.waterLiters,
      sandKg: 740,
      gravelKg: 1060,
      deliveryFeeAMD: 4000,
    },
    {
      id: "iranian_m500_bulk",
      title: "Iranian M500 High-Strength",
      cementType: "iranian_m500" as const,
      packaging: "bulk" as const,
      cementKg: Math.max(290, Math.min(380, userInput.cementKg * 0.88)), // lower cement due to higher strength
      waterLiters: Math.max(155, Math.min(185, userInput.waterLiters * 0.94)),
      sandKg: 760,
      gravelKg: 1040,
      deliveryFeeAMD: 5000,
    },
    {
      id: "eco_green_mix",
      title: "Eco-Green Low Carbon",
      cementType: "ararat_m400" as const,
      packaging: "bulk" as const,
      cementKg: Math.max(280, Math.min(330, userInput.cementKg * 0.85)),
      waterLiters: Math.max(150, Math.min(175, userInput.waterLiters * 0.92)),
      sandKg: 780,
      gravelKg: 1040,
      deliveryFeeAMD: 3500,
    },
  ];

  // Evaluate each recipe
  recipes.forEach((rec, idx) => {
    const inputForRec: ConcreteMixInput = {
      ...userInput,
      cementType: rec.cementType,
      packaging: rec.packaging,
      cementKg: Math.round(rec.cementKg),
      waterLiters: Math.round(rec.waterLiters),
      sandKg: Math.round(rec.sandKg),
      gravelKg: Math.round(rec.gravelKg),
    };

    const order = calculateOrderBreakdown(inputForRec);
    const cost = calculateCostBreakdown(inputForRec, order, rec.deliveryFeeAMD);
    const carbon = calculateCarbonBreakdown(inputForRec, order);
    const strength = calculateStrengthForecast(inputForRec.cementKg, inputForRec.waterLiters, inputForRec.cementType);
    const validation = validateConcreteMixInput(inputForRec);

    // Hard Engineering Constraints
    let isFeasible = validation.isExecutable;

    // Must meet target strength requirement (allow 2.5 MPa tolerance)
    if (userInput.targetStrengthMPa && strength.strengthMPa < userInput.targetStrengthMPa - 2.5) {
      isFeasible = false;
    }

    // Must satisfy user limit caps if set
    if (userInput.maxCostPerM3AMD && cost.costPerM3AMD > userInput.maxCostPerM3AMD) {
      isFeasible = false;
    }
    if (userInput.maxTotalBudgetAMD && cost.totalAMD > userInput.maxTotalBudgetAMD) {
      isFeasible = false;
    }
    if (userInput.maxCO2PerM3Kg && carbon.co2PerM3 > userInput.maxCO2PerM3Kg) {
      isFeasible = false;
    }
    if (userInput.maxTotalCO2Kg && carbon.totalCO2 > userInput.maxTotalCO2Kg) {
      isFeasible = false;
    }

    const { costLight, carbonLight, consumptionLight, feasibilityLight } = getMetricTrafficLights(
      cost.costPerM3AMD,
      carbon.co2PerM3,
      inputForRec.cementKg,
      isFeasible
    );

    const supplierName = SUPPLIER_OFFERS[idx % SUPPLIER_OFFERS.length].name;

    const candidateObj: CandidateMix = {
      id: rec.id,
      title: rec.title,
      supplierName,
      cementType: rec.cementType,
      packaging: rec.packaging,
      input: inputForRec,
      cost,
      carbon,
      strength,
      order,
      validation,
      isFeasible,
      costTrafficLight: costLight,
      carbonTrafficLight: carbonLight,
      consumptionTrafficLight: consumptionLight,
      feasibilityTrafficLight: feasibilityLight,
      score: 0,
      badges: {
        isBestOverall: false,
        isCheapest: false,
        isLowestCarbon: false,
        isLowestConsumption: false,
      },
      reasons: [],
    };

    candidateObj.reasons = generateMixReasons(candidateObj, baselineCostPerM3, baselineCarbonPerM3);
    candidates.push(candidateObj);
  });

  // Determine min and max for multi-objective scoring
  const feasibleOnly = candidates.filter((c) => c.isFeasible);
  const pool = feasibleOnly.length > 0 ? feasibleOnly : candidates;

  const minCost = Math.min(...pool.map((c) => c.cost.costPerM3AMD));
  const maxCost = Math.max(...pool.map((c) => c.cost.costPerM3AMD), minCost + 1);

  const minCarbon = Math.min(...pool.map((c) => c.carbon.co2PerM3));
  const maxCarbon = Math.max(...pool.map((c) => c.carbon.co2PerM3), minCarbon + 1);

  const minCement = Math.min(...pool.map((c) => c.input.cementKg));
  const maxCement = Math.max(...pool.map((c) => c.input.cementKg), minCement + 1);

  const maxStrengthVal = Math.max(...pool.map((c) => c.strength.strengthMPa), 1.0);

  // Get weights based on priority
  let weights = userInput.weights;
  if (userInput.priority === "cheapest") weights = { cost: 70, carbon: 10, consumption: 10, performance: 10 };
  else if (userInput.priority === "lowest_co2") weights = { cost: 10, carbon: 70, consumption: 10, performance: 10 };
  else if (userInput.priority === "lowest_consumption") weights = { cost: 20, carbon: 10, consumption: 60, performance: 10 };
  else if (userInput.priority === "balanced") weights = { cost: 40, carbon: 30, consumption: 20, performance: 10 };

  const normW = normalizeWeights(weights);

  // Score candidates
  candidates.forEach((cand) => {
    // Infeasible candidates get score penalty and cannot win
    if (!cand.isFeasible) {
      cand.score = 15;
      return;
    }

    const costScore = 1 - (cand.cost.costPerM3AMD - minCost) / (maxCost - minCost);
    const carbonScore = 1 - (cand.carbon.co2PerM3 - minCarbon) / (maxCarbon - minCarbon);
    const consumptionScore = 1 - (cand.input.cementKg - minCement) / (maxCement - minCement);
    const performanceScore = cand.strength.strengthMPa / maxStrengthVal;

    const rawScore =
      (normW.cost / 100) * costScore +
      (normW.carbon / 100) * carbonScore +
      (normW.consumption / 100) * consumptionScore +
      (normW.performance / 100) * performanceScore;

    cand.score = Math.round(Math.max(15, Math.min(99, rawScore * 100)));
  });

  // Assign Badges
  const cheapestCost = Math.min(...pool.map((c) => c.cost.totalAMD));
  const lowestCarbonVal = Math.min(...pool.map((c) => c.carbon.totalCO2));
  const lowestCementVal = Math.min(...pool.map((c) => c.input.cementKg));
  const highestScoreVal = Math.max(...pool.map((c) => c.score));

  candidates.forEach((cand) => {
    if (cand.isFeasible) {
      cand.badges.isCheapest = cand.cost.totalAMD === cheapestCost;
      cand.badges.isLowestCarbon = cand.carbon.totalCO2 === lowestCarbonVal;
      cand.badges.isLowestConsumption = cand.input.cementKg === lowestCementVal;
      cand.badges.isBestOverall = cand.score === highestScoreVal;
    }
  });

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Evaluates supplier offers for AstraMix supplier list view.
 */
export function evaluateAllOffers(input: ConcreteMixInput): ConcreteResult[] {
  const candidates = generateCandidateMixes(input);

  return candidates.map((cand, idx) => {
    const supplier = SUPPLIER_OFFERS[idx % SUPPLIER_OFFERS.length];
    return {
      ...cand,
      supplier,
      astramixScore: cand.score,
    };
  });
}

/**
 * Sorts evaluation results by sort mode.
 */
export function sortConcreteResults<T extends { score: number; cost: { totalAMD: number }; carbon: { totalCO2: number }; strength: { strengthMPa: number } }>(
  results: T[],
  mode: SortMode
): T[] {
  const sorted = [...results];
  switch (mode) {
    case "best_overall":
      return sorted.sort((a, b) => b.score - a.score);
    case "cheapest":
      return sorted.sort((a, b) => a.cost.totalAMD - b.cost.totalAMD);
    case "eco_greenest":
      return sorted.sort((a, b) => a.carbon.totalCO2 - b.carbon.totalCO2);
    case "max_durability":
      return sorted.sort((a, b) => b.strength.strengthMPa - a.strength.strengthMPa);
    default:
      return sorted;
  }
}

/**
 * Computes savings delta compared to Armenian market baseline.
 */
export function calculateMarketSavings(bestResult: CandidateMix, volumeM3: number): MarketSavingsDelta {
  const vol = Math.max(0.1, volumeM3);
  const baselineTotalCost = MARKET_BASELINE.costPerM3AMD * vol;
  const baselineTotalCarbon = MARKET_BASELINE.co2PerM3Kg * vol;

  const costSavedAMD = Math.max(0, baselineTotalCost - bestResult.cost.totalAMD);
  const carbonSavedKg = Math.max(0, baselineTotalCarbon - bestResult.carbon.totalCO2);

  const percentCostSaved = Math.round((costSavedAMD / baselineTotalCost) * 100);
  const percentCarbonSaved = Math.round((carbonSavedKg / baselineTotalCarbon) * 100);

  return {
    costSavedAMD: Math.round(costSavedAMD),
    carbonSavedKg: Math.round(carbonSavedKg),
    percentCostSaved,
    percentCarbonSaved,
  };
}
