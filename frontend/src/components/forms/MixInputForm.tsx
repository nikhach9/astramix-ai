"use client";

import {
  ConcreteMixInput,
  MIX_FIELD_LABELS,
  MIX_FIELD_ORDER,
  MIX_FIELD_UNITS,
} from "@/types/mix";
import { MIX_FIELD_CONSTRAINTS } from "@/lib/constants/mixDefaults";
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
  submitLabel = "Run prediction",
  loading = false,
}: MixInputFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MIX_FIELD_ORDER.map((field) => (
          <FormField
            key={field}
            id={field}
            label={MIX_FIELD_LABELS[field]}
            unit={MIX_FIELD_UNITS[field]}
            value={value[field]}
            min={MIX_FIELD_CONSTRAINTS[field].min}
            max={MIX_FIELD_CONSTRAINTS[field].max}
            step={MIX_FIELD_CONSTRAINTS[field].step}
            helpText={MIX_FIELD_CONSTRAINTS[field].hint}
            error={errors[field]}
            onChange={(v) => {
              onChange({ ...value, [field]: v });
              if (errors[field] && onClearFieldError) {
                onClearFieldError(field);
              }
            }}
          />
        ))}
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading && <Spinner />}
        {loading ? "Running…" : submitLabel}
      </Button>
    </form>
  );
}
