"use client";

import {
  ConcreteMixInput,
  MIX_FIELD_LABELS,
  MIX_FIELD_ORDER,
  MIX_FIELD_UNITS,
} from "@/types/mix";
import {
  MIX_FIELD_CONSTRAINTS,
  computeWaterBinderRatio,
  computeWaterCementRatio,
  validateConcreteMix,
} from "@/lib/constants/mixDefaults";
import { FormField } from "./FormField";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface MixInputFormProps {
  value: ConcreteMixInput;
  onChange: (value: ConcreteMixInput) => void;
  onSubmit: () => void;
  errors?: Record<string, string>;
  onClearFieldError?: (field: string) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function MixInputForm({
  value,
  onChange,
  onSubmit,
  errors = {},
  onClearFieldError,
  submitLabel = "Run evaluation",
  loading = false,
}: MixInputFormProps) {
  const wcRatio = computeWaterCementRatio(value.water, value.cement);
  const wbRatio = computeWaterBinderRatio(
    value.water,
    value.cement,
    value.blastFurnaceSlag,
    value.flyAsh
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateConcreteMix(value);
    const firstInvalidField = MIX_FIELD_ORDER.find(
      (f) => validationErrors[f] || errors[f]
    );
    if (firstInvalidField) {
      const el = document.getElementById(firstInvalidField);
      if (el) {
        el.focus();
      }
    }
    onSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">
      <div className="rounded-lg border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-bold text-blue-900 dark:text-blue-300">
          Model Training-Data Range (v1.0.0):
        </span>{" "}
        Allowed limits represent the recorded reference input range (1,030 UCI mixes). They are{" "}
        <strong className="font-semibold underline">not engineering safety limits</strong> or structural code compliance guarantees. Out-of-range inputs are rejected rather than silently clamped.
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {MIX_FIELD_ORDER.map((field) => {
          const constraint = MIX_FIELD_CONSTRAINTS[field];
          return (
            <FormField
              key={field}
              id={field}
              label={MIX_FIELD_LABELS[field]}
              unit={MIX_FIELD_UNITS[field]}
              value={value[field]}
              min={constraint.min}
              max={constraint.max}
              step={constraint.step}
              isInteger={constraint.isInteger}
              presets={constraint.presets}
              helpText={constraint.hint}
              error={errors[field]}
              onChange={(v) => {
                onChange({ ...value, [field]: v });
                if (errors[field] && onClearFieldError) {
                  onClearFieldError(field);
                }
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">
            Water / cement ratio (w/c = water / cement)
          </span>
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
            {wcRatio > 0 ? wcRatio.toFixed(3) : "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">
            Water / binder ratio (w/b = water / total binder)
          </span>
          <span
            className={`font-mono text-sm font-bold ${
              wbRatio >= 0.2 && wbRatio <= 1.0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {wbRatio > 0 ? wbRatio.toFixed(3) : "—"}{" "}
            <span className="text-[11px] font-normal text-slate-500">
              (allowed 0.20–1.00)
            </span>
          </span>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading && <Spinner />}
        {loading ? "Running…" : submitLabel}
      </Button>
    </form>
  );
}
