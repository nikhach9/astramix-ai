<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\Core\App;
use AstraMix\Core\Request;

$app = new App();

echo "========================================================\n";
echo "    Materials Market 50-Country & Feature Test Suite    \n";
echo "========================================================\n\n";

$suites = [];
$totalPassed = 0;
$totalFailed = 0;

function runTest(string $desc, callable $fn, App $app): void {
    global $totalPassed, $totalFailed;
    try {
        $fn($app);
        echo "  [PASS] $desc\n";
        $totalPassed++;
    } catch (\Throwable $e) {
        echo "  [FAIL] $desc\n";
        echo "         Error: " . $e->getMessage() . "\n";
        $totalFailed++;
    }
}

// 1. Overview and Country Discovery
runTest("GET /api/v1/market/overview returns honest country metrics", function(App $app) {
    $req = new Request('GET', '/api/v1/market/overview');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if (($data['total_countries_indexed'] ?? 0) < 50) {
        throw new Exception("Expected at least 50 countries, got " . ($data['total_countries_indexed'] ?? 0));
    }
    if (($data['total_entities_outside_cameroon'] ?? 0) !== 542) {
        throw new Exception("Expected 542 entities outside Cameroon, got " . ($data['total_entities_outside_cameroon'] ?? 0));
    }
    if (($data['total_locations_outside_cameroon'] ?? 0) !== 3451) {
        throw new Exception("Expected 3451 locations outside Cameroon, got " . ($data['total_locations_outside_cameroon'] ?? 0));
    }
}, $app);

// 2. City search across different countries
runTest("GET /api/v1/locations/suggest suggests Armenian cities with GeoNames attribution", function(App $app) {
    $req = new Request('GET', '/api/v1/locations/suggest?country=AM&q=Yer&limit=5');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if (empty($data['suggestions'])) throw new Exception("Expected suggestions for Yer in AM");
    if (empty($data['attribution'])) throw new Exception("Attribution missing");
    $first = $data['suggestions'][0];
    if (stripos($first['name'], 'Yerevan') === false) {
        throw new Exception("Expected Yerevan, got: " . $first['name']);
    }
}, $app);

runTest("GET /api/v1/locations/suggest suggests Cameroon cities (Douala/Yaounde)", function(App $app) {
    $req = new Request('GET', '/api/v1/locations/suggest?country=CM&q=Dou&limit=5');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if (empty($data['suggestions'])) throw new Exception("Expected suggestions for Dou in CM");
    $names = array_column($data['suggestions'], 'name');
    if (!in_array('Douala', $names)) {
        throw new Exception("Expected Douala in suggestions: " . implode(', ', $names));
    }
}, $app);

// 3. Search Ingredients Tab with Pagination
runTest("POST /api/v1/market/search finds cement suppliers with pagination", function(App $app) {
    $req = new Request('POST', '/api/v1/market/search', null, null, json_encode([
        'tab' => 'ingredients',
        'country_code' => 'CM',
        'category' => 'cement',
        'quantity' => 500.0,
        'unit' => 'kg',
        'page' => 1,
        'page_size' => 10,
    ]));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if (empty($data['suppliers'])) throw new Exception("Expected suppliers in CM for cement");
    if (!isset($data['pagination']['total_matches'])) throw new Exception("Missing pagination");
    if ($data['pagination']['page'] !== 1) throw new Exception("Page number mismatch");
}, $app);

// 4. Search Ready-Mix Tab with Strength Class
runTest("POST /api/v1/market/search ready_mix tab with strength class", function(App $app) {
    $req = new Request('POST', '/api/v1/market/search', null, null, json_encode([
        'tab' => 'ready_mix',
        'country_code' => 'CM',
        'volume_m3' => 8.0,
        'strength_class' => 'C25/30',
        'needs_pump' => true,
    ]));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if (!isset($data['suppliers'])) throw new Exception("Missing suppliers array");
}, $app);

// 5. Order calculation: Ready Mix order
runTest("POST /api/v1/market/calculate-order computes trucks, delivery, and VAT", function(App $app) {
    $req = new Request('POST', '/api/v1/market/calculate-order', null, null, json_encode([
        'mode' => 'ready_mix_order',
        'volume_m3' => 16.0,
        'unit_price_per_m3' => 100.0,
        'currency' => 'EUR',
        'vat_status' => 'ex_vat',
        'vat_rate_pct' => 20.0,
        'truck_capacity_m3' => 8.0,
        'distance_km' => 20.0,
        'fixed_delivery_fee_per_truck' => 50.0,
        'per_km_rate_per_truck' => 2.5,
    ]));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) throw new Exception("HTTP " . $res->getStatusCode());
    $data = json_decode($res->getBody(), true);
    if ($data['truck_count'] !== 2) throw new Exception("Expected 2 trucks, got " . $data['truck_count']);
    // Material: 16 * 100 = 1600.
    // Delivery per truck: 50 + 20*2.5 = 100. For 2 trucks = 200.
    // Subtotal ex VAT: 1800.
    // VAT 20%: 360.
    // Total inc VAT: 2160.
    if (abs((float)$data['total_inc_vat'] - 2160.0) > 0.01) {
        throw new Exception("Expected 2160.00, got: " . $data['total_inc_vat']);
    }
}, $app);

// 6. Supplier Reviews Lifecycle
runTest("GET & POST /api/v1/market/suppliers/{id}/reviews lifecycle", function(App $app) {
    $supplierId = 'am-araratcement';
    // 1. Submit review
    $postReq = new Request('POST', "/api/v1/market/suppliers/{$supplierId}/reviews", null, null, json_encode([
        'reviewer_user_id' => 'test_user_777',
        'reviewer_display_name' => 'Armen S.',
        'order_reference' => 'ORD-TEST-777',
        'service_rating' => 5,
        'material_rating' => 5,
        'title' => 'Top Quality Concrete CEM II',
        'review_text' => 'Fast delivery to site, slump test was completely within tolerance.',
        'verified_purchase' => true
    ]));
    $postRes = $app->handle($postReq);
    if ($postRes->getStatusCode() !== 200) throw new Exception("POST review failed: HTTP " . $postRes->getStatusCode() . " " . $postRes->getBody());
    $postData = json_decode($postRes->getBody(), true);
    if (($postData['success'] ?? false) !== true) throw new Exception("Review submission returned success=false");

    // 2. Fetch reviews
    $getReq = new Request('GET', "/api/v1/market/suppliers/{$supplierId}/reviews");
    $getRes = $app->handle($getReq);
    if ($getRes->getStatusCode() !== 200) throw new Exception("GET reviews failed: HTTP " . $getRes->getStatusCode());
    $getData = json_decode($getRes->getBody(), true);
    if (!isset($getData['reviews'])) throw new Exception("Missing reviews array");
}, $app);

echo "\n========================================================\n";
echo "SUMMARY: Passed: $totalPassed | Failed: $totalFailed\n";
echo "========================================================\n";
exit($totalFailed > 0 ? 1 : 0);
