import React from "react";
import Link from "next/link";
import { AstraMixLogo } from "@/components/layout/AstraMixLogo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="md:col-span-5 flex flex-col gap-3">
            <Link href="/" className="inline-flex">
              <AstraMixLogo iconSize={32} />
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Two transparent engineering &amp; procurement workspaces:{" "}
              <strong>Mix Lab</strong> (validated UCI strength prediction, multi-objective optimization, and ingredient cost/carbon comparison) and{" "}
              <strong>Materials Market</strong> (concrete ingredients &amp; ready-mix supplier directory, order cost calculator, and verified customer reviews).
            </p>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Two Core Sections
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/mix-lab" className="hover:text-blue-600 font-semibold text-blue-600 dark:text-blue-400">
                  1. Mix Lab — Strength, Cost &amp; Embodied Emissions
                </Link>
              </li>
              <li>
                <Link href="/materials-market" className="hover:text-blue-600 font-semibold text-blue-600 dark:text-blue-400">
                  2. Materials Market — Ingredients &amp; Ready-Mixed Concrete
                </Link>
              </li>
              <li>
                <Link href="/predict" className="hover:text-blue-600 transition-colors">
                  Direct Strength Predictor (/predict)
                </Link>
              </li>
              <li>
                <Link href="/optimize" className="hover:text-blue-600 transition-colors">
                  Direct Mix Optimizer (/optimize)
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-blue-600 transition-colors">
                  Printable Mix Report (/report)
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Provenance &amp; Data Ethics
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/projects/astramix" className="hover:text-blue-600 transition-colors">
                  Model Card &amp; Training Envelope
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 transition-colors">
                  About &amp; Data Integrity Rules
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <p>&copy; {new Date().getFullYear()} AstraMix AI — Civil Engineering &amp; Material Procurement Platform.</p>
          <p>Schema v1.0.0 · Model v0.1 (XGBoost, UCI 1,030-mix envelope)</p>
        </div>
      </div>
    </footer>
  );
}
