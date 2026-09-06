"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Leaf,
  DollarSign,
  Layers,
  BarChart3,
  Sliders,
  CheckCircle2,
  Cpu,
  Award,
  Sparkles,
  TrendingDown,
  Building2,
  FileText,
  Activity,
} from "lucide-react";

export default function HomePage() {
  // Live Demo Preview State
  const [demoVolume, setDemoVolume] = useState<number>(25);
  const [targetStrength, setTargetStrength] = useState<number>(30);

  // Calculated preview values
  const estimatedCostPerM3 = 34500;
  const estimatedTotalCost = demoVolume * estimatedCostPerM3;
  const estimatedCO2PerM3 = 248;
  const estimatedTotalCO2 = demoVolume * estimatedCO2PerM3;
  const estimatedSavingsAMD = Math.round(demoVolume * 4200);

  const formatAMD = (val: number) => Math.round(val).toLocaleString("en-US");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 sm:py-24 transition-colors">
        {/* Subtle Background Mesh Grid */}
        <div className="absolute inset-0 opacity-15 dark:opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 self-center lg:self-start rounded-full bg-blue-50 dark:bg-blue-950/80 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>AI-Assisted Civil Engineering &amp; Material Science</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-[1.1]">
                Optimize Concrete. <br />
                <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                  Reduce Cost. Lower Carbon.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                AstraMix AI couples machine learning strength predictions with constrained multi-objective optimization algorithms to help civil engineers, batching plants, and contractors design cost-effective, low-carbon concrete mixes.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/optimize"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Start Optimizing</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/projects/astramix"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-6 py-3.5 text-sm font-semibold transition-all"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Explore the Research</span>
                </Link>
              </div>

              {/* Quick Specs Indicator */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base">XGBoost ML</span>
                  <span className="text-slate-500 dark:text-slate-400">R² = 0.917 Regressor</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base">SLSQP Solver</span>
                  <span className="text-slate-500 dark:text-slate-400">Hard Bounds &amp; Pareto</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-slate-100 font-mono text-sm sm:text-base">ISO / GOST</span>
                  <span className="text-slate-500 dark:text-slate-400">ACI 211 Code Safe</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white p-6 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-bl-lg">
                  LIVE ANALYTICS PREVIEW
                </div>

                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <Activity className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-bold text-slate-200">AstraMix Mix Evaluation Engine</span>
                </div>

                {/* Interactive Sliders Preview */}
                <div className="space-y-4 text-xs font-sans">
                  <div>
                    <div className="flex justify-between mb-1 font-semibold text-slate-300">
                      <span>Concrete Volume</span>
                      <span className="font-mono text-blue-400">{demoVolume} m³</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      value={demoVolume}
                      onChange={(e) => setDemoVolume(parseInt(e.target.value) || 10)}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 font-semibold text-slate-300">
                      <span>Target Compressive Strength</span>
                      <span className="font-mono text-emerald-400">{targetStrength} MPa (B22.5 / M300)</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="50"
                      step="5"
                      value={targetStrength}
                      onChange={(e) => setTargetStrength(parseInt(e.target.value) || 30)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Calculated Result Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                      <span className="text-[10px] text-slate-400 font-medium block">Total Cost</span>
                      <span className="text-base font-bold font-mono text-white">
                        {formatAMD(estimatedTotalCost)} ֏
                      </span>
                      <span className="text-[10px] text-blue-400 block mt-0.5">{formatAMD(estimatedCostPerM3)} ֏ / m³</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                      <span className="text-[10px] text-slate-400 font-medium block">Embodied Carbon</span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        {estimatedTotalCO2.toLocaleString("en-US")} kg
                      </span>
                      <span className="text-[10px] text-emerald-300 block mt-0.5">{estimatedCO2PerM3} kg CO₂ / m³</span>
                    </div>
                  </div>

                  {/* Optimization Score */}
                  <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-300 block">ESTIMATED OPTIMIZATION SAVINGS</span>
                      <span className="text-xs text-slate-300">Save approx. <strong className="text-emerald-400 font-mono">{formatAMD(estimatedSavingsAMD)} ֏</strong></span>
                    </div>
                    <span className="text-2xl font-black text-blue-400 font-mono">94/100</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <Link
                    href="/optimize"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                  >
                    <span>Launch Full Interactive Optimization Tool &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM STATEMENT */}
      <section className="py-16 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-2">
              INDUSTRY CHALLENGE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Why Traditional Concrete Mix Design Needs Computational Optimization
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Cement manufacturing accounts for 8% of global CO₂ emissions. Traditional empirical mix tables rely on conservative, over-dimensioned cement formulas that drive up financial costs and environmental impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Volatile Material Costs</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Raw binder prices fluctuate based on import tariffs and local quarry supply. Arbitrary recipes lead to over-spending on Portland cement without structural gains.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Leaf className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Embodied Carbon Intensity</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every extra 10 kg of cement per cubic meter adds ~9 kg of embodied CO₂. Optimizing binder ratios is the fastest lever to reduce concrete carbon intensity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Strict Safety Limits</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Concrete cannot compromise on structural compressive strength. Optimization must rigorously honor water-cement boundaries and GOST/ACI structural standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ASTRAMIX SOLUTION — 4-STEP WORKFLOW */}
      <section className="py-16 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-2">
              HOW IT WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              The AstraMix AI Optimization Workflow
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              A 4-step computational pipeline that converts project specifications into optimal, code-compliant concrete recipes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Define Requirements</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Specify target compressive strength (MPa), project volume (m³), material tariffs, and hard budget/CO₂ ceilings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Generate Candidates</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The engine evaluates regional cement grades (Ararat M400, Iranian M500), packaging formats, and aggregate grain matrices.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Evaluate Metrics</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                XGBoost regressor models compressive strength while SciPy solvers score cost, carbon, and material efficiency.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                04
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Select &amp; Order</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Select the pareto-optimal candidate mix and view actionable procurement order sheets with exact bag and truckload counts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. KEY CAPABILITIES GRID */}
      <section className="py-16 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-2">
              CORE CAPABILITIES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Engineering-Grade Decision Support Tools
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Built for civil engineers, batching plants, contractors, and sustainability researchers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sliders className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Mix Optimization</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Find optimal concrete proportions under target strength, water-cement ratio, and custom weighted multi-objective priorities.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cost Analysis</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Calculate total delivered project costs using regional material price databases, bulk vs. bagged tariffs, and supplier delivery fees.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Leaf className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Carbon Footprint Analysis</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Estimate embodied CO₂ emissions (kg CO₂e/m³) across individual ingredients (cement, sand, gravel, water, rebar) and compare alternatives.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Strength Prediction</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Forecast 28-day compressive strength (MPa) using trained gradient boosting regressors validated on experimental concrete datasets.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Trade-Off Analysis</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Visualize candidate mixtures on an interactive Cost vs. Embodied Carbon scatter map to select Pareto-optimal engineering trade-offs.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement Intelligence</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Translate mathematical mix outputs into practical purchasing orders, including 50kg cement bag counts, 25kg aggregate bags, and truckload logistics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RESEARCH & METHODOLOGY SECTION */}
      <section className="py-16 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                SCIENTIFIC FOUNDATION
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Machine Learning Coupled with Physical Concrete Chemistry
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                AstraMix AI does not treat concrete as a generic black-box. The platform combines machine learning strength regressors trained on experimental test data with hard physical envelope constraints governing binder hydration.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">XGBoost Regression Accuracy:</strong> Evaluated on held-out test splits with an RMSE of 4.62 MPa and an R² of 0.917.
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Physical Bound Warnings:</strong> Automatically flags out-of-distribution feature vectors to prevent inaccurate model extrapolation.
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">ACI 211 &amp; GOST 27006 Compliance:</strong> Enforces structural limits for water-cement ratio (0.30–0.68) and minimum binder dosage (300 kg/m³ for load-bearing slabs).
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/projects/astramix"
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Read Model Cards &amp; Technical Validation Methodology &rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Table / Metrics Box */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>Model Benchmark Validation Results</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-2 font-sans font-semibold">Algorithm Candidate</th>
                        <th className="py-2.5 px-2 font-semibold">RMSE</th>
                        <th className="py-2.5 px-2 font-semibold">MAE</th>
                        <th className="py-2.5 px-2 font-semibold">R²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="py-2.5 px-2 font-sans font-medium text-slate-700 dark:text-slate-300">Linear Regression</td>
                        <td className="py-2.5 px-2 text-slate-600">9.80 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">7.75 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">0.628</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-sans font-medium text-slate-700 dark:text-slate-300">Gradient Boosting</td>
                        <td className="py-2.5 px-2 text-slate-600">5.50 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">4.14 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">0.883</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-sans font-medium text-slate-700 dark:text-slate-300">Random Forest</td>
                        <td className="py-2.5 px-2 text-slate-600">5.46 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">3.75 MPa</td>
                        <td className="py-2.5 px-2 text-slate-600">0.884</td>
                      </tr>
                      <tr className="bg-blue-50/80 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300">
                        <td className="py-2.5 px-2 font-sans text-slate-900 dark:text-slate-100">XGBoost Regressor (Selected)</td>
                        <td className="py-2.5 px-2">4.62 MPa</td>
                        <td className="py-2.5 px-2">3.03 MPa</td>
                        <td className="py-2.5 px-2">0.917</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA SECTION */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950 text-white text-center relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col gap-6 items-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 px-3 py-1 rounded-full bg-blue-950 border border-blue-800">
            ENGINEERING DECISION SUPPORT
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Ready to Optimize Your Concrete Mix Design?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Run instant multi-objective optimizations for regional Armenian material tariffs, evaluate compressive strength, and reduce embodied carbon emissions.
          </p>

          <div className="pt-2">
            <Link
              href="/optimize"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <span>Launch AstraMix AI Optimizer</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
