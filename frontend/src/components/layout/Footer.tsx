import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
          {/* Left Brand Summary */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs">
                A
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                AstraMix AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              AI-assisted sustainable concrete mix design, cost optimization, compressive strength prediction, and carbon footprint reduction platform.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Platform Tools
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link href="/optimize" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-blue-600 dark:text-blue-400">
                  Concrete Mix Optimizer
                </Link>
              </li>
              <li>
                <Link href="/predict" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Strength Predictor
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Model Benchmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Research & Project Column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Research &amp; Science
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/projects/astramix" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Methodology &amp; Model Cards
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  About Research Project
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Validation Report Preview
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <p>&copy; {new Date().getFullYear()} AstraMix AI — Civil Engineering &amp; Computational Material Science.</p>
          <p>Version 0.1 · Academic &amp; Engineering Research Software</p>
        </div>
      </div>
    </footer>
  );
}
