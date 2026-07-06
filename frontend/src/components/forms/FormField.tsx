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
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
        {unit && <span className="ml-1 font-mono text-xs font-normal text-ink-faint">{unit}</span>}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="rounded-sm border border-line-strong bg-paper-raised px-3 py-2 font-mono text-sm text-ink
                   focus:border-blueprint-400 focus:outline-none focus:ring-1 focus:ring-blueprint-400"
      />
      {helpText && <span className="text-xs text-ink-faint">{helpText}</span>}
    </label>
  );
}
