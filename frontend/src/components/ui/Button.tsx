import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blueprint-600 text-white hover:bg-blueprint-700 disabled:bg-blueprint-100 disabled:text-ink-faint",
  secondary:
    "bg-white text-ink border border-line-strong hover:border-blueprint-400 hover:text-blueprint-600 disabled:opacity-50",
  ghost: "text-ink-muted hover:text-ink disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
