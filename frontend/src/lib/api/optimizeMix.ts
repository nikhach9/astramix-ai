import { apiPost } from "./client";
import { ENDPOINTS } from "./endpoints";
import { frontendToApiOptimizeRequest, apiToFrontendOptimizedResult } from "./adapters";
import { OptimizeMixRequest, OptimizeMixRequestApi } from "@/types/mix";
import { OptimizedMixResult, OptimizedMixResultApi } from "@/types/predictions";

/**
 * v0.1: the backend optimizer is a weighted-sum SLSQP solver and returns a
 * single trade-off point, not a Pareto front. This function returns exactly
 * one OptimizedMixResult. When a Pareto-front endpoint ships
 * (ENDPOINTS.optimizeMixPareto), it will need its own function returning
 * OptimizedMixResult[] — this one should not change shape underneath callers.
 */
export async function optimizeMix(req: OptimizeMixRequest): Promise<OptimizedMixResult> {
  const payload = frontendToApiOptimizeRequest(req);
  const res = await apiPost<OptimizedMixResultApi, OptimizeMixRequestApi>(
    ENDPOINTS.optimizeMix,
    payload
  );
  return apiToFrontendOptimizedResult(res);
}
