"use client";

import React, { useState } from "react";
import { ConcreteResult } from "@/types/concrete";
import { getStatusStyle } from "@/utils/validation";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  Truck,
  Zap,
  Info,
  Building2,
  DollarSign,
} from "lucide-react";

interface ResultCardProps {
  result: ConcreteResult;
  isFeatured?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, isFeatured = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showOrderSheet, setShowOrderSheet] = useState(false);

  const costStyle = getStatusStyle(result.costTrafficLight);
  const carbonStyle = getStatusStyle(result.carbonTrafficLight);

  const formatAMD = (val: number) => new Intl.NumberFormat("hy-AM").format(val);

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
        isFeatured || result.badges.isBestOverall
          ? "border-indigo-500/80 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
      }`}
    >
      {/* Top Banner for Best Overall */}
      {result.badges.isBestOverall && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1 text-center text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Award className="h-3.5 w-3.5" />
          <span>Kayak #1 Best Overall Value Pick</span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Header: Supplier Info & Kayak Score */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {result.supplier.name}
              </h3>
              {result.supplier.isLocal && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Armenia Stock
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                {result.supplier.location}
              </span>
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <Star className="h-3 w-3 fill-amber-400" />
                {result.supplier.rating}
              </span>
            </div>
          </div>

          {/* Kayak Score Badge */}
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-baseline gap-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg">
              <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {result.kayakScore}
              </span>
              <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500">/100</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5">Kayak Score</span>
          </div>
        </div>

        {/* Dynamic Feature Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {result.badges.isLowestPrice && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              🟢 Lowest Price
            </span>
          )}
          {result.badges.isEcoFriendly && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <Leaf className="h-3 w-3" /> Eco-Friendly
            </span>
          )}
          {result.badges.isTopStrength && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Zap className="h-3 w-3" /> Top Structural Grade
            </span>
          )}
        </div>

        {/* Traffic Light Badges Grid (Cost, Carbon, Strength) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
          {/* A. Cost Index */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Cost</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                {formatAMD(result.cost.totalAMD)} ֏
              </span>
            </div>
            <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${costStyle.badgeBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${costStyle.dotBg}`} />
              <span>{formatAMD(result.cost.costPerM3AMD)} ֏/m³</span>
            </div>
          </div>

          {/* B. Carbon Footprint */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Embodied Carbon</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                {result.carbon.totalCO2} kg CO₂
              </span>
            </div>
            <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${carbonStyle.badgeBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${carbonStyle.dotBg}`} />
              <span>{result.carbon.co2PerM3} kg/m³</span>
            </div>
          </div>

          {/* C. Structural Strength Forecast */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">28-Day Strength Forecast</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {result.strength.strengthMPa} MPa
              </span>
              <span className="text-xs text-slate-400 font-mono">({result.strength.strengthPSI} PSI)</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 w-fit">
              <ShieldCheck className="h-3 w-3" />
              <span>{result.strength.gostClass}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cost Breakdown & Order Sheet */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>Cost & Carbon Breakdown</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowOrderSheet(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Order Breakdown Sheet</span>
          </button>
        </div>

        {/* Cost Breakdown Accordion */}
        {showDetails && (
          <div className="mt-2 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 border-b border-slate-200 dark:border-slate-800 pb-1">
              Detailed Itemized Summary ({result.order.volumeM3} m³ total)
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Cement ({result.order.cementBags50kg} bags / bulk)</span>
              <span className="font-mono font-medium">{formatAMD(result.cost.cementAMD)} ֏ ({result.carbon.cementCO2} kg CO₂)</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sand (0-5/0-8mm)</span>
              <span className="font-mono font-medium">{formatAMD(result.cost.sandAMD)} ֏ ({result.carbon.sandCO2} kg CO₂)</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Gravel / Crushed Stone</span>
              <span className="font-mono font-medium">{formatAMD(result.cost.gravelAMD)} ֏ ({result.carbon.gravelCO2} kg CO₂)</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Water (Veolia Jur)</span>
              <span className="font-mono font-medium">{formatAMD(result.cost.waterAMD)} ֏ ({result.carbon.waterCO2} kg CO₂)</span>
            </div>
            {result.cost.rebarAMD > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Steel Rebar (A500C)</span>
                <span className="font-mono font-medium">{formatAMD(result.cost.rebarAMD)} ֏ ({result.carbon.rebarCO2} kg CO₂)</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Supplier Delivery Fee ({result.supplier.name})</span>
              <span className="font-mono font-medium">{formatAMD(result.cost.deliveryAMD)} ֏</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-slate-100">
              <span>Total Delivered Project Cost</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatAMD(result.cost.totalAMD)} ֏</span>
            </div>
          </div>
        )}
      </div>

      {/* Order Breakdown Sheet Modal */}
      {showOrderSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Order & Truckload Sheet</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderSheet(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculated order quantities for <strong className="text-slate-800 dark:text-slate-200">{result.supplier.name}</strong> to deliver <strong className="text-slate-800 dark:text-slate-200">{result.order.volumeM3} m³</strong> of concrete.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Cement (50 kg bags)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.order.cementBags50kg} bags
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Ready-Mix Truckloads</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.order.truckloads} truck(s)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Sand (25 kg bags)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.order.sandBags25kg} bags
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Gravel (25 kg bags)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {result.order.gravelBags25kg} bags
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <span>
                Total estimated payment at supplier: <strong>{formatAMD(result.cost.totalAMD)} ֏</strong>. Delivery fee included ({formatAMD(result.cost.deliveryAMD)} ֏).
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOrderSheet(false)}
              className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              Close Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
