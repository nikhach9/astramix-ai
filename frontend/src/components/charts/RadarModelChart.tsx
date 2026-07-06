import { ModelComparisonEntry } from "@/types/predictions";

interface RadarModelChartProps {
  models: ModelComparisonEntry[];
}

export function RadarModelChart({ models }: RadarModelChartProps) {
  if (!models || models.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-faint">
        No models to compare.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <div className="text-sm font-medium text-ink">Model performance comparison</div>
      <div className="overflow-x-auto rounded-sm border border-line-strong">
        <table className="w-full text-left text-sm text-ink">
          <thead className="bg-paper-sunken text-xs uppercase text-ink-faint">
            <tr>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">RMSE</th>
              <th className="px-4 py-2 font-medium">MAE</th>
              <th className="px-4 py-2 font-medium">R²</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {models.map((m) => (
              <tr key={m.modelName}>
                <td className="px-4 py-2 font-medium">{m.modelName}</td>
                <td className="px-4 py-2 font-mono text-xs">{m.rmse.toFixed(3)}</td>
                <td className="px-4 py-2 font-mono text-xs">{m.mae.toFixed(3)}</td>
                <td className="px-4 py-2 font-mono text-xs">{m.r2.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
