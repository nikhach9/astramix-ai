import { HTMLAttributes } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-sm border border-line bg-paper-raised p-6 shadow-panel ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
