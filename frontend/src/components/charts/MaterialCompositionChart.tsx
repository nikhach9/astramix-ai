"use client";

import React from "react";
import { CarbonBreakdown, CostBreakdown, ConcreteMixInput } from "@/types/concrete";

interface MaterialCompositionChartProps {
  input: ConcreteMixInput;
  cost: CostBreakdown;
  carbon: CarbonBreakdown;
}

export const MaterialCompositionChart: React.FC<MaterialCompositionChartProps> = ({
  input,
  cost,
  carbon,
}) => {
  const formatAMD = (val: number) => Math.round(val).toLocaleString("en-US");

  const materials = [
    { name: "Cement", massKg: input.cementKg, costAMD: cost.cementAMD, co2Kg: carbon.cementCO2, color: "bg-indigo-500" },
    { name: "Sand", massKg: input.sandKg, costAMD: cost.sandAMD, co2Kg: carbon.sandCO2, color: "bg-amber-500" },
    { name: "Gravel", massKg: input.gravelKg, costAMD: cost.gravelAMD, co2Kg: carbon.gravelCO2, color: "bg-slate-500" },
    { name: "Water", massKg: input.waterLiters, costAMD: cost.waterAMD, co2Kg: carbon.waterCO2, color: "bg-cyan-500" },
    { name: "Rebar", massKg: input.rebarKgPerM3, costAMD: cost.rebarAMD, co2Kg: carbon.rebarCO2, color: "bg-rose-500" },
  ];

  const totalCost = cost.totalAMD || 1;
  const totalCarbon = carbon.totalCO2 || 1;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Material & Environmental Impact Breakdown
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Proportional breakdown of material mass, total financial cost, and embodied carbon emissions.
        </p>
      </div>

      {/* Financial Cost Stack Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <span>Cost Share (Total: {formatAMD(cost.totalAMD)} ֏)</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatAMD(cost.costPerM3AMD)} ֏ / m³</span>
        </div>
        <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
          {materials.map((m) => {
            const pct = Math.max(1, Math.round((m.costAMD / totalCost) * 100));
            return (
              <div
                key={m.name}
                className={`${m.color} h-full transition-all`}
                style={{ width: `${pct}%` }}
                title={`${m.name}: ${formatAMD(m.costAMD)} ֏ (${pct}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Embodied Carbon Stack Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <span>Embodied CO₂ Share (Total: {carbon.totalCO2} kg)</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">{carbon.co2PerM3} kg CO₂ / m³</span>
        </div>
        <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
          {materials.map((m) => {
            const pct = Math.max(1, Math.round((m.co2Kg / totalCarbon) * 100));
            return (
              <div
                key={m.name}
                className={`${m.color} opacity-85 h-full transition-all`}
                style={{ width: `${pct}%` }}
                title={`${m.name}: ${m.co2Kg} kg CO₂ (${pct}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Legend & Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        {materials.map((m) => (
          <div key={m.name} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <span className={`h-2.5 w-2.5 rounded-full ${m.color} shrink-0`} />
              <span>{m.name}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <div>{m.massKg} kg/m³</div>
              <div>{formatAMD(m.costAMD)} ֏</div>
              <div>{m.co2Kg} kg CO₂</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
