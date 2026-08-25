"use client";

import { useState } from "react";
import { MixInputForm } from "@/components/forms/MixInputForm";
import { ResultCard } from "@/components/results/ResultCard";
import { ResultSummaryGrid } from "@/components/results/ResultSummaryGrid";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { usePrediction } from "@/lib/hooks/usePrediction";
import { predictStrength } from "@/lib/api/predictStrength";
import { estimateCarbon } from "@/lib/api/estimateCarbon";
import { estimateCost } from "@/lib/api/estimateCost";
import { DEFAULT_MIX, validateConcreteMix } from "@/lib/constants/mixDefaults";
import {
  MIX_FIELD_LABELS,
  MATERIAL_FIELD_ORDER,
  ConcreteMixInput,
} from "@/types/mix";
import { useReport } from "@/lib/context/ReportContext";
import { formatNumber, formatCurrency } from "@/lib/utils/formatUnits";

export default function PredictStrengthPage() {
  const [mix, setMix] = useState<ConcreteMixInput>(DEFAULT_MIX);

  const strength = usePrediction(predictStrength);
  const co2 = usePrediction(estimateCarbon);
  const cost = usePrediction(estimateCost);

  const { setReportSection } = useReport();

  const loading = strength.loading || co2.loading || cost.loading;
  const anyError = strength.error ?? co2.error ?? cost.error;

  const handleSubmit = async () => {
    // 1. Client-side sanity check validation
    const clientErrors = validateConcreteMix(mix);
    if (Object.keys(clientErrors).length > 0) {
      strength.setErrors(
        clientErrors,
        "Client Validation Error: Invalid mix input values."
      );
      return;
    }

    // 2. Execute API calls
    const [strengthResult, co2Result, costResult] = await Promise.all([
      strength.run(mix),
      co2.run(mix),
      cost.run(mix),
    ]);

    if (strengthResult) setReportSection("strength", strengthResult);
    if (co2Result) setReportSection("co2", co2Result);
    if (costResult) setReportSection("cost", costResult);
  };

  const hasResults = strength.data && co2.data && cost.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Tool"
        title="Predict Strength"
        subtitle="Enter a mix design to get predicted compressive strength, CO₂ output, and cost for the same mix in one pass."
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Card>
          <MixInputForm
            value={mix}
            onChange={setMix}
            onSubmit={handleSubmit}
            errors={strength.fieldErrors}
            onClearFieldError={strength.clearFieldError}
            loading={loading}
            submitLabel="Run prediction"
          />
        </Card>

        <div className="flex flex-col gap-4">
          {anyError && (
            <p className="rounded-sm border border-signal-danger/30 bg-signal-danger/5 px-4 py-3 text-sm text-signal-danger">
              {anyError}
            </p>
          )}

          {!hasResults && !loading && !anyError && (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-sm border border-dashed border-line-strong text-sm text-ink-faint">
              Results will appear here after you run a prediction.
            </div>
          )}

          {hasResults && (
            <>
              <ResultSummaryGrid>
                <ResultCard
                  label="Strength"
                  value={formatNumber(strength.data!.predictedStrengthMPa)}
                  unit="MPa"
                  sublabel={`Model: ${strength.data!.modelUsed}`}
                />
                <ResultCard
                  label="CO₂"
                  value={formatNumber(co2.data!.totalCO2KgPerM3)}
                  unit="kg/m³"
                />
                <ResultCard
                  label="Cost"
                  value={formatCurrency(
                    cost.data!.totalCostPerM3,
                    cost.data!.currency
                  )}
                  unit="/ m³"
                />
              </ResultSummaryGrid>

              {strength.data?.isOutOfDistribution && (
                <div className="rounded-sm border border-amber-500/40 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Out-of-Distribution Confidence Warning
                  </p>
                  <p className="mt-1 text-amber-800">
                    This feature vector falls outside the standard training
                    dataset envelope. Predictions may have reduced accuracy.
                  </p>
                </div>
              )}

              {strength.data?.warnings &&
                strength.data.warnings.length > 0 && (
                  <div className="flex flex-col gap-1.5 rounded-sm border border-signal-warning/30 bg-signal-warning/5 px-4 py-3 text-xs text-signal-warning">
                    <p className="font-semibold">Prediction Warnings:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {strength.data.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {strength.data?.estimatedErrorRMSEMPa && (
                <div className="rounded-sm border border-line bg-paper px-4 py-3 text-xs text-ink-muted">
                  <p className="font-semibold text-ink">
                    Validation Error Estimate:
                  </p>
                  <p className="mt-1">
                    RMSE = {strength.data.estimatedErrorRMSEMPa} MPa, MAE ={" "}
                    {strength.data.estimatedErrorMAEMPa} MPa.
                  </p>
                  {strength.data.confidenceNote && (
                    <p className="mt-1 text-xxs italic text-ink-faint">
                      {strength.data.confidenceNote}
                    </p>
                  )}
                </div>
              )}

              <BarComparisonChart
                categories={MATERIAL_FIELD_ORDER.map(
                  (f) => MIX_FIELD_LABELS[f]
                )}
                values={MATERIAL_FIELD_ORDER.map((f) => mix[f])}
                title="Mix composition"
                yLabel="kg/m³"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
