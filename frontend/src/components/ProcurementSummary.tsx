"use client";

import React from "react";
import { CandidateMix } from "@/types/concrete";
import { ShoppingCart, Truck, CheckCircle, Package, ArrowRight } from "lucide-react";

interface ProcurementSummaryProps {
  mix: CandidateMix;
}

export const ProcurementSummary: React.FC<ProcurementSummaryProps> = ({ mix }) => {
  const formatAMD = (val: number) => Math.round(val).toLocaleString("en-US");
  const o = mix.order;
  const c = mix.cost;
  const isBagged = mix.packaging === "bagged";

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Procurement & Purchasing Order Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For <strong className="text-slate-900 dark:text-slate-100">{o.volumeM3} m³</strong> of concrete (+{mix.input.wastagePercent}% wastage allowance = {o.effectiveVolumeM3} m³)
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" />
          Ready to Order
        </span>
      </div>

      {/* Material Line Items */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {/* Cement */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Cement ({mix.cementType === "ararat_m400" ? "Ararat M400" : "Iranian M500"})</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {isBagged ? "Bagged Delivery" : "Bulk Tanker"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Calculated requirement: {o.calculatedCementKg.toLocaleString("en-US")} kg
              {isBagged && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1.5">
                  → Purchase: {o.purchasableCementBags50kg} bags (50kg each, rounded UP)
                </span>
              )}
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.cementAMD)} ֏
          </span>
        </div>

        {/* Sand */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">Sand (0–5mm / 0–8mm Aggregate)</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Calculated volume: {o.sandVolumeM3} m³ ({o.calculatedSandKg.toLocaleString("en-US")} kg)
              {mix.input.prices.sandPackaging === "bagged" && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1.5">
                  → Purchase: {o.purchasableSandBags25kg} bags (25kg each)
                </span>
              )}
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.sandAMD)} ֏
          </span>
        </div>

        {/* Gravel */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">Crushed Stone / Gravel (5–15mm)</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Calculated volume: {o.gravelVolumeM3} m³ ({o.calculatedGravelKg.toLocaleString("en-US")} kg)
              {mix.input.prices.gravelPackaging === "bagged" && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1.5">
                  → Purchase: {o.purchasableGravelBags25kg} bags (25kg each)
                </span>
              )}
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.gravelAMD)} ֏
          </span>
        </div>

        {/* Water */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">Batching Water</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {o.waterLiters.toLocaleString("en-US")} Liters (Veolia Jur municipal connection)
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.waterAMD)} ֏
          </span>
        </div>

        {/* Rebar */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              Steel Rebar A500C (Ø {mix.input.rebarDiameterMm} mm)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {o.calculatedRebarKg.toLocaleString("en-US")} kg total ≈ <strong className="text-indigo-600 dark:text-indigo-400">{o.rebarMeters.toLocaleString("en-US")} meters</strong>
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.rebarAMD)} ֏
          </span>
        </div>

        {/* Delivery Logistics */}
        <div className="py-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Logistics & Delivery ({mix.supplierName})</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Estimated ready-mix transit truckloads: {o.truckloads} (~7 m³ capacity per mixer truck)
            </div>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatAMD(c.deliveryAMD)} ֏
          </span>
        </div>
      </div>

      {/* Total Sum Footer */}
      <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
            ESTIMATED TOTAL PROCUREMENT COST
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {formatAMD(c.costPerM3AMD)} ֏ per m³
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {formatAMD(c.totalAMD)} ֏
          </span>
        </div>
      </div>
    </div>
  );
};
