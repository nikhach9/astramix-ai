import { ConcreteMixInput } from "@/types/mix";

const STORAGE_KEY = "astramix:report";

export interface SavedReportPayload {
  createdAt: string;
  mix: ConcreteMixInput;
  strength?: {
    predictedStrengthMPa: number;
    ageDays?: number;
    waterCementRatio?: number;
    waterBinderRatio?: number;
    modelVersion?: string;
    warnings?: string[];
    estimatedErrorRMSEMPa?: number;
    estimatedErrorMAEMPa?: number;
  };
  co2?: {
    totalCo2KgPerM3: number;
    breakdownKgPerM3?: Record<string, number>;
  };
  cost?: {
    currency: string;
    totalCostPerM3: number;
    breakdownPerM3?: Record<string, number>;
  };
}

export function saveLastReport(payload: SavedReportPayload): void {
  if (typeof window === "undefined") return;
  try {
    const reportData = {
      strength: payload.strength
        ? {
            mix: payload.mix,
            predictedStrengthMPa: payload.strength.predictedStrengthMPa,
            modelUsed: payload.strength.modelVersion ?? "xgb_v1",
            warnings: payload.strength.warnings ?? [],
            estimatedErrorRMSEMPa: payload.strength.estimatedErrorRMSEMPa,
            estimatedErrorMAEMPa: payload.strength.estimatedErrorMAEMPa,
          }
        : undefined,
      co2: payload.co2
        ? {
            mix: payload.mix,
            totalCO2KgPerM3: payload.co2.totalCo2KgPerM3,
            breakdown: payload.co2.breakdownKgPerM3 ?? {},
          }
        : undefined,
      cost: payload.cost
        ? {
            mix: payload.mix,
            totalCostPerM3: payload.cost.totalCostPerM3,
            currency: payload.cost.currency,
            breakdown: payload.cost.breakdownPerM3 ?? {},
          }
        : undefined,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
  } catch {
    // ignore storage errors
  }
}
