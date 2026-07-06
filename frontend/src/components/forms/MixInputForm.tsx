"use client";

import { ConcreteMixInput, MIX_FIELD_LABELS, MIX_FIELD_ORDER, MIX_FIELD_UNITS } from "@/types/mix";
import { FormField } from "./FormField";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface MixInputFormProps {
  value: ConcreteMixInput;
  onChange: (value: ConcreteMixInput) => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export function MixInputForm({
  value,
  onChange,
  onSubmit,
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
            label={MIX_FIELD_LABELS[field]}
            unit={MIX_FIELD_UNITS[field]}
            value={value[field]}
            onChange={(v) => onChange({ ...value, [field]: v })}
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
