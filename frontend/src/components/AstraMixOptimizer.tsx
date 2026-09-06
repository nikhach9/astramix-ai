"use client";

import React, { useMemo, useState } from "react";
import {
  AppMode,
  CandidateMix,
  ConcreteMixInput,
  ProjectPreset,
  SortMode,
} from "@/types/concrete";
import { PROJECT_PRESETS } from "@/data/marketData";
import {
  calculateMarketSavings,
  evaluateAllOffers,
  generateCandidateMixes,
  sortConcreteResults,
} from "@/utils/optimizer";
import { validateConcreteMixInput } from "@/utils/validation";
import { MixCalculator } from "@/components/MixCalculator";
import { ResultCard } from "@/components/ResultCard";
import { ScatterTradeoffChart } from "@/components/charts/ScatterTradeoffChart";
import { MaterialCompositionChart } from "@/components/charts/MaterialCompositionChart";
import { ProcurementSummary } from "@/components/ProcurementSummary";
import { CarbonTransparencyModal } from "@/components/CarbonTransparencyModal";
import { ENGINEERING_MIX_DESIGN_DISCLAIMER } from "@/utils/calculator";
import {
  Award,
  Filter,
  Leaf,
  TrendingDown,
  Zap,
  Building2,
  AlertTriangle,
  Info,
  Check,
  Table,
  Sparkles,
} from "lucide-react";

export const AstraMixOptimizer: React.FC = () => {
  // Default mode & preset
  const [mode, setMode] = useState<AppMode>("optimizer");
  const [activePreset, setActivePreset] = useState<ProjectPreset | null>("foundation");
  const [input, setInput] = useState<ConcreteMixInput>(PROJECT_PRESETS.foundation.input);
  const [sortMode, setSortMode] = useState<SortMode>("best_overall");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("ararat_bulk_opt");
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);

  // Preset Selection
  const handlePresetSelect = (presetKey: ProjectPreset) => {
    setActivePreset(presetKey);
    setInput(PROJECT_PRESETS[presetKey].input);
  };

  // Custom Input Modification
  const handleInputChange = (newInput: ConcreteMixInput) => {
    setActivePreset(null);
    setInput(newInput);
  };

  // Evaluated Candidate Mixes & Supplier Offers in Real Time
  const evaluatedCandidates = useMemo(() => {
    const candidates = generateCandidateMixes(input);
    return sortConcreteResults(candidates, sortMode);
  }, [input, sortMode]);

  const supplierOffers = useMemo(() => {
    const raw = evaluateAllOffers(input);
    return sortConcreteResults(raw, sortMode);
  }, [input, sortMode]);

  const bestCandidate = evaluatedCandidates.find((c) => c.badges.isBestOverall) || evaluatedCandidates[0];
  const selectedCandidate = evaluatedCandidates.find((c) => c.id === selectedCandidateId) || bestCandidate || evaluatedCandidates[0];

  // Market Savings Delta
  const savingsDelta = useMemo(() => {
    if (!bestCandidate) return { costSavedAMD: 0, carbonSavedKg: 0, percentCostSaved: 0, percentCarbonSaved: 0 };
    return calculateMarketSavings(bestCandidate, input.volumeM3);
  }, [bestCandidate, input.volumeM3]);

  const validation = validateConcreteMixInput(input);
  const formatAMD = (val: number) => Math.round(val).toLocaleString("en-US");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-28">
      {/* Top Header & Brand Bar */}
      <header className="sticky top-14 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-slate-800 flex items-center justify-center text-white font-black text-xl shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  AstraMix AI Optimization Engine
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Armenia Market &amp; Carbon Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Engineering Decision-Support Platform: Compressive Strength, Cost &amp; Embodied CO₂ Optimization
              </p>
            </div>
          </div>

          {/* Quick Preset Pills */}
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
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs font-semibold"
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Unsafe Structural Warning Alert */}
        {!validation.isExecutable && (
          <div className="p-4 rounded-xl border border-rose-500/80 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Unsafe Structural Mix Proportions Detected</h4>
              <p className="text-xs mt-0.5 opacity-90">
                The input water-cement ratio or aggregate ratio violates structural engineering bounds. Adjust sliders on the left panel to restore green structural status.
              </p>
            </div>
          </div>
        )}

        {/* DOMINANT RECOMMENDED MIX CARD */}
        {bestCandidate && (
          <div className="relative rounded-2xl border-2 border-blue-600 bg-white dark:bg-slate-900 p-6 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-700 to-indigo-600 text-white px-4 py-1.5 rounded-bl-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Award className="h-4 w-4" />
              <span>⭐ RECOMMENDED OPTION</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Summary & KPIs */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      {bestCandidate.title}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {bestCandidate.supplierName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Optimal balance between financial cost, material consumption efficiency, structural strength, and embodied CO₂ footprint.
                  </p>
                </div>

                {/* KPI Metrics Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Cost */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Estimated Cost</span>
                    <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                      {formatAMD(bestCandidate.cost.costPerM3AMD)} ֏/m³
                    </span>
                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                      🟢 LOW COST
                    </span>
                  </div>

                  {/* CO2 */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Embodied CO₂</span>
                    <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                      {bestCandidate.carbon.co2PerM3} kg/m³
                    </span>
                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                      🟢 LOW CARBON
                    </span>
                  </div>

                  {/* Consumption */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Material Usage</span>
                    <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                      {bestCandidate.input.cementKg} kg cement
                    </span>
                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                      🟢 EFFICIENT
                    </span>
                  </div>

                  {/* Feasibility */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Feasibility</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                      {bestCandidate.strength.strengthMPa} MPa
                    </span>
                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                      🟢 PASSES CONSTRAINTS
                    </span>
                  </div>
                </div>

                {/* WHY THIS OPTION? Dynamic Data-Driven Explanations */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-2">
                    WHY THIS OPTION?
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-900 dark:text-blue-200">
                    {bestCandidate.reasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-1.5 font-medium">
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Overall Score Gauge */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-100 dark:border-blue-900 text-center">
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  ASTRAMIX OPTIMIZATION SCORE
                </span>
                <div className="my-2 flex items-baseline gap-1">
                  <span className="text-5xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {bestCandidate.score}
                  </span>
                  <span className="text-lg font-bold text-blue-400 dark:text-blue-500 font-mono">/ 100</span>
                </div>
                <p className="text-xs text-blue-950 dark:text-blue-200 max-w-xs">
                  Scored across Armenian regional material tariffs, GOST strength standards, and embodied carbon baselines.
                </p>

                <button
                  type="button"
                  onClick={() => setShowTransparencyModal(true)}
                  className="mt-4 flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>How is carbon &amp; cost calculated?</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN SPLIT LAYOUT: Controls on Left, Visualizations & Results on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Inputs & Real-Time Controls (5 Cols) */}
          <div className="lg:col-span-5">
            <MixCalculator
              input={input}
              onChange={handleInputChange}
              mode={mode}
              onModeChange={setMode}
              activePreset={activePreset}
              onPresetSelect={handlePresetSelect}
            />
          </div>

          {/* Right Panel: Visualizations & Comparison (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Scatter Trade-off Chart */}
            <ScatterTradeoffChart
              candidates={evaluatedCandidates}
              selectedId={selectedCandidateId}
              onSelectCandidate={setSelectedCandidateId}
            />

            {/* Quick Sort Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Sort Candidate Options:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSortMode("best_overall")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === "best_overall"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Best Overall</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode("cheapest")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === "cheapest"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Cheapest</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode("eco_greenest")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === "eco_greenest"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Leaf className="h-3.5 w-3.5" />
                  <span>Eco Carbon</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode("max_durability")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    sortMode === "max_durability"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Strength</span>
                </button>
              </div>
            </div>

            {/* CANDIDATE MIX EVALUATION TABLE */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Table className="h-4 w-4 text-blue-600" />
                  <span>Candidate Mix Evaluation Matrix ({evaluatedCandidates.length} Options)</span>
                </h3>
              </div>

              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-2">Option</th>
                    <th className="py-2.5 px-2">Cement / m³</th>
                    <th className="py-2.5 px-2">Cost / m³</th>
                    <th className="py-2.5 px-2">Total Cost</th>
                    <th className="py-2.5 px-2">CO₂ / m³</th>
                    <th className="py-2.5 px-2">Strength</th>
                    <th className="py-2.5 px-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {evaluatedCandidates.map((c) => {
                    const isSelected = c.id === selectedCandidateId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCandidateId(c.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/50 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 px-2 font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {c.badges.isBestOverall && <span className="text-amber-500">⭐</span>}
                          <span>{c.title}</span>
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{c.input.cementKg} kg</td>
                        <td className="py-3 px-2 text-slate-900 dark:text-slate-100">{formatAMD(c.cost.costPerM3AMD)} ֏</td>
                        <td className="py-3 px-2 text-slate-900 dark:text-slate-100">{formatAMD(c.cost.totalAMD)} ֏</td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{c.carbon.co2PerM3} kg</td>
                        <td className="py-3 px-2 text-blue-600 dark:text-blue-400">{c.strength.strengthMPa} MPa</td>
                        <td className="py-3 px-2 text-center font-bold text-blue-600 dark:text-blue-400">
                          {c.score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Material Composition & Procurement Summary for Selected Mix */}
            {selectedCandidate && (
              <>
                <MaterialCompositionChart
                  input={selectedCandidate.input}
                  cost={selectedCandidate.cost}
                  carbon={selectedCandidate.carbon}
                />

                <ProcurementSummary mix={selectedCandidate} />
              </>
            )}

            {/* Supplier Offers Cards List */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>Armenian Hardware Suppliers &amp; Distribution Depots</span>
              </h3>
              {supplierOffers.map((result, idx) => (
                <ResultCard
                  key={result.supplier.id + idx}
                  result={result}
                  isFeatured={idx === 0}
                />
              ))}
            </div>

            {/* Mandatory Engineering Mix Design Disclaimer */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs">
              <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="leading-relaxed opacity-95">
                {ENGINEERING_MIX_DESIGN_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Real-Time Savings & Optimization Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-2xl">
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
                Save <strong className="text-emerald-600 dark:text-emerald-400">{formatAMD(savingsDelta.costSavedAMD)} ֏</strong> and <strong className="text-emerald-600 dark:text-emerald-400">{savingsDelta.carbonSavedKg} kg of CO₂</strong> compared to unoptimized Armenian market averages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
            <div className="text-right hidden md:block">
              <span className="text-slate-400 block text-[10px]">Best Total AMD</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {bestCandidate ? formatAMD(bestCandidate.cost.totalAMD) : 0} ֏
              </span>
            </div>
            <div className="text-right hidden md:block">
              <span className="text-slate-400 block text-[10px]">28-Day Strength</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                {bestCandidate ? bestCandidate.strength.strengthMPa : 0} MPa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Carbon Transparency Modal */}
      <CarbonTransparencyModal
        isOpen={showTransparencyModal}
        onClose={() => setShowTransparencyModal(false)}
      />
    </div>
  );
};
