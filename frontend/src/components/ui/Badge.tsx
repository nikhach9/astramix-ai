import { ReactNode } from "react";

interface BadgeProps {
  variant?: "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  success: "bg-signal-success/10 text-signal-success border-signal-success/30",
  warning: "bg-signal-warning/10 text-signal-warning border-signal-warning/30",
  danger: "bg-signal-danger/10 text-signal-danger border-signal-danger/30",
  neutral: "bg-line/40 text-ink-muted border-line-strong",
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium uppercase tracking-wide2 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
