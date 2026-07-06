"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/results/ResultCard";
import { ResultSummaryGrid } from "@/components/results/ResultSummaryGrid";
import { OptimizedMixSummary } from "@/components/results/OptimizedMixSummary";
import { useReport } from "@/lib/context/ReportContext";
import { formatNumber, formatCurrency } from "@/lib/utils/formatUnits";

export default function ReportPreviewPage() {
  const { report, clearReport } = useReport();

  const hasAnything = Boolean(report.strength || report.co2 || report.cost || report.optimized);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Session"
        title="Report Preview"
        subtitle="A snapshot of the most recent prediction and optimization results from this browser session."
      />

      {!hasAnything && (
        <Card className="flex flex-col items-start gap-4">
          <p className="text-sm text-ink-muted">
            Nothing to show yet. Run a prediction or optimization and it will
            appear here.
          </p>
          <div className="flex gap-3">
            <Link href="/predict">
              <Button variant="secondary">Go to Predict Strength</Button>
            </Link>
            <Link href="/optimize">
              <Button variant="secondary">Go to Optimize Mix</Button>
            </Link>
          </div>
        </Card>
      )}

      {hasAnything && (
        <div className="flex flex-col gap-10">
          {(report.strength || report.co2 || report.cost) && (
            <section>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wide2 text-ink-faint">
                Latest prediction
              </h2>
              <ResultSummaryGrid>
                {report.strength && (
                  <ResultCard
                    label="Strength"
                    value={formatNumber(report.strength.predictedStrengthMPa)}
                    unit="MPa"
                    sublabel={`Model: ${report.strength.modelUsed}`}
                  />
                )}
                {report.co2 && (
                  <ResultCard
                    label="CO₂"
                    value={formatNumber(report.co2.totalCO2KgPerM3)}
                    unit="kg/m³"
                  />
                )}
                {report.cost && (
                  <ResultCard
                    label="Cost"
                    value={formatCurrency(report.cost.totalCostPerM3, report.cost.currency)}
                    unit="/ m³"
                  />
                )}
              </ResultSummaryGrid>
            </section>
          )}

          {report.optimized && (
            <section>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wide2 text-ink-faint">
                Latest optimization
              </h2>
              <OptimizedMixSummary result={report.optimized} />
            </section>
          )}

          <div>
            <Button variant="ghost" onClick={clearReport}>
              Clear session report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
