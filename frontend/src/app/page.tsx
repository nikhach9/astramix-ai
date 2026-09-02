"use client";

import Link from "next/link";
import { BetonKayakApp } from "@/components/BetonKayakApp";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* Hero Header */}
      <header className="border-b border-line bg-paper-raised py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-block rounded-full bg-blueprint-100 px-3 py-1 text-xs font-mono tracking-wider text-blueprint-700 uppercase">
              Research &amp; Material Science Engine
            </span>
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono font-bold tracking-wider text-emerald-800 uppercase border border-emerald-200">
              ⚡ BetonKayak Active
            </span>
          </div>

          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-blueprint-600">
            AstraMix AI — Concrete Cost &amp; Carbon Optimizer (&quot;BetonKayak&quot;)
          </h1>
          <p className="mt-2 text-sm text-ink-muted max-w-4xl leading-relaxed">
            Real-time material aggregator and decision-support optimization engine tailored for the Armenian concrete construction market.
            Compare Ararat M400, Iranian M500, bulk vs. bagged delivery, embodied CO₂, and structural strength.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/beton-kayak"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Launch Dedicated BetonKayak App &rarr;
            </Link>
            <Link
              href="/predict"
              className="inline-flex items-center justify-center rounded-md border border-line bg-paper px-5 py-2.5 text-xs font-semibold text-ink hover:bg-paper-raised transition-colors"
            >
              Strength Predictor
            </Link>
            <Link
              href="/projects/astramix"
              className="inline-flex items-center justify-center rounded-md border border-line bg-paper px-5 py-2.5 text-xs font-semibold text-ink hover:bg-paper-raised transition-colors"
            >
              AstraMix Showcase
            </Link>
          </div>
        </div>
      </header>

      {/* Embedded Main Engine: BetonKayak App */}
      <section className="py-6">
        <BetonKayakApp />
      </section>
    </div>
  );
}
