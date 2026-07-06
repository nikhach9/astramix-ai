interface BarComparisonChartProps {
  categories: string[];
  values: number[];
  title: string;
  yLabel: string;
  color?: string;
}

export function BarComparisonChart({
  categories,
  values,
  title,
  yLabel,
  color = "#1D3557",
}: BarComparisonChartProps) {
  const maxVal = Math.max(...values, 1); // prevent division by zero

  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="flex flex-col gap-3">
        {categories.map((cat, i) => (
          <div key={cat} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-ink-faint">
              <span>{cat}</span>
              <span>
                {values[i].toFixed(1)} {yLabel}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-paper-sunken">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(values[i] / maxVal) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
