import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function AboutResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        eyebrow="Reference"
        title="About Research"
        subtitle="How predictions, ingredient estimates and candidate search work together."
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
          <h2 className="text-sm font-semibold text-ink">Mix candidate search</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The backend checks a reproducible set of bounded recipes, then ranks
            feasible candidates by normalized ingredient cost and CO₂. Strength,
            water/cement and water/binder ratios are constraints. The response
            records the seed, budget, evaluated count and normalization references.
            A successful search identifies the best feasible recipe checked within
            that budget. Laboratory suitability and a global optimum are not established.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Model Comparison</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Model Comparison shows the versioned development cross-validation
            results and separate internal test scores for the selected model and
            linear baseline. Both recipe groups and evaluation protocol are recorded
            with the released artifacts.
          </p>
        </Card>
      </div>
    </div>
  );
}
