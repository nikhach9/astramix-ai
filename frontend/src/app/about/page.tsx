import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function AboutResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        eyebrow="Reference"
        title="About Research"
        subtitle="How AstraMix AI's four models fit together."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Strength prediction</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Given a mix design (cement, slag, fly ash, water, superplasticizer,
            aggregates, and curing age), the backend model predicts compressive
            strength in MPa. The model identifier returned with each prediction
            is shown alongside the result so predictions stay traceable to the
            model version that produced them.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">CO₂ and cost estimation</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            CO₂ output and material cost are estimated per m³ from the same mix
            design, using a per-material breakdown so it is possible to see
            which components of a mix contribute most to emissions or cost.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Mix optimization (v0.1)</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The optimizer is a weighted-sum SLSQP solver: it combines strength,
            cost, and CO₂ objectives into a single scalar objective and returns
            one best trade-off mix, subject to whatever constraints are set.
            This means v0.1 returns exactly one result, not a set of
            alternatives to choose between.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            A future version is planned to add a Pareto-front optimizer
            (NSGA-II) behind a separate endpoint, returning multiple
            non-dominated candidates instead of one. That endpoint does not
            exist yet — this page will be updated when it ships, and it will
            be a new tool alongside the current one rather than a replacement
            for it.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Model Comparison</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The Model Comparison page is reserved for benchmarking prediction
            models against each other (RMSE, MAE, R²). It stays empty until a
            comparison endpoint exists on the backend, rather than showing
            placeholder figures.
          </p>
        </Card>
      </div>
    </div>
  );
}
