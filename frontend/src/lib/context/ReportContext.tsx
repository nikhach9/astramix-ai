"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ReportData, readSavedReport, persistReport, clearSavedReport, REPORT_EVENT } from "@/lib/utils/reportStorage";
export type { ReportData } from "@/lib/utils/reportStorage";

interface ReportContextValue {
  report: ReportData;
  setReportSection: <K extends keyof ReportData>(key: K, value: ReportData[K]) => void;
  clearReport: () => void;
}
const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [report, setReport] = useState<ReportData>({});
  useEffect(() => {
    const refresh = () => setReport(readSavedReport());
    refresh();
    window.addEventListener(REPORT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(REPORT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const setReportSection: ReportContextValue["setReportSection"] = (key, value) => {
    setReport(previous => persistReport({ ...previous, [key]: value }));
  };
  const clearReport = () => { clearSavedReport(); setReport({}); };
  return <ReportContext.Provider value={{ report, setReportSection, clearReport }}>{children}</ReportContext.Provider>;
}

export function useReport(): ReportContextValue {
  const context = useContext(ReportContext);
  if (!context) throw new Error("useReport must be used within a ReportProvider");
  return context;
}
