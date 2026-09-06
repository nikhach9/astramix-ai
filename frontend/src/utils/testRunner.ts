import {
  convertRebarAMDPerKgToMeter,
  getRebarKgPerMeter,
  normalizeAggregatePriceAMDPerKg,
  normalizeCementPriceAMDPerKg,
  normalizeRebarPriceAMDPerKg,
  rebarKgToMeters,
  rebarMetersToKg,
} from "./units";
import {
  validateConcreteMixInput,
  validateConcreteVolume,
  validateMaterialPrice,
  validateWaterCementRatio,
} from "./validation";
import {
  calculateCarbonBreakdown,
  calculateCostBreakdown,
  calculateOrderBreakdown,
  calculateStrengthForecast,
} from "./calculator";
import {
  calculateMarketSavings,
  generateCandidateMixes,
  getMetricTrafficLights,
  normalizeWeights,
} from "./optimizer";
import { PROJECT_PRESETS } from "../data/marketData";
import { ConcreteMixInput } from "../types/concrete";

export function runAutomatedTests() {
  const testResults: { testName: string; passed: boolean; details?: string }[] = [];

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      testResults.push({ testName, passed: true, details });
    } else {
      testResults.push({ testName, passed: false, details });
    }
  }

  const baseInput: ConcreteMixInput = PROJECT_PRESETS.foundation.input;

  // Test 1: 1 m³ project calculation
  try {
    const input1 = { ...baseInput, volumeM3: 1 };
    const order1 = calculateOrderBreakdown(input1);
    const cost1 = calculateCostBreakdown(input1, order1);
    assert(order1.volumeM3 === 1 && cost1.totalAMD > 0, "1. 1 m³ Project Calculation");
  } catch (e: any) {
    assert(false, "1. 1 m³ Project Calculation", e.message);
  }

  // Test 2: 10 m³ project calculation
  try {
    const input10 = { ...baseInput, volumeM3: 10 };
    const order10 = calculateOrderBreakdown(input10);
    const cost10 = calculateCostBreakdown(input10, order10);
    assert(order10.volumeM3 === 10 && cost10.totalAMD > 0, "2. 10 m³ Project Calculation");
  } catch (e: any) {
    assert(false, "2. 10 m³ Project Calculation", e.message);
  }

  // Test 3: 100 m³ project calculation
  try {
    const input100 = { ...baseInput, volumeM3: 100 };
    const order100 = calculateOrderBreakdown(input100);
    assert(order100.volumeM3 === 100 && order100.truckloads >= 14, "3. 100 m³ Project Calculation");
  } catch (e: any) {
    assert(false, "3. 100 m³ Project Calculation", e.message);
  }

  // Test 4: Zero volume handling
  try {
    const volVal = validateConcreteVolume(0);
    assert(volVal.status === "red", "4. Zero Volume Handling");
  } catch (e: any) {
    assert(false, "4. Zero Volume Handling", e.message);
  }

  // Test 5: Negative volume handling
  try {
    const volVal = validateConcreteVolume(-5);
    assert(volVal.status === "red", "5. Negative Volume Handling");
  } catch (e: any) {
    assert(false, "5. Negative Volume Handling", e.message);
  }

  // Test 6: Normal cement price validation
  try {
    const val = validateMaterialPrice(2850, "CEMENT", "AMD/50kg", "ararat_m400");
    assert(val.status === "green", "6. Normal Cement Price Validation");
  } catch (e: any) {
    assert(false, "6. Normal Cement Price Validation", e.message);
  }

  // Test 7: Suspiciously low cement price detection (e.g. 500 AMD / 50kg)
  try {
    const val = validateMaterialPrice(500, "CEMENT", "AMD/50kg", "ararat_m400");
    assert(val.status === "red" && val.message.includes("Suspiciously low"), "7. Suspiciously Low Cement Price Detection");
  } catch (e: any) {
    assert(false, "7. Suspiciously Low Cement Price Detection", e.message);
  }

  // Test 8: Suspiciously high cement price detection
  try {
    const val = validateMaterialPrice(8500, "CEMENT", "AMD/50kg", "ararat_m400");
    assert(val.status === "red" && val.message.includes("Unusually high"), "8. Suspiciously High Cement Price Detection");
  } catch (e: any) {
    assert(false, "8. Suspiciously High Cement Price Detection", e.message);
  }

  // Test 9: Normal sand price validation
  try {
    const val = validateMaterialPrice(8000, "SAND", "AMD/m3");
    assert(val.status === "green", "9. Normal Sand Price Validation");
  } catch (e: any) {
    assert(false, "9. Normal Sand Price Validation", e.message);
  }

  // Test 10: Normal aggregate price validation
  try {
    const val = validateMaterialPrice(7500, "AGGREGATE", "AMD/m3");
    assert(val.status === "green", "10. Normal Aggregate Price Validation");
  } catch (e: any) {
    assert(false, "10. Normal Aggregate Price Validation", e.message);
  }

  // Test 11: Different packaging units (bulk vs bagged)
  try {
    const orderBulk = calculateOrderBreakdown({ ...baseInput, packaging: "bulk" });
    const orderBagged = calculateOrderBreakdown({ ...baseInput, packaging: "bagged" });
    assert(orderBagged.purchasableCementBags50kg > 0 && orderBulk.calculatedCementKg > 0, "11. Bulk vs Bagged Packaging Units");
  } catch (e: any) {
    assert(false, "11. Bulk vs Bagged Packaging Units", e.message);
  }

  // Test 12: kg → tonne conversion
  try {
    const priceKg = normalizeCementPriceAMDPerKg(52000, "AMD/tonne");
    assert(priceKg === 52, "12. kg → Tonne Price Normalization");
  } catch (e: any) {
    assert(false, "12. kg → Tonne Price Normalization", e.message);
  }

  // Test 13: Bag → kg conversion
  try {
    const priceKg = normalizeCementPriceAMDPerKg(2900, "AMD/50kg");
    assert(priceKg === 58, "13. Bag → kg Price Normalization");
  } catch (e: any) {
    assert(false, "13. Bag → kg Price Normalization", e.message);
  }

  // Test 14: Rebar kg ↔ metre conversion (8mm, 10mm, 12mm)
  try {
    const kg8 = getRebarKgPerMeter(8);
    const kg12 = getRebarKgPerMeter(12);
    const m = rebarKgToMeters(100, 12);
    assert(kg8 > 0.35 && kg12 > 0.85 && m > 0, "14. Rebar kg ↔ Metre Conversion");
  } catch (e: any) {
    assert(false, "14. Rebar kg ↔ Metre Conversion", e.message);
  }

  // Test 15: High CO₂ scenario traffic light
  try {
    const lights = getMetricTrafficLights(30000, 450, 360, true);
    assert(lights.carbonLight === "red", "15. High CO₂ Scenario Traffic Light");
  } catch (e: any) {
    assert(false, "15. High CO₂ Scenario Traffic Light", e.message);
  }

  // Test 16: Low CO₂ scenario traffic light
  try {
    const lights = getMetricTrafficLights(30000, 220, 320, true);
    assert(lights.carbonLight === "green", "16. Low CO₂ Scenario Traffic Light");
  } catch (e: any) {
    assert(false, "16. Low CO₂ Scenario Traffic Light", e.message);
  }

  // Test 17: High cost scenario traffic light
  try {
    const lights = getMetricTrafficLights(55000, 250, 360, true);
    assert(lights.costLight === "red", "17. High Cost Scenario Traffic Light");
  } catch (e: any) {
    assert(false, "17. High Cost Scenario Traffic Light", e.message);
  }

  // Test 18: Invalid optimization weights normalization
  try {
    const norm = normalizeWeights({ cost: 0, carbon: 0, consumption: 0, performance: 0 });
    assert(norm.cost + norm.carbon + norm.consumption + norm.performance === 100, "18. Invalid Optimization Weight Normalization");
  } catch (e: any) {
    assert(false, "18. Invalid Optimization Weight Normalization", e.message);
  }

  // Test 19: Missing carbon factor fallback
  try {
    const order = calculateOrderBreakdown(baseInput);
    const carbon = calculateCarbonBreakdown(baseInput, order);
    assert(carbon.totalCO2 > 0 && !isNaN(carbon.co2PerM3), "19. Missing Carbon Factor Fallback");
  } catch (e: any) {
    assert(false, "19. Missing Carbon Factor Fallback", e.message);
  }

  // Test 20: Mobile layout & candidate generation
  try {
    const candidates = generateCandidateMixes(baseInput);
    assert(candidates.length >= 5 && candidates[0].score > 0, "20. Candidate Generation & Multi-Objective Ranking");
  } catch (e: any) {
    assert(false, "20. Candidate Generation & Multi-Objective Ranking", e.message);
  }

  return testResults;
}

if (typeof require !== "undefined" && require.main === module) {
  const results = runAutomatedTests();
  let passedCount = 0;
  console.log("\n=================== ASTRAMIX AI AUTOMATED TEST SUITE ===================");
  results.forEach((r) => {
    if (r.passed) {
      passedCount++;
      console.log(` ✅ PASS: ${r.testName}`);
    } else {
      console.log(` ❌ FAIL: ${r.testName} ${r.details ? `(${r.details})` : ""}`);
    }
  });
  console.log(`\nRESULTS: ${passedCount} / ${results.length} PASSED.`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}
