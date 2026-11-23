<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\Core\App;
use AstraMix\Core\Request;

$app = new App();

echo "========================================================\n";
echo "       AstraMix AI PHP API Endpoint Diagnostic Suite    \n";
echo "========================================================\n\n";

$tests = [];

// 1. Health
$tests[] = [
    'name' => 'GET /api/v1/health',
    'method' => 'GET',
    'uri' => '/api/v1/health',
    'body' => null,
];

// 2. Schema
$tests[] = [
    'name' => 'GET /api/v1/schema/mix-input',
    'method' => 'GET',
    'uri' => '/api/v1/schema/mix-input',
    'body' => null,
];

// 3. Evaluate Mix Lab
$mix = [
    'cement' => 350.0,
    'blast_furnace_slag' => 0.0,
    'fly_ash' => 0.0,
    'water' => 175.0,
    'superplasticizer' => 3.5,
    'coarse_aggregate' => 1020.0,
    'fine_aggregate' => 760.0,
    'age' => 28,
];
$tests[] = [
    'name' => 'POST /api/v1/mix-lab/evaluate (Standard mix)',
    'method' => 'POST',
    'uri' => '/api/v1/mix-lab/evaluate',
    'body' => json_encode([
        'mix' => $mix,
        'target_strength_mpa' => null,
        'comparison_mode' => 'selected_reference',
        'tolerance_pct' => 5.0,
        'currency' => 'USD',
    ]),
];

// 4. Evaluate with target strength
$tests[] = [
    'name' => 'POST /api/v1/mix-lab/evaluate (With target strength 40 MPa)',
    'method' => 'POST',
    'uri' => '/api/v1/mix-lab/evaluate',
    'body' => json_encode([
        'mix' => $mix,
        'target_strength_mpa' => 40.0,
        'comparison_mode' => 'selected_reference',
        'tolerance_pct' => 5.0,
        'currency' => 'USD',
    ]),
];

// 4b. Evaluate directly via /v1/mix-lab/evaluate (Apache subdirectory rewrite)
$tests[] = [
    'name' => 'POST /v1/mix-lab/evaluate (Direct /v1 prefix)',
    'method' => 'POST',
    'uri' => '/v1/mix-lab/evaluate',
    'body' => json_encode([
        'mix' => $mix,
        'target_strength_mpa' => 35.0,
        'comparison_mode' => 'selected_reference',
        'tolerance_pct' => 5.0,
        'currency' => 'USD',
    ]),
];

// 5. Direct predict strength
$tests[] = [
    'name' => 'POST /api/v1/predict-strength',
    'method' => 'POST',
    'uri' => '/api/v1/predict-strength',
    'body' => json_encode(['mix' => $mix]),
];

// 6. Optimize Mix Lab
$tests[] = [
    'name' => 'POST /api/v1/mix-lab/optimize',
    'method' => 'POST',
    'uri' => '/api/v1/mix-lab/optimize',
    'body' => json_encode([
        'constraints' => [
            'target_strength_mpa' => 35.0,
            'age' => 28,
            'max_w_c_ratio' => 0.55,
            'alpha' => 1.0,
            'beta' => 1.0,
        ],
        'currency' => 'USD',
    ]),
];

// 7. Market Overview
$tests[] = [
    'name' => 'GET /api/v1/market/overview',
    'method' => 'GET',
    'uri' => '/api/v1/market/overview',
    'body' => null,
];

// 8. Locations Suggest
$tests[] = [
    'name' => 'GET /api/v1/locations/suggest?country=AM&q=Yer&limit=8',
    'method' => 'GET',
    'uri' => '/api/v1/locations/suggest?country=AM&q=Yer&limit=8',
    'body' => null,
];

// 9. Basket from Mix
$tests[] = [
    'name' => 'POST /api/v1/market/basket-from-mix',
    'method' => 'POST',
    'uri' => '/api/v1/market/basket-from-mix',
    'body' => json_encode([
        'mix' => $mix,
        'project_volume_m3' => 5.0,
    ]),
];

// 10. Search Market
$tests[] = [
    'name' => 'POST /api/v1/market/search (Ingredients)',
    'method' => 'POST',
    'uri' => '/api/v1/market/search',
    'body' => json_encode([
        'tab' => 'ingredients',
        'country_code' => 'AM',
        'category' => 'cement',
        'quantity' => 1000.0,
        'unit' => 'kg',
    ]),
];

// 11. Calculate Order
$tests[] = [
    'name' => 'POST /api/v1/market/calculate-order (Ready Mix)',
    'method' => 'POST',
    'uri' => '/api/v1/market/calculate-order',
    'body' => json_encode([
        'mode' => 'ready_mix_order',
        'volume_m3' => 12.0,
        'unit_price_per_m3' => 95.0,
        'currency' => 'USD',
        'distance_km' => 15.0,
    ]),
];

// 12. Supplier Reviews
$tests[] = [
    'name' => 'GET /api/v1/market/suppliers/arm-sup-001/reviews',
    'method' => 'GET',
    'uri' => '/api/v1/market/suppliers/arm-sup-001/reviews',
    'body' => null,
];

$allPassed = true;
foreach ($tests as $t) {
    $parsedUri = parse_url($t['uri']);
    $queryParams = [];
    if (isset($parsedUri['query'])) {
        parse_str($parsedUri['query'], $queryParams);
    }
    
    $req = new Request(
        method: $t['method'],
        uri: $t['uri'],
        headers: ['content-type' => 'application/json'],
        queryParams: $queryParams,
        rawBody: $t['body'] ?? ''
    );
    
    $t0 = microtime(true);
    $res = $app->handle($req);
    $ms = round((microtime(true) - $t0) * 1000, 1);
    
    $status = $res->getStatusCode();
    $body = $res->getBody();
    $isOk = ($status >= 200 && $status < 300);
    
    if (!$isOk) {
        $allPassed = false;
        echo sprintf("FAIL [%3d] %-55s (%sms)\n", $status, $t['name'], $ms);
        echo "     Error Body: " . substr($body, 0, 300) . "\n\n";
    } else {
        echo sprintf("PASS [%3d] %-55s (%sms)\n", $status, $t['name'], $ms);
    }
}

echo "\n========================================================\n";
echo "OVERALL: " . ($allPassed ? "ALL ENDPOINTS WORKING PROPERLY" : "ERRORS ENCOUNTERED") . "\n";
echo "========================================================\n";
exit($allPassed ? 0 : 1);
