"use client";

import { useState } from "react";
import { ConstraintsForm } from "@/components/forms/ConstraintsForm";
import { OptimizedMixSummary } from "@/components/results/OptimizedMixSummary";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { usePrediction } from "@/lib/hooks/usePrediction";
import { optimizeMix } from "@/lib/api/optimizeMix";
import { MIX_FIELD_LABELS, MATERIAL_FIELD_ORDER, OptimizationConstraints } from "@/types/mix";
import { useReport } from "@/lib/context/ReportContext";

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  targetStrengthMPa: 30,
  ageDays: 28,
  maxWCRatio: 0.5,
  alpha: 0.5,
  beta: 0.5,
};

export default function OptimizeMixPage() {
  const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
  const { data, loading, error, run } = usePrediction(optimizeMix);
  const { setReportSection } = useReport();

  const handleSubmit = async () => {
    const result = await run({ constraints });
    if (result) setReportSection("optimized", result);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Tool"
        title="Optimize Mix"
        subtitle="Set constraints and run the solver. v0.1 returns a single weighted-sum trade-off result, not a Pareto front — see About Research for details."
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Card>
          <ConstraintsForm
            value={constraints}
            onChange={setConstraints}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </Card>

        <div className="flex flex-col gap-6">
          {error && (
            <p className="rounded-sm border border-signal-danger/30 bg-signal-danger/5 px-4 py-3 text-sm text-signal-danger">
              {error}
            </p>
          )}

          {!data && !loading && !error && (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-sm border border-dashed border-line-strong text-sm text-ink-faint">
              The optimized mix will appear here after you run the solver.
            </div>
          )}

          {data && (
            <>
              <OptimizedMixSummary result={data} />
              <BarComparisonChart
                categories={MATERIAL_FIELD_ORDER.map((f) => MIX_FIELD_LABELS[f])}
                values={MATERIAL_FIELD_ORDER.map((f) => data.mix[f])}
                title="Optimized mix composition"
                yLabel="kg/m³"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
