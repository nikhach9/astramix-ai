<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\ML\TreeEnsemble;

$fixturePath = __DIR__ . '/fixtures/reference_predictions.json';
$fixtures = json_decode(file_get_contents($fixturePath), true);

$ensemble = TreeEnsemble::getInstance();

echo "Loaded XGBoost model: base_score=" . $ensemble->getBaseScore() . ", trees=" . $ensemble->getTreeCount() . PHP_EOL;

$maxDiff = 0.0;
$passed = 0;
$total = count($fixtures['mixes']);

foreach ($fixtures['mixes'] as $m) {
    $id = $m['id'];
    $inp = $m['input'];
    $expectedStrength = (float)$m['prediction']['predicted_strength_mpa'];

    // Order: cement, blast_furnace_slag, fly_ash, water, superplasticizer, coarse_aggregate, fine_aggregate, age
    $vector = [
        (float)$inp['cement'],
        (float)$inp['blast_furnace_slag'],
        (float)$inp['fly_ash'],
        (float)$inp['water'],
        (float)$inp['superplasticizer'],
        (float)$inp['coarse_aggregate'],
        (float)$inp['fine_aggregate'],
        (float)$inp['age'],
    ];

    $predicted = $ensemble->predict($vector);
    $diff = abs($predicted - $expectedStrength);
    if ($diff > $maxDiff) {
        $maxDiff = $diff;
    }

    echo sprintf(
        "Mix [%-25s]: Python=%8.4f | PHP=%8.4f | Diff=%e\n",
        $id,
        $expectedStrength,
        $predicted,
        $diff
    );

    if ($diff < 1e-4) {
        $passed++;
    }
}

echo "--------------------------------------------------------" . PHP_EOL;
echo "Parity check: $passed / $total passed. Max difference: $maxDiff" . PHP_EOL;

if ($passed === $total) {
    echo "SUCCESS: 100% XGBOOST NUMERICAL PARITY CONFIRMED!" . PHP_EOL;
    exit(0);
} else {
    echo "FAILURE: Discrepancy observed." . PHP_EOL;
    exit(1);
}
