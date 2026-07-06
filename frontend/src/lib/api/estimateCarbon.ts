import { apiPost } from "./client";
import { ENDPOINTS } from "./endpoints";
import { frontendToApiMix, apiToFrontendCO2Estimate } from "./adapters";
import { ConcreteMixInput, ConcreteMixInputApi } from "@/types/mix";
import { CO2Estimate, CO2EstimateApi } from "@/types/predictions";

export async function estimateCarbon(mix: ConcreteMixInput): Promise<CO2Estimate> {
  const payload = { mix: frontendToApiMix(mix) };
  const res = await apiPost<CO2EstimateApi, { mix: ConcreteMixInputApi }>(
    ENDPOINTS.estimateCarbon,
    payload
  );
  return apiToFrontendCO2Estimate(res, mix);
}
