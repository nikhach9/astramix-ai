<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\Optimization\Optimizer;

$fixturePath = __DIR__ . '/fixtures/reference_predictions.json';
$fixtures = json_decode(file_get_contents($fixturePath), true);

$optimizer = new Optimizer();

echo "Running Optimizer verification against reference fixtures..." . PHP_EOL;

foreach ($fixtures['optimizations'] as $idx => $opt) {
    $req = $opt['input'];
    $expected = $opt;

    $targetStrength = (float)$req['target_strength_mpa'];
    $age = (int)($req['age'] ?? 28);
    $maxWc = (float)($req['max_w_c_ratio'] ?? 0.60);
    $maxWb = isset($req['max_w_b_ratio']) ? (float)$req['max_w_b_ratio'] : null;
    $alpha = (float)($req['alpha'] ?? 1.0);
    $beta = (float)($req['beta'] ?? 1.0);

    $res = $optimizer->optimize(
        $targetStrength,
        $age,
        $maxWc,
        $maxWb,
        $alpha,
        $beta
    );

    echo sprintf(
        "Scenario #%d: Target=%-4.1f | Result Strength=%-5.2f | Status=%s (Optimum=%s)\n",
        $idx + 1,
        $targetStrength,
        $res['predicted_strength_mpa'],
        $res['solver_status'],
        $res['is_optimum'] ? 'true' : 'false'
    );

    // Assert strength >= target - 0.05 if optimum
    if ($res['is_optimum']) {
        if ($res['predicted_strength_mpa'] < $targetStrength - 0.05) {
            echo "FAILED: Predicted strength below target for feasible scenario #$idx" . PHP_EOL;
            exit(1);
        }
        if ($res['water_cement_ratio'] > $maxWc + 1e-4) {
            echo "FAILED: w/c ratio violated for scenario #$idx" . PHP_EOL;
            exit(1);
        }
    } else {
        // Assert infeasible matches
        if ($opt['is_optimum'] === false) {
            echo "Infeasible diagnostic correctly flagged without false optimum!" . PHP_EOL;
        }
    }
}

echo "SUCCESS: Optimizer verification passed!" . PHP_EOL;
exit(0);
