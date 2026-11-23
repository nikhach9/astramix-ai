import type { ConcreteMixInput } from "@/types/mix";
import type { StrengthPrediction, CO2Estimate, CostEstimate, OptimizedMixResult } from "@/types/predictions";

export interface ReportData {
  strength?: StrengthPrediction;
  co2?: CO2Estimate;
  cost?: CostEstimate;
  optimized?: OptimizedMixResult;
  createdAt?: string;
  provenance?: Record<string, unknown>;
  request?: Record<string, unknown>;
  search?: Record<string, unknown>;
  incompleteSections?: string[];
  knownSubtotals?: Record<string, number>;
  provenanceStatus?: "recorded" | "not_recorded" | "legacy_missing";
  storageNotice?: string;
}

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
  co2?: { totalCo2KgPerM3: number; breakdownKgPerM3?: Record<string, number>; isComplete?: boolean };
  cost?: { currency: string; totalCostPerM3: number; breakdownPerM3?: Record<string, number>; isComplete?: boolean };
  provenance?: Record<string, unknown>;
  request?: Record<string, unknown>;
  search?: Record<string, unknown>;
}

export const REPORT_EVENT = "astramix-report-updated";
const STORAGE_KEY = "astramix:report:v2";
const LEGACY_KEY = "astramix:report";
let memoryReport: ReportData = {};
let memoryOnly = false;

export function readSavedReport(): ReportData {
  if (typeof window === "undefined") return {};
  if (memoryOnly) return memoryReport;
  try {
    let local: string | null = null, session: string | null = null, legacy: string | null = null;
    try { local = window.localStorage.getItem(STORAGE_KEY); } catch { /* Try session storage independently. */ }
    try { session = window.sessionStorage.getItem(STORAGE_KEY); legacy = window.sessionStorage.getItem(LEGACY_KEY); } catch { /* The in-memory result remains usable. */ }
    const entries: { value: string; savedAt: number }[] = [];
    let corruptEntry = false;
    for (const value of [session, local]) {
      if (value === null) continue;
      try {
        const envelope = JSON.parse(value);
        if (envelope.version !== 2 || !envelope.data || typeof envelope.data !== "object") throw new Error("Invalid envelope");
        entries.push({ value, savedAt: Number(envelope.savedAt ?? 0) });
      } catch { corruptEntry = true; }
    }
    const raw = entries.sort((a, b) => b.savedAt - a.savedAt).at(0)?.value ?? null;
    if (raw === null && legacy === null && corruptEntry) throw new Error("Unreadable report");
    if (raw === null && legacy === null) return memoryReport;
    const parsed = JSON.parse(raw ?? legacy!);
    const data = raw !== null ? (parsed.version === 2 ? parsed.data : null) : parsed;
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid report schema");
    for (const [section, field] of [["strength", "predictedStrengthMPa"], ["co2", "totalCO2KgPerM3"], ["cost", "totalCostPerM3"]]) {
      if (data[section] && (!data[section].mix || !Number.isFinite(data[section][field]))) {
        throw new Error(`Invalid ${section} result`);
      }
    }
    if (data.optimized && (!data.optimized.mix || !Array.isArray(data.optimized.warnings) ||
      ["predictedStrengthMPa", "co2KgPerM3", "costPerM3", "objectiveValue"].some(key => !Number.isFinite(data.optimized[key])))) {
      throw new Error("Invalid optimized result");
    }
    memoryReport = raw === null ? { ...data, provenanceStatus: "legacy_missing" } : data;
    return memoryReport;
  } catch {
    return { ...memoryReport, storageNotice: "Saved report storage could not be read. Results remain available in this tab when possible." };
  }
}

export function persistReport(data: ReportData): ReportData {
  memoryReport = data;
  if (typeof window === "undefined") return data;
  memoryOnly = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, savedAt: Date.now(), data }));
    memoryOnly = false;
  } catch {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, savedAt: Date.now(), data }));
      memoryReport = { ...data, storageNotice: "Saved for this browser session only." };
      memoryOnly = true; // Read the current snapshot rather than an older local-storage record.
    } catch {
      memoryReport = { ...data, storageNotice: "Browser storage is unavailable. Keep this tab open or download the report." };
    }
  }
  queueMicrotask(() => window.dispatchEvent(new Event(REPORT_EVENT)));
  return memoryReport;
}

export function clearSavedReport(): void {
  memoryReport = {};
  memoryOnly = true;
  if (typeof window === "undefined") return;
  let cleared = true;
  for (const [name, key] of [["localStorage", STORAGE_KEY], ["sessionStorage", STORAGE_KEY], ["sessionStorage", LEGACY_KEY]] as const) {
    try { window[name].removeItem(key); } catch { cleared = false; }
  }
  memoryOnly = !cleared;
  queueMicrotask(() => window.dispatchEvent(new Event(REPORT_EVENT)));
}

export function saveLastReport(payload: SavedReportPayload): void {
  const incomplete: string[] = [];
  const subtotals: Record<string, number> = {};
  if (payload.cost?.isComplete === false) {
    incomplete.push("cost"); subtotals.cost = payload.cost.totalCostPerM3;
  }
  if (payload.co2?.isComplete === false) {
    incomplete.push("emissions"); subtotals.emissions = payload.co2.totalCo2KgPerM3;
  }
  persistReport({
    createdAt: payload.createdAt,
    strength: payload.strength ? {
      mix: payload.mix, predictedStrengthMPa: payload.strength.predictedStrengthMPa,
      modelUsed: payload.strength.modelVersion ?? "unversioned",
      warnings: payload.strength.warnings,
      estimatedErrorRMSEMPa: payload.strength.estimatedErrorRMSEMPa,
      estimatedErrorMAEMPa: payload.strength.estimatedErrorMAEMPa,
    } : undefined,
    co2: payload.co2 && payload.co2.isComplete !== false ? {
      mix: payload.mix, totalCO2KgPerM3: payload.co2.totalCo2KgPerM3, breakdown: payload.co2.breakdownKgPerM3 ?? {},
    } : undefined,
    cost: payload.cost && payload.cost.isComplete !== false ? {
      mix: payload.mix, totalCostPerM3: payload.cost.totalCostPerM3,
      currency: payload.cost.currency, breakdown: payload.cost.breakdownPerM3 ?? {},
    } : undefined,
    provenance: payload.provenance, request: payload.request, search: payload.search,
    incompleteSections: incomplete, knownSubtotals: subtotals,
    provenanceStatus: payload.provenance ? "recorded" : "not_recorded",
  });
}
