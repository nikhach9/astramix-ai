import { CEMENT_PROPERTIES, MATERIALS_DATA } from "../data/marketData";
import {
  CarbonBreakdown,
  CementType,
  ConcreteMixInput,
  CostBreakdown,
  OrderBreakdown,
  StrengthForecast,
} from "../types/concrete";
import {
  normalizeAggregatePriceAMDPerKg,
  normalizeCementPriceAMDPerKg,
  normalizeRebarPriceAMDPerKg,
  normalizeWaterPriceAMDPerLiter,
  rebarKgToMeters,
} from "./units";

/**
 * Predicts 28-day concrete compressive strength based on Abrams' Law.
 */
export function calculateStrengthForecast(
  cementKg: number,
  waterLiters: number,
  cementType: CementType
): StrengthForecast {
  if (cementKg <= 0 || waterLiters <= 0) {
    return {
      strengthMPa: 0,
      strengthPSI: 0,
      gostClass: "N/A",
      description: "Invalid mix proportions",
    };
  }

  const wcRatio = waterLiters / cementKg;
  const isM500 = cementType === "iranian_m500";

  // Abrams' Law parameters calibrated for Armenian cement grades
  const A = isM500 ? 96.0 : 82.0;
  const B = 7.2;

  // Base strength prediction
  let baseMPa = A / Math.pow(B, wcRatio);

  // Density & cement dosage correction factor
  const dosageFactor = Math.min(1.25, Math.max(0.55, cementKg / 350.0));
  let finalMPa = baseMPa * dosageFactor;

  // Clamp within realistic physical limits (5.0 to 65.0 MPa)
  finalMPa = Math.max(5.0, Math.min(65.0, finalMPa));
  const psi = Math.round(finalMPa * 145.038);

  // Map to Russian GOST Classes (GOST 26633)
  let gostClass = "B15 / M200";
  let description = "Light structural / interior screed";

  if (finalMPa < 15) {
    gostClass = "B10 / M150";
    description = "Sub-base blinding & non-structural fill";
  } else if (finalMPa < 20) {
    gostClass = "B12.5 / M150";
    description = "Unreinforced garden walls & path paving";
  } else if (finalMPa < 25) {
    gostClass = "B15 / M200";
    description = "Light slab, fence footing, interior screed";
  } else if (finalMPa < 30) {
    gostClass = "B20 / M250";
    description = "Standard low-rise residential foundation";
  } else if (finalMPa < 35) {
    gostClass = "B22.5 / M300";
    description = "Heavy slab, retaining wall, driveway";
  } else if (finalMPa < 40) {
    gostClass = "B25 / M350";
    description = "High-load commercial foundation & column";
  } else if (finalMPa < 45) {
    gostClass = "B30 / M400";
    description = "Bridge pier, high-rise slab & heavy industrial";
  } else if (finalMPa < 50) {
    gostClass = "B35 / M450";
    description = "Prestressed structural beam & hydraulic dam";
  } else {
    gostClass = "B40 / M500+";
    description = "Ultra-high strength heavy infrastructure";
  }

  return {
    strengthMPa: parseFloat(finalMPa.toFixed(1)),
    strengthPSI: psi,
    gostClass,
    description,
  };
}

/**
 * Calculates Order Breakdown with calculated vs purchasable material quantities.
 */
export function calculateOrderBreakdown(input: ConcreteMixInput): OrderBreakdown {
  const vol = Math.max(0.1, input.volumeM3);
  const wastage = Math.max(0, input.wastagePercent) / 100.0;
  const effectiveVolumeM3 = vol * (1 + wastage);

  const calculatedCementKg = input.cementKg * effectiveVolumeM3;
  const calculatedSandKg = input.sandKg * effectiveVolumeM3;
  const calculatedGravelKg = input.gravelKg * effectiveVolumeM3;
  const calculatedWaterLiters = input.waterLiters * effectiveVolumeM3;
  const calculatedRebarKg = input.rebarKgPerM3 * effectiveVolumeM3;

  // Round UP for purchasable packaged items
  const purchasableCementBags50kg = Math.ceil(calculatedCementKg / 50.0);
  const purchasableSandBags25kg = Math.ceil(calculatedSandKg / 25.0);
  const purchasableGravelBags25kg = Math.ceil(calculatedGravelKg / 25.0);

  const sandDensity = MATERIALS_DATA.sand.densityKgPerM3;
  const gravelDensity = MATERIALS_DATA.gravel.densityKgPerM3;

  const sandVolumeM3 = parseFloat((calculatedSandKg / sandDensity).toFixed(2));
  const gravelVolumeM3 = parseFloat((calculatedGravelKg / gravelDensity).toFixed(2));

  const rebarMeters = rebarKgToMeters(calculatedRebarKg, input.rebarDiameterMm);

  // Standard ready-mix transit mixer capacity is ~7.0 m3
  const truckloads = Math.ceil(effectiveVolumeM3 / 7.0);

  return {
    calculatedCementKg: parseFloat(calculatedCementKg.toFixed(1)),
    purchasableCementBags50kg,
    calculatedSandKg: parseFloat(calculatedSandKg.toFixed(1)),
    purchasableSandBags25kg,
    sandVolumeM3,
    calculatedGravelKg: parseFloat(calculatedGravelKg.toFixed(1)),
    purchasableGravelBags25kg,
    gravelVolumeM3,
    waterLiters: Math.round(calculatedWaterLiters),
    calculatedRebarKg: parseFloat(calculatedRebarKg.toFixed(1)),
    rebarMeters,
    truckloads,
    volumeM3: vol,
    effectiveVolumeM3: parseFloat(effectiveVolumeM3.toFixed(2)),
  };
}

/**
 * Computes Cost Breakdown for a mix input.
 */
export function calculateCostBreakdown(
  input: ConcreteMixInput,
  order: OrderBreakdown,
  deliveryFeeAMD: number = 0
): CostBreakdown {
  const vol = Math.max(0.1, input.volumeM3);
  const isBagged = input.packaging === "bagged";
  const p = input.prices;

  // 1. Cement cost
  let cementAMD = 0;
  if (isBagged) {
    const bagPrice = p.cementUnit === "AMD/50kg" ? p.cementPriceAMD : normalizeCementPriceAMDPerKg(p.cementPriceAMD, p.cementUnit) * 50;
    cementAMD = order.purchasableCementBags50kg * bagPrice;
  } else {
    const pricePerKg = normalizeCementPriceAMDPerKg(p.cementPriceAMD, p.cementUnit);
    cementAMD = order.calculatedCementKg * pricePerKg;
  }

  // 2. Sand cost
  let sandAMD = 0;
  if (p.sandPackaging === "bagged") {
    const bagPrice = p.sandUnit === "AMD/25kg" ? p.sandPriceAMD : normalizeAggregatePriceAMDPerKg(p.sandPriceAMD, p.sandUnit, 1500) * 25;
    sandAMD = order.purchasableSandBags25kg * bagPrice;
  } else {
    const pricePerKg = normalizeAggregatePriceAMDPerKg(p.sandPriceAMD, p.sandUnit, 1500);
    sandAMD = order.calculatedSandKg * pricePerKg;
  }

  // 3. Gravel cost
  let gravelAMD = 0;
  if (p.gravelPackaging === "bagged") {
    const bagPrice = p.gravelUnit === "AMD/25kg" ? p.gravelPriceAMD : normalizeAggregatePriceAMDPerKg(p.gravelPriceAMD, p.gravelUnit, 1450) * 25;
    gravelAMD = order.purchasableGravelBags25kg * bagPrice;
  } else {
    const pricePerKg = normalizeAggregatePriceAMDPerKg(p.gravelPriceAMD, p.gravelUnit, 1450);
    gravelAMD = order.calculatedGravelKg * pricePerKg;
  }

  // 4. Water cost
  const waterPricePerLiter = normalizeWaterPriceAMDPerLiter(p.waterPriceAMD, p.waterUnit);
  const waterAMD = order.waterLiters * waterPricePerLiter;

  // 5. Rebar cost
  const rebarPricePerKg = normalizeRebarPriceAMDPerKg(p.rebarPriceAMD, p.rebarUnit, p.rebarDiameterMm);
  const rebarAMD = order.calculatedRebarKg * rebarPricePerKg;

  const totalAMD = Math.round(cementAMD + sandAMD + gravelAMD + waterAMD + rebarAMD + deliveryFeeAMD);
  const costPerM3AMD = Math.round(totalAMD / vol);

  return {
    cementAMD: Math.round(cementAMD),
    sandAMD: Math.round(sandAMD),
    gravelAMD: Math.round(gravelAMD),
    waterAMD: Math.round(waterAMD),
    rebarAMD: Math.round(rebarAMD),
    deliveryAMD: Math.round(deliveryFeeAMD),
    totalAMD,
    costPerM3AMD,
  };
}

/**
 * Computes Embodied Carbon Breakdown for a mix input.
 */
export function calculateCarbonBreakdown(
  input: ConcreteMixInput,
  order: OrderBreakdown
): CarbonBreakdown {
  const vol = Math.max(0.1, input.volumeM3);
  const cementMeta = CEMENT_PROPERTIES[input.cementType];

  const cementCO2 = order.calculatedCementKg * cementMeta.carbonKgPerKg;
  const sandCO2 = order.calculatedSandKg * MATERIALS_DATA.sand.carbonKgPerUnit;
  const gravelCO2 = order.calculatedGravelKg * MATERIALS_DATA.gravel.carbonKgPerUnit;
  const waterCO2 = order.waterLiters * MATERIALS_DATA.water.carbonKgPerUnit;
  const rebarCO2 = order.calculatedRebarKg * MATERIALS_DATA.rebar.carbonKgPerUnit;

  const totalCO2 = cementCO2 + sandCO2 + gravelCO2 + waterCO2 + rebarCO2;
  const co2PerM3 = totalCO2 / vol;

  return {
    cementCO2: parseFloat(cementCO2.toFixed(1)),
    sandCO2: parseFloat(sandCO2.toFixed(1)),
    gravelCO2: parseFloat(gravelCO2.toFixed(1)),
    waterCO2: parseFloat(waterCO2.toFixed(1)),
    rebarCO2: parseFloat(rebarCO2.toFixed(1)),
    totalCO2: parseFloat(totalCO2.toFixed(1)),
    co2PerM3: parseFloat(co2PerM3.toFixed(1)),
  };
}

export const ENGINEERING_MIX_DESIGN_DISCLAIMER =
  "Notice: This calculation is an engineering estimate for material quantity, procurement, and cost. Final structural concrete proportions must be validated according to the applicable concrete design standards (EN 206 / ACI 211 / GOST) and verified with laboratory trial batches prior to construction.";
