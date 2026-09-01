"use client";

import React from "react";
import { CementType, ConcreteMixInput, PackagingType, ProjectPreset } from "@/types/concrete";
import { getStatusStyle, validateConcreteMixInput } from "@/utils/validation";
import { CEMENT_PROPERTIES, PROJECT_PRESETS } from "@/data/marketData";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Package,
  Sparkles,
  Droplets,
  Scale,
  ShieldAlert,
  Building,
  Info,
} from "lucide-react";

interface MixCalculatorProps {
  input: ConcreteMixInput;
  onChange: (newInput: ConcreteMixInput) => void;
  activePreset: ProjectPreset | null;
  onPresetSelect: (preset: ProjectPreset) => void;
}

export const MixCalculator: React.FC<MixCalculatorProps> = ({
  input,
  onChange,
  activePreset,
  onPresetSelect,
}) => {
  const validation = validateConcreteMixInput(input);
  const wcStyle = getStatusStyle(validation.waterCementValidation.status);
  const cementStyle = getStatusStyle(validation.cementContentValidation.status);
  const sandStyle = getStatusStyle(validation.sandRatioValidation.status);

  const updateField = <K extends keyof ConcreteMixInput>(field: K, value: ConcreteMixInput[K]) => {
    onChange({ ...input, [field]: value });
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header & Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mix & Engineering Controls</h2>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
            Real-Time Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Adjust mix parameters per m³ or select a predefined Armenian project standard.
        </p>

        {/* Project Preset Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(Object.keys(PROJECT_PRESETS) as ProjectPreset[]).map((key) => {
            const preset = PROJECT_PRESETS[key];
            const isSelected = activePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPresetSelect(key)}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left border transition-all text-xs ${
                  isSelected
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="font-semibold flex items-center justify-between w-full">
                  <span>{preset.name.split("/")[0]}</span>
                  {isSelected && <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {preset.recommendedGrade}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Global Project Specs (Volume & Packaging) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Volume */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Project Volume (m³)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              max="500"
              step="0.5"
              value={input.volumeM3}
              onChange={(e) => updateField("volumeM3", Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">m³</span>
          </div>
        </div>

        {/* Packaging Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Delivery Format
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => updateField("packaging", "bulk")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                input.packaging === "bulk"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Bulk Truck
            </button>
            <button
              type="button"
              onClick={() => updateField("packaging", "bagged")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                input.packaging === "bagged"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Bagged
            </button>
          </div>
        </div>
      </div>

      {/* Cement Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Cement Type & Origin
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['ararat_m400', 'iranian_m500'] as CementType[]).map((type) => {
            const info = CEMENT_PROPERTIES[type];
            const isSelected = input.cementType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => updateField("cementType", type)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{info.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {info.grade.split('/')[0]}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
                  <span>{info.origin}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">~{info.avgBagPriceAMD} ֏/bag</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Mix Constituents Controls (Per m³) */}
      <div className="flex flex-col gap-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Constituent Quantities (per 1 m³)
        </h3>

        {/* Cement Content Control */}
        <div className={`p-4 rounded-xl border transition-all ${cementStyle.border} ${cementStyle.bgGlow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Building className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Cement Dosage</label>
            </div>
            <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cementStyle.badgeBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cementStyle.dotBg}`} />
              <span>{validation.cementContentValidation.message}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="180"
              max="650"
              step="5"
              value={input.cementKg}
              onChange={(e) => updateField("cementKg", parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min="150"
                max="700"
                value={input.cementKg}
                onChange={(e) => updateField("cementKg", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">kg/m³</span>
            </div>
          </div>

          {/* Tooltip & Warning */}
          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <Info className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cementStyle.iconColor}`} />
            <span>{validation.cementContentValidation.tooltip}</span>
          </div>
        </div>

        {/* Water & Water-Cement Ratio Control */}
        <div className={`p-4 rounded-xl border transition-all ${wcStyle.border} ${wcStyle.bgGlow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Water Dosage & w/c Ratio</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                w/c = {validation.waterCementRatio}
              </span>
              <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${wcStyle.badgeBg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${wcStyle.dotBg}`} />
                <span>{validation.waterCementValidation.message}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="100"
              max="280"
              step="2"
              value={input.waterLiters}
              onChange={(e) => updateField("waterLiters", parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min="80"
                max="320"
                value={input.waterLiters}
                onChange={(e) => updateField("waterLiters", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">L/m³</span>
            </div>
          </div>

          {/* Tooltip & Warning */}
          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <Info className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${wcStyle.iconColor}`} />
            <span>{validation.waterCementValidation.tooltip}</span>
          </div>
        </div>

        {/* Fine Aggregate (Sand) Control */}
        <div className={`p-4 rounded-xl border transition-all ${sandStyle.border} ${sandStyle.bgGlow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Sand (0-5/0-8mm)</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                S/(S+G) = {validation.sandRatio}%
              </span>
              <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sandStyle.badgeBg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sandStyle.dotBg}`} />
                <span>{validation.sandRatioValidation.message}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="400"
              max="1100"
              step="10"
              value={input.sandKg}
              onChange={(e) => updateField("sandKg", parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min="300"
                max="1300"
                value={input.sandKg}
                onChange={(e) => updateField("sandKg", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">kg/m³</span>
            </div>
          </div>

          {/* Tooltip */}
          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <Info className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${sandStyle.iconColor}`} />
            <span>{validation.sandRatioValidation.tooltip}</span>
          </div>
        </div>

        {/* Coarse Aggregate (Gravel) Control */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-500" />
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Gravel / Crushed Stone (5-15mm)</label>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500">Target ~1000 kg/m³</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="600"
              max="1300"
              step="10"
              value={input.gravelKg}
              onChange={(e) => updateField("gravelKg", parseFloat(e.target.value))}
              className="w-full accent-slate-600 cursor-pointer"
            />
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min="400"
                max="1500"
                value={input.gravelKg}
                onChange={(e) => updateField("gravelKg", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">kg/m³</span>
            </div>
          </div>
        </div>

        {/* Steel Rebar Control */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-indigo-500" />
              Steel Reinforcement Rebar (A500C)
            </label>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {input.rebarKgPerM3} kg/m³
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={input.rebarKgPerM3}
              onChange={(e) => updateField("rebarKgPerM3", parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min="0"
                max="200"
                value={input.rebarKgPerM3}
                onChange={(e) => updateField("rebarKgPerM3", Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">kg/m³</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Standard slab: 30–50 kg/m³. Rebar adds 340 ֏/kg and 1.85 kg CO₂/kg.
          </p>
        </div>
      </div>
    </div>
  );
};
