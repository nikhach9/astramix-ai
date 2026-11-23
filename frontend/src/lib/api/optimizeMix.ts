import { apiPost } from "./client";
import { ENDPOINTS } from "./endpoints";
import { frontendToApiOptimizeRequest, apiToFrontendOptimizedResult } from "./adapters";
import { OptimizeMixRequest, OptimizeMixRequestApi } from "@/types/mix";
import { OptimizedMixResult, OptimizedMixResultApi } from "@/types/predictions";

/** Return the best candidate found by the documented bounded search. */
export async function optimizeMix(req: OptimizeMixRequest): Promise<OptimizedMixResult> {
  const payload = frontendToApiOptimizeRequest(req);
  const res = await apiPost<OptimizedMixResultApi, OptimizeMixRequestApi>(
    ENDPOINTS.optimizeMix,
    payload
  );
  return apiToFrontendOptimizedResult(res);
}
