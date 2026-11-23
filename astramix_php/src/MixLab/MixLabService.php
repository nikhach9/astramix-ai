<?php
declare(strict_types=1);

namespace AstraMix\MixLab;

use AstraMix\Domain\InputSchema;
use AstraMix\Domain\Trust;
use AstraMix\ML\StrengthPredictor;
use AstraMix\Sustainability\CarbonEstimator;
use AstraMix\Sustainability\CostEstimator;

class MixLabService
{
    public const BASELINE_REFERENCE_MIX = [
        "cement" => 380.0,
        "blast_furnace_slag" => 0.0,
        "fly_ash" => 0.0,
        "water" => 175.0,
        "superplasticizer" => 2.5,
        "coarse_aggregate" => 1040.0,
        "fine_aggregate" => 760.0,
        "age" => 28,
    ];

    private StrengthPredictor $predictor;

    public function __construct(?StrengthPredictor $predictor = null)
    {
        $this->predictor = $predictor ?? new StrengthPredictor();
    }

    public function evaluateMixLab(
        array $mix,
        ?float $targetStrengthMpa = null,
        ?string $targetStrengthClass = null,
        string $comparisonMode = "selected_reference",
        float $tolerancePct = 5.0,
        string $currency = "USD",
        ?array $unitCosts = null,
        bool $strictCustomPrices = false,
        ?array $emissionFactors = null,
        bool $strictCustomFactors = false,
        ?array $marketCohortCosts = null,
        ?array $marketCohortEmissions = null,
        ?array $referenceMix = null,
        ?float $referenceCostPerM3 = null,
        ?float $referenceCo2KgPerM3 = null,
        string $referenceLabel = "Baseline OPC 380 kg/m³ reference mix",
        string $priceSourceId = "ASTRAMIX_ENGINEERING_REF_V1",
        string $emissionFactorSetId = "ICE_V3_CRADLE_TO_GATE_A1_A3"
    ): array {
        $predResult = $this->predictor->predict($mix);
        $normMix = $predResult['normalized_mix'];

        $costResult = CostEstimator::estimate($normMix, $unitCosts, $strictCustomPrices, $currency);
        $co2Result = CarbonEstimator::estimate($normMix, $emissionFactors, $strictCustomFactors);

        $refMixNorm = $referenceMix ? $this->predictor->normalizeMix($referenceMix) : self::BASELINE_REFERENCE_MIX;
        if ($referenceCostPerM3 === null) {
            $refCostEst = CostEstimator::estimate($refMixNorm, $unitCosts, false, $currency);
            $referenceCostPerM3 = $refCostEst['total_cost_per_m3'];
        }
        if ($referenceCo2KgPerM3 === null) {
            $refCo2Est = CarbonEstimator::estimate($refMixNorm, $emissionFactors, false);
            $referenceCo2KgPerM3 = $refCo2Est['total_co2_kg_per_m3'];
        }

        $strengthCard = $this->evaluateStrengthCard($normMix, $predResult, $targetStrengthMpa, $targetStrengthClass);
        $costCard = $this->evaluateCostCard(
            $costResult['total_cost_per_m3'],
            $currency . '/m³',
            $comparisonMode,
            $marketCohortCosts,
            $referenceCostPerM3,
            $referenceLabel,
            $tolerancePct,
            $costResult['breakdown'],
            $currency,
            $normMix,
            $costResult['unit_costs_used'] ?? []
        );
        $emissionsCard = $this->evaluateEmissionsCard(
            $co2Result['total_co2_kg_per_m3'],
            'kg CO₂e/m³',
            $comparisonMode,
            $marketCohortEmissions,
            $referenceCo2KgPerM3,
            $referenceLabel,
            $tolerancePct,
            $co2Result['breakdown'],
            $normMix,
            $co2Result['factors_used'] ?? []
        );

        $wc = round(InputSchema::computeWaterCementRatio($normMix["water"], $normMix["cement"]), 4);
        $wb = round(InputSchema::computeWaterBinderRatio($normMix["water"], $normMix["cement"], $normMix["blast_furnace_slag"], $normMix["fly_ash"]), 4);

        return [
            "success" => true,
            "mix" => $normMix,
            "prediction" => $predResult,
            "cost" => [
                "total" => $costResult['total'],
                "total_cost_per_m3" => $costResult['total_cost_per_m3'],
                "currency" => $currency,
                "breakdown" => $costResult['breakdown'],
                "unit" => $costResult['unit'],
            ],
            "co2" => [
                "total" => $co2Result['total'],
                "total_co2_kg_per_m3" => $co2Result['total_co2_kg_per_m3'],
                "breakdown" => $co2Result['breakdown'],
                "unit" => $co2Result['unit'],
            ],
            "cards" => [
                "predicted_strength" => $strengthCard,
                "estimated_ingredient_cost" => $costCard,
                "estimated_embodied_emissions" => $emissionsCard,
                "strength" => $strengthCard,
                "cost" => $costCard,
                "emissions" => $emissionsCard,
            ],
            "provenance" => [
                "evaluated_at" => gmdate("Y-m-d\TH:i:s\Z"),
                "calculated_at" => gmdate("Y-m-d\TH:i:s\Z"),
                "schema_version" => InputSchema::SCHEMA_VERSION,
                "model_id" => "xgboost_baseline_uci_1030",
                "model_version" => "v0.1",
                "curing_age_days" => (int)$normMix["age"],
                "water_cement_ratio" => $wc,
                "water_binder_ratio" => $wb,
                "price_source_id" => $priceSourceId,
                "currency" => strtoupper($currency),
                "emission_factor_set_id" => $emissionFactorSetId,
                "system_boundary" => "Cradle-to-Gate (A1–A3) concrete constituent ingredients",
                "comparison_mode" => $comparisonMode,
                "tolerance_pct" => $tolerancePct,
                "reference_label" => $comparisonMode === "selected_reference" ? $referenceLabel : "Market cohort",
            ],
        ];
    }

    private function evaluateStrengthCard(
        array $mix,
        array $predResult,
        ?float $targetStrengthMpa = null,
        ?string $targetStrengthClass = null
    ): array {
        $predMpa = round(max(0.0, (float)$predResult["predicted_strength_mpa"]), 2);
        $ageDays = (int)$mix["age"];
        $rmseMpa = (float)($predResult["estimated_error_rmse_mpa"] ?? Trust::RMSE_METRIC);
        $maeMpa = (float)($predResult["estimated_error_mae_mpa"] ?? Trust::MAE_METRIC);

        $schema = InputSchema::loadVersionedInputSchema();
        $targetRef = $schema["target_reference"] ?? [];
        $strengthClasses = [];
        foreach ($schema["strength_classes"] ?? [] as $sc) {
            $strengthClasses[strtoupper($sc["code"])] = $sc;
        }

        $ageLabel = ($ageDays === 28)
            ? "Predicted 28-day compressive strength"
            : "Predicted {$ageDays}-day compressive strength (non-standard curing age; standard reference classes are defined at 28 days)";

        $classInfo = null;
        if ($targetStrengthClass) {
            $scKey = strtoupper(trim($targetStrengthClass));
            if (isset($strengthClasses[$scKey])) {
                $classInfo = $strengthClasses[$scKey];
                if ($targetStrengthMpa === null) {
                    $targetStrengthMpa = (float)$classInfo["cylinder_mpa"];
                }
            }
        }

        $specimenNote = $classInfo["note"] ??
            "UCI model predicts laboratory cylinder compressive strength (MPa). EN 206 classes (e.g. C25/30) list cylinder/cube strength at 28 days.";

        if ($targetStrengthMpa !== null) {
            $targetVal = round((float)$targetStrengthMpa, 2);
            $deltaMpa = round($predMpa - $targetVal, 2);
            $deltaPct = $targetVal > 0 ? round(($deltaMpa / $targetVal) * 100.0, 2) : 0.0;

            if ($predMpa >= $targetVal + $rmseMpa) {
                $status = "meets_target_with_margin";
                $color = "green";
                $badge = "Meets target (above RMSE margin)";
                $summary = sprintf(
                    "%+.2f MPa (%+.1f%%) vs %.2f MPa target at %d days — exceeds target by more than model validation RMSE (±%.2f MPa).",
                    $deltaMpa,
                    $deltaPct,
                    $targetVal,
                    $ageDays,
                    $rmseMpa
                );
            } elseif ($predMpa >= $targetVal) {
                $status = "meets_target_within_uncertainty";
                $color = "yellow";
                $badge = "Caution: within model RMSE";
                $summary = sprintf(
                    "%+.2f MPa (%+.1f%%) vs %.2f MPa target at %d days — barely meets target within model validation error (RMSE ±%.2f MPa; MAE ±%.2f MPa).",
                    $deltaMpa,
                    $deltaPct,
                    $targetVal,
                    $ageDays,
                    $rmseMpa,
                    $maeMpa
                );
            } else {
                $status = "below_target";
                $color = "red";
                $badge = "Below target strength";
                $summary = sprintf(
                    "%+.2f MPa (%+.1f%%) below %.2f MPa target at %d days.",
                    $deltaMpa,
                    $deltaPct,
                    $targetVal,
                    $ageDays
                );
            }

            $comparison = [
                "mode" => "target_strength",
                "target_strength_mpa" => $targetVal,
                "target_strength_class" => $classInfo["code"] ?? $targetStrengthClass,
                "target_curing_age_days" => $ageDays,
                "delta_mpa" => $deltaMpa,
                "delta_pct" => $deltaPct,
                "rmse_margin_mpa" => $rmseMpa,
                "mae_margin_mpa" => $maeMpa,
            ];
        } else {
            $status = "neutral_context";
            $color = "neutral";
            $badge = "Training distribution context";
            $pcts = ($ageDays === 28)
                ? ($targetRef["percentiles_28_days"] ?? [])
                : ($targetRef["percentiles_all_ages"] ?? []);

            $p25 = (float)($pcts["p25"] ?? 23.71);
            $p50 = (float)($pcts["p50"] ?? 34.45);
            $p75 = (float)($pcts["p75"] ?? 46.14);
            $obsMin = (float)($targetRef["min"] ?? 2.33);
            $obsMax = (float)($targetRef["max"] ?? 82.60);

            if ($predMpa < $p25) {
                $posDesc = sprintf("in the lower quartile (< %.1f MPa)", $p25);
            } elseif ($predMpa <= $p75) {
                $posDesc = sprintf("in the middle 50%% interquartile range (%.1f–%.1f MPa, median %.1f MPa)", $p25, $p75, $p50);
            } else {
                $posDesc = sprintf("in the upper quartile (> %.1f MPa)", $p75);
            }

            $summary = sprintf(
                "No target strength specified. Predicted %.2f MPa at %d days sits %s of the model's observed training range (%.2f–%.2f MPa).",
                $predMpa,
                $ageDays,
                $posDesc,
                $obsMin,
                $obsMax
            );

            $comparison = [
                "mode" => "training_distribution_context",
                "observed_min_mpa" => $obsMin,
                "observed_max_mpa" => $obsMax,
                "p25_mpa" => $p25,
                "median_p50_mpa" => $p50,
                "p75_mpa" => $p75,
                "rmse_margin_mpa" => $rmseMpa,
                "mae_margin_mpa" => $maeMpa,
            ];
        }

        $ratingLabelMap = [
            "green" => "Good",
            "yellow" => "Normal",
            "red" => "Poor",
            "neutral" => "Not enough comparable data",
        ];

        return [
            "card_type" => "predicted_strength",
            "title" => "Predicted strength",
            "headline_value" => $predMpa,
            "unit" => "MPa",
            "curing_age_days" => $ageDays,
            "age_label" => $ageLabel,
            "status" => $status,
            "color" => $color,
            "rating_label" => $ratingLabelMap[$color] ?? "Not enough comparable data",
            "badge" => $badge,
            "summary" => $summary,
            "specimen_convention_note" => $specimenNote,
            "comparison" => $comparison,
            "details" => [
                "water_cement_ratio" => round(InputSchema::computeWaterCementRatio($mix["water"], $mix["cement"]), 4),
                "water_binder_ratio" => round(
                    InputSchema::computeWaterBinderRatio($mix["water"], $mix["cement"], $mix["blast_furnace_slag"], $mix["fly_ash"]),
                    4
                ),
                "model_version" => "v0.1",
                "estimated_error_rmse_mpa" => $rmseMpa,
                "estimated_error_mae_mpa" => $maeMpa,
                "confidence_note" => Trust::CONFIDENCE_DISCLAIMER,
                "warnings" => array_merge($predResult["warnings"], Trust::checkSplitComparisonNotes($mix)),
            ],
        ];
    }

    private function evaluateCostCard(
        float $value,
        string $unitStr,
        string $comparisonMode,
        ?array $marketCohortValues,
        ?float $referenceValue,
        string $referenceLabel,
        float $tolerancePct,
        array $breakdown,
        string $currency,
        array $materialQuantities = [],
        array $unitCosts = []
    ): array {
        [$status, $color, $badge, $summary, $comparison] = $this->evaluateComparisonEngine(
            $value,
            $unitStr,
            $comparisonMode,
            $marketCohortValues,
            $referenceValue,
            $referenceLabel,
            $tolerancePct
        );

        $ratingLabelMap = [
            "green" => "Good",
            "yellow" => "Normal",
            "red" => "Poor",
            "neutral" => "Not enough comparable data",
        ];

        $labels = [
            "cement" => "Cement",
            "blast_furnace_slag" => "Blast furnace slag",
            "fly_ash" => "Fly ash",
            "water" => "Water",
            "superplasticizer" => "Superplasticizer",
            "coarse_aggregate" => "Coarse aggregate",
            "fine_aggregate" => "Fine aggregate",
        ];

        $lineItems = [];
        foreach (InputSchema::MATERIAL_FEATURE_ORDER as $mat) {
            $qty = isset($materialQuantities[$mat]) ? (float)$materialQuantities[$mat] : 0.0;
            $lineItems[] = [
                "material" => $mat,
                "label" => $labels[$mat] ?? ucfirst(str_replace('_', ' ', $mat)),
                "quantity_kg_per_m3" => $qty,
                "unit_price_per_kg" => (float)($unitCosts[$mat] ?? 0.0),
                "cost_per_m3" => (float)($breakdown[$mat] ?? 0.0),
                "status" => "priced",
            ];
        }

        return [
            "card_type" => "estimated_ingredient_cost",
            "title" => "Estimated ingredient cost",
            "scope_label" => "Ingredient-only estimate per m³ (excludes batching plant overhead, delivery, and tax)",
            "is_complete" => true,
            "headline_value" => $value,
            "known_subtotal_per_m3" => $value,
            "unit" => $unitStr,
            "currency" => $currency,
            "status" => $status,
            "color" => $color,
            "rating_label" => $ratingLabelMap[$color] ?? "Not enough comparable data",
            "badge" => $badge,
            "summary" => $summary,
            "coverage" => [
                "priced_mass_coverage_ratio" => 1.0,
                "missing_ingredients" => [],
            ],
            "comparison" => $comparison,
            "total_per_m3" => $value,
            "details" => [
                "breakdown_per_m3" => $breakdown,
                "line_items" => $lineItems,
            ],
        ];
    }

    private function evaluateEmissionsCard(
        float $value,
        string $unitStr,
        string $comparisonMode,
        ?array $marketCohortValues,
        ?float $referenceValue,
        string $referenceLabel,
        float $tolerancePct,
        array $breakdown,
        array $materialQuantities = [],
        array $emissionFactors = []
    ): array {
        [$status, $color, $badge, $summary, $comparison] = $this->evaluateComparisonEngine(
            $value,
            $unitStr,
            $comparisonMode,
            $marketCohortValues,
            $referenceValue,
            $referenceLabel,
            $tolerancePct
        );

        $ratingLabelMap = [
            "green" => "Good",
            "yellow" => "Normal",
            "red" => "Poor",
            "neutral" => "Not enough comparable data",
        ];

        $labels = [
            "cement" => "Cement",
            "blast_furnace_slag" => "Blast furnace slag",
            "fly_ash" => "Fly ash",
            "water" => "Water",
            "superplasticizer" => "Superplasticizer",
            "coarse_aggregate" => "Coarse aggregate",
            "fine_aggregate" => "Fine aggregate",
        ];

        $lineItems = [];
        foreach (InputSchema::MATERIAL_FEATURE_ORDER as $mat) {
            $qty = isset($materialQuantities[$mat]) ? (float)$materialQuantities[$mat] : 0.0;
            $lineItems[] = [
                "material" => $mat,
                "label" => $labels[$mat] ?? ucfirst(str_replace('_', ' ', $mat)),
                "quantity_kg_per_m3" => $qty,
                "co2_kg_per_m3" => (float)($breakdown[$mat] ?? 0.0),
                "status" => "priced",
            ];
        }

        return [
            "card_type" => "estimated_embodied_emissions",
            "title" => "Estimated embodied emissions",
            "scope_label" => "Cradle-to-gate (A1–A3) material embodied carbon per m³",
            "is_complete" => true,
            "headline_value" => $value,
            "known_subtotal_co2_kg_per_m3" => $value,
            "unit" => $unitStr,
            "status" => $status,
            "color" => $color,
            "rating_label" => $ratingLabelMap[$color] ?? "Not enough comparable data",
            "badge" => $badge,
            "summary" => $summary,
            "coverage" => [
                "covered_mass_ratio" => 1.0,
                "missing_ingredients" => [],
            ],
            "comparison" => $comparison,
            "total_kg_co2e_per_m3" => $value,
            "details" => [
                "breakdown_kg_per_m3" => $breakdown,
                "line_items" => $lineItems,
            ],
        ];
    }

    private function evaluateComparisonEngine(
        float $value,
        string $unitStr,
        string $comparisonMode,
        ?array $marketCohortValues,
        ?float $referenceValue,
        string $referenceLabel,
        float $tolerancePct
    ): array {
        $mode = strtolower(trim($comparisonMode ?: "selected_reference"));

        if ($mode === "market_cohort") {
            $cohort = array_values(array_filter((array)($marketCohortValues ?? []), function ($v) {
                return $v !== null && is_numeric($v) && is_finite((float)$v);
            }));
            $n = count($cohort);
            if ($n < 10) {
                return [
                    "insufficient_comparison_data",
                    "neutral",
                    "Insufficient comparison data",
                    "Insufficient comparison data: found {$n} compatible independent market observations (at least 10 observations matching currency, region, unit, and scope are required to show percentile bands).",
                    [
                        "mode" => "market_cohort",
                        "observation_count" => $n,
                        "min_required_observations" => 10,
                        "sufficient_data" => false,
                        "p25" => null,
                        "median_p50" => null,
                        "p75" => null,
                    ],
                ];
            }

            sort($cohort);
            $p25 = round($this->percentile($cohort, 0.25), 2);
            $p50 = round($this->percentile($cohort, 0.50), 2);
            $p75 = round($this->percentile($cohort, 0.75), 2);
            $deltaVsMedian = round($value - $p50, 2);
            $deltaPctMedian = $p50 > 0 ? round(($deltaVsMedian / $p50) * 100.0, 2) : 0.0;

            if ($value < $p25) {
                $status = "favorable_below_p25";
                $color = "green";
                $badge = "Below 25th percentile (favorable)";
                $summary = sprintf(
                    "%.2f %s is below the 25th percentile (%.2f %s; median %.2f %s, %+.1f%% vs median across %d observations).",
                    $value,
                    $unitStr,
                    $p25,
                    $unitStr,
                    $p50,
                    $unitStr,
                    $deltaPctMedian,
                    $n
                );
            } elseif ($value <= $p75) {
                $status = "typical_p25_to_p75";
                $color = "yellow";
                $badge = "25th–75th percentile (typical)";
                $summary = sprintf(
                    "%.2f %s is within the typical 25th–75th percentile band (%.2f–%.2f %s; median %.2f %s, %+.1f%% vs median across %d observations).",
                    $value,
                    $unitStr,
                    $p25,
                    $p75,
                    $unitStr,
                    $p50,
                    $unitStr,
                    $deltaPctMedian,
                    $n
                );
            } else {
                $status = "high_above_p75";
                $color = "red";
                $badge = "Above 75th percentile (high)";
                $summary = sprintf(
                    "%.2f %s is above the 75th percentile (%.2f %s; median %.2f %s, %+.1f%% vs median across %d observations).",
                    $value,
                    $unitStr,
                    $p75,
                    $unitStr,
                    $p50,
                    $unitStr,
                    $deltaPctMedian,
                    $n
                );
            }

            return [
                $status,
                $color,
                $badge,
                $summary,
                [
                    "mode" => "market_cohort",
                    "observation_count" => $n,
                    "min_required_observations" => 10,
                    "sufficient_data" => true,
                    "p25" => $p25,
                    "median_p50" => $p50,
                    "p75" => $p75,
                    "delta_vs_median" => $deltaVsMedian,
                    "delta_pct_vs_median" => $deltaPctMedian,
                ],
            ];
        }

        // selected_reference mode
        if ($referenceValue === null || $referenceValue <= 0) {
            return [
                "neutral_no_reference",
                "neutral",
                "No reference selected",
                sprintf("Estimated %.2f %s. Select a reference mix or target to compare.", $value, $unitStr),
                [
                    "mode" => "selected_reference",
                    "comparison_label" => "Compared with selected reference",
                    "reference_value" => null,
                    "tolerance_pct" => $tolerancePct,
                ],
            ];
        }

        $refVal = round((float)$referenceValue, 2);
        $delta = round($value - $refVal, 2);
        $deltaPct = $refVal > 0 ? round(($delta / $refVal) * 100.0, 2) : 0.0;

        if ($deltaPct < -$tolerancePct) {
            $status = "lower_than_reference";
            $color = "green";
            $badge = "Compared with selected reference: Lower";
            $summary = sprintf(
                "Compared with selected reference (%s: %.2f %s): %+.2f %s (%+.1f%%, more than %.1f%% lower).",
                $referenceLabel,
                $refVal,
                $unitStr,
                $delta,
                $unitStr,
                $deltaPct,
                $tolerancePct
            );
        } elseif (abs($deltaPct) <= $tolerancePct) {
            $status = "similar_to_reference";
            $color = "yellow";
            $badge = "Compared with selected reference: Similar";
            $summary = sprintf(
                "Compared with selected reference (%s: %.2f %s): %+.2f %s (%+.1f%%, within ±%.1f%% tolerance band).",
                $referenceLabel,
                $refVal,
                $unitStr,
                $delta,
                $unitStr,
                $deltaPct,
                $tolerancePct
            );
        } else {
            $status = "higher_than_reference";
            $color = "red";
            $badge = "Compared with selected reference: Higher";
            $summary = sprintf(
                "Compared with selected reference (%s: %.2f %s): %+.2f %s (%+.1f%%, more than %.1f%% higher).",
                $referenceLabel,
                $refVal,
                $unitStr,
                $delta,
                $unitStr,
                $deltaPct,
                $tolerancePct
            );
        }

        return [
            $status,
            $color,
            $badge,
            $summary,
            [
                "mode" => "selected_reference",
                "comparison_label" => "Compared with selected reference",
                "reference_label" => $referenceLabel,
                "reference_value" => $refVal,
                "delta" => $delta,
                "delta_pct" => $deltaPct,
                "tolerance_pct" => $tolerancePct,
            ],
        ];
    }

    private function percentile(array $sortedData, float $p): float
    {
        $count = count($sortedData);
        if ($count === 0) return 0.0;
        if ($count === 1) return (float)$sortedData[0];

        $idx = $p * ($count - 1);
        $lower = (int)floor($idx);
        $upper = (int)ceil($idx);
        $weight = $idx - $lower;

        return (float)($sortedData[$lower] * (1.0 - $weight) + $sortedData[$upper] * $weight);
    }
}
