interface FormFieldProps {
  id?: string;
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
  error?: string;
}

export function FormField({
  id,
  label,
  unit,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  helpText,
  error,
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
        {unit && (
          <span className="ml-1 font-mono text-xs font-normal text-ink-faint">
            {unit}
          </span>
        )}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
        className={`rounded-sm border bg-paper-raised px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-1 ${
          error
            ? "border-signal-danger text-signal-danger focus:border-signal-danger focus:ring-signal-danger"
            : "border-line-strong focus:border-blueprint-400 focus:ring-blueprint-400"
        }`}
      />
      {error ? (
        <span className="text-xs font-medium text-signal-danger">{error}</span>
      ) : helpText ? (
        <span className="text-xs text-ink-faint">{helpText}</span>
      ) : null}
    </label>
  );
}
