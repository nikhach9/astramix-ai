"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Sparkles,
  FileText,
  Info,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#172D44] font-sans">
      {/* 1. HERO SECTION — TWO PRIMARY SECTIONS */}
      <section className="relative overflow-hidden border-b border-[#D8DFDF] bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E3F2EF] px-3.5 py-1 text-xs font-bold text-[#176B65] border border-[#176B65]/25 mb-5">
                <Sparkles className="h-3.5 w-3.5 text-[#176B65]" />
                <span>
                  Concrete Mix Lab &amp; Transparent Materials Market (100 Countries)
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#172D44] leading-[1.12]">
                Design Concrete Mixes.{" "}
                <span className="text-[#176B65]">
                  Compare Real Material Costs.
                </span>
              </h1>

              <p className="mt-4 text-base sm:text-lg text-[#536574] leading-relaxed">
                AstraMix AI is organized into two focused tools for civil
                engineers, batching plants, and concrete buyers:{" "}
                <strong className="text-[#172D44]">Mix Lab</strong> for validated
                strength prediction and multi-objective mix optimization, and{" "}
                <strong className="text-[#172D44]">Materials Market</strong> for
                comparing concrete ingredients and ready-mixed concrete across
                verified local branches, service-area suppliers, and national
                buying channels.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/mix-lab"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B65] hover:bg-[#125651] text-white px-6 py-3.5 text-sm font-bold shadow-xs transition-all"
                >
                  <FlaskConical className="h-4 w-4" />
                  <span>Open Mix Lab</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/materials-market"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A65429] hover:bg-[#8B431E] text-white px-6 py-3.5 text-sm font-bold shadow-xs transition-all"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Browse Materials Market</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/projects/astramix"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] hover:bg-[#F0ECE2] text-[#172D44] px-5 py-3.5 text-sm font-semibold transition-all"
                >
                  <FileText className="h-4 w-4 text-[#536574]" />
                  <span>Methodology &amp; Model Card</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#D8DFDF] bg-slate-900 group">
                <img
                  src="/images/astramix-hero.jpg"
                  alt="AstraMix AI Concrete Mix Laboratory & Material Optimization"
                  className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* TWO PRIMARY SECTION CARDS */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1: Mix Lab */}
            <div className="rounded-2xl border-2 border-[#176B65]/30 bg-[#F7F5EF] p-7 flex flex-col justify-between gap-6 shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#E3F2EF] px-3 py-1 text-xs font-bold text-[#176B65]">
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>Section 1 · Mix Lab</span>
                  </span>
                  <span className="text-xs font-mono text-[#536574]">
                    Schema v1.0.0 · 1,030-Row Envelope
                  </span>
                </div>

                <h2 className="text-2xl font-black text-[#172D44]">
                  Strength Prediction &amp; Multi-Objective Mix Optimization
                </h2>

                <p className="text-sm text-[#536574] leading-relaxed">
                  Dedicated workspaces for predicting compressive strength from a
                  known recipe or optimizing ingredient proportions under
                  explicit constraints—with one-click transfer between both
                  tools.
                </p>

                <ul className="space-y-2.5 text-xs text-[#172D44]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#176B65] shrink-0 mt-0.5" />
                    <span>
                      <strong>Allowed Input Ranges:</strong> Displays exact
                      supported bounds (`kg/m³` and integer curing age `1–365`
                      days) with sliders, steppers, and preset curing chips.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#176B65] shrink-0 mt-0.5" />
                    <span>
                      <strong>Three Understandable Result Cards:</strong>{" "}
                      <em>Predicted strength</em> (MPa with RMSE uncertainty
                      rules), <em>Estimated ingredient cost</em> (`/m³`), and{" "}
                      <em>Estimated embodied emissions</em> (`kg CO₂e/m³`) with{" "}
                      <code>Good</code> / <code>Normal</code> /{" "}
                      <code>Poor</code> rating badges.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#176B65] shrink-0 mt-0.5" />
                    <span>
                      <strong>Separate w/c and w/b Ratios:</strong>{" "}
                      Distinguishes `water / cement` from `water / (cement +
                      slag + fly ash)` and never labels an infeasible solve as
                      an optimum.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-[#D8DFDF] flex flex-wrap items-center gap-3">
                <Link
                  href="/mix-lab"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#176B65] hover:bg-[#125651] text-white px-4 py-2.5 text-xs font-bold"
                >
                  <span>Open Mix Lab Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/mix-lab/predict"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8DFDF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#172D44] hover:bg-[#F0ECE2]"
                >
                  <span>Strength Predictor</span>
                </Link>
                <Link
                  href="/mix-lab/optimize"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8DFDF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#172D44] hover:bg-[#F0ECE2]"
                >
                  <Sliders className="h-3.5 w-3.5 text-[#A65429]" />
                  <span>Mix Optimizer</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Materials Market */}
            <div className="rounded-2xl border-2 border-[#A65429]/30 bg-[#F7F5EF] p-7 flex flex-col justify-between gap-6 shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8EBE3] px-3 py-1 text-xs font-bold text-[#A65429]">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Section 2 · Materials Market</span>
                  </span>
                  <span className="text-xs font-mono text-[#536574]">
                    100 Indexed Countries · Verified Supplier Directory
                  </span>
                </div>

                <h2 className="text-2xl font-black text-[#172D44]">
                  Ingredients, Dry Mixes &amp; Ready-Mixed Concrete Directory
                </h2>

                <p className="text-sm text-[#536574] leading-relaxed">
                  Send your Mix Lab recipe directly to the Materials Market or
                  search standalone orders across 100 countries and 62,964
                  GeoNames cities with strict category separation and honest
                  pricing provenance.
                </p>

                <ul className="space-y-2.5 text-xs text-[#172D44]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0 mt-0.5" />
                    <span>
                      <strong>
                        Country-Scoped GeoNames City Autocomplete:
                      </strong>{" "}
                      Search 62,964 cities across 100 countries (CC BY 4.0) with
                      instant keyboard navigation and automatic reset on country
                      change.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0 mt-0.5" />
                    <span>
                      <strong>Progressive Discovery &amp; Quantity Tiers:</strong>{" "}
                      Separates verified local branches and outlets, service-area
                      suppliers, and national buying channels, with automatic
                      bulk quantity tier pricing and whole-bag rounding.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#A65429] shrink-0 mt-0.5" />
                    <span>
                      <strong>Strict Data Honesty:</strong> Separates branch-scoped
                      stock from public price snapshots and quote-only suppliers.
                      Customer reviews start empty (`0` fabricated ratings).
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-[#D8DFDF] flex flex-wrap items-center gap-3">
                <Link
                  href="/materials-market"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#A65429] hover:bg-[#8B431E] text-white px-4 py-2.5 text-xs font-bold"
                >
                  <span>Open Materials Market</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/report"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8DFDF] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#172D44] hover:bg-[#F0ECE2]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Mix Evaluation Report</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INPUT VALIDATION & EMPIRICAL ENVELOPE SUMMARY */}
      <section className="py-14 border-b border-[#D8DFDF] bg-[#F7F5EF]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#176B65]">
                EMPIRICAL MODEL SCOPE
              </span>
              <h2 className="text-2xl font-black text-[#172D44]">
                Supported Input Envelope vs. Engineering Qualification
              </h2>
              <p className="text-xs sm:text-sm text-[#536574] leading-relaxed">
                The Mix Lab strength regressor (`XGBoost`, test RMSE `4.62 MPa`,
                MAE `3.03 MPa`, $R^2 = 0.917$) is bounded by the empirical
                1,030-sample UCI Concrete Compressive Strength dataset.
              </p>
              <div className="rounded-xl border border-[#A26012]/35 bg-[#FBF3E4] p-3.5 text-xs text-[#172D44] flex items-start gap-2.5">
                <Info className="h-4 w-4 text-[#A26012] shrink-0 mt-0.5" />
                <span>
                  <strong>Important distinction:</strong> These bounds define
                  the statistical range where the machine learning model was
                  trained. They are not a substitute for structural engineering
                  codes (ACI 318, EN 206, GOST 27006) or laboratory trial
                  batches.
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-[#D8DFDF] bg-white p-5 shadow-xs overflow-x-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#536574] mb-3">
                  Mix Lab Input Validation Contract (v1.0.0)
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#D8DFDF] text-[#536574]">
                      <th className="py-2 pr-3 font-semibold">Feature</th>
                      <th className="py-2 px-3 font-semibold font-mono">
                        Allowed Range
                      </th>
                      <th className="py-2 px-3 font-semibold">Unit</th>
                      <th className="py-2 pl-3 font-semibold">
                        Validation Rule
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE2] font-mono text-[#172D44]">
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Cement
                      </td>
                      <td className="py-2 px-3">102.0 – 540.0</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Required positive binder (`&gt; 0` for `w/c`)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Blast Furnace Slag
                      </td>
                      <td className="py-2 px-3">0.0 – 359.4</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Included in total binder (`w/b`)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Fly Ash
                      </td>
                      <td className="py-2 px-3">0.0 – 200.1</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Included in total binder (`w/b`)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Mixing Water
                      </td>
                      <td className="py-2 px-3">121.75 – 247.0</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Full 1,030-row UCI minimum (`121.75 kg/m³`)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Superplasticizer
                      </td>
                      <td className="py-2 px-3">0.0 – 32.2</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        High-range water reducer dosage
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Coarse Aggregate
                      </td>
                      <td className="py-2 px-3">801.0 – 1145.0</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Crushed stone / gravel skeleton
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Fine Aggregate
                      </td>
                      <td className="py-2 px-3">594.0 – 992.6</td>
                      <td className="py-2 px-3">kg/m³</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Natural or manufactured concrete sand
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-semibold">
                        Curing Age
                      </td>
                      <td className="py-2 px-3">1 – 365 (integer)</td>
                      <td className="py-2 px-3">days</td>
                      <td className="py-2 pl-3 font-sans text-[#536574]">
                        Whole integer days (`1, 3, 7, 14, 28, 56, 90, 180, 365`)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
