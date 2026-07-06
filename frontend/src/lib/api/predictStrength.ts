import { apiPost } from "./client";
import { ENDPOINTS } from "./endpoints";
import { frontendToApiMix, apiToFrontendStrengthPrediction } from "./adapters";
import { ConcreteMixInput, ConcreteMixInputApi } from "@/types/mix";
import { StrengthPrediction, StrengthPredictionApi } from "@/types/predictions";

export async function predictStrength(mix: ConcreteMixInput): Promise<StrengthPrediction> {
  const payload = { mix: frontendToApiMix(mix) };
  const res = await apiPost<StrengthPredictionApi, { mix: ConcreteMixInputApi }>(
    ENDPOINTS.predictStrength,
    payload
  );
  return apiToFrontendStrengthPrediction(res, mix);
}
