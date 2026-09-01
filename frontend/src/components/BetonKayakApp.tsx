"use client";

import React, { useMemo, useState } from "react";
import { ConcreteMixInput, ProjectPreset, SortMode } from "@/types/concrete";
import { PROJECT_PRESETS } from "@/data/marketData";
import { calculateMarketSavings, evaluateAllOffers, sortConcreteResults } from "@/utils/optimizer";
import { validateConcreteMixInput } from "@/utils/validation";
import { MixCalculator } from "@/components/MixCalculator";
import { ResultCard } from "@/components/ResultCard";
import {
  Award,
  DollarSign,
  Filter,
  Flame,
  Leaf,
  Layers,
  Sparkles,
  TrendingDown,
  Zap,
  Building,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const BetonKayakApp: React.FC = () => {
  // Default to Foundation preset
  const [input, setInput] = useState<ConcreteMixInput>(PROJECT_PRESETS.foundation.input);
  const [activePreset, setActivePreset] = useState<ProjectPreset | null>('foundation');
  const [sortMode, setSortMode] = useState<SortMode>('best_overall');

  // Handle Preset selection
  const handlePresetSelect = (presetKey: ProjectPreset) => {
    setActivePreset(presetKey);
    setInput(PROJECT_PRESETS[presetKey].input);
  };

  // Custom input change resets active preset indicator if modified
  const handleInputChange = (newInput: ConcreteMixInput) => {
    setActivePreset(null);
    setInput(newInput);
  };

  // Evaluate and sort supplier offers in real time
  const evaluatedResults = useMemo(() => {
    const raw = evaluateAllOffers(input);
    return sortConcreteResults(raw, sortMode);
  }, [input, sortMode]);

  // Compute market savings delta
  const bestResult = evaluatedResults[0];
  const savingsDelta = useMemo(() => {
    if (!bestResult) return { costSavedAMD: 0, carbonSavedKg: 0, percentCostSaved: 0, percentCarbonSaved: 0 };
    return calculateMarketSavings(bestResult, input.volumeM3);
  }, [bestResult, input.volumeM3]);

  const validation = validateConcreteMixInput(input);
  const formatAMD = (val: number) => new Intl.NumberFormat("hy-AM").format(val);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24">
      {/* Top Header & Brand Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  BetonKayak
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Armenia Market
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-Time Concrete Cost, Quality & Carbon Aggregator
              </p>
            </div>
          </div>

          {/* Quick Preset Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 hidden sm:inline">Presets:</span>
            {(Object.keys(PROJECT_PRESETS) as ProjectPreset[]).map((key) => {
              const preset = PROJECT_PRESETS[key];
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {preset.name.split("/")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Layout (Split View: Inputs on Left, Results on Right) */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Invalid Executive Warning Alert */}
        {!validation.isExecutable && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/80 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Unsafe Mix Configuration Detected</h4>
              <p className="text-xs mt-0.5 opacity-90">
                The current inputs violate structural engineering safety rules (water-cement ratio or aggregate ratio). Adjust the sliders on the left to restore green structural status.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Inputs & Real-Time Controls (5 Cols) */}
          <div className="lg:col-span-5">
            <MixCalculator
              input={input}
              onChange={handleInputChange}
              activePreset={activePreset}
              onPresetSelect={handlePresetSelect}
            />
          </div>

          {/* Right Panel: Kayak Offers & Results (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Quick-Sort Bar (Best Overall, Cheapest, Eco-Greenest, Max Durability) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Sort Deals By:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSortMode('best_overall')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === 'best_overall'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Best Value</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode('cheapest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === 'cheapest'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Cheapest</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode('eco_greenest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === 'eco_greenest'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Leaf className="h-3.5 w-3.5" />
                  <span>Eco-Green</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode('max_durability')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === 'max_durability'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Strength</span>
                </button>
              </div>
            </div>

            {/* Results Counter Banner */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Showing {evaluatedResults.length} Armenian Supplier & Material Combinations</span>
              <span className="font-mono">Volume: {input.volumeM3} m³</span>
            </div>

            {/* Result Cards List */}
            <div className="flex flex-col gap-4">
              {evaluatedResults.map((result, idx) => (
                <ResultCard
                  key={result.supplier.id + idx}
                  result={result}
                  isFeatured={idx === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Real-Time Summary & Savings Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Real-Time Optimization Savings Delta</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  -{savingsDelta.percentCostSaved}% Cost | -{savingsDelta.percentCarbonSaved}% CO₂
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                You save <strong className="text-emerald-600 dark:text-emerald-400">{formatAMD(savingsDelta.costSavedAMD)} ֏</strong> and <strong className="text-emerald-600 dark:text-emerald-400">{savingsDelta.carbonSavedKg} kg of CO₂</strong> compared to unoptimized Armenian market averages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
            <div className="text-right hidden md:block">
              <span className="text-slate-400 block text-[10px]">Best Total AMD</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {bestResult ? formatAMD(bestResult.cost.totalAMD) : 0} ֏
              </span>
            </div>
            <div className="text-right hidden md:block">
              <span className="text-slate-400 block text-[10px]">28-Day Strength</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                {bestResult ? bestResult.strength.strengthMPa : 0} MPa
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
