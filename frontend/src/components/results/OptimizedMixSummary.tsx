import { OptimizedMixResult } from "@/types/predictions";
import { ResultCard } from "./ResultCard";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatCurrency } from "@/lib/utils/formatUnits";

interface OptimizedMixSummaryProps {
  result: OptimizedMixResult;
}

export function OptimizedMixSummary({ result }: OptimizedMixSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-wide2 text-ink-faint">
          Optimization result
        </h3>
        <Badge variant={result.success ? "success" : "warning"}>
          {result.success ? "Converged" : "Did not converge"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResultCard
          label="Strength"
          value={formatNumber(result.predictedStrengthMPa)}
          unit="MPa"
        />
        <ResultCard label="CO₂" value={formatNumber(result.co2KgPerM3)} unit="kg/m³" />
        <ResultCard label="Cost" value={formatCurrency(result.costPerM3)} unit="/ m³" />
      </div>

      <p className="font-mono text-xs text-ink-faint">
        Objective value: {result.objectiveValue.toFixed(4)}
      </p>

      {result.warnings.length > 0 && (
        <ul className="rounded-sm border border-signal-warning/30 bg-signal-warning/5 px-4 py-3 text-xs text-signal-warning">
          {result.warnings.map((w, i) => (
            <li key={i}>— {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
