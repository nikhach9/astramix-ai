import { CEMENT_PROPERTIES, MARKET_BASELINE, MATERIALS_DATA, SUPPLIER_OFFERS } from "@/data/marketData";
import { ConcreteMixInput, ConcreteResult, MarketSavingsDelta, OrderBreakdown, SortMode, StrengthForecast, ValidationStatus } from "@/types/concrete";

/**
 * Predicts 28-day concrete compressive strength based on Abrams' Law.
 */
export function calculateStrengthForecast(cementKg: number, waterLiters: number, cementType: keyof typeof CEMENT_PROPERTIES): StrengthForecast {
  if (cementKg <= 0 || waterLiters <= 0) {
    return {
      strengthMPa: 0,
      strengthPSI: 0,
      gostClass: 'N/A',
      description: 'Invalid mix proportions',
    };
  }

  const wcRatio = waterLiters / cementKg;
  const isM500 = cementType === 'iranian_m500';

  // Abrams' Law parameters calibrated for Armenian cement grades
  const A = isM500 ? 96.0 : 82.0;
  const B = 7.2;

  // Raw strength prediction
  let baseMPa = A / Math.pow(B, wcRatio);

  // Density & cement dosage correction factor
  const dosageFactor = Math.min(1.2, Math.max(0.6, cementKg / 350.0));
  let finalMPa = baseMPa * dosageFactor;

  // Clamp within reasonable physical limits (5 to 65 MPa)
  finalMPa = Math.max(5.0, Math.min(65.0, finalMPa));
  const psi = Math.round(finalMPa * 145.038);

  // Map to Russian GOST Classes (GOST 26633)
  let gostClass = 'B15 / M200';
  let description = 'Light structural / interior screed';

  if (finalMPa < 15) {
    gostClass = 'B10 / M150';
    description = 'Sub-base blinding & non-structural fill';
  } else if (finalMPa < 20) {
    gostClass = 'B12.5 / M150';
    description = 'Unreinforced garden walls & path paving';
  } else if (finalMPa < 25) {
    gostClass = 'B15 / M200';
    description = 'Light slab, fence footing, interior screed';
  } else if (finalMPa < 30) {
    gostClass = 'B20 / M250';
    description = 'Standard low-rise residential foundation';
  } else if (finalMPa < 35) {
    gostClass = 'B22.5 / M300';
    description = 'Heavy slab, retaining wall, driveway';
  } else if (finalMPa < 40) {
    gostClass = 'B25 / M350';
    description = 'High-load commercial foundation & column';
  } else if (finalMPa < 45) {
    gostClass = 'B30 / M400';
    description = 'Bridge pier, high-rise slab & heavy industrial';
  } else if (finalMPa < 50) {
    gostClass = 'B35 / M450';
    description = 'Prestressed structural beam & hydraulic dam';
  } else {
    gostClass = 'B40 / M500+';
    description = 'Ultra-high strength heavy infrastructure';
  }

  return {
    strengthMPa: parseFloat(finalMPa.toFixed(1)),
    strengthPSI: psi,
    gostClass,
    description,
  };
}

/**
 * Calculates Order Breakdown (bag counts & truckloads).
 */
export function calculateOrderBreakdown(input: ConcreteMixInput): OrderBreakdown {
  const vol = Math.max(0.1, input.volumeM3);
  const totalCementKg = input.cementKg * vol;
  const totalSandKg = input.sandKg * vol;
  const totalGravelKg = input.gravelKg * vol;

  const cementBags50kg = Math.ceil(totalCementKg / 50.0);
  const sandBags25kg = Math.ceil(totalSandKg / 25.0);
  const gravelBags25kg = Math.ceil(totalGravelKg / 25.0);

  // Standard ready-mix truck capacity is ~7 to 8 m3
  const truckloads = Math.ceil(vol / 7.0);

  return {
    cementBags50kg,
    sandBags25kg,
    gravelBags25kg,
    truckloads,
    volumeM3: vol,
  };
}

/**
 * Evaluates cost traffic light based on per-m3 price in AMD.
 */
export function getCostTrafficLight(costPerM3AMD: number): ValidationStatus {
  if (costPerM3AMD <= 28000) return 'green';
  if (costPerM3AMD <= 36000) return 'amber';
  return 'red';
}

/**
 * Evaluates carbon traffic light based on CO2 intensity per m3.
 */
export function getCarbonTrafficLight(co2PerM3Kg: number): ValidationStatus {
  if (co2PerM3Kg <= 260) return 'green';
  if (co2PerM3Kg <= 380) return 'amber';
  return 'red';
}

/**
 * Evaluates all supplier offers for a given concrete mix input.
 */
export function evaluateAllOffers(input: ConcreteMixInput): ConcreteResult[] {
  const vol = Math.max(0.1, input.volumeM3);
  const isBagged = input.packaging === 'bagged';

  // 1. Compute Carbon per m3 & total
  const cementMeta = CEMENT_PROPERTIES[input.cementType];
  const cementCO2 = input.cementKg * cementMeta.carbonKgPerKg * vol;
  const sandCO2 = input.sandKg * MATERIALS_DATA.sand.carbonKgPerUnit * vol;
  const gravelCO2 = input.gravelKg * MATERIALS_DATA.gravel.carbonKgPerUnit * vol;
  const waterCO2 = input.waterLiters * MATERIALS_DATA.water.carbonKgPerUnit * vol;
  const rebarCO2 = input.rebarKgPerM3 * MATERIALS_DATA.rebar.carbonKgPerUnit * vol;

  const totalCO2 = cementCO2 + sandCO2 + gravelCO2 + waterCO2 + rebarCO2;
  const co2PerM3 = totalCO2 / vol;

  // 2. Strength Forecast
  const strengthInfo = calculateStrengthForecast(input.cementKg, input.waterLiters, input.cementType);

  // 3. Order Breakdown
  const orderBreakdown = calculateOrderBreakdown(input);

  // Evaluate each supplier offer
  const rawResults = SUPPLIER_OFFERS.map((supplier) => {
    // Cement pricing
    let cementCostAMD = 0;
    const isSupplierSameCement = supplier.cementType === input.cementType;
    const effectiveBagPrice = isSupplierSameCement
      ? supplier.pricePerBagAMD
      : supplier.pricePerBagAMD * (cementMeta.avgBagPriceAMD / CEMENT_PROPERTIES[supplier.cementType].avgBagPriceAMD);
    const effectiveBulkPrice = isSupplierSameCement
      ? supplier.pricePerTonBulkAMD
      : supplier.pricePerTonBulkAMD * (cementMeta.avgBulkTonAMD / CEMENT_PROPERTIES[supplier.cementType].avgBulkTonAMD);

    if (isBagged) {
      cementCostAMD = orderBreakdown.cementBags50kg * effectiveBagPrice;
    } else {
      cementCostAMD = ((input.cementKg * vol) / 1000.0) * effectiveBulkPrice;
    }

    // Sand pricing
    let sandCostAMD = 0;
    if (isBagged) {
      sandCostAMD = orderBreakdown.sandBags25kg * MATERIALS_DATA.sand.baggedPriceAMD!;
    } else {
      sandCostAMD = input.sandKg * vol * MATERIALS_DATA.sand.bulkPriceAMD;
    }

    // Gravel pricing
    let gravelCostAMD = 0;
    if (isBagged) {
      gravelCostAMD = orderBreakdown.gravelBags25kg * MATERIALS_DATA.gravel.baggedPriceAMD!;
    } else {
      gravelCostAMD = input.gravelKg * vol * MATERIALS_DATA.gravel.bulkPriceAMD;
    }

    // Water & Rebar
    const waterCostAMD = input.waterLiters * vol * MATERIALS_DATA.water.bulkPriceAMD;
    const rebarCostAMD = input.rebarKgPerM3 * vol * MATERIALS_DATA.rebar.bulkPriceAMD;
    const deliveryAMD = supplier.deliveryFeeAMD;

    const totalAMD = cementCostAMD + sandCostAMD + gravelCostAMD + waterCostAMD + rebarCostAMD + deliveryAMD;
    const costPerM3AMD = totalAMD / vol;

    const costTrafficLight = getCostTrafficLight(costPerM3AMD);
    const carbonTrafficLight = getCarbonTrafficLight(co2PerM3);

    return {
      supplier,
      cost: {
        cementAMD: Math.round(cementCostAMD),
        sandAMD: Math.round(sandCostAMD),
        gravelAMD: Math.round(gravelCostAMD),
        waterAMD: Math.round(waterCostAMD),
        rebarAMD: Math.round(rebarCostAMD),
        deliveryAMD: Math.round(deliveryAMD),
        totalAMD: Math.round(totalAMD),
        costPerM3AMD: Math.round(costPerM3AMD),
      },
      carbon: {
        cementCO2: parseFloat(cementCO2.toFixed(1)),
        sandCO2: parseFloat(sandCO2.toFixed(1)),
        gravelCO2: parseFloat(gravelCO2.toFixed(1)),
        waterCO2: parseFloat(waterCO2.toFixed(1)),
        rebarCO2: parseFloat(rebarCO2.toFixed(1)),
        totalCO2: parseFloat(totalCO2.toFixed(1)),
        co2PerM3: parseFloat(co2PerM3.toFixed(1)),
      },
      strength: strengthInfo,
      order: orderBreakdown,
      costTrafficLight,
      carbonTrafficLight,
      kayakScore: 0,
      badges: {
        isLowestPrice: false,
        isEcoFriendly: false,
        isTopStrength: false,
        isBestOverall: false,
      },
    };
  });

  // Calculate min/max for normalization in Kayak score
  const maxStrength = Math.max(...rawResults.map((r) => r.strength.strengthMPa), 1.0);
  const maxCost = Math.max(...rawResults.map((r) => r.cost.costPerM3AMD), 1.0);
  const maxCarbon = Math.max(...rawResults.map((r) => r.carbon.co2PerM3), 1.0);

  const minCost = Math.min(...rawResults.map((r) => r.cost.costPerM3AMD));
  const minCarbon = Math.min(...rawResults.map((r) => r.carbon.co2PerM3));
  const maxStrengthVal = Math.max(...rawResults.map((r) => r.strength.strengthMPa));

  // Compute Kayak Scores & Badges
  const results: ConcreteResult[] = rawResults.map((item) => {
    const strengthPart = (item.strength.strengthMPa / maxStrength) * 0.40;
    const costPart = (1 - item.cost.costPerM3AMD / maxCost) * 0.40;
    const carbonPart = (1 - item.carbon.co2PerM3 / maxCarbon) * 0.20;

    const rawScore = (strengthPart + costPart + carbonPart) * 100;
    const kayakScore = Math.round(Math.max(10, Math.min(99, rawScore)));

    const isLowestPrice = item.cost.costPerM3AMD === minCost;
    const isEcoFriendly = item.carbon.co2PerM3 === minCarbon;
    const isTopStrength = item.strength.strengthMPa === maxStrengthVal;

    return {
      ...item,
      kayakScore,
      badges: {
        isLowestPrice,
        isEcoFriendly,
        isTopStrength,
        isBestOverall: false,
      },
    };
  });

  // Mark best overall score
  const highestScore = Math.max(...results.map((r) => r.kayakScore));
  results.forEach((r) => {
    if (r.kayakScore === highestScore) {
      r.badges.isBestOverall = true;
    }
  });

  return results;
}

/**
 * Sorts evaluation results by selected quick-sort mode.
 */
export function sortConcreteResults(results: ConcreteResult[], mode: SortMode): ConcreteResult[] {
  const sorted = [...results];
  switch (mode) {
    case 'best_overall':
      return sorted.sort((a, b) => b.kayakScore - a.kayakScore);
    case 'cheapest':
      return sorted.sort((a, b) => a.cost.totalAMD - b.cost.totalAMD);
    case 'eco_greenest':
      return sorted.sort((a, b) => a.carbon.totalCO2 - b.carbon.totalCO2);
    case 'max_durability':
      return sorted.sort((a, b) => b.strength.strengthMPa - a.strength.strengthMPa);
    default:
      return sorted;
  }
}

/**
 * Computes savings delta compared to Armenian market average.
 */
export function calculateMarketSavings(bestResult: ConcreteResult, volumeM3: number): MarketSavingsDelta {
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
