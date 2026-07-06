"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { StrengthPrediction, CO2Estimate, CostEstimate, OptimizedMixResult } from "@/types/predictions";

export interface ReportData {
  strength?: StrengthPrediction;
  co2?: CO2Estimate;
  cost?: CostEstimate;
  optimized?: OptimizedMixResult;
}

interface ReportContextValue {
  report: ReportData;
  setReportSection: <K extends keyof ReportData>(key: K, value: ReportData[K]) => void;
  clearReport: () => void;
}

const STORAGE_KEY = "astramix:report";

const ReportContext = createContext<ReportContextValue | null>(null);

function readFromStorage(): ReportData {
  if (typeof window === "undefined") return {};
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ReportData;
    return {};
  } catch {
    // Corrupted or stale-schema payload — drop it rather than crash the app.
    window.sessionStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export function ReportProvider({ children }: { children: ReactNode }) {
  const [report, setReport] = useState<ReportData>({});

  // Hydrate from sessionStorage on mount. Deferred to an effect because
  // sessionStorage is only available client-side.
  useEffect(() => {
    setReport(readFromStorage());
  }, []);

  const setReportSection: ReportContextValue["setReportSection"] = (key, value) => {
    setReport(prev => {
      const next = { ...prev, [key]: value };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // sessionStorage can throw in private-browsing / quota-exceeded cases.
        // Non-fatal: in-memory state still works for the current session.
      }
      return next;
    });
  };

  const clearReport = () => {
    setReport({});
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <ReportContext.Provider value={{ report, setReportSection, clearReport }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return ctx;
}
