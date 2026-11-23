import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ModelComparisonTable } from "@/components/charts/ModelComparisonTable";
import validation from "@/data/modelValidation.json";

export default function ModelComparisonPage() {
  const models = validation.development_comparison.map(row => ({
    modelName: row.model,
    rmse: row.cv_rmse,
    mae: row.cv_mae,
    r2: row.cv_r2,
  }));
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader eyebrow="Model evaluation" title="Model Comparison"
        subtitle="Five-fold recipe-grouped cross-validation within the development partition." />
      <Card>
        <p className="text-sm text-ink-muted">The {validation.best_model_name} model was selected by the lowest pooled development RMSE. Scores below compare the same development folds.</p>
        <ModelComparisonTable models={models} />
        <p className="mt-4 text-sm text-ink-muted">On the separate internal test partition, selected-model RMSE is {validation.validation_metrics.rmse.toFixed(2)} MPa; linear-baseline RMSE is {validation.baseline_test_metrics.rmse.toFixed(2)} MPa. These aggregate errors are not per-mix confidence intervals. This dataset has been used in earlier experiments; external validation remains outstanding.</p>
      </Card>
    </div>
  );
}
