import { PriceUnit, RebarDiameter } from "../types/concrete";

/**
 * Calculates linear mass density of steel rebar in kg per meter based on diameter d (mm).
 * Formula: Mass/meter = pi * (d / 2000)^2 * 7850 kg/m3
 */
export function getRebarKgPerMeter(diameterMm: RebarDiameter): number {
  const radiusMeters = diameterMm / 2000.0;
  const areaM2 = Math.PI * Math.pow(radiusMeters, 2);
  const steelDensityKgPerM3 = 7850.0;
  return parseFloat((areaM2 * steelDensityKgPerM3).toFixed(3));
}

/**
 * Converts rebar length in meters to mass in kg for a given diameter.
 */
export function rebarMetersToKg(meters: number, diameterMm: RebarDiameter): number {
  const kgPerM = getRebarKgPerMeter(diameterMm);
  return parseFloat((meters * kgPerM).toFixed(2));
}

/**
 * Converts rebar mass in kg to length in meters for a given diameter.
 */
export function rebarKgToMeters(kg: number, diameterMm: RebarDiameter): number {
  const kgPerM = getRebarKgPerMeter(diameterMm);
  if (kgPerM <= 0) return 0;
  return parseFloat((kg / kgPerM).toFixed(2));
}

/**
 * Normalizes cement price to AMD per kg.
 */
export function normalizeCementPriceAMDPerKg(price: number, unit: PriceUnit): number {
  if (price <= 0) return 0;
  switch (unit) {
    case 'AMD/50kg':
      return price / 50.0;
    case 'AMD/tonne':
      return price / 1000.0;
    case 'AMD/kg':
      return price;
    default:
      return price / 50.0;
  }
}

/**
 * Normalizes aggregate (sand/gravel) price to AMD per kg.
 */
export function normalizeAggregatePriceAMDPerKg(
  price: number,
  unit: PriceUnit,
  densityKgPerM3: number = 1500
): number {
  if (price <= 0) return 0;
  switch (unit) {
    case 'AMD/m3':
      return price / densityKgPerM3;
    case 'AMD/25kg':
      return price / 25.0;
    case 'AMD/50kg':
      return price / 50.0;
    case 'AMD/tonne':
      return price / 1000.0;
    case 'AMD/kg':
      return price;
    default:
      return price / densityKgPerM3;
  }
}

/**
 * Normalizes water price to AMD per Liter.
 */
export function normalizeWaterPriceAMDPerLiter(price: number, unit: PriceUnit): number {
  if (price <= 0) return 0;
  switch (unit) {
    case 'AMD/m3':
      return price / 1000.0;
    case 'AMD/liter':
      return price;
    default:
      return price / 1000.0;
  }
}

/**
 * Normalizes rebar price to AMD per kg.
 */
export function normalizeRebarPriceAMDPerKg(
  price: number,
  unit: PriceUnit,
  diameterMm: RebarDiameter = 12
): number {
  if (price <= 0) return 0;
  if (unit === 'AMD/meter') {
    const kgPerM = getRebarKgPerMeter(diameterMm);
    return kgPerM > 0 ? price / kgPerM : price;
  }
  if (unit === 'AMD/tonne') {
    return price / 1000.0;
  }
  return price; // AMD/kg
}

/**
 * Converts price per kg of rebar to price per meter for a specific diameter.
 */
export function convertRebarAMDPerKgToMeter(pricePerKg: number, diameterMm: RebarDiameter): number {
  const kgPerM = getRebarKgPerMeter(diameterMm);
  return Math.round(pricePerKg * kgPerM);
}
