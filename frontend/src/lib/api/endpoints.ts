/**
 * Canonical backend routes. All paths are relative to API_PREFIX
 * (see client.ts) and correspond 1:1 to the FastAPI router.
 */
export const ENDPOINTS = {
  predictStrength: "/predict-strength",
  estimateCarbon: "/estimate-carbon",
  estimateCost: "/estimate-cost",
  optimizeMix: "/optimize-mix",

  /**
   * Reserved for a future NSGA-II / Pareto-front optimizer.
   * Not implemented on the backend yet and not called anywhere in this
   * codebase. Do not build UI against this until the endpoint is real —
   * it will return OptimizedMixResult[], a different shape from
   * `optimizeMix`, which stays a single-result endpoint indefinitely.
   */
  optimizeMixPareto: "/optimize-mix/pareto",

  health: "/health",
} as const;
