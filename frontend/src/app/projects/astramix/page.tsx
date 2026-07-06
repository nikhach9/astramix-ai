import React from "react";
import type { Metadata } from "next";
import { ShowcaseImage } from "@/components/showcase/ShowcaseImage";

const links = {
  github: "#github-link-coming-soon",
  demo: "#demo-video-coming-soon",
  report: "/docs/PROJECT_REPORT_v0_1.md"
};

export const metadata: Metadata = {
  title: "AstraMix AI | Sustainable Concrete Mix Design with Machine Learning",
  description:
    "AstraMix AI is a research-style engineering software project created by Nikolay Khachatryan. It predicts concrete compressive strength, estimates CO₂ and cost, and demonstrates concrete mix optimization using machine learning and constrained optimization.",
  keywords:
    "AstraMix AI, concrete mix design, sustainable concrete, machine learning, compressive strength prediction, civil engineering AI, concrete optimization",
  authors: [{ name: "Nikolay Khachatryan" }],
  openGraph: {
    title: "AstraMix AI | Sustainable Concrete Mix Design with Machine Learning",
    description:
      "AstraMix AI is a research-style engineering software project created by Nikolay Khachatryan. It predicts concrete compressive strength, estimates CO₂ and cost, and demonstrates concrete mix optimization using machine learning and constrained optimization.",
    url: "https://astramix-ai.com/projects/astramix",
    type: "website",
  },
};

export default function AstraMixShowcasePage() {
  const isGithubComingSoon = links.github.startsWith("#");
  const isDemoComingSoon = links.demo.startsWith("#");

  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased">
      {/* Hero Section */}
      <header className="border-b border-line bg-paper-raised transition-all duration-300">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24 text-center sm:text-left">
          <div className="inline-block rounded-full bg-blueprint-100 px-3 py-1 text-xs font-mono tracking-wider text-blueprint-700 uppercase mb-4">
            Research & Engineering Portfolio Project
          </div>
          <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-blueprint-600">
            AstraMix AI
          </h1>
          <p className="mt-2 text-xs font-mono text-ink-faint">
            Founder & Developer: Nikolay Khachatryan
          </p>
          <p className="mt-4 font-sans text-lg sm:text-xl font-medium text-ink-muted max-w-3xl leading-relaxed">
            AI-assisted sustainable concrete mix design and optimization platform.
          </p>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink-muted max-w-3xl">
            AstraMix AI is a completed research-style engineering software project that predicts concrete compressive strength, 
            estimates CO₂ and cost, and optimizes concrete mix designs using machine learning and constrained optimization.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center sm:justify-start">
            {isGithubComingSoon ? (
              <span className="inline-flex items-center justify-center rounded-sm bg-line px-6 py-3 text-sm font-semibold text-ink-faint cursor-not-allowed select-none">
                GitHub Repository — Coming Soon
              </span>
            ) : (
              <a
                href={links.github}
                className="inline-flex items-center justify-center rounded-sm bg-blueprint-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blueprint-700 transition-colors"
              >
                GitHub Repository
              </a>
            )}

            {isDemoComingSoon ? (
              <span className="inline-flex items-center justify-center rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink-faint cursor-not-allowed select-none">
                Demo Video — Coming Soon
              </span>
            ) : (
              <a
                href={links.demo}
                className="inline-flex items-center justify-center rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-paper transition-colors"
              >
                Demo Video
              </a>
            )}

            <a
              href={links.report}
              className="inline-flex items-center justify-center rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-paper transition-colors"
            >
              Technical Report
            </a>
          </div>
        </div>
      </header>

      {/* Project Highlights Grid */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-8">
          Project Highlights
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-blueprint-600">
                <span className="font-mono text-xxs uppercase tracking-wider">ML Inference</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Strength Prediction</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Uses a trained XGBoost regressor to map 8 canonical material/age inputs directly to concrete compressive strength predictions in MPa.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-rust-600">
                <span className="font-mono text-xxs uppercase tracking-wider">Sustainability</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3h9m-9 0a9 9 0 11-18 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">CO₂ Estimation</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Computes lifecycle greenhouse gas emissions (kg/m³) by multiplying material amounts by physical emission factor coefficients.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-signal-success">
                <span className="font-mono text-xxs uppercase tracking-wider">Economics</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Cost Estimation</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Provides dynamic pricing estimates ($/m³) based on the volume of Portland cement, aggregate, slag, and superplasticizer used.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-blueprint-600">
                <span className="font-mono text-xxs uppercase tracking-wider">Solver Math</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Mix Optimization</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Executes a Sequential Least Squares Programming (SLSQP) solver to search for optimal mix ratios satisfying hard water/cement ratio and target strength constraints.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-signal-warning">
                <span className="font-mono text-xxs uppercase tracking-wider">EXPLAINABILITY</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Scientific Trust Layer</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Appends validation error margins (RMSE/MAE) and flags out-of-envelope inputs (extrapolation warnings) to guard against machine learning limits.
              </p>
            </div>
          </div>

          {/* Card 6 */}
          <div className="flex flex-col justify-between rounded-sm border border-line bg-paper-raised p-6 shadow-panel hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-3 text-ink-faint">
                <span className="font-mono text-xxs uppercase tracking-wider">Production</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Demo/Research Ready</h3>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                Packaged with local Docker compose environments, GitHub Actions CI workflows, and a full model validation report suite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Sections: Why I Built It & What It Does */}
      <section className="border-y border-line bg-paper-raised py-16">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Why I Built It */}
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
              Why I Built It
            </h2>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-ink-muted">
              <p>
                Concrete is one of the most widely used construction materials in the world, but designing sustainable mixes requires balancing strength, carbon impact, cost, and material constraints. AstraMix AI explores how machine learning and optimization can support smarter concrete mix design decisions.
              </p>
              <p>
                Traditional ACI design formulas are conservative and slow. This project serves as a showcase of how civil engineering material science and modern full-stack development can collaborate to make sustainable recipe design fast, transparent, and accurate.
              </p>
            </div>
          </div>

          {/* What AstraMix Does */}
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
              What AstraMix Does
            </h2>
            <ul className="space-y-3.5 text-sm text-ink-muted font-sans">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Predicts concrete compressive strength (MPa) at varying ages.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Calculates water-to-cement (W/C) and water-to-binder (W/B) ratios.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Estimates lifecycle CO₂ carbon impact (kg/m³) for concrete mixes.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Estimates raw material cost ($/m³) using standard factor databases.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Optimizes concrete formulations under target strength boundaries.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Flags warnings when mix ratios lie outside the model&apos;s training envelope.</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blueprint-600 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Incorporates baseline ML validation error metrics (RMSE/MAE) inside the UI.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Model Performance Validation Section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
          <div className="md:col-span-1">
            <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-2">
              Model Performance
            </h2>
            <h3 className="text-2xl font-bold text-blueprint-600 mb-4">
              XGBoost Regressor
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              We trained and validated multiple algorithms on the UCI Concrete Strength dataset (1,030 instances). XGBoost was selected for its superior capacity to model non-linear binder hydration dynamics.
            </p>
            <div className="mt-4 rounded-sm border border-signal-warning/30 bg-signal-warning/5 px-4 py-3 text-xxs text-signal-warning leading-relaxed italic">
              <strong>Disclaimer:</strong> Metrics are derived from held-out validation tests and do not constitute certified construction safety guarantees.
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="overflow-hidden rounded-sm border border-line bg-paper-raised">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-paper font-mono text-xxs uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th scope="col" className="px-6 py-3">Model Candidate</th>
                    <th scope="col" className="px-6 py-3">RMSE</th>
                    <th scope="col" className="px-6 py-3">MAE</th>
                    <th scope="col" className="px-6 py-3">R² Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-muted font-mono">
                  <tr>
                    <td className="px-6 py-4 font-sans font-medium text-ink">Linear Regression</td>
                    <td className="px-6 py-4">9.80 MPa</td>
                    <td className="px-6 py-4">7.75 MPa</td>
                    <td className="px-6 py-4">0.628</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-sans font-medium text-ink">Gradient Boosting</td>
                    <td className="px-6 py-4">5.50 MPa</td>
                    <td className="px-6 py-4">4.14 MPa</td>
                    <td className="px-6 py-4">0.883</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-sans font-medium text-ink">Random Forest</td>
                    <td className="px-6 py-4">5.46 MPa</td>
                    <td className="px-6 py-4">3.75 MPa</td>
                    <td className="px-6 py-4">0.884</td>
                  </tr>
                  <tr className="bg-blueprint-50/50 font-bold text-blueprint-700">
                    <td className="px-6 py-4 font-sans text-ink">XGBoost (Selected)</td>
                    <td className="px-6 py-4">4.62 MPa</td>
                    <td className="px-6 py-4">3.03 MPa</td>
                    <td className="px-6 py-4">0.917</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Grid Section */}
      <section className="border-t border-line bg-paper-raised py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-8">
            Application Showcase (Screenshots)
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Screenshot 1 */}
            <div className="rounded-sm border border-line bg-paper p-4 shadow-panel flex flex-col justify-between min-h-[260px]">
              <ShowcaseImage
                src="/images/astramix-dashboard.png"
                alt="AstraMix Dashboard Interface"
                mockupType="dashboard"
              />
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-ink">1. AstraMix Dashboard Interface</h4>
                <p className="mt-1 text-xxs text-ink-muted leading-relaxed">
                  Input concrete mix materials, curing age, and engineering constraints through a clean full-stack interface.
                </p>
              </div>
            </div>

            {/* Screenshot 2 */}
            <div className="rounded-sm border border-line bg-paper p-4 shadow-panel flex flex-col justify-between min-h-[260px]">
              <ShowcaseImage
                src="/images/astramix-prediction.png"
                alt="Strength Prediction Results"
                mockupType="prediction"
              />
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-ink">2. Strength Prediction Results</h4>
                <p className="mt-1 text-xxs text-ink-muted leading-relaxed">
                  Predicted compressive strength with water/cement ratio, water/binder ratio, estimated model error, and training-envelope warnings.
                </p>
              </div>
            </div>

            {/* Screenshot 3 */}
            <div className="rounded-sm border border-line bg-paper p-4 shadow-panel flex flex-col justify-between min-h-[260px]">
              <ShowcaseImage
                src="/images/astramix-optimization.png"
                alt="Mix Optimization Results"
                mockupType="optimization"
              />
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-ink">3. Mix Optimization Results</h4>
                <p className="mt-1 text-xxs text-ink-muted leading-relaxed">
                  Optimized concrete mix suggestion using target strength, cost, CO₂, and water/cement constraints.
                </p>
              </div>
            </div>

            {/* Screenshot 4 */}
            <div className="rounded-sm border border-line bg-paper p-4 shadow-panel flex flex-col justify-between min-h-[260px]">
              <ShowcaseImage
                src="/images/astramix-report.png"
                alt="Technical Report & Model Card"
                mockupType="report"
              />
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-ink">4. Technical Report & Model Card</h4>
                <p className="mt-1 text-xxs text-ink-muted leading-relaxed">
                  Project documentation including model metrics, limitations, validation notes, and future research directions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Breakdown Section */}
      <section className="mx-auto max-w-5xl px-6 py-16 border-t border-line bg-paper-raised">
        <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-8">
          System Technology Stack
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-line bg-paper p-5 shadow-panel">
            <h4 className="font-mono text-xxs uppercase tracking-wider text-blueprint-600 font-bold mb-3">Backend Core</h4>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              <li>FastAPI (REST API)</li>
              <li>Uvicorn Server</li>
              <li>Pydantic v2 (Validation)</li>
              <li>Pydantic Settings</li>
            </ul>
          </div>

          <div className="rounded-sm border border-line bg-paper p-5 shadow-panel">
            <h4 className="font-mono text-xxs uppercase tracking-wider text-blueprint-600 font-bold mb-3">Frontend Client</h4>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              <li>Next.js (v14.2.35)</li>
              <li>React 18</li>
              <li>TypeScript</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>

          <div className="rounded-sm border border-line bg-paper p-5 shadow-panel">
            <h4 className="font-mono text-xxs uppercase tracking-wider text-blueprint-600 font-bold mb-3">ML & Optimizers</h4>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              <li>XGBoost Regressor</li>
              <li>Scikit-Learn</li>
              <li>Joblib Serialization</li>
              <li>SciPy SLSQP Solver</li>
            </ul>
          </div>

          <div className="rounded-sm border border-line bg-paper p-5 shadow-panel">
            <h4 className="font-mono text-xxs uppercase tracking-wider text-blueprint-600 font-bold mb-3">DevOps & Release</h4>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              <li>Docker Compose</li>
              <li>GHA CI Workflow</li>
              <li>npm audit Scanning</li>
              <li>Release Checklist</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Research Value Section */}
      <section className="border-t border-line bg-paper-raised py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
            Research Value & Interdisciplinary Rigor
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-ink-muted max-w-4xl">
            AstraMix AI stands apart from typical student portfolio projects. While many showcase repositories are simple CRUD wrappers around databases, AstraMix is a mathematically driven engineering tool:
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-ink-muted">
            <div className="border-l-2 border-blueprint-400 pl-4">
              <h4 className="font-bold text-ink mb-1">Scientific Integrity</h4>
              <p>Model limits are bound by physical concrete envelope JSON profiles. Extreme values (such as cement &gt; 540 kg/m³) are caught and flagged to highlight the limits of regression tree extrapolation.</p>
            </div>
            <div className="border-l-2 border-blueprint-400 pl-4">
              <h4 className="font-bold text-ink mb-1">Constrained Optimization</h4>
              <p>The backend wraps SciPy&apos;s Sequential Least Squares Programming solver to perform multi-objective optimization, utilizing thread locks to preserve memory stability during concurrent executions.</p>
            </div>
            <div className="border-l-2 border-blueprint-400 pl-4">
              <h4 className="font-bold text-ink mb-1">Explainability Standards</h4>
              <p>The code ships with detailed model cards and validation reports, explaining hidden variables (cement chemistry, moisture history, testing sizes) that govern physical concrete performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Limitations and Future Work */}
      <section className="mx-auto max-w-5xl px-6 py-16 border-t border-line grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* Limitations */}
        <div>
          <div className="inline-flex items-center text-rust-600 font-mono text-xxs uppercase tracking-wider mb-2">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Limitations
          </div>
          <h3 className="text-xl font-bold text-ink mb-4">Current Constraints (v0.1)</h3>
          <ul className="space-y-3.5 text-xs text-ink-muted list-disc pl-4">
            <li><strong>Not Certified for Structural Construction:</strong> Preliminary mix recipe outputs are suggestions only and must undergo physical laboratory break tests before placement.</li>
            <li><strong>Static Emission and Price Factors:</strong> Cost and carbon metrics are linear factor estimates and do not account for volatile regional market shifts.</li>
            <li><strong>No Durability or Slump Models:</strong> The platform does not yet predict fresh mix workability (slump flow) or long-term structural durability.</li>
            <li><strong>Static Uncertainty Estimates:</strong> Confidence indicators are based on offline split validations (RMSE/MAE) rather than real-time prediction interval models.</li>
          </ul>
        </div>

        {/* Future Work */}
        <div>
          <div className="inline-flex items-center text-blueprint-600 font-mono text-xxs uppercase tracking-wider mb-2">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Future Work
          </div>
          <h3 className="text-xl font-bold text-ink mb-4">Roadmap (v0.2)</h3>
          <ul className="space-y-3.5 text-xs text-ink-muted list-disc pl-4">
            <li><strong>Evolutionary Multi-Objective Optimization:</strong> Transition from weighted-sum solvers to NSGA-II algorithms to display true non-dominated Pareto frontiers.</li>
            <li><strong>Fresh and Durability Target Predictors:</strong> Train additional model classifiers to predict concrete workability (slump) and durability permeability metrics.</li>
            <li><strong>Probabilistic Confidence Boundaries:</strong> Incorporate Conformal Prediction to output mathematically sound, input-specific confidence intervals.</li>
            <li><strong>Exportable PDF Validation Sheets:</strong> Develop automated PDF generation engines to exports mix parameters and ML predictions for engineering submittals.</li>
          </ul>
        </div>
      </section>

      {/* Launch Status Section */}
      <section className="border-t border-line bg-blueprint-50/10 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint mb-4">
            Launch Readiness Status
          </h2>
          <div className="rounded-sm border border-line bg-paper-raised p-6 shadow-panel">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-success"></span>
                <span className="text-ink">AstraMix AI v0.1:</span>
                <span className="text-ink-muted font-sans font-semibold">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-success"></span>
                <span className="text-ink">Showcase Page:</span>
                <span className="text-ink-muted font-sans font-semibold">Prepared</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-warning animate-pulse"></span>
                <span className="text-ink">GitHub Repository:</span>
                <span className="text-ink-muted font-sans font-semibold">Coming Soon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-warning animate-pulse"></span>
                <span className="text-ink">Demo Video:</span>
                <span className="text-ink-muted font-sans font-semibold">Coming Soon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-warning animate-pulse"></span>
                <span className="text-ink">Custom Domain Launch:</span>
                <span className="text-ink-muted font-sans font-semibold">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <footer className="border-t border-line bg-paper-raised py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="font-mono text-2xl font-bold text-blueprint-600">
            Explore AstraMix AI
          </h2>
          <p className="mt-3 text-sm text-ink-muted max-w-xl mx-auto">
            AstraMix AI v0.1 is a completed AI + civil engineering research software project built to demonstrate sustainable concrete mix prediction, optimization, and explainability.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {isGithubComingSoon ? (
              <span className="rounded-sm bg-line px-6 py-3 text-sm font-semibold text-ink-faint cursor-not-allowed select-none">
                GitHub Repository — Coming Soon
              </span>
            ) : (
              <a
                href={links.github}
                className="rounded-sm bg-blueprint-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blueprint-700 transition-colors"
              >
                GitHub Repository
              </a>
            )}

            {isDemoComingSoon ? (
              <span className="rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink-faint cursor-not-allowed select-none">
                Demo Video — Coming Soon
              </span>
            ) : (
              <a
                href={links.demo}
                className="rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-paper transition-colors"
              >
                Demo Video
              </a>
            )}

            <a
              href={links.report}
              className="rounded-sm border border-line bg-paper-raised px-6 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-paper transition-colors"
            >
              Technical Report
            </a>
          </div>
          <p className="mt-12 text-xxs text-ink-faint">
            AstraMix AI v0.1 — Created by Nikolay Khachatryan
          </p>
          <p className="mt-1 text-xxs text-ink-faint">
            &copy; 2026. Open-source research and engineering portfolio.
          </p>
        </div>
      </footer>
    </div>
  );
}
