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
        eyebrow="Saved in this browser"
        title="Report Preview"
        subtitle="A snapshot of the most recent prediction and optimization results saved in this browser."
      />

      {report.storageNotice && <p role="status" className="mb-4 text-sm text-amber-800">{report.storageNotice}</p>}
      {report.provenanceStatus !== "recorded" && hasAnything && <p className="mb-4 text-sm text-amber-800">This saved result has incomplete historical provenance. Model and factor versions were not reconstructed.</p>}
      {Boolean(report.incompleteSections?.length) && <p role="status" className="mb-4 text-sm text-amber-800">Incomplete estimate: {report.incompleteSections?.join(", ")}. Known subtotals are excluded from complete totals and rankings.</p>}
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

          <details className="rounded border border-line p-4 text-sm">
            <summary>Calculation inputs and provenance</summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ createdAt: report.createdAt, provenance: report.provenance, request: report.request, search: report.search, knownSubtotals: report.knownSubtotals }, null, 2)}</pre>
          </details>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => {
              const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
              const anchor = document.createElement("a"); anchor.href = url; anchor.download = "astramix-report.json"; anchor.click(); URL.revokeObjectURL(url);
            }}>Download report data</Button>
            <Button variant="ghost" onClick={clearReport}>
              Clear saved report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
