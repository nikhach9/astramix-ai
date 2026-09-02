"use client";

import React from "react";
import { CARBON_TRANSPARENCY_META } from "@/data/marketData";
import { X, Info, ExternalLink, ShieldCheck } from "lucide-react";

interface CarbonTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CarbonTransparencyModal: React.FC<CarbonTransparencyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Embodied Carbon Data Transparency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data sources, LCA methodology, and regional emission factor calibration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Embodied carbon emissions represent cradle-to-gate greenhouse gas (GHG) emissions calculated per unit mass of concrete materials according to ISO 14040/44 Life Cycle Assessment (LCA) standards.
          </p>

          <div className="space-y-3 mt-2">
            {Object.entries(CARBON_TRANSPARENCY_META).map(([key, meta]) => (
              <div
                key={key}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{meta.material}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {meta.factorKgCO2PerKg} {meta.unit}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                  <div><strong>Source:</strong> {meta.source}</div>
                  <div className="flex items-center justify-between">
                    <span><strong>Region:</strong> {meta.region}</span>
                    <span className="text-slate-400 font-mono">Updated: {meta.confidence.lastUpdated}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-start gap-2 text-[11px]">
            <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <p>
              Note: Regional emission factors are continuously updated as local Environmental Product Declarations (EPDs) from Armenian cement producers become available. You can adjust default factors in Advanced Controls.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            Close Transparency View
          </button>
        </div>
      </div>
    </div>
  );
};
