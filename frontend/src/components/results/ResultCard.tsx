interface ResultCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
}

export function ResultCard({ label, value, unit, sublabel }: ResultCardProps) {
  return (
    <div className="rounded-sm border border-line bg-paper-raised p-5 shadow-panel">
      <p className="font-mono text-xs uppercase tracking-wide2 text-ink-faint">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-ink">
        {value}
        {unit && <span className="ml-1.5 text-base font-normal text-ink-muted">{unit}</span>}
      </p>
      {sublabel && <p className="mt-1.5 text-xs text-ink-faint">{sublabel}</p>}
    </div>
  );
}
