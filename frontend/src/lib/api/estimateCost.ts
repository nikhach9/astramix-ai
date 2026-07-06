import { apiPost } from "./client";
import { ENDPOINTS } from "./endpoints";
import { frontendToApiMix, apiToFrontendCostEstimate } from "./adapters";
import { ConcreteMixInput, ConcreteMixInputApi } from "@/types/mix";
import { CostEstimate, CostEstimateApi } from "@/types/predictions";

export async function estimateCost(mix: ConcreteMixInput): Promise<CostEstimate> {
  const payload = { mix: frontendToApiMix(mix) };
  const res = await apiPost<CostEstimateApi, { mix: ConcreteMixInputApi }>(
    ENDPOINTS.estimateCost,
    payload
  );
  return apiToFrontendCostEstimate(res, mix);
}
