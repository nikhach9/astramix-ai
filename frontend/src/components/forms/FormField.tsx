"use client";

import React, { useEffect, useState } from "react";

interface FormFieldProps {
  id?: string;
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isInteger?: boolean;
  presets?: number[];
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
  max = 1000,
  step = 1,
  isInteger = false,
  presets,
  helpText,
  error,
}: FormFieldProps) {
  const [rawText, setRawText] = useState<string>(
    Number.isFinite(value) ? String(value) : ""
  );

  useEffect(() => {
    if (Number.isFinite(value)) {
      setRawText((prev) => {
        const parsedCurrent = prev.trim() === "" ? NaN : Number(prev);
        return parsedCurrent !== value ? String(value) : prev;
      });
    }
  }, [value]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(NaN);
      return;
    }
    const num = Number(trimmed);
    onChange(num);
  };

  const handleStep = (delta: number) => {
    const base = Number.isFinite(value) ? value : min;
    const nextRaw = base + delta;
    const decimals = step < 1 ? 2 : 0;
    const next = Math.min(max, Math.max(min, Number(nextRaw.toFixed(decimals))));
    setRawText(String(next));
    onChange(next);
  };

  const sliderVal = Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : min;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {label}
          {unit && (
            <span className="ml-1 font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
              ({unit})
            </span>
          )}
        </label>
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
          Range: {min}–{max} {unit}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="h-9 w-8 shrink-0 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={id}
          name={id}
          type="text"
          inputMode={isInteger ? "numeric" : "decimal"}
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={`h-9 w-full rounded border px-2.5 font-mono text-sm focus:outline-none focus:ring-2 ${
            error
              ? "border-red-600 bg-red-50/40 text-red-900 dark:text-red-200 focus:border-red-600 focus:ring-red-500/30"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-500/20"
          }`}
        />
        <button
          type="button"
          onClick={() => handleStep(step)}
          className="h-9 w-8 shrink-0 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderVal}
        onChange={(e) => {
          const v = isInteger ? Math.round(Number(e.target.value)) : Number(e.target.value);
          setRawText(String(v));
          onChange(v);
        }}
        aria-label={`${label} slider`}
        className="h-1.5 w-full cursor-pointer accent-blue-600"
      />

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Presets:
          </span>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setRawText(String(p));
                onChange(p);
              }}
              className={`rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
                value === p
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      )}

      {error ? (
        <span id={`${id}-error`} role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : helpText ? (
        <span id={`${id}-help`} className="text-[11px] text-slate-500 dark:text-slate-400">
          {helpText}
        </span>
      ) : null}
    </div>
  );
}
