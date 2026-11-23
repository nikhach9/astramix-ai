"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  Info,
  Sliders,
  Store,
} from "lucide-react";
import { ConcreteMixInput, MIX_FIELD_ORDER } from "@/types/mix";
import {
  DEFAULT_MIX,
  validateConcreteMix,
} from "@/lib/constants/mixDefaults";
import { MixInputForm } from "@/components/forms/MixInputForm";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { saveLastReport } from "@/lib/utils/reportStorage";

interface MixLabWorkspaceProps {
  initialMode?: "predict" | "optimize";
}

const COLOR_STYLES: Record<
  string,
  {
    border: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    valueText: string;
    defaultRatingLabel: string;
  }
> = {
  green: {
    border: "border-[#146C43]/40",
    bg: "bg-[#FFFFFF]",
    badgeBg: "bg-[#E6F4EC]",
    badgeText: "text-[#146C43]",
    valueText: "text-[#146C43]",
    defaultRatingLabel: "Good",
  },
  yellow: {
    border: "border-[#805700]/40",
    bg: "bg-[#FFFFFF]",
    badgeBg: "bg-[#FFF3CD]",
    badgeText: "text-[#805700]",
    valueText: "text-[#805700]",
    defaultRatingLabel: "Normal",
  },
  red: {
    border: "border-[#B42318]/40",
    bg: "bg-[#FFFFFF]",
    badgeBg: "bg-[#FCE9E7]",
    badgeText: "text-[#B42318]",
    valueText: "text-[#B42318]",
    defaultRatingLabel: "Poor",
  },
  neutral: {
    border: "border-[#D8DFDF]",
    bg: "bg-[#FFFFFF]",
    badgeBg: "bg-[#EDF0F2]",
    badgeText: "text-[#536574]",
    valueText: "text-[#172D44]",
    defaultRatingLabel: "Not enough comparable data",
  },
};

function toCanonicalMixPayload(mix: ConcreteMixInput) {
  return {
    cement: Number(mix.cement),
    blast_furnace_slag: Number(mix.blastFurnaceSlag),
    fly_ash: Number(mix.flyAsh),
    water: Number(mix.water),
    superplasticizer: Number(mix.superplasticizer),
    coarse_aggregate: Number(mix.coarseAggregate),
    fine_aggregate: Number(mix.fineAggregate),
    age: Number(mix.ageDays),
  };
}

function fromCanonicalMixPayload(raw: Record<string, number>): ConcreteMixInput {
  return {
    cement: Number(raw.cement ?? 350),
    blastFurnaceSlag: Number(raw.blast_furnace_slag ?? 0),
    flyAsh: Number(raw.fly_ash ?? 0),
    water: Number(raw.water ?? 175),
    superplasticizer: Number(raw.superplasticizer ?? 3.5),
    coarseAggregate: Number(raw.coarse_aggregate ?? 1020),
    fineAggregate: Number(raw.fine_aggregate ?? 760),
    ageDays: Number(raw.age ?? 28),
  };
}

export function MixLabWorkspace({ initialMode = "predict" }: MixLabWorkspaceProps) {
  const router = useRouter();
  const isOptimizePage = initialMode === "optimize";

  const [mix, setMix] = useState<ConcreteMixInput>(DEFAULT_MIX);
  const [transferredBanner, setTransferredBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Target & Comparison settings
  const [targetStrengthText, setTargetStrengthText] = useState<string>("");
  const [targetClass, setTargetClass] = useState<string>("");
  const [comparisonMode, setComparisonMode] = useState<"selected_reference" | "market_cohort">(
    "selected_reference"
  );
  const [tolerancePct, setTolerancePct] = useState<number>(5.0);
  const [simulateIncompletePrice, setSimulateIncompletePrice] = useState<boolean>(false);

  // Optimizer settings (only used when isOptimizePage === true)
  const [optTargetMpa, setOptTargetMpa] = useState<string>("40");
  const [optAgeDays, setOptAgeDays] = useState<string>("28");
  const [optMaxWc, setOptMaxWc] = useState<string>("0.55");
  const [optMaxWb, setOptMaxWb] = useState<string>("0.48");
  const [optAlpha, setOptAlpha] = useState<string>("1.0");
  const [optBeta, setOptBeta] = useState<string>("1.0");
  const [optErrors, setOptErrors] = useState<Record<string, string>>({});

  // Results state
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [optStatusInfo, setOptStatusInfo] = useState<any | null>(null);
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({
    strength: false,
    cost: false,
    emissions: false,
    provenance: false,
  });

  // Materials Market transfer volume
  const [projectVolumeM3, setProjectVolumeM3] = useState<string>("5.0");
  const [schemaInfo, setSchemaInfo] = useState<any | null>(null);

  useEffect(() => {
    apiGet("/schema/mix-input")
      .then((data) => setSchemaInfo(data))
      .catch(() => null);

    if (!isOptimizePage) {
      let initialMixToEval = DEFAULT_MIX;
      let initialTargetMpa: number | null = null;
      if (typeof window !== "undefined") {
        const transferredRaw = window.sessionStorage.getItem(
          "astramix_predict_candidate_transfer"
        );
        if (transferredRaw) {
          try {
            const parsed = JSON.parse(transferredRaw);
            if (parsed?.mix) {
              initialMixToEval = fromCanonicalMixPayload(parsed.mix);
              setMix(initialMixToEval);
              if (parsed.target_strength_mpa) {
                setTargetStrengthText(String(parsed.target_strength_mpa));
                initialTargetMpa = Number(parsed.target_strength_mpa);
              }
              setTransferredBanner(
                "Loaded candidate mix transferred from Mix Optimizer. Evaluating strength, cost, and embodied emissions."
              );
            }
          } catch {
            // ignore malformed transfer
          }
          window.sessionStorage.removeItem("astramix_predict_candidate_transfer");
        }
      }

      apiPost<any>("/mix-lab/evaluate", {
        mix: toCanonicalMixPayload(initialMixToEval),
        target_strength_mpa: initialTargetMpa,
        comparison_mode: "selected_reference",
        tolerance_pct: 5.0,
        currency: "USD",
      })
        .then((data) => setEvalResult(data))
        .catch(() => null);
    }
  }, [isOptimizePage]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleRunEvaluation = async () => {
    setBannerError(null);
    const clientErrors = validateConcreteMix(mix);

    if (targetStrengthText.trim() !== "") {
      const tVal = Number(targetStrengthText.trim());
      if (!Number.isFinite(tVal) || tVal <= 0 || tVal > 150) {
        setBannerError("Target compressive strength must be a finite number between 0 and 150 MPa.");
        return;
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setBannerError("Please fix the highlighted input range or type errors before running prediction.");
      const firstField = MIX_FIELD_ORDER.find((f) => clientErrors[f]);
      if (firstField) {
        document.getElementById(firstField)?.focus();
      }
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const payload: Record<string, any> = {
        mix: toCanonicalMixPayload(mix),
        target_strength_mpa:
          targetStrengthText.trim() !== "" ? Number(targetStrengthText.trim()) : null,
        target_strength_class: targetClass || null,
        comparison_mode: comparisonMode,
        tolerance_pct: tolerancePct,
        currency: "USD",
      };

      if (simulateIncompletePrice) {
        payload.strict_custom_prices = true;
        payload.unit_costs = {
          cement: 0.12,
          blast_furnace_slag: 0.06,
          fly_ash: 0.04,
          water: 0.002,
          superplasticizer: null,
          coarse_aggregate: null,
          fine_aggregate: 0.02,
        };
      }

      const data = await apiPost<any>("/mix-lab/evaluate", payload);
      setEvalResult(data);

      if (data?.cards) {
        const strCard = data.cards.predicted_strength ?? data.cards.strength;
        const co2Card = data.cards.estimated_embodied_emissions ?? data.cards.emissions;
        const costCard = data.cards.estimated_ingredient_cost ?? data.cards.cost;
        if (strCard && co2Card && costCard) {
          saveLastReport({
            createdAt: new Date().toISOString(),
            mix,
            provenance: data.provenance,
            request: payload,
            strength: {
              predictedStrengthMPa: Number(strCard.headline_value ?? 0),
              ageDays: Number(strCard.curing_age_days ?? mix.ageDays),
              waterCementRatio: Number(data.provenance?.water_cement_ratio ?? 0),
              waterBinderRatio: Number(data.provenance?.water_binder_ratio ?? 0),
              modelVersion: data.provenance?.model_version,
              warnings: strCard.details?.warnings ?? [],
              estimatedErrorRMSEMPa: strCard.details?.estimated_error_rmse_mpa,
              estimatedErrorMAEMPa: strCard.details?.estimated_error_mae_mpa,
            },
            co2: {
              isComplete: co2Card.is_complete !== false && co2Card.headline_value !== null,
              totalCo2KgPerM3: Number(co2Card.known_subtotal_co2_kg_per_m3 ?? co2Card.headline_value),
              breakdownKgPerM3: co2Card.details?.breakdown_kg_per_m3 ?? {},
            },
            cost: {
              currency: costCard.currency ?? "USD",
              isComplete: costCard.is_complete !== false && costCard.headline_value !== null,
              totalCostPerM3: Number(costCard.known_subtotal_per_m3 ?? costCard.headline_value),
              breakdownPerM3: costCard.details?.breakdown_per_m3 ?? {},
            },
          });
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setBannerError(err.message);
      } else {
        setBannerError("Failed to evaluate mix. Verify backend server connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimization = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    const errs: Record<string, string> = {};

    const tMpa = Number(optTargetMpa.trim());
    if (optTargetMpa.trim() === "" || !Number.isFinite(tMpa) || tMpa <= 0 || tMpa > 150) {
      errs.target_strength_mpa = "Target strength must be a finite number in (0, 150] MPa.";
    }

    const ageNum = Number(optAgeDays.trim());
    if (
      optAgeDays.trim() === "" ||
      !Number.isFinite(ageNum) ||
      !Number.isInteger(ageNum) ||
      ageNum < 1 ||
      ageNum > 365
    ) {
      errs.age = "Curing age must be a whole integer between 1 and 365 days.";
    }

    const wcNum = Number(optMaxWc.trim());
    if (optMaxWc.trim() === "" || !Number.isFinite(wcNum) || wcNum <= 0 || wcNum > 2.0) {
      errs.max_w_c_ratio = "Max w/c ratio (water / cement) must be in (0.0, 2.0].";
    }

    let wbNum: number | null = null;
    if (optMaxWb.trim() !== "") {
      wbNum = Number(optMaxWb.trim());
      if (!Number.isFinite(wbNum) || wbNum < 0.2 || wbNum > 1.0) {
        errs.max_w_b_ratio = "Max w/b ratio (water / total binder) must be in [0.20, 1.00].";
      }
    }

    const alphaNum = Number(optAlpha.trim());
    const betaNum = Number(optBeta.trim());
    if (optAlpha.trim() === "" || !Number.isFinite(alphaNum) || alphaNum < 0) {
      errs.alpha = "CO₂ weight (alpha) must be a non-negative number.";
    }
    if (optBeta.trim() === "" || !Number.isFinite(betaNum) || betaNum < 0) {
      errs.beta = "Cost weight (beta) must be a non-negative number.";
    }
    if (!errs.alpha && !errs.beta && alphaNum === 0 && betaNum === 0) {
      errs.alpha = "alpha and beta cannot both be zero.";
    }

    if (Object.keys(errs).length > 0) {
      setOptErrors(errs);
      const firstId = Object.keys(errs)[0];
      document.getElementById(`opt-${firstId}`)?.focus();
      return;
    }

    setOptErrors({});
    setLoading(true);
    try {
      const data = await apiPost<any>("/mix-lab/optimize", {
        constraints: {
          target_strength_mpa: tMpa,
          age: ageNum,
          max_w_c_ratio: wcNum,
          max_w_b_ratio: wbNum,
          alpha: alphaNum,
          beta: betaNum,
        },
        comparison_mode: comparisonMode,
        tolerance_pct: tolerancePct,
      });

      const resultCards = data.cards;
      if (resultCards) {
        const strength = resultCards.predicted_strength ?? resultCards.strength;
        const cost = resultCards.estimated_ingredient_cost ?? resultCards.cost;
        const emissions = resultCards.estimated_embodied_emissions ?? resultCards.emissions;
        saveLastReport({
          createdAt: new Date().toISOString(), mix: fromCanonicalMixPayload(data.mix),
          provenance: data.provenance, search: data.search,
          request: { constraints: { target_strength_mpa: tMpa, age: ageNum, max_w_c_ratio: wcNum, max_w_b_ratio: wbNum, alpha: alphaNum, beta: betaNum }, comparison_mode: comparisonMode, tolerance_pct: tolerancePct },
          strength: { predictedStrengthMPa: strength.headline_value, modelVersion: data.provenance?.model_version,
            estimatedErrorRMSEMPa: strength.details?.estimated_error_rmse_mpa, estimatedErrorMAEMPa: strength.details?.estimated_error_mae_mpa },
          cost: { currency: cost.currency ?? "USD", totalCostPerM3: cost.known_subtotal_per_m3 ?? cost.headline_value,
            isComplete: cost.is_complete !== false && cost.headline_value !== null, breakdownPerM3: cost.details?.breakdown_per_m3 },
          co2: { totalCo2KgPerM3: emissions.known_subtotal_co2_kg_per_m3 ?? emissions.headline_value,
            isComplete: emissions.is_complete !== false && emissions.headline_value !== null, breakdownKgPerM3: emissions.details?.breakdown_kg_per_m3 },
        });
      }
      setOptStatusInfo({
        success: data.success,
        isOptimum: data.is_optimum,
        solverStatus: data.solver_status,
        failureReason: data.failure_reason,
        statusLabel: data.status_label,
        warnings: data.warnings ?? [],
        objectiveValue: data.objective_value,
        search: data.search,
      });

      if (data.mix) {
        setMix(fromCanonicalMixPayload(data.mix));
      }
      if (data.cards) {
        setEvalResult({
          success: true,
          mix: data.mix,
          cards: data.cards,
          provenance: data.provenance,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setBannerError(err.message);
      } else {
        setBannerError("Optimization request failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseCandidateInPrediction = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "astramix_predict_candidate_transfer",
        JSON.stringify({
          mix: toCanonicalMixPayload(mix),
          target_strength_mpa: Number(optTargetMpa) || null,
        })
      );
    }
    router.push("/mix-lab/predict");
  };

  const handleUseMixInMarket = () => {
    const vol = Number(projectVolumeM3);
    if (!Number.isFinite(vol) || vol <= 0) {
      setBannerError("Enter a valid positive project volume in m³ before sending to Materials Market.");
      return;
    }
    const transferPayload = {
      mix: toCanonicalMixPayload(mix),
      project_volume_m3: vol,
      predicted_strength_mpa:
        evalResult?.cards?.predicted_strength?.headline_value ?? null,
    };
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "astramix_market_basket_transfer",
        JSON.stringify(transferPayload)
      );
    }
    router.push(`/materials-market?fromMixLab=1&volume=${encodeURIComponent(String(vol))}`);
  };

  const cards = evalResult?.cards;
  const provenance = evalResult?.provenance;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Dedicated Route Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#D8DFDF] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href="/mix-lab"
              className="inline-flex items-center gap-1 rounded-full bg-[#EFECE4] border border-[#D8DFDF] px-3 py-1 text-xs font-bold text-[#172D44] hover:bg-[#FFFFFF]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Mix Lab Hub</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EC] border border-[#176B65]/25 px-3 py-1 text-xs font-bold text-[#176B65]">
              {isOptimizePage ? (
                <>
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Workflow 2 · Mix Optimization (Schema v{schemaInfo?.schema_version ?? "1.0.0"})</span>
                </>
              ) : (
                <>
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Workflow 1 · Strength Prediction (Schema v{schemaInfo?.schema_version ?? "1.0.0"})</span>
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#172D44]">
            {isOptimizePage
              ? "Optimize Concrete Mix Proportions for Target Strength"
              : "Predict Concrete Strength, Cost & Embodied Emissions"}
          </h1>
          <p className="mt-1 text-sm text-[#536574] max-w-3xl">
            {isOptimizePage
              ? "Specify target compressive strength, curing age, maximum w/c and w/b ratios, and cost vs. carbon weights. Candidate mixes can be sent to Strength Prediction with one click."
              : "Enter one known 1 m³ concrete composition and curing age to evaluate compressive strength, ingredient cost, and embodied carbon with clear comparison badges."}
          </p>
        </div>

        {/* Dedicated Route Links (Separate Workflows) */}
        <div className="flex items-center rounded-xl bg-[#EFECE4] p-1 border border-[#D8DFDF] self-start">
          <Link
            href="/mix-lab/predict"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              !isOptimizePage
                ? "bg-[#FFFFFF] text-[#176B65] shadow-xs"
                : "text-[#536574] hover:text-[#172D44]"
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Predict Strength</span>
          </Link>
          <Link
            href="/mix-lab/optimize"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              isOptimizePage
                ? "bg-[#FFFFFF] text-[#A65429] shadow-xs"
                : "text-[#536574] hover:text-[#172D44]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Optimize Mix</span>
          </Link>
        </div>
      </div>

      {transferredBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#146C43]/30 bg-[#E6F4EC] px-4 py-3 text-xs font-semibold text-[#146C43]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{transferredBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setTransferredBanner(null)}
            className="text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {bannerError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[#B42318]/40 bg-[#FCE9E7] px-4 py-3 text-xs font-semibold text-[#B42318]"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#B42318] mt-0.5" />
          <span>{bannerError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Either Predict Input Form OR Optimize Constraints Form (Never Merged) */}
        <div className="lg:col-span-6 space-y-6 rounded-2xl border border-[#D8DFDF] bg-[#EFECE4]/60 p-5">
          {!isOptimizePage ? (
            <>
              {/* Predict Mode: Comparison & Target Context */}
              <div className="rounded-xl border border-[#D8DFDF] bg-[#FFFFFF] p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172D44]">
                  Comparison &amp; Target Context
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="target-strength-input"
                      className="block text-xs font-semibold text-[#172D44] mb-1"
                    >
                      Optional Target Strength (MPa)
                    </label>
                    <input
                      id="target-strength-input"
                      type="text"
                      inputMode="decimal"
                      placeholder="Leave blank for neutral context"
                      value={targetStrengthText}
                      onChange={(e) => setTargetStrengthText(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#FFFFFF] px-2.5 font-mono text-xs text-[#172D44]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="target-class-select"
                      className="block text-xs font-semibold text-[#172D44] mb-1"
                    >
                      Standard Grade / Specimen Basis
                    </label>
                    <select
                      id="target-class-select"
                      value={targetClass}
                      onChange={(e) => {
                        const code = e.target.value;
                        setTargetClass(code);
                        const found = schemaInfo?.strength_classes?.find(
                          (sc: any) => sc.code === code
                        );
                        if (found) {
                          setTargetStrengthText(String(found.cylinder_mpa));
                        }
                      }}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#FFFFFF] px-2 text-xs text-[#172D44]"
                    >
                      <option value="">No preset class (custom / neutral)</option>
                      <option value="C20/25">EN 206 C20/25 (20 MPa cyl / 25 MPa cube @ 28d)</option>
                      <option value="C25/30">EN 206 C25/30 (25 MPa cyl / 30 MPa cube @ 28d)</option>
                      <option value="C30/37">EN 206 C30/37 (30 MPa cyl / 37 MPa cube @ 28d)</option>
                      <option value="C35/45">EN 206 C35/45 (35 MPa cyl / 45 MPa cube @ 28d)</option>
                      <option value="C40/50">EN 206 C40/50 (40 MPa cyl / 50 MPa cube @ 28d)</option>
                      <option value="ACI-3000psi">ACI 3000 psi (20.7 MPa cyl @ 28d)</option>
                      <option value="ACI-4000psi">ACI 4000 psi (27.6 MPa cyl @ 28d)</option>
                      <option value="ACI-5000psi">ACI 5000 psi (34.5 MPa cyl @ 28d)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label
                      htmlFor="comparison-mode-select"
                      className="block text-xs font-semibold text-[#172D44] mb-1"
                    >
                      Cost &amp; Emissions Comparison Mode
                    </label>
                    <select
                      id="comparison-mode-select"
                      value={comparisonMode}
                      onChange={(e) =>
                        setComparisonMode(
                          e.target.value as "selected_reference" | "market_cohort"
                        )
                      }
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#FFFFFF] px-2 text-xs text-[#172D44]"
                    >
                      <option value="selected_reference">
                        Compared with selected reference (OPC 380 baseline)
                      </option>
                      <option value="market_cohort">
                        Local market cohort percentile bands (requires ≥ 10 obs)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="tolerance-pct-input"
                      className="block text-xs font-semibold text-[#172D44] mb-1"
                    >
                      Reference Tolerance Band (±%)
                    </label>
                    <input
                      id="tolerance-pct-input"
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={tolerancePct}
                      onChange={(e) => setTolerancePct(Number(e.target.value) || 5.0)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#FFFFFF] px-2.5 font-mono text-xs text-[#172D44]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs text-[#536574] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateIncompletePrice}
                    onChange={(e) => setSimulateIncompletePrice(e.target.checked)}
                    className="rounded border-[#D8DFDF] text-[#176B65]"
                  />
                  <span>
                    Test incomplete ingredient price state (omit superplasticizer &amp; coarse aggregate prices to verify non-zero coverage handling)
                  </span>
                </label>
              </div>

              {/* Predict Mode: Mix Proportions Form */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-[#172D44]">
                  Known Mix Proportions &amp; Curing Age (per m³)
                </h2>
                <MixInputForm
                  value={mix}
                  onChange={setMix}
                  onSubmit={handleRunEvaluation}
                  errors={fieldErrors}
                  onClearFieldError={clearFieldError}
                  submitLabel="Predict Strength & Evaluate Mix"
                  loading={loading}
                />
              </div>
            </>
          ) : (
            <>
              {/* Optimize Mode: Constrained Multi-Objective Optimizer Form */}
              <form
                onSubmit={handleRunOptimization}
                noValidate
                className="rounded-xl border border-[#D8DFDF] bg-[#FFFFFF] p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#172D44]">
                    Constrained Multi-Objective Optimization
                  </h2>
                  <span className="rounded bg-[#F5E7DB] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#A65429]">
                    UCI Training Bounds Enforced
                  </span>
                </div>
                <p className="text-xs text-[#536574] leading-relaxed">
                  Searches strictly within the validated UCI training-data bounds. Enforces{" "}
                  <code>w/c = water / cement</code> and{" "}
                  <code>w/b = water / (cement + slag + fly ash)</code> separately, and verifies the returned mix against all constraints before recommending it. The search does not establish a global optimum.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="opt-target_strength_mpa"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Target Strength (MPa) <span className="font-mono text-[11px] text-[#536574]">[2.33–82.60]</span>
                    </label>
                    <input
                      id="opt-target_strength_mpa"
                      type="text"
                      inputMode="decimal"
                      value={optTargetMpa}
                      onChange={(e) => setOptTargetMpa(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.target_strength_mpa && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.target_strength_mpa}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opt-age"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Curing Age (whole days) <span className="font-mono text-[11px] text-[#536574]">[1–365]</span>
                    </label>
                    <input
                      id="opt-age"
                      type="text"
                      inputMode="numeric"
                      value={optAgeDays}
                      onChange={(e) => setOptAgeDays(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.age && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.age}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opt-max_w_c_ratio"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Max Water/Cement (w/c = water/cement)
                    </label>
                    <input
                      id="opt-max_w_c_ratio"
                      type="text"
                      inputMode="decimal"
                      value={optMaxWc}
                      onChange={(e) => setOptMaxWc(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.max_w_c_ratio && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.max_w_c_ratio}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opt-max_w_b_ratio"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Max Water/Binder (w/b = water/binder)
                    </label>
                    <input
                      id="opt-max_w_b_ratio"
                      type="text"
                      inputMode="decimal"
                      value={optMaxWb}
                      onChange={(e) => setOptMaxWb(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.max_w_b_ratio && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.max_w_b_ratio}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opt-alpha"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Embodied CO₂ Weight (α ≥ 0)
                    </label>
                    <input
                      id="opt-alpha"
                      type="text"
                      inputMode="decimal"
                      value={optAlpha}
                      onChange={(e) => setOptAlpha(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.alpha && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.alpha}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="opt-beta"
                      className="block text-xs font-bold text-[#172D44] mb-1"
                    >
                      Ingredient Cost Weight (β ≥ 0)
                    </label>
                    <input
                      id="opt-beta"
                      type="text"
                      inputMode="decimal"
                      value={optBeta}
                      onChange={(e) => setOptBeta(e.target.value)}
                      className="h-9 w-full rounded border border-[#D8DFDF] bg-[#F7F5EF] text-[#172D44] px-2.5 font-mono text-sm"
                    />
                    {optErrors.beta && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-[#B42318]">
                        {optErrors.beta}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#176B65] hover:bg-[#10564F] disabled:opacity-50 text-white py-2.5 px-4 text-xs font-bold shadow-xs transition-colors"
                >
                  {loading ? "Solving Constrained Optimization…" : "Run Constrained Mix Optimization"}
                </button>
              </form>

              {/* Candidate Mix Proportions Readout & Explicit Transfer to Predict */}
              <div className="rounded-xl border border-[#D8DFDF] bg-[#FFFFFF] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#172D44]">
                    Candidate Mix Proportions (1 m³)
                  </h3>
                  <button
                    type="button"
                    onClick={handleUseCandidateInPrediction}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#A65429] hover:bg-[#8C431E] text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>Use this mix in prediction</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Cement</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.cement} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Slag</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.blastFurnaceSlag} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Fly Ash</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.flyAsh} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Water</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.water} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Superplasticizer</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.superplasticizer} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Coarse Agg.</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.coarseAggregate} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Fine Agg.</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.fineAggregate} kg/m³</div>
                  </div>
                  <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-2.5">
                    <div className="text-[#536574]">Curing Age</div>
                    <div className="font-mono font-bold text-[#172D44]">{mix.ageDays} days</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Three Primary Result Cards + Provenance + Transfer to Materials Market */}
        <div className="lg:col-span-6 space-y-6">
          {/* Optimizer Solver Status Banner (only in optimize mode) */}
          {isOptimizePage && optStatusInfo && (
            <div
              className={`rounded-xl border p-4 text-xs ${
                optStatusInfo.success
                  ? "border-[#146C43]/40 bg-[#E6F4EC] text-[#146C43]"
                  : "border-[#B42318]/40 bg-[#FCE9E7] text-[#B42318]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {optStatusInfo.success ? (
                    <CheckCircle2 className="h-4 w-4 text-[#146C43]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[#B42318]" />
                  )}
                  <span>{optStatusInfo.statusLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseCandidateInPrediction}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] border border-[#D8DFDF] px-2.5 py-1 text-xs font-bold text-[#172D44] hover:bg-[#EFECE4]"
                >
                  <span>Use this mix in prediction</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {optStatusInfo.failureReason && (
                <p className="mt-1.5 font-semibold">
                  Search outcome: {optStatusInfo.failureReason}
                </p>
              )}
              <p className="mt-1 text-[#536574]">
                Solver status: <code>{optStatusInfo.solverStatus}</code> · Normalized weighted score:{" "}
                <code>{optStatusInfo.objectiveValue}</code>
              </p>
            </div>
          )}

          {!cards ? (
            <div className="rounded-2xl border border-dashed border-[#D8DFDF] bg-[#FFFFFF] p-10 text-center space-y-3">
              <FlaskConical className="h-8 w-8 text-[#176B65] mx-auto" />
              <h3 className="text-base font-bold text-[#172D44]">
                {isOptimizePage
                  ? "Ready to Run Constrained Mix Optimization"
                  : "Ready to Evaluate Your Mix"}
              </h3>
              <p className="text-xs text-[#536574] max-w-md mx-auto">
                {isOptimizePage
                  ? "Set your target strength and water-ratio limits on the left, then click Run Constrained Mix Optimization."
                  : "Click Predict Strength & Evaluate Mix on the left to generate the three primary result cards with full calculation provenance."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* CARD 1: PREDICTED STRENGTH */}
              {(() => {
                const c = cards.predicted_strength ?? cards.strength;
                if (!c) return null;
                const st = COLOR_STYLES[c.color] ?? COLOR_STYLES.neutral;
                const ratingLabel = c.rating_label || st.defaultRatingLabel;
                return (
                  <div className={`rounded-2xl border-2 ${st.border} ${st.bg} p-5 shadow-xs space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#536574]">
                          1 · {c.title}
                        </span>
                        <h3 className="text-xs font-semibold text-[#172D44]">
                          {c.age_label}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${st.badgeBg} ${st.badgeText}`}
                        >
                          {ratingLabel}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${st.badgeBg} ${st.badgeText}`}
                        >
                          {c.badge}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className={`font-mono text-3xl font-black ${st.valueText}`}>
                        {c.headline_value.toFixed(2)}
                      </span>
                      <span className="font-mono text-sm font-bold text-[#536574]">
                        {c.unit} (at {c.curing_age_days} days)
                      </span>
                    </div>

                    <p className="text-xs text-[#172D44] leading-relaxed">
                      {c.summary}
                    </p>

                    <div className="text-[11px] text-[#536574] bg-[#F7F5EF] rounded-lg px-3 py-2 border border-[#D8DFDF]">
                      <strong>Specimen &amp; Grade Note:</strong> {c.specimen_convention_note}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCard((p) => ({ ...p, strength: !p.strength }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#176B65] hover:underline"
                    >
                      <span>{expandedCard.strength ? "Hide details" : "Show model uncertainty & ratios"}</span>
                      {expandedCard.strength ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {expandedCard.strength && (
                      <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-3 text-xs space-y-1.5 font-mono text-[#172D44]">
                        <div>
                          w/c (water / cement): <strong>{c.details.water_cement_ratio}</strong>
                        </div>
                        <div>
                          w/b (water / total binder): <strong>{c.details.water_binder_ratio}</strong>
                        </div>
                        <div>
                          Validation Error: RMSE = {Number(c.details.estimated_error_rmse_mpa).toFixed(2)} MPa · MAE = {Number(c.details.estimated_error_mae_mpa).toFixed(2)} MPa
                        </div>
                        <div className="font-sans text-[11px] text-[#536574]">
                          {c.details.confidence_note}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CARD 2: ESTIMATED INGREDIENT COST */}
              {(() => {
                const c = cards.estimated_ingredient_cost ?? cards.cost;
                if (!c) return null;
                const st = COLOR_STYLES[c.color] ?? COLOR_STYLES.neutral;
                const ratingLabel = c.rating_label || st.defaultRatingLabel;
                return (
                  <div className={`rounded-2xl border-2 ${st.border} ${st.bg} p-5 shadow-xs space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#536574]">
                          2 · {c.title}
                        </span>
                        <h3 className="text-xs font-semibold text-[#172D44]">
                          {c.scope_label}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${st.badgeBg} ${st.badgeText}`}
                        >
                          {ratingLabel}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${st.badgeBg} ${st.badgeText}`}
                        >
                          {c.badge}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      {c.is_complete ? (
                        <>
                          <span className={`font-mono text-3xl font-black ${st.valueText}`}>
                            {Number(c.headline_value ?? 0).toFixed(2)}
                          </span>
                          <span className="font-mono text-sm font-bold text-[#536574]">
                            {c.unit}
                          </span>
                        </>
                      ) : (
                        <div>
                          <span className="font-mono text-lg font-bold text-[#172D44]">
                            Known subtotal: {Number(c.known_subtotal_per_m3 ?? c.headline_value ?? 0).toFixed(2)} {c.unit}
                          </span>
                          <span className="ml-2 rounded bg-[#FFF3CD] px-2 py-0.5 font-mono text-xs text-[#805700]">
                            {Number((c.coverage?.priced_mass_coverage_ratio ?? 1) * 100).toFixed(1)}% mass priced
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#172D44] leading-relaxed">
                      {c.summary}
                    </p>

                    <button
                      type="button"
                      onClick={() => setExpandedCard((p) => ({ ...p, cost: !p.cost }))}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#176B65] hover:underline"
                    >
                      <span>{expandedCard.cost ? "Hide ingredient breakdown" : "Show per-ingredient cost breakdown"}</span>
                      {expandedCard.cost ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {expandedCard.cost && c.details?.line_items && (
                      <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-3 text-xs space-y-1">
                        {c.details.line_items.map((li: any) => (
                          <div
                            key={li.material}
                            className="flex items-center justify-between py-1 border-b last:border-b-0 border-[#D8DFDF]"
                          >
                            <span>
                              {li.label} ({li.quantity_kg_per_m3} kg/m³)
                            </span>
                            <span className="font-mono font-semibold">
                              {li.status === "missing_price" ? (
                                <span className="text-[#805700]">
                                  Missing unit price (not $0)
                                </span>
                              ) : (
                                `${Number(li.cost_per_m3 ?? 0).toFixed(2)} ${c.currency}`
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CARD 3: ESTIMATED EMBODIED EMISSIONS */}
              {(() => {
                const c = cards.estimated_embodied_emissions ?? cards.emissions;
                if (!c) return null;
                const st = COLOR_STYLES[c.color] ?? COLOR_STYLES.neutral;
                const ratingLabel = c.rating_label || st.defaultRatingLabel;
                return (
                  <div className={`rounded-2xl border-2 ${st.border} ${st.bg} p-5 shadow-xs space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#536574]">
                          3 · {c.title}
                        </span>
                        <h3 className="text-xs font-semibold text-[#172D44]">
                          {c.scope_label}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${st.badgeBg} ${st.badgeText}`}
                        >
                          {ratingLabel}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${st.badgeBg} ${st.badgeText}`}
                        >
                          {c.badge}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      {c.is_complete ? (
                        <>
                          <span className={`font-mono text-3xl font-black ${st.valueText}`}>
                            {Number(c.headline_value ?? 0).toFixed(2)}
                          </span>
                          <span className="font-mono text-sm font-bold text-[#536574]">
                            {c.unit}
                          </span>
                        </>
                      ) : (
                        <div>
                          <span className="font-mono text-lg font-bold text-[#172D44]">
                            Known subtotal: {Number(c.known_subtotal_co2_kg_per_m3 ?? c.headline_value ?? 0).toFixed(2)} {c.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#172D44] leading-relaxed">
                      {c.summary}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCard((p) => ({ ...p, emissions: !p.emissions }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#176B65] hover:underline"
                    >
                      <span>
                        {expandedCard.emissions
                          ? "Hide emissions breakdown"
                          : "Show per-ingredient CO₂e breakdown"}
                      </span>
                      {expandedCard.emissions ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {expandedCard.emissions && c.details?.line_items && (
                      <div className="rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] p-3 text-xs space-y-1">
                        {c.details.line_items.map((li: any) => (
                          <div
                            key={li.material}
                            className="flex items-center justify-between py-1 border-b last:border-b-0 border-[#D8DFDF]"
                          >
                            <span>
                              {li.label} ({li.quantity_kg_per_m3} kg/m³)
                            </span>
                            <span className="font-mono font-semibold">
                              {li.status === "missing_factor" ? (
                                <span className="text-[#805700]">Missing factor</span>
                              ) : (
                                `${Number(li.co2_kg_per_m3 ?? 0).toFixed(2)} kg CO₂e`
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Calculation Provenance Drawer */}
              {provenance && (
                <div className="rounded-xl border border-[#D8DFDF] bg-[#FFFFFF] p-4 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCard((p) => ({ ...p, provenance: !p.provenance }))
                    }
                    className="flex w-full items-center justify-between font-bold text-[#172D44]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-[#176B65]" />
                      <span>Calculation Provenance &amp; Audit Metadata</span>
                    </span>
                    {expandedCard.provenance ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedCard.provenance && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#D8DFDF] pt-3 font-mono text-[11px] text-[#536574]">
                      <div>Schema Version: {provenance.schema_version}</div>
                      <div>Model ID: {provenance.model_id} ({provenance.model_version})</div>
                      <div>Curing Age: {provenance.curing_age_days} days</div>
                      <div>w/c Ratio: {provenance.water_cement_ratio}</div>
                      <div>w/b Ratio: {provenance.water_binder_ratio}</div>
                      <div>Price Source: {provenance.price_source_id}</div>
                      <div>Emission Factor Set: {provenance.emission_factor_set_id}</div>
                      <div>Boundary: {provenance.system_boundary}</div>
                      <div>Comparison Mode: {provenance.comparison_mode}</div>
                      <div>Tolerance Band: ±{provenance.tolerance_pct}%</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transfer Recipe to Materials Market Card */}
          <div className="rounded-2xl border border-[#176B65]/30 bg-[#FFFFFF] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#176B65]" />
              <h3 className="text-sm font-black text-[#172D44]">
                Use This Mix in Materials Market
              </h3>
            </div>
            <p className="text-xs text-[#536574]">
              Convert this 1 m³ recipe into an exact project ingredient basket (multiplying each constituent by your project volume in m³, with whole-bag rounding and surplus calculation) or compare ready-mixed concrete suppliers across 100 indexed markets.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="project-volume-m3-input"
                  className="block text-xs font-bold text-[#172D44] mb-1"
                >
                  Project Volume Required (m³)
                </label>
                <input
                  id="project-volume-m3-input"
                  type="text"
                  inputMode="decimal"
                  value={projectVolumeM3}
                  onChange={(e) => setProjectVolumeM3(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 font-mono text-sm font-bold text-[#172D44]"
                />
              </div>
              <button
                type="button"
                onClick={handleUseMixInMarket}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B65] hover:bg-[#10564F] text-white px-5 h-10 text-xs font-bold shadow-xs transition-all"
              >
                <span>Use this mix in Materials Market</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/report")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3.5 h-10 text-xs font-semibold text-[#172D44] hover:bg-[#EFECE4]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
