<?php
declare(strict_types=1);

namespace AstraMix\Controllers;

use AstraMix\Core\Request;
use AstraMix\Core\Response;
use AstraMix\Core\ValidationException;
use AstraMix\Domain\InputSchema;
use AstraMix\MixLab\MixLabService;
use AstraMix\ML\StrengthPredictor;
use AstraMix\Optimization\Optimizer;
use AstraMix\Sustainability\CarbonEstimator;
use AstraMix\Sustainability\CostEstimator;

class MixLabController
{
    private StrengthPredictor $predictor;
    private MixLabService $mixLabService;
    private Optimizer $optimizer;

    public function __construct()
    {
        $this->predictor = new StrengthPredictor();
        $this->mixLabService = new MixLabService($this->predictor);
        $this->optimizer = new Optimizer($this->predictor);
    }

    public function getSchema(Request $request): Response
    {
        $schema = InputSchema::loadVersionedInputSchema();
        return Response::json($schema);
    }

    public function predictStrength(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mix'])) {
            throw new ValidationException("Request body must contain 'mix' object.", [
                ["loc" => ["body", "mix"], "msg" => "Field required"]
            ]);
        }

        $res = $this->predictor->predict($body['mix']);
        return Response::json($res);
    }

    public function estimateCost(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mix'])) {
            throw new ValidationException("Request body must contain 'mix' object.", [
                ["loc" => ["body", "mix"], "msg" => "Field required"]
            ]);
        }

        $normMix = $this->predictor->normalizeMix($body['mix']);
        $customCosts = $body['custom_costs'] ?? $body['unit_costs'] ?? null;
        $currency = strtoupper(trim($body['currency'] ?? 'USD'));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new ValidationException('Currency must be a three-letter code.');
        }
        if ($currency !== 'USD') {
            foreach (InputSchema::MATERIAL_FEATURE_ORDER as $material) {
                if ($normMix[$material] > 0 && !isset($customCosts[$material])) {
                    throw new ValidationException('Non-USD estimates require prices in that currency for every active ingredient.');
                }
            }
        }

        $res = CostEstimator::estimate($normMix, $customCosts, false, $currency);
        return Response::json([
            "success" => true,
            "total_cost_per_m3" => $res['is_complete'] ? $res['total_cost_per_m3'] : null,
            "breakdown_per_m3" => array_map(static fn($v) => $v === null ? null : round($v, 2), $res['breakdown']),
            "total_cost" => $res['is_complete'] ? $res['total_cost_per_m3'] : null,
            "is_complete" => $res['is_complete'],
            "known_subtotal" => $res['known_subtotal'],
            "currency" => $currency,
            "cost_breakdown" => $res['breakdown'],
            "unit" => $res['unit'],
        ]);
    }

    public function estimateCarbon(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mix'])) {
            throw new ValidationException("Request body must contain 'mix' object.", [
                ["loc" => ["body", "mix"], "msg" => "Field required"]
            ]);
        }

        $normMix = $this->predictor->normalizeMix($body['mix']);
        $customFactors = $body['custom_factors'] ?? $body['emission_factors'] ?? null;

        $res = CarbonEstimator::estimate($normMix, $customFactors);
        return Response::json([
            "success" => true,
            "total_co2_kg_per_m3" => $res['is_complete'] ? round($res['known_subtotal'], 3) : null,
            "breakdown_kg_per_m3" => array_map(static fn($v) => $v === null ? null : round($v, 3), $res['breakdown']),
            "total_co2" => $res['is_complete'] ? round($res['known_subtotal'], 3) : null,
            "is_complete" => $res['is_complete'],
            "known_subtotal" => $res['known_subtotal'],
            "carbon_breakdown" => $res['breakdown'],
            "unit" => $res['unit'],
        ]);
    }

    public function optimizeMix(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['constraints'])) {
            throw new ValidationException("Request body must contain 'constraints' object.", [
                ["loc" => ["body", "constraints"], "msg" => "Field required"]
            ]);
        }

        $c = $body['constraints'];
        $budget = $c['candidate_budget'] ?? 512;
        $seed = $c['seed'] ?? 42;
        if (!is_int($budget) || !is_int($seed)) {
            throw new ValidationException('Search budget and seed must be integers.');
        }
        $costReference = InputSchema::parseStrictFiniteFloat($c['cost_reference'] ?? 100., 'cost_reference', 'Cost reference');
        $co2Reference = InputSchema::parseStrictFiniteFloat($c['co2_reference'] ?? 400., 'co2_reference', 'Carbon reference');
        $costs = ($body['strict_custom_prices'] ?? false) ? ($body['unit_costs'] ?? []) : array_replace(CostEstimator::DEFAULT_COST_FACTORS, $body['unit_costs'] ?? []);
        $factors = ($body['strict_custom_factors'] ?? false) ? ($body['emission_factors'] ?? []) : array_replace(CarbonEstimator::DEFAULT_CO2_FACTORS, $body['emission_factors'] ?? []);

        $targetMpa = InputSchema::parseStrictFiniteFloat($c['target_strength_mpa'] ?? null, 'target_strength_mpa', 'Target strength');
        $age = InputSchema::parseStrictIntegerAge($c['age'] ?? 28);
        $maxWc = InputSchema::parseStrictFiniteFloat($c['max_w_c_ratio'] ?? .60, 'max_w_c_ratio', 'Maximum w/c');
        $maxWb = isset($c['max_w_b_ratio']) ? InputSchema::parseStrictFiniteFloat($c['max_w_b_ratio'], 'max_w_b_ratio', 'Maximum w/b') : null;
        $alpha = InputSchema::parseStrictFiniteFloat($c['alpha'] ?? 1., 'alpha', 'Carbon weight');
        $beta = InputSchema::parseStrictFiniteFloat($c['beta'] ?? 1., 'beta', 'Cost weight');
        $matBounds = $c['material_bounds'] ?? null;
        $initialGuess = $body['initial_guess'] ?? null;

        $res = $this->optimizer->optimize(
            $targetMpa,
            $age,
            $maxWc,
            $maxWb,
            $alpha,
            $beta,
            $matBounds,
            $initialGuess,
            $costs,
            $factors,
            $budget,
            $seed,
            $costReference,
            $co2Reference
        );

        return Response::json($res);
    }

    public function evaluateMixLab(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mix'])) {
            throw new ValidationException("Request body must contain 'mix' object.", [
                ["loc" => ["body", "mix"], "msg" => "Field required"]
            ]);
        }

        $targetMpa = isset($body['target_strength_mpa']) && $body['target_strength_mpa'] !== "" && $body['target_strength_mpa'] !== null
            ? (float)$body['target_strength_mpa']
            : null;

        $res = $this->mixLabService->evaluateMixLab(
            mix: $body['mix'],
            targetStrengthMpa: $targetMpa,
            targetStrengthClass: $body['target_strength_class'] ?? null,
            comparisonMode: $body['comparison_mode'] ?? 'selected_reference',
            cohortContext: $body['cohort_context'] ?? null,
            cohortObservationIds: $body['cohort_observation_ids'] ?? null,
            pricingRegion: $body['pricing_region'] ?? null,
            tolerancePct: (float)($body['tolerance_pct'] ?? 5.0),
            currency: $body['currency'] ?? 'USD',
            unitCosts: $body['unit_costs'] ?? null,
            strictCustomPrices: (bool)($body['strict_custom_prices'] ?? false),
            emissionFactors: $body['emission_factors'] ?? null,
            strictCustomFactors: (bool)($body['strict_custom_factors'] ?? false),
            marketCohortCosts: $body['market_cohort_costs'] ?? null,
            marketCohortEmissions: $body['market_cohort_emissions'] ?? null,
            referenceMix: $body['reference_mix'] ?? null,
            referenceCostPerM3: isset($body['reference_cost_per_m3']) ? (float)$body['reference_cost_per_m3'] : null,
            referenceCo2KgPerM3: isset($body['reference_co2_kg_per_m3']) ? (float)$body['reference_co2_kg_per_m3'] : null,
            referenceLabel: $body['reference_label'] ?? 'Baseline OPC 380 kg/m³ reference mix',
            priceSourceId: $body['price_source_id'] ?? 'ASTRAMIX_ENGINEERING_REF_V1',
            emissionFactorSetId: $body['emission_factor_set_id'] ?? 'ICE_V3_CRADLE_TO_GATE_A1_A3'
        );

        return Response::json($res);
    }

    public function optimizeMixLab(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['constraints'])) {
            throw new ValidationException("Request body must contain 'constraints' object.", [
                ["loc" => ["body", "constraints"], "msg" => "Field required"]
            ]);
        }

        $c = $body['constraints'];
        $budget = $c['candidate_budget'] ?? 512;
        $seed = $c['seed'] ?? 42;
        if (!is_int($budget) || !is_int($seed)) {
            throw new ValidationException('Search budget and seed must be integers.');
        }
        $costReference = InputSchema::parseStrictFiniteFloat($c['cost_reference'] ?? 100., 'cost_reference', 'Cost reference');
        $co2Reference = InputSchema::parseStrictFiniteFloat($c['co2_reference'] ?? 400., 'co2_reference', 'Carbon reference');
        $costs = ($body['strict_custom_prices'] ?? false) ? ($body['unit_costs'] ?? []) : array_replace(CostEstimator::DEFAULT_COST_FACTORS, $body['unit_costs'] ?? []);
        $factors = ($body['strict_custom_factors'] ?? false) ? ($body['emission_factors'] ?? []) : array_replace(CarbonEstimator::DEFAULT_CO2_FACTORS, $body['emission_factors'] ?? []);

        $targetMpa = InputSchema::parseStrictFiniteFloat($c['target_strength_mpa'] ?? null, 'target_strength_mpa', 'Target strength');
        $age = InputSchema::parseStrictIntegerAge($c['age'] ?? 28);
        $maxWc = InputSchema::parseStrictFiniteFloat($c['max_w_c_ratio'] ?? .60, 'max_w_c_ratio', 'Maximum w/c');
        $maxWb = isset($c['max_w_b_ratio']) ? InputSchema::parseStrictFiniteFloat($c['max_w_b_ratio'], 'max_w_b_ratio', 'Maximum w/b') : null;
        $alpha = InputSchema::parseStrictFiniteFloat($c['alpha'] ?? 1., 'alpha', 'Carbon weight');
        $beta = InputSchema::parseStrictFiniteFloat($c['beta'] ?? 1., 'beta', 'Cost weight');
        $matBounds = $c['material_bounds'] ?? null;
        $initialGuess = $body['initial_guess'] ?? null;

        $optRes = $this->optimizer->optimize(
            $targetMpa,
            $age,
            $maxWc,
            $maxWb,
            $alpha,
            $beta,
            $matBounds,
            $initialGuess,
            $costs,
            $factors,
            $budget,
            $seed,
            $costReference,
            $co2Reference
        );

        // Evaluate candidate mix cards
        $refMixDict = $initialGuess ?? MixLabService::BASELINE_REFERENCE_MIX;
        $refLabel = $initialGuess ? "Initial starting mix" : "Baseline OPC 380 kg/m³ reference mix";

        $cardsEval = null;
        try {
            $cardsEval = $this->mixLabService->evaluateMixLab(
                mix: $optRes['mix'],
                targetStrengthMpa: $targetMpa,
                comparisonMode: $body['comparison_mode'] ?? 'selected_reference',
                cohortContext: $body['cohort_context'] ?? null,
            cohortObservationIds: $body['cohort_observation_ids'] ?? null,
                pricingRegion: $body['pricing_region'] ?? null,
                tolerancePct: (float)($body['tolerance_pct'] ?? 5.0),
                currency: $body['currency'] ?? 'USD',
                unitCosts: $body['unit_costs'] ?? null,
                strictCustomPrices: (bool)($body['strict_custom_prices'] ?? false),
                emissionFactors: $body['emission_factors'] ?? null,
                strictCustomFactors: (bool)($body['strict_custom_factors'] ?? false),
                marketCohortCosts: $body['market_cohort_costs'] ?? null,
                marketCohortEmissions: $body['market_cohort_emissions'] ?? null,
                referenceMix: $refMixDict,
                referenceLabel: $refLabel
            );
        } catch (ValidationException $error) {
            if ($optRes['success']) {
                throw $error;
            }
        }

        return Response::json([
            "success" => $optRes['success'],
            "is_optimum" => $optRes['is_optimum'],
            "solver_status" => $optRes['solver_status'],
            "failure_reason" => $optRes['failure_reason'],
            "status_label" => $optRes['success']
                ? "Verified Feasible Candidate"
                : "No feasible candidate found within the search budget — diagnostic only",
            "mix" => $optRes['mix'],
            "predicted_strength_mpa" => $optRes['predicted_strength_mpa'],
            "water_cement_ratio" => $optRes['water_cement_ratio'],
            "water_binder_ratio" => $optRes['water_binder_ratio'],
            "co2_kg_per_m3" => $optRes['co2_kg_per_m3'],
            "cost_per_m3" => $optRes['cost_per_m3'],
            "objective_value" => $optRes['objective_value'],
            "warnings" => $optRes['warnings'],
            "search" => $optRes['search'],
            "cards" => $cardsEval ? $cardsEval['cards'] : null,
            "provenance" => $cardsEval ? $cardsEval['provenance'] : null,
        ]);
    }
}
