"use client";

import { OptimizationConstraints } from "@/types/mix";
import { FormField } from "./FormField";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface ConstraintsFormProps {
  value: OptimizationConstraints;
  onChange: (value: OptimizationConstraints) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function ConstraintsForm({ value, onChange, onSubmit, loading = false }: ConstraintsFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="targetStrengthMPa"
          label="Target strength"
          unit="MPa"
          value={value.targetStrengthMPa}
          onChange={(v) => onChange({ ...value, targetStrengthMPa: v })}
        />
        <FormField
          id="ageDays"
          label="Age"
          unit="days"
          value={value.ageDays}
          onChange={(v) => onChange({ ...value, ageDays: v })}
        />
        <FormField
          id="maxWCRatio"
          label="Max Water/Cement ratio"
          value={value.maxWCRatio}
          onChange={(v) => onChange({ ...value, maxWCRatio: v })}
        />
        <FormField
          id="alpha"
          label="Alpha (CO₂ weight)"
          value={value.alpha}
          onChange={(v) => onChange({ ...value, alpha: v })}
        />
        <FormField
          id="beta"
          label="Beta (Cost weight)"
          value={value.beta}
          onChange={(v) => onChange({ ...value, beta: v })}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading && <Spinner />}
        {loading ? "Optimizing…" : "Run optimization"}
      </Button>
    </form>
  );
}
