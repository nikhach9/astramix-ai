import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ModelComparisonPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Tool"
        title="Model Comparison"
        subtitle="Compare prediction models by RMSE, MAE, and R² once benchmark data is available from the backend."
      />

      <Card className="flex flex-col items-start gap-4">
        <Badge variant="neutral">Not available yet</Badge>
        <p className="text-sm leading-relaxed text-ink-muted">
          There is no model-comparison endpoint in the current backend contract
          (only <code className="font-mono text-xs">/predict-strength</code>,{" "}
          <code className="font-mono text-xs">/estimate-carbon</code>,{" "}
          <code className="font-mono text-xs">/estimate-cost</code>, and{" "}
          <code className="font-mono text-xs">/optimize-mix</code> exist today).
          Rather than show placeholder numbers, this page stays empty until a
          real endpoint — for example{" "}
          <code className="font-mono text-xs">GET /api/v1/models/compare</code> —
          is added.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Once that endpoint exists, this page will fetch a list of{" "}
          <code className="font-mono text-xs">ModelComparisonEntry</code> records
          and render them with the existing{" "}
          <code className="font-mono text-xs">RadarModelChart</code> component —
          no new chart component is needed, only the fetch call.
        </p>
      </Card>
    </div>
  );
}
