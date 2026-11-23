"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FlaskConical, ShieldCheck, Sliders, Store } from "lucide-react";

const TRAINING_BOUNDS_SUMMARY = [
  { name: "Cement", range: "102.0 – 540.0 kg/m³" },
  { name: "Blast Furnace Slag", range: "0.0 – 359.4 kg/m³" },
  { name: "Fly Ash", range: "0.0 – 200.1 kg/m³" },
  { name: "Mixing Water", range: "121.75 – 247.0 kg/m³" },
  { name: "Superplasticizer", range: "0.0 – 32.2 kg/m³" },
  { name: "Coarse Aggregate", range: "801.0 – 1145.0 kg/m³" },
  { name: "Fine Aggregate", range: "594.0 – 992.6 kg/m³" },
  { name: "Curing Age", range: "1 – 365 whole days" },
];

export default function MixLabHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="rounded-2xl border border-[#D8DFDF] bg-[#FFFFFF] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#E6F4EC] border border-[#176B65]/25 px-3.5 py-1 text-xs font-bold text-[#176B65]">
          <FlaskConical className="h-3.5 w-3.5" />
          <span>Section 1 · AstraMix Mix Lab</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#172D44]">
          Choose Your Concrete Mix Lab Workflow
        </h1>
        <p className="text-sm sm:text-base text-[#536574] max-w-3xl leading-relaxed">
          Prediction and optimization are separated into two focused engineering workflows. Evaluate a known mix composition for compressive strength, cost, and embodied carbon, or search for a feasible mix that satisfies your strength and water-ratio constraints.
        </p>
      </div>

      {/* Two Independent Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Predict Strength */}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-[#176B65]/30 bg-[#FFFFFF] p-6 sm:p-7 shadow-xs hover:border-[#176B65] transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F4EC] text-[#176B65]">
                <FlaskConical className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#E6F4EC] px-3 py-1 font-mono text-xs font-bold text-[#146C43]">
                Workflow 1 · Known Composition
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-[#172D44]">
                Predict Strength &amp; Evaluate Mix
              </h2>
              <p className="mt-1.5 text-sm text-[#536574] leading-relaxed">
                Enter one known 1 m³ concrete composition and curing age. Get predicted laboratory cylinder compressive strength (MPa), ingredient cost estimate, and cradle-to-gate embodied emissions with clear comparison badges.
              </p>
            </div>
            <ul className="space-y-2 pt-2 text-xs text-[#172D44]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#146C43] shrink-0" />
                <span>Trained XGBoost model with validation RMSE (±4.62 MPa) &amp; MAE (±3.03 MPa)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#146C43] shrink-0" />
                <span>Explicit text &amp; color badges: <strong>Good</strong>, <strong>Normal</strong>, <strong>Poor</strong>, or <strong>Not enough comparable data</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#146C43] shrink-0" />
                <span>Direct 1-click basket conversion to the Materials Market (100 Countries)</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-[#D8DFDF] flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/mix-lab/predict"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B65] hover:bg-[#10564F] text-white px-5 py-2.5 text-xs font-bold shadow-xs transition-all"
            >
              <span>Open Strength Prediction</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="font-mono text-[11px] text-[#536574]">Route: /mix-lab/predict</span>
          </div>
        </div>

        {/* Card 2: Optimize Mix */}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-[#A65429]/30 bg-[#FFFFFF] p-6 sm:p-7 shadow-xs hover:border-[#A65429] transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E7DB] text-[#A65429]">
                <Sliders className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F5E7DB] px-3 py-1 font-mono text-xs font-bold text-[#A65429]">
                Workflow 2 · Target &amp; Constraints
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black text-[#172D44]">
                Optimize Mix Proportions for Target
              </h2>
              <p className="mt-1.5 text-sm text-[#536574] leading-relaxed">
                Specify your target strength (MPa), curing age, maximum water/cement ratio (<code>w/c</code>), maximum water/binder ratio (<code>w/b</code>), and cost vs. carbon weights. Find a verified feasible candidate mix.
              </p>
            </div>
            <ul className="space-y-2 pt-2 text-xs text-[#172D44]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0" />
                <span>Separately enforces <code>w/c = water/cement</code> and <code>w/b = water/(cement+slag+ash)</code></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0" />
                <span>Never labels an infeasible solve as an optimum; reports exact constraint diagnostics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0" />
                <span>Includes <strong>&ldquo;Use this mix in prediction&rdquo;</strong> to transfer candidates to Predict</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-[#D8DFDF] flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/mix-lab/optimize"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A65429] hover:bg-[#8C431E] text-white px-5 py-2.5 text-xs font-bold shadow-xs transition-all"
            >
              <span>Open Mix Optimizer</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="font-mono text-[11px] text-[#536574]">Route: /mix-lab/optimize</span>
          </div>
        </div>
      </div>

      {/* Allowed UCI Training Envelope Reference */}
      <div className="rounded-2xl border border-[#D8DFDF] bg-[#FFFFFF] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#176B65]" />
            <h3 className="text-base font-black text-[#172D44]">
              Allowed Model Training Envelope (1,030 UCI Concrete Mixtures)
            </h3>
          </div>
          <Link
            href="/materials-market"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B65] hover:underline"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Go to Materials Market</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-[#536574]">
          Both Predict and Optimize enforce the empirical bounds of the 1,030-row UCI Concrete Compressive Strength dataset so the model never extrapolates silently outside its training domain.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRAINING_BOUNDS_SUMMARY.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] p-3"
            >
              <div className="text-xs font-bold text-[#172D44]">{item.name}</div>
              <div className="mt-1 font-mono text-xs font-semibold text-[#176B65]">
                {item.range}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
