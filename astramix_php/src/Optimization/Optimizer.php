<?php
declare(strict_types=1);

namespace AstraMix\Optimization;

use AstraMix\Core\OptimizationException;
use AstraMix\Domain\InputSchema;
use AstraMix\ML\StrengthPredictor;
use AstraMix\Sustainability\CarbonEstimator;
use AstraMix\Sustainability\CostEstimator;

class Optimizer
{
    public const DESIGN_VARIABLES = ['cement', 'water', 'fly_ash', 'blast_furnace_slag', 'coarse_aggregate', 'fine_aggregate', 'superplasticizer'];
    public const DEFAULT_VARIABLE_BOUNDS = [
        'cement' => [102.0, 540.0], 'water' => [121.75, 247.0],
        'fly_ash' => [0.0, 200.1], 'blast_furnace_slag' => [0.0, 359.4],
        'coarse_aggregate' => [801.0, 1145.0], 'fine_aggregate' => [594.0, 992.6], 'superplasticizer' => [0.0, 32.2],
    ];
    private const TOLERANCE = 1e-8;
    private StrengthPredictor $predictor;

    public function __construct(?StrengthPredictor $predictor = null)
    {
        $this->predictor = $predictor ?? new StrengthPredictor();
    }

    public function optimize(
        float $targetStrengthMpa, int $ageDays = 28, float $maxWcRatio = 0.60,
        ?float $maxWbRatio = null, float $alpha = 1.0, float $beta = 1.0,
        ?array $materialBounds = null, ?array $initialGuess = null,
        ?array $unitCosts = null, ?array $emissionFactors = null,
        int $candidateBudget = 512, int $seed = 42, float $costReference = 100.0, float $co2Reference = 400.0
    ): array {
        foreach ([$targetStrengthMpa, $maxWcRatio, $alpha, $beta, $costReference, $co2Reference] as $value) {
            if (!is_finite($value)) {
                throw new OptimizationException('Search settings must be finite.');
            }
        }
        if ($targetStrengthMpa <= 0 || $targetStrengthMpa > 150 || $ageDays < 1 || $ageDays > 365) {
            throw new OptimizationException('Invalid target strength or curing age.');
        }
        if ($maxWcRatio <= 0 || $maxWcRatio > 2 || ($maxWbRatio !== null && (!is_finite($maxWbRatio) || $maxWbRatio < .20 || $maxWbRatio > 1))) {
            throw new OptimizationException('Invalid water ratio constraint.');
        }
        if (min($alpha, $beta) < 0 || max($alpha, $beta) == 0 || min($costReference, $co2Reference) <= 0) {
            throw new OptimizationException('Weights must be non-negative with a positive sum; references must be positive.');
        }
        if ($candidateBudget < 1 || $candidateBudget > 10000 || $seed < 0 || $seed > 4294967295) {
            throw new OptimizationException('Invalid search budget or seed.');
        }
        $contract = json_decode(file_get_contents(dirname(__DIR__, 2) . '/data/search/contract_v1.json'), true, 512, JSON_THROW_ON_ERROR);
        $bounds = self::DEFAULT_VARIABLE_BOUNDS;
        foreach ($materialBounds ?? [] as $key => $range) {
            if (!isset($bounds[$key]) || !is_array($range) || !array_key_exists('min', $range) || !array_key_exists('max', $range)) {
                throw new OptimizationException("Invalid material bounds for $key.");
            }
            $low = InputSchema::parseStrictFiniteFloat($range['min'], $key, $key);
            $high = InputSchema::parseStrictFiniteFloat($range['max'], $key, $key);
            if ($low > $high || $low < $bounds[$key][0] || $high > $bounds[$key][1]) {
                throw new OptimizationException("Material bounds for $key are outside the supported domain or reversed.");
            }
            $bounds[$key] = [$low, $high];
        }
        $candidates = [];
        $seen = [];
        $add = static function (array $values, bool $generated = true) use (&$candidates, &$seen, $bounds, $candidateBudget): void {
            $row = [];
            foreach (self::DESIGN_VARIABLES as $i => $key) {
                [$low, $high] = $bounds[$key];
                $value = (float)$values[$i];
                $row[] = $generated ? min($high, max($low, floor($value * 100 + .5) / 100)) : $value;
            }
            $key = json_encode($row, JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
            if (!isset($seen[$key]) && count($candidates) < $candidateBudget) {
                $seen[$key] = true;
                $candidates[] = $row;
            }
        };
        if ($initialGuess !== null) {
            $mix = $this->predictor->normalizeMix($initialGuess);
            $row = [];
            foreach (self::DESIGN_VARIABLES as $key) {
                if ($mix[$key] < $bounds[$key][0] || $mix[$key] > $bounds[$key][1]) {
                    throw new OptimizationException('Initial guess is outside the requested material bounds.');
                }
                $row[] = $mix[$key];
            }
            $add($row, false);
        }
        foreach ($contract['anchors'] as $anchor) {
            $add($anchor);
        }
        $state = $seed;
        $fixed = count(array_filter($bounds, static fn($b) => $b[0] != $b[1])) === 0;
        for ($attempt = 0; $attempt < $candidateBudget * 3 && count($candidates) < $candidateBudget && !$fixed; $attempt++) {
            $row = [];
            foreach (self::DESIGN_VARIABLES as $key) {
                $state = (1664525 * $state + 1013904223) % 4294967296;
                [$low, $high] = $bounds[$key];
                $row[] = $low + ($high - $low) * $state / 4294967296;
            }
            $add($row);
        }
        $costs = $this->validateFactors($unitCosts ?? CostEstimator::DEFAULT_COST_FACTORS);
        $emissions = $this->validateFactors($emissionFactors ?? CarbonEstimator::DEFAULT_CO2_FACTORS);
        $scale = max($alpha, $beta);
        $a = $alpha / $scale;
        $b = $beta / $scale;
        $weightSum = $a + $b;
        $a /= $weightSum;
        $b /= $weightSum;
        $best = null;
        $evaluated = $feasibleCount = $omitted = 0;
        foreach ($candidates as $vector) {
            $mix = array_combine(self::DESIGN_VARIABLES, $vector);
            $cost = $this->total($mix, $costs);
            $co2 = $this->total($mix, $emissions);
            if ($cost === null || $co2 === null) {
                $omitted++;
                continue;
            }
            // The search records failed-ratio candidates as diagnostics; it
            // checks all ratios itself before declaring a candidate feasible.
            $pred = $this->predictor->predict($mix + ['age' => $ageDays], false);
            $strength = max(0.0, (float)$pred['raw_prediction']);
            if (!is_finite($strength)) {
                throw new OptimizationException('Strength model returned a non-finite prediction.');
            }
            $evaluated++;
            $wc = $mix['water'] / $mix['cement'];
            $wb = $mix['water'] / ($mix['cement'] + $mix['fly_ash'] + $mix['blast_furnace_slag']);
            $violations = [max(0.0, $targetStrengthMpa - $strength), max(0.0, .20 - $wb), max(0.0, $wb - 1), max(0.0, $wc - $maxWcRatio)];
            if ($maxWbRatio !== null) {
                $violations[] = max(0.0, $wb - $maxWbRatio);
            }
            $feasible = max($violations) <= self::TOLERANCE;
            $feasibleCount += (int)$feasible;
            $score = $a * $co2 / $co2Reference + $b * $cost / $costReference;
            if (!is_finite($score)) {
                throw new OptimizationException('Normalized objective exceeds finite numeric range.');
            }
            $rank = [!$feasible, $feasible ? 0.0 : array_sum($violations), $score, $vector];
            if ($best === null || $rank < $best['rank']) {
                $best = compact('rank', 'mix', 'strength', 'co2', 'cost', 'wc', 'wb', 'score', 'feasible');
            }
        }
        if ($best === null) {
            throw new OptimizationException('No rankable candidates: missing factors for active ingredients.');
        }
        $warnings = ['Best candidate among the evaluated recipes; global optimality and physical suitability are not established.', 'Normalized weighted-sum ranking uses the recorded cost and emissions references.'];
        if ($omitted) {
            $warnings[] = "$omitted candidates excluded because active ingredient factors were missing.";
        }
        return [
            'success' => $best['feasible'], 'is_optimum' => false,
            'solver_status' => $best['feasible'] ? 'feasible_candidate_found' : 'no_feasible_candidate_found',
            'failure_reason' => $best['feasible'] ? null : 'No feasible candidate was found within the declared search budget.',
            'mix' => $best['mix'] + ['age' => $ageDays], 'predicted_strength_mpa' => $best['strength'],
            'water_cement_ratio' => $best['wc'], 'water_binder_ratio' => $best['wb'],
            'co2_kg_per_m3' => $best['co2'], 'cost_per_m3' => $best['cost'], 'objective_value' => $best['score'], 'warnings' => $warnings,
            'search' => ['method' => $contract['version'], 'seed' => $seed, 'candidate_budget' => $candidateBudget,
                'generated' => count($candidates), 'evaluated' => $evaluated, 'feasible' => $feasibleCount,
                'optimality_scope' => 'best_evaluated_candidate', 'cost_reference' => $costReference,
                'co2_reference' => $co2Reference, 'alpha' => $alpha, 'beta' => $beta, 'constraint_tolerance' => self::TOLERANCE],
        ];
    }

    private function validateFactors(array $factors): array
    {
        foreach ($factors as $key => $value) {
            if (!in_array($key, self::DESIGN_VARIABLES, true)) {
                throw new OptimizationException("Unknown factor material: $key.");
            }
            if ($value !== null) {
                $value = InputSchema::parseStrictFiniteFloat($value, $key, $key);
                if ($value < 0) {
                    throw new OptimizationException("Negative factor for $key.");
                }
                $factors[$key] = $value;
            }
        }
        return $factors;
    }

    private function total(array $mix, array $factors): ?float
    {
        $total = 0.0;
        foreach ($mix as $key => $quantity) {
            if ($quantity > 0 && !isset($factors[$key])) {
                return null;
            }
            $total += $quantity * ($factors[$key] ?? 0.0);
        }
        if (!is_finite($total)) {
            throw new OptimizationException('Factor calculation exceeds finite numeric range.');
        }
        return $total;
    }
}
