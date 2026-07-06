import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* Hero Section */}
      <header className="border-b border-line bg-paper-raised py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="inline-block rounded-full bg-blueprint-100 px-3 py-1 text-xs font-mono tracking-wider text-blueprint-700 uppercase mb-4">
            Research & Material Science Project
          </div>
          <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-blueprint-600">
            AstraMix AI
          </h1>
          <p className="mt-2 text-xs font-mono text-ink-faint">
            Founder & Developer: Nikolay Khachatryan
          </p>
          <p className="mt-6 text-lg sm:text-xl font-medium text-ink-muted max-w-3xl leading-relaxed">
            AI-assisted sustainable concrete mix design and optimization platform.
          </p>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink-muted max-w-3xl">
            AstraMix AI maps binder hydration chemistry using machine learning. The system predicts concrete compressive strength, 
            estimates lifecycle environmental footprint (CO₂), and calculates raw cost variables, wrapping all predictions in a scientific validation framework.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/projects/astramix"
              className="inline-flex items-center justify-center rounded-sm bg-blueprint-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blueprint-700 transition-colors"
            >
              View AstraMix Showcase
            </Link>
          </div>
        </div>
      </header>

      {/* Core Features & Highlights */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-8">
          Core Platform Tools
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/predict">
            <Card className="h-full border border-line bg-paper-raised p-6 shadow-panel transition-colors hover:border-blueprint-400">
              <h3 className="text-base font-semibold text-ink">Strength Prediction</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                Run machine learning evaluations to forecast 28-day concrete strength using raw ingredients.
              </p>
            </Card>
          </Link>

          <Link href="/optimize">
            <Card className="h-full border border-line bg-paper-raised p-6 shadow-panel transition-colors hover:border-blueprint-400">
              <h3 className="text-base font-semibold text-ink">Mix Optimization</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                Search for optimal low-carbon and cost-effective mixes using our bounded SLSQP solver.
              </p>
            </Card>
          </Link>

          <Link href="/projects/astramix">
            <Card className="h-full border border-blueprint-200 bg-blueprint-50/20 p-6 shadow-panel transition-colors hover:border-blueprint-400">
              <h3 className="text-base font-semibold text-blueprint-700">AstraMix Showcase</h3>
              <p className="mt-2 text-xs leading-relaxed text-blueprint-600">
                Explore the research positioning, model cards, offline metrics, validation reports, and roadmap.
              </p>
            </Card>
          </Link>
        </div>
      </section>

      {/* Overview & Stack Info */}
      <section className="border-t border-line bg-paper-raised py-16">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
              Project Motivation
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
              Cement manufacturing accounts for approximately 8% of global CO₂ emissions. Designing sustainable concrete requires civil engineers to replace conservative, over-dimensioned formulas with optimized binder blends. AstraMix AI couples XGBoost prediction models with SciPy solvers to explore how algorithms can support material science decisions.
            </p>
          </div>

          <div>
            <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
              Integrated Stack
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs text-ink-muted">
              <div>
                <h4 className="font-semibold text-ink mb-1">Backend Core</h4>
                <p>FastAPI, Python, Pydantic, XGBoost, SciPy SLSQP</p>
              </div>
              <div>
                <h4 className="font-semibold text-ink mb-1">Frontend UI</h4>
                <p>Next.js 14, TypeScript, Tailwind CSS, Chart.js</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper-raised py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-xxs text-ink-faint">
          <p>AstraMix AI v0.1 — Created by Nikolay Khachatryan</p>
          <p className="mt-1">&copy; 2026. Academic & Research Portfolio Project.</p>
        </div>
      </footer>
    </div>
  );
}
