"use client";

import React, { useState } from "react";
import {
  AppMode,
  CementType,
  ConcreteMixInput,
  OptimizationPriority,
  PackagingType,
  PriceUnit,
  ProjectPreset,
  RebarDiameter,
} from "@/types/concrete";
import { getStatusStyle, validateConcreteMixInput, validateMaterialPrice } from "@/utils/validation";
import { convertRebarAMDPerKgToMeter, getRebarKgPerMeter } from "@/utils/units";
import {
  Sliders,
  AlertTriangle,
  Info,
  DollarSign,
  Leaf,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  Scale,
  Award,
  Zap,
} from "lucide-react";

interface MixCalculatorProps {
  input: ConcreteMixInput;
  onChange: (input: ConcreteMixInput) => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activePreset: ProjectPreset | null;
  onPresetSelect: (preset: ProjectPreset) => void;
}

export const MixCalculator: React.FC<MixCalculatorProps> = ({
  input,
  onChange,
  mode,
  onModeChange,
  activePreset,
  onPresetSelect,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const validation = validateConcreteMixInput(input);
  const p = input.prices;

  // Live Smart Validations
  const cementPriceVal = validateMaterialPrice(p.cementPriceAMD, "CEMENT", p.cementUnit, input.cementType);
  const sandPriceVal = validateMaterialPrice(p.sandPriceAMD, "SAND", p.sandUnit);
  const gravelPriceVal = validateMaterialPrice(p.gravelPriceAMD, "AGGREGATE", p.gravelUnit);
  const waterPriceVal = validateMaterialPrice(p.waterPriceAMD, "WATER", p.waterUnit);
  const rebarPriceVal = validateMaterialPrice(p.rebarPriceAMD, "REBAR", p.rebarUnit);

  const updateInput = (fields: Partial<ConcreteMixInput>) => {
    onChange({ ...input, ...fields });
  };

  const updatePrices = (fields: Partial<typeof p>) => {
    onChange({
      ...input,
      prices: { ...p, ...fields },
    });
  };

  const handleWeightsChange = (key: keyof typeof input.weights, val: number) => {
    const newWeights = { ...input.weights, [key]: Math.max(0, Math.min(100, val)) };
    updateInput({ weights: newWeights, priority: "custom" });
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col gap-6">
      {/* Top Controls Header: Mode Switcher & Presets */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Mix Proportions & Market Controls</span>
          </h2>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onModeChange("quick")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mode === "quick"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Mode A: Quick
            </button>
            <button
              type="button"
              onClick={() => onModeChange("optimizer")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                mode === "optimizer"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Mode B: Optimizer
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {mode === "quick"
            ? "Fast single-mix estimation for volume, materials, cost, and carbon footprint."
            : "Advanced decision-support optimization engine ranking multiple candidate mix solutions."}
        </p>
      </div>

      {/* SECTION 1 — PROJECT REQUIREMENTS */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          SECTION 1 — PROJECT REQUIREMENTS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Volume M3 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Concrete Volume (m³)
            </label>
            <input
              type="number"
              min="0.1"
              max="100000"
              step="0.5"
              value={input.volumeM3}
              onChange={(e) => updateInput({ volumeM3: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            {validation.volumeValidation.message && (
              <div className="text-[11px] mt-1 font-medium text-slate-500 dark:text-slate-400">
                {validation.volumeValidation.message}
              </div>
            )}
          </div>

          {/* Target Strength / Class */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Strength (MPa)
            </label>
            <select
              value={input.targetStrengthMPa}
              onChange={(e) => updateInput({ targetStrengthMPa: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value={20}>B15 / M200 (20 MPa - Light Slab / Screed)</option>
              <option value={25}>B20 / M250 (25 MPa - Footings & Walkways)</option>
              <option value={30}>B22.5 / M300 (30 MPa - Residential Slab)</option>
              <option value={35}>B25 / M350 (35 MPa - Building Foundation)</option>
              <option value={40}>B30 / M400 (40 MPa - Heavy Columns & Driveway)</option>
              <option value={45}>B35 / M450 (45 MPa - Commercial Structural)</option>
              <option value={50}>B40 / M500 (50 MPa - Infrastructure)</option>
            </select>
          </div>

          {/* Project Wastage Allowance */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Site Wastage Allowance (%)
            </label>
            <input
              type="number"
              min="0"
              max="25"
              step="1"
              value={input.wastagePercent}
              onChange={(e) => updateInput({ wastagePercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Cement Grade */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cement Grade & Origin
            </label>
            <select
              value={input.cementType}
              onChange={(e) => {
                const ct = e.target.value as CementType;
                updateInput({ cementType: ct });
                updatePrices({ cementType: ct });
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="ararat_m400">Ararat M400 (Local Armenian CEM I 42.5N)</option>
              <option value="iranian_m500">Iranian M500 (Imported High-Strength CEM I 52.5R)</option>
            </select>
          </div>

          {/* Packaging */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Packaging Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateInput({ packaging: "bulk" })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  input.packaging === "bulk"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                Bulk Delivery
              </button>
              <button
                type="button"
                onClick={() => updateInput({ packaging: "bagged" })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  input.packaging === "bagged"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                Bagged (50kg)
              </button>
            </div>
          </div>

          {/* Rebar Diameter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Steel Rebar Diameter (mm)
            </label>
            <select
              value={input.rebarDiameterMm}
              onChange={(e) => {
                const diam = parseInt(e.target.value) as RebarDiameter;
                updateInput({ rebarDiameterMm: diam });
                updatePrices({ rebarDiameterMm: diam });
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value={8}>Ø 8 mm ({getRebarKgPerMeter(8)} kg/m)</option>
              <option value={10}>Ø 10 mm ({getRebarKgPerMeter(10)} kg/m)</option>
              <option value={12}>Ø 12 mm ({getRebarKgPerMeter(12)} kg/m - Standard)</option>
              <option value={16}>Ø 16 mm ({getRebarKgPerMeter(16)} kg/m)</option>
              <option value={20}>Ø 20 mm ({getRebarKgPerMeter(20)} kg/m)</option>
              <option value={25}>Ø 25 mm ({getRebarKgPerMeter(25)} kg/m)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2 — MATERIAL MIX PROPORTIONS & LIVE VALIDATION */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          SECTION 2 — MIX PROPORTIONS (kg/m³)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cement kg */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cement (kg/m³)
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusStyle(validation.cementContentValidation.status).badgeBg}`}>
                {validation.cementContentValidation.message.split("(")[0]}
              </span>
            </div>
            <input
              type="number"
              min="150"
              max="700"
              step="10"
              value={input.cementKg}
              onChange={(e) => updateInput({ cementKg: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(validation.cementContentValidation.status).border}`}
            />
          </div>

          {/* Water Liters */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Water (L/m³) — w/c = {validation.waterCementRatio}
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusStyle(validation.waterCementValidation.status).badgeBg}`}>
                {validation.waterCementValidation.message.split("(")[0]}
              </span>
            </div>
            <input
              type="number"
              min="100"
              max="300"
              step="5"
              value={input.waterLiters}
              onChange={(e) => updateInput({ waterLiters: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(validation.waterCementValidation.status).border}`}
            />
          </div>

          {/* Sand kg */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sand (kg/m³) — {validation.sandRatio}% aggregate
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusStyle(validation.sandRatioValidation.status).badgeBg}`}>
                {validation.sandRatioValidation.message.split("(")[0]}
              </span>
            </div>
            <input
              type="number"
              min="300"
              max="1200"
              step="20"
              value={input.sandKg}
              onChange={(e) => updateInput({ sandKg: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(validation.sandRatioValidation.status).border}`}
            />
          </div>

          {/* Gravel kg */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Crushed Stone / Gravel (kg/m³)
            </label>
            <input
              type="number"
              min="500"
              max="1500"
              step="20"
              value={input.gravelKg}
              onChange={(e) => updateInput({ gravelKg: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          {/* Rebar kg/m3 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rebar Density (kg/m³)
            </label>
            <input
              type="number"
              min="0"
              max="200"
              step="5"
              value={input.rebarKgPerM3}
              onChange={(e) => updateInput({ rebarKgPerM3: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3 — MATERIAL MARKET PRICES & LIVE SMART VALIDATION */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          SECTION 3 — ARMENIAN MARKET PRICES & LIVE SMART VALIDATION
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cement Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cement Price
              </label>
              <select
                value={p.cementUnit}
                onChange={(e) => updatePrices({ cementUnit: e.target.value as PriceUnit })}
                className="text-[11px] font-semibold bg-transparent text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
              >
                <option value="AMD/50kg">AMD / 50kg bag</option>
                <option value="AMD/tonne">AMD / tonne bulk</option>
                <option value="AMD/kg">AMD / kg</option>
              </select>
            </div>
            <input
              type="number"
              value={p.cementPriceAMD}
              onChange={(e) => updatePrices({ cementPriceAMD: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(cementPriceVal.status).border}`}
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={`font-semibold ${getStatusStyle(cementPriceVal.status).text}`}>
                {cementPriceVal.message}
              </span>
              {cementPriceVal.referenceRangeText && (
                <span className="text-slate-400">{cementPriceVal.referenceRangeText}</span>
              )}
            </div>
            {cementPriceVal.suggestion && (
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 italic">
                {cementPriceVal.suggestion}
              </p>
            )}
          </div>

          {/* Sand Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sand Price
              </label>
              <select
                value={p.sandUnit}
                onChange={(e) => updatePrices({ sandUnit: e.target.value as PriceUnit })}
                className="text-[11px] font-semibold bg-transparent text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
              >
                <option value="AMD/m3">AMD / m³ bulk</option>
                <option value="AMD/25kg">AMD / 25kg bag</option>
                <option value="AMD/kg">AMD / kg</option>
              </select>
            </div>
            <input
              type="number"
              value={p.sandPriceAMD}
              onChange={(e) => updatePrices({ sandPriceAMD: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(sandPriceVal.status).border}`}
            />
            <div className="mt-1 text-[11px] font-semibold ${getStatusStyle(sandPriceVal.status).text}">
              {sandPriceVal.message}
            </div>
          </div>

          {/* Gravel Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gravel / Aggregate Price
              </label>
              <select
                value={p.gravelUnit}
                onChange={(e) => updatePrices({ gravelUnit: e.target.value as PriceUnit })}
                className="text-[11px] font-semibold bg-transparent text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
              >
                <option value="AMD/m3">AMD / m³ bulk</option>
                <option value="AMD/25kg">AMD / 25kg bag</option>
                <option value="AMD/kg">AMD / kg</option>
              </select>
            </div>
            <input
              type="number"
              value={p.gravelPriceAMD}
              onChange={(e) => updatePrices({ gravelPriceAMD: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(gravelPriceVal.status).border}`}
            />
            <div className="mt-1 text-[11px] font-semibold ${getStatusStyle(gravelPriceVal.status).text}">
              {gravelPriceVal.message}
            </div>
          </div>

          {/* Rebar Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rebar Price (Ø {input.rebarDiameterMm} mm)
              </label>
              <select
                value={p.rebarUnit}
                onChange={(e) => updatePrices({ rebarUnit: e.target.value as PriceUnit })}
                className="text-[11px] font-semibold bg-transparent text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
              >
                <option value="AMD/kg">AMD / kg</option>
                <option value="AMD/meter">AMD / meter</option>
              </select>
            </div>
            <input
              type="number"
              value={p.rebarPriceAMD}
              onChange={(e) => updatePrices({ rebarPriceAMD: parseFloat(e.target.value) || 0 })}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 font-mono ${getStatusStyle(rebarPriceVal.status).border}`}
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={`font-semibold ${getStatusStyle(rebarPriceVal.status).text}`}>
                {rebarPriceVal.message}
              </span>
              <span className="text-slate-400 font-mono">
                {p.rebarUnit === "AMD/kg"
                  ? `≈ ${convertRebarAMDPerKgToMeter(p.rebarPriceAMD, input.rebarDiameterMm)} AMD/m`
                  : `≈ ${p.rebarPriceAMD} AMD/m`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODE B — OPTIMIZER CONTROLS & WEIGHT SLIDERS */}
      {mode === "optimizer" && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            SECTION 4 — OPTIMIZATION PRIORITY & WEIGHTS
          </h3>

          {/* Priority Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "balanced", label: "⭐ Balanced", icon: Award },
              { id: "cheapest", label: "💰 Cheapest", icon: DollarSign },
              { id: "lowest_co2", label: "🌱 Eco Carbon", icon: Leaf },
              { id: "lowest_consumption", label: "📦 Low Material", icon: Layers },
              { id: "custom", label: "⚙️ Custom", icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateInput({ priority: item.id as OptimizationPriority })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 border ${
                  input.priority === item.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Weight Sliders */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Multi-Objective Scoring Weighting Matrix</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                Sum: {input.weights.cost + input.weights.carbon + input.weights.consumption + input.weights.performance}%
              </span>
            </div>

            {/* Cost Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-600 dark:text-slate-400 font-medium">
                <span>Financial Cost Weight</span>
                <span className="font-mono">{input.weights.cost}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={input.weights.cost}
                onChange={(e) => handleWeightsChange("cost", parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Carbon Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-600 dark:text-slate-400 font-medium">
                <span>Embodied Carbon Weight</span>
                <span className="font-mono">{input.weights.carbon}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={input.weights.carbon}
                onChange={(e) => handleWeightsChange("carbon", parseInt(e.target.value) || 0)}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Consumption Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-600 dark:text-slate-400 font-medium">
                <span>Material Consumption Efficiency Weight</span>
                <span className="font-mono">{input.weights.consumption}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={input.weights.consumption}
                onChange={(e) => handleWeightsChange("consumption", parseInt(e.target.value) || 0)}
                className="w-full accent-amber-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE ADVANCED LIMIT CAPS */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowLimits(!showLimits)}
          className="flex items-center justify-between w-full text-xs font-bold text-slate-600 dark:text-slate-400 py-1 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-indigo-600" />
            <span>Advanced Hard Limits & Constraint Caps (Budget & CO₂)</span>
          </span>
          {showLimits ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showLimits && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Cost Limit (AMD / m³)
              </label>
              <input
                type="number"
                placeholder="e.g. 45000"
                value={input.maxCostPerM3AMD || ""}
                onChange={(e) => updateInput({ maxCostPerM3AMD: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Embodied CO₂ Limit (kg CO₂ / m³)
              </label>
              <input
                type="number"
                placeholder="e.g. 300"
                value={input.maxCO2PerM3Kg || ""}
                onChange={(e) => updateInput({ maxCO2PerM3Kg: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
