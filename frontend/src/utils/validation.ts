/**
 * Retired legacy client-side validation stub.
 * Strict v1.0.0 input validation is enforced by `src/lib/constants/mixDefaults.ts`
 * and `backend/src/astramix/domain/input_schema.py`.
 */
export function getStatusStyle(status?: string) {
  return {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    dot: "bg-slate-500",
    label: status ?? "Neutral",
  };
}
