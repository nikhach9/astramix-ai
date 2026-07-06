import { ConcreteMixInput } from "@/types/mix";

/**
 * A plausible starting mix used only to seed the form UI. This is not a
 * prediction, recommendation, or real test result — it exists so the form
 * doesn't render at all-zero on first load.
 */
export const DEFAULT_MIX: ConcreteMixInput = {
  cement: 350,
  blastFurnaceSlag: 0,
  flyAsh: 0,
  water: 175,
  superplasticizer: 5,
  coarseAggregate: 1000,
  fineAggregate: 750,
  ageDays: 28,
};
