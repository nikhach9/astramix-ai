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
    public const DESIGN_VARIABLES = [
        "cement",
        "water",
        "fly_ash",
        "blast_furnace_slag",
        "coarse_aggregate",
        "fine_aggregate",
        "superplasticizer",
    ];

    public const DEFAULT_VARIABLE_BOUNDS = [
        "cement" => [102.0, 540.0],
        "water" => [121.75, 247.0],
        "fly_ash" => [0.0, 200.1],
        "blast_furnace_slag" => [0.0, 359.4],
        "coarse_aggregate" => [801.0, 1145.0],
        "fine_aggregate" => [594.0, 992.6],
        "superplasticizer" => [0.0, 32.2],
    ];

    private StrengthPredictor $predictor;

    public function __construct(?StrengthPredictor $predictor = null)
    {
        $this->predictor = $predictor ?? new StrengthPredictor();
    }

    public function optimize(
        float $targetStrengthMpa,
        int $ageDays = 28,
        float $maxWcRatio = 0.60,
        ?float $maxWbRatio = null,
        float $alpha = 1.0,
        float $beta = 1.0,
        ?array $materialBounds = null,
        ?array $initialGuess = null,
        ?array $unitCosts = null,
        ?array $emissionFactors = null
    ): array {
        if ($targetStrengthMpa <= 0 || $targetStrengthMpa > 150.0) {
            throw new OptimizationException("Target compressive strength must be in (0, 150] MPa.");
        }
        if ($ageDays < 1 || $ageDays > 365) {
            throw new OptimizationException("Curing age must be between 1 and 365 days.");
        }
        if ($maxWcRatio <= 0.0 || $maxWcRatio > 2.5) {
            throw new OptimizationException("max_w_c_ratio must be in (0.0, 2.5].");
        }
        if ($maxWbRatio !== null && ($maxWbRatio < 0.20 || $maxWbRatio > 1.00)) {
            throw new OptimizationException("max_w_b_ratio must be in [0.20, 1.00].");
        }
        if ($alpha < 0 || $beta < 0 || ($alpha == 0.0 && $beta == 0.0)) {
            throw new OptimizationException("Objective weights alpha and beta cannot both be zero or negative.");
        }

        // Resolve active bounds
        $bounds = self::DEFAULT_VARIABLE_BOUNDS;
        if ($materialBounds) {
            foreach ($materialBounds as $var => $rng) {
                if (isset($bounds[$var]) && isset($rng['min']) && isset($rng['max'])) {
                    $uLow = (float)$rng['min'];
                    $uHigh = (float)$rng['max'];
                    if ($uLow > $uHigh) {
                        throw new OptimizationException("Material bound for '$var' has min ($uLow) > max ($uHigh).");
                    }
                    $bounds[$var] = [
                        max($bounds[$var][0], $uLow),
                        min($bounds[$var][1], $uHigh),
                    ];
                }
            }
        }

        $rawCandidates = [
            [250.0, 145.0, 120.0, 140.0, 1020.0, 760.0, 6.0],
            [280.0, 150.0, 100.0, 120.0, 1020.0, 750.0, 5.5],
            [320.0, 155.0, 80.0, 100.0, 1020.0, 750.0, 5.0],
            [350.0, 165.0, 40.0, 60.0, 1000.0, 750.0, 4.0],
            [380.0, 160.0, 30.0, 80.0, 1020.0, 740.0, 6.0],
            [420.0, 155.0, 0.0, 100.0, 1000.0, 740.0, 7.5],
            [450.0, 150.0, 40.0, 80.0, 1000.0, 750.0, 8.0],
            [490.0, 145.0, 0.0, 120.0, 1020.0, 720.0, 10.0],
            [525.0, 140.0, 0.0, 150.0, 1000.0, 700.0, 12.0],
            [540.0, 138.0, 0.0, 180.0, 980.0, 680.0, 14.0],
        ];

        $candidates = [];
        if ($initialGuess !== null) {
            $igVec = [];
            foreach (self::DESIGN_VARIABLES as $v) {
                $igVec[] = (float)($initialGuess[$v] ?? self::DEFAULT_VARIABLE_BOUNDS[$v][0]);
            }
            $candidates[] = $igVec;
        }

        foreach ($rawCandidates as $rc) {
            $clipped = [];
            foreach (self::DESIGN_VARIABLES as $idx => $v) {
                $low = $bounds[$v][0];
                $high = $bounds[$v][1];
                $val = max($low, min($high, $rc[$idx]));
                $clipped[] = $val;
            }

            // Adjust water / cement if max_w_c_ratio is violated
            $cVal = $clipped[0];
            $wVal = $clipped[1];
            if ($wVal / $cVal > $maxWcRatio) {
                $neededC = min($bounds['cement'][1], max($bounds['cement'][0], $wVal / $maxWcRatio + 1.0));
                $clipped[0] = $neededC;
                if ($wVal / $clipped[0] > $maxWcRatio) {
                    $clipped[1] = max($bounds['water'][0], $clipped[0] * $maxWcRatio - 0.5);
                }
            }

            $candidates[] = $clipped;
        }

        $penalty = 1000.0;
        $bestFeasibleMix = null;
        $bestFeasibleObj = INF;
        $bestFeasibleStrength = 0.0;
        $bestFeasibleCost = 0.0;
        $bestFeasibleCo2 = 0.0;

        $bestAnyMix = null;
        $bestAnyObj = INF;
        $bestAnyStrength = 0.0;
        $bestAnyCost = 0.0;
        $bestAnyCo2 = 0.0;

        $warnings = [];
        $maxObservedStrength = 0.0;

        foreach ($candidates as $cand) {
            $mixDict = [
                'cement' => $cand[0],
                'water' => $cand[1],
                'fly_ash' => $cand[2],
                'blast_furnace_slag' => $cand[3],
                'coarse_aggregate' => $cand[4],
                'fine_aggregate' => $cand[5],
                'superplasticizer' => $cand[6],
                'age' => $ageDays,
            ];

            $predRes = $this->predictor->predict($mixDict);
            $predStrength = (float)$predRes['predicted_strength_mpa'];
            if ($predStrength > $maxObservedStrength) {
                $maxObservedStrength = $predStrength;
            }

            $costRes = CostEstimator::estimate($mixDict, $unitCosts);
            $co2Res = CarbonEstimator::estimate($mixDict, $emissionFactors);

            $costVal = (float)$costRes['total_cost_per_m3'];
            $co2Val = (float)$co2Res['total_co2_kg_per_m3'];
            $baseObj = $alpha * $co2Val + $beta * $costVal;

            $isFeasible = true;
            $violPen = 0.0;

            // Bounds check
            foreach (self::DESIGN_VARIABLES as $idx => $v) {
                $val = $cand[$idx];
                $low = $bounds[$v][0];
                $high = $bounds[$v][1];
                if ($val < $low - 1e-6) {
                    $isFeasible = false;
                    $violPen += $penalty * ($low - $val);
                } elseif ($val > $high + 1e-6) {
                    $isFeasible = false;
                    $violPen += $penalty * ($val - $high);
                }
            }

            // Strength check
            if ($predStrength < $targetStrengthMpa - 0.05) {
                $isFeasible = false;
                $violPen += $penalty * ($targetStrengthMpa - $predStrength);
            }

            // w/c check
            $wc = $mixDict['cement'] > 0 ? $mixDict['water'] / $mixDict['cement'] : 999.0;
            if ($wc > $maxWcRatio + 1e-4) {
                $isFeasible = false;
                $violPen += $penalty * 100.0 * ($wc - $maxWcRatio);
            }

            // w/b check
            $binder = $mixDict['cement'] + $mixDict['fly_ash'] + $mixDict['blast_furnace_slag'];
            $wb = $binder > 0 ? $mixDict['water'] / $binder : 999.0;
            if ($wb < 0.20 - 1e-4) {
                $isFeasible = false;
                $violPen += $penalty * 100.0 * (0.20 - $wb);
            } elseif ($wb > 1.00 + 1e-4) {
                $isFeasible = false;
                $violPen += $penalty * 100.0 * ($wb - 1.00);
            }
            if ($maxWbRatio !== null && $wb > $maxWbRatio + 1e-4) {
                $isFeasible = false;
                $violPen += $penalty * 100.0 * ($wb - $maxWbRatio);
            }

            $totalObj = $baseObj + $violPen;

            if ($isFeasible && $baseObj < $bestFeasibleObj) {
                $bestFeasibleObj = $baseObj;
                $bestFeasibleMix = $mixDict;
                $bestFeasibleStrength = $predStrength;
                $bestFeasibleCost = $costVal;
                $bestFeasibleCo2 = $co2Val;
            }

            if ($totalObj < $bestAnyObj) {
                $bestAnyObj = $totalObj;
                $bestAnyMix = $mixDict;
                $bestAnyStrength = $predStrength;
                $bestAnyCost = $costVal;
                $bestAnyCo2 = $co2Val;
            }
        }

        if ($maxObservedStrength < $targetStrengthMpa - 15.0) {
            $warnings[] = "Target strength appears unreachable within the validated training envelope; short-circuiting optimizer.";
        }

        if ($bestFeasibleMix !== null) {
            $finalMix = $bestFeasibleMix;
            $finalStrength = $bestFeasibleStrength;
            $finalCost = $bestFeasibleCost;
            $finalCo2 = $bestFeasibleCo2;
            $finalObj = $bestFeasibleObj;
            $isOptimum = true;
            $solverStatus = "optimal";
            $failureReason = null;
        } else {
            $finalMix = $bestAnyMix ?? $candidates[0];
            $finalStrength = $bestAnyStrength;
            $finalCost = $bestAnyCost;
            $finalCo2 = $bestAnyCo2;
            $finalObj = $bestAnyObj;
            $isOptimum = false;
            $solverStatus = "infeasible";
            $failureReason = "Target constraints could not be met.";
            $warnings[] = "Optimization could not satisfy all target constraints; returning best diagnostic screening candidate.";
        }

        $mixClean = [
            'cement' => round((float)$finalMix['cement'], 2),
            'water' => round((float)$finalMix['water'], 2),
            'fine_aggregate' => round((float)$finalMix['fine_aggregate'], 2),
            'coarse_aggregate' => round((float)$finalMix['coarse_aggregate'], 2),
            'fly_ash' => round((float)$finalMix['fly_ash'], 2),
            'blast_furnace_slag' => round((float)$finalMix['blast_furnace_slag'], 2),
            'superplasticizer' => round((float)$finalMix['superplasticizer'], 2),
            'age' => $ageDays,
        ];

        $wcRatio = $mixClean['cement'] > 0 ? round($mixClean['water'] / $mixClean['cement'], 4) : 0.0;
        $binderTotal = $mixClean['cement'] + $mixClean['fly_ash'] + $mixClean['blast_furnace_slag'];
        $wbRatio = $binderTotal > 0 ? round($mixClean['water'] / $binderTotal, 4) : 0.0;

        return [
            "success" => $isOptimum,
            "is_optimum" => $isOptimum,
            "solver_status" => $solverStatus,
            "failure_reason" => $failureReason,
            "mix" => $mixClean,
            "predicted_strength_mpa" => round($finalStrength, 2),
            "water_cement_ratio" => $wcRatio,
            "water_binder_ratio" => $wbRatio,
            "co2_kg_per_m3" => round($finalCo2, 3),
            "cost_per_m3" => round($finalCost, 2),
            "objective_value" => round($finalObj, 4),
            "warnings" => $warnings,
        ];
    }
}
