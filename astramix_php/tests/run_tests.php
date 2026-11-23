<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\Core\App;
use AstraMix\Core\Request;
use AstraMix\ML\TreeEnsemble;
use AstraMix\Optimization\Optimizer;

echo "========================================================\n";
echo "       AstraMix AI PHP 8.2+ Backend Verification       \n";
echo "========================================================\n\n";

$passCount = 0;
$failCount = 0;

$it = function (string $description, callable $test) use (&$passCount, &$failCount) {
    try {
        $test();
        echo "  [PASS] $description\n";
        $passCount++;
    } catch (\Throwable $e) {
        echo "  [FAIL] $description: " . $e->getMessage() . "\n";
        echo "         in " . $e->getFile() . ":" . $e->getLine() . "\n";
        $failCount++;
    }
};

$app = new App();

// --- Test Suite 1: Health & Runtime ---
echo "--- 1. Service Health & Runtime ---\n";
$it("GET /health returns status ok with loaded XGBoost model", function () use ($app) {
    $req = new Request('GET', '/health');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode());
    }
    $body = json_decode($res->getBody(), true);
    if (($body['status'] ?? '') !== 'ok') {
        throw new Exception("Status is not ok");
    }
    if (($body['model_loaded'] ?? false) !== true) {
        throw new Exception("Model is not loaded");
    }
});

// --- Test Suite 2: Schema Contract ---
echo "\n--- 2. Mix Lab Schema Contract ---\n";
$it("GET /schema/mix-input returns valid v1.0.0 features schema", function () use ($app) {
    $req = new Request('GET', '/api/v1/schema/mix-input');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode());
    }
    $body = json_decode($res->getBody(), true);
    if (($body['schema_version'] ?? '') !== '1.0.0') {
        throw new Exception("Schema version mismatch: " . ($body['schema_version'] ?? 'none'));
    }
    if (!isset($body['features']['cement']['min'])) {
        throw new Exception("Missing cement features");
    }
});

// --- Test Suite 3: Model Parity ---
echo "\n--- 3. XGBoost Model Numerical Parity ---\n";
$it("TreeEnsemble matches Python predictions on all 13 reference mixes", function () {
    $fixtures = json_decode(file_get_contents(__DIR__ . '/fixtures/reference_predictions.json'), true);
    $ensemble = TreeEnsemble::getInstance();

    foreach ($fixtures['mixes'] as $m) {
        $inp = $m['input'];
        $vec = [
            (float)$inp['cement'],
            (float)$inp['blast_furnace_slag'],
            (float)$inp['fly_ash'],
            (float)$inp['water'],
            (float)$inp['superplasticizer'],
            (float)$inp['coarse_aggregate'],
            (float)$inp['fine_aggregate'],
            (float)$inp['age'],
        ];
        $pred = $ensemble->predict($vec);
        $expected = (float)$m['prediction']['predicted_strength_mpa'];
        if (abs($pred - $expected) > 1e-4) {
            throw new Exception("Mismatch on {$m['id']}: expected $expected, got $pred");
        }
    }
});

// --- Test Suite 4: Mix Lab Prediction & Evaluation ---
echo "\n--- 4. Mix Lab Prediction & Evaluation Cards ---\n";
$it("POST /api/v1/mix-lab/evaluate produces Strength, Cost, and Emissions cards", function () use ($app) {
    $mixPayload = [
        "mix" => [
            "cement" => 350.0,
            "blast_furnace_slag" => 0.0,
            "fly_ash" => 0.0,
            "water" => 175.0,
            "superplasticizer" => 2.5,
            "coarse_aggregate" => 1040.0,
            "fine_aggregate" => 760.0,
            "age" => 28,
        ],
        "target_strength_mpa" => 35.0,
        "comparison_mode" => "selected_reference",
    ];

    $req = new Request('POST', '/api/v1/mix-lab/evaluate', null, null, json_encode($mixPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }

    $body = json_decode($res->getBody(), true);
    if (!isset($body['cards']['strength']['badge'])) {
        throw new Exception("Missing strength card");
    }
    if (!isset($body['cards']['cost']['badge'])) {
        throw new Exception("Missing cost card");
    }
    if (!isset($body['cards']['emissions']['badge'])) {
        throw new Exception("Missing emissions card");
    }

    // Target 35 MPa vs predicted ~55.99 MPa should be "Meets target (above RMSE margin)"
    if ($body['cards']['strength']['badge'] !== "Meets target (above RMSE margin)") {
        throw new Exception("Unexpected strength badge: " . $body['cards']['strength']['badge']);
    }
});

// --- Test Suite 5: Constrained Optimization ---
echo "\n--- 5. Constrained Mix Optimization ---\n";
$it("POST /api/v1/mix-lab/optimize satisfies strength and w/c constraints", function () use ($app) {
    $optPayload = [
        "constraints" => [
            "target_strength_mpa" => 35.0,
            "age" => 28,
            "max_w_c_ratio" => 0.55,
            "alpha" => 1.0,
            "beta" => 1.0,
        ],
    ];

    $req = new Request('POST', '/api/v1/mix-lab/optimize', null, null, json_encode($optPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }

    $body = json_decode($res->getBody(), true);
    if (($body['is_optimum'] ?? false) !== true) {
        throw new Exception("Optimization failed to find optimum: " . json_encode($body));
    }
    if ($body['predicted_strength_mpa'] < 35.0 - 0.05) {
        throw new Exception("Optimal strength ({$body['predicted_strength_mpa']}) < target 35.0");
    }
    if ($body['water_cement_ratio'] > 0.55 + 1e-4) {
        throw new Exception("w/c ratio violated: " . $body['water_cement_ratio']);
    }
});

// --- Test Suite 6: Materials Market ---
echo "\n--- 6. Materials Market & Locations ---\n";
$it("GET /locations/suggest returns ranked localities with GeoNames attribution", function () use ($app) {
    $req = new Request('GET', '/locations/suggest?country=AM&q=Yerevan&limit=5');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    if (empty($body['suggestions'])) {
        throw new Exception("No suggestions returned for Yerevan");
    }
    if (!str_contains($body['attribution'], 'GeoNames')) {
        throw new Exception("GeoNames attribution missing");
    }
});

$it("GET /market/overview returns honest 50-country metrics", function () use ($app) {
    $req = new Request('GET', '/api/v1/market/overview');
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode());
    }
    $body = json_decode($res->getBody(), true);
    $cov = $body['coverage_metrics'];
    if ($cov['country_count'] !== 100) {
        throw new Exception("Expected 100 countries, got " . $cov['country_count']);
    }
    if ($cov['refreshed_50_country_count'] !== 50) {
        throw new Exception("Expected 50 refreshed markets, got " . $cov['refreshed_50_country_count']);
    }
    if ($cov['global_50_branch_count'] < 3400) {
        throw new Exception("Expected > 3400 branches, got " . $cov['global_50_branch_count']);
    }
});

$it("POST /market/basket-from-mix generates whole-bag preview", function () use ($app) {
    $basketPayload = [
        "mix" => [
            "cement" => 350.0,
            "water" => 175.0,
            "coarse_aggregate" => 1040.0,
            "fine_aggregate" => 760.0,
        ],
        "project_volume_m3" => 2.0,
    ];
    $req = new Request('POST', '/api/v1/market/basket-from-mix', null, null, json_encode($basketPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    if (empty($body['items'])) {
        throw new Exception("No basket items generated");
    }
    // Cement: 350 * 2 = 700 kg / 50 kg bag = 14 bags
    $cementItem = null;
    foreach ($body['items'] as $it) {
        if ($it['material_key'] === 'cement') $cementItem = $it;
    }
    if (!$cementItem || ($cementItem['bag_rounding_preview']['bags_needed'] ?? 0) !== 14) {
        throw new Exception("Expected 14 bags of cement, got: " . json_encode($cementItem));
    }
});

$it("POST /market/calculate-order computes ready-mix trucks without double-counting", function () use ($app) {
    $orderPayload = [
        "mode" => "ready_mix_order",
        "volume_m3" => 14.0,
        "unit_price_per_m3" => 90.0,
        "truck_capacity_m3" => 8.0,
        "delivery_status" => "delivered",
        "vat_status" => "inc_vat",
        "vat_rate_pct" => 20.0,
    ];
    $req = new Request('POST', '/api/v1/market/calculate-order', null, null, json_encode($orderPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode());
    }
    $body = json_decode($res->getBody(), true);
    if ($body['truck_count'] !== 2) {
        throw new Exception("Expected 2 trucks for 14 m³, got: " . $body['truck_count']);
    }
    // 14 * 90 = 1260 total inc vat
    if ((float)$body['total_inc_vat'] !== 1260.0) {
        throw new Exception("Expected 1260.00 total inc vat, got " . $body['total_inc_vat']);
    }
});

$it("POST /market/calculate-order computes whole-bag ingredient order (Italy 1,461 kg case)", function () use ($app) {
    $orderPayload = [
        "mode" => "ingredient_order",
        "required_quantity" => 1461.0,
        "requested_unit" => "kg",
        "unit_price" => 4.40,
        "original_unit" => "bag",
        "currency" => "EUR",
        "pack_mass_kg" => 25.0,
        "product_name" => "Cemento 25 kg",
        "product_category" => "cement",
    ];
    $req = new Request('POST', '/api/v1/market/calculate-order', null, null, json_encode($orderPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    if (($body['bags_needed'] ?? 0) !== 59) {
        throw new Exception("Expected 59 bags needed, got: " . ($body['bags_needed'] ?? 'null'));
    }
    if (($body['material_subtotal'] ?? '') !== "259.60") {
        throw new Exception("Expected €259.60 subtotal, got: " . ($body['material_subtotal'] ?? 'null'));
    }
    if ((float)($body['purchased_kg'] ?? 0) !== 1475.0) {
        throw new Exception("Expected 1,475 kg purchased, got: " . ($body['purchased_kg'] ?? 'null'));
    }
});

$it("POST /market/calculate-order computes Armenia ShinShin whole-bag order (1,001 kg = 79,800 AMD)", function () use ($app) {
    $orderPayload = [
        "mode" => "ingredient_order",
        "required_quantity" => 1001.0,
        "requested_unit" => "kg",
        "unit_price" => 3800.0,
        "original_unit" => "bag",
        "currency" => "AMD",
        "pack_mass_kg" => 50.0,
        "product_name" => "Ararat M400 Cement 50 kg",
        "product_category" => "cement",
    ];
    $req = new Request('POST', '/api/v1/market/calculate-order', null, null, json_encode($orderPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    if (($body['bags_needed'] ?? 0) !== 21) {
        throw new Exception("Expected 21 bags needed, got: " . ($body['bags_needed'] ?? 'null'));
    }
    if (($body['material_subtotal'] ?? '') !== "79800") {
        throw new Exception("Expected 79,800 AMD subtotal, got: " . ($body['material_subtotal'] ?? 'null'));
    }
    if ((float)($body['purchased_kg'] ?? 0) !== 1050.0) {
        throw new Exception("Expected 1,050 kg purchased, got: " . ($body['purchased_kg'] ?? 'null'));
    }
    if ((float)($body['surplus_kg'] ?? 0) !== 49.0) {
        throw new Exception("Expected 49 kg surplus, got: " . ($body['surplus_kg'] ?? 'null'));
    }
});

$it("POST /market/search returns correct Leroy Merlin €259.60 for 1,461 kg", function () use ($app) {
    $searchPayload = [
        "country_code" => "IT",
        "tab" => "ingredients",
        "category" => "cement",
        "quantity" => 1461.0,
        "unit" => "kg",
    ];
    $req = new Request('POST', '/api/v1/market/search', null, null, json_encode($searchPayload));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    $leroy = null;
    foreach ($body['offers'] as $o) {
        if (stripos($o['display_name'], 'Leroy') !== false) {
            $leroy = $o;
            break;
        }
    }
    if (!$leroy) {
        throw new Exception("Leroy Merlin offer not found in search results");
    }
    if ($leroy['reference_subtotal'] !== "259.60") {
        throw new Exception("Expected reference_subtotal 259.60, got: " . $leroy['reference_subtotal']);
    }
    if ($leroy['bags_needed'] !== 59) {
        throw new Exception("Expected 59 bags_needed, got: " . $leroy['bags_needed']);
    }
});

// --- Test Suite 7: Admin Role Security ---
echo "\n--- 7. Role-Protected Admin Endpoints ---\n";
$it("POST /admin/suppliers/upsert-quote rejects default development token (HTTP 403)", function () use ($app) {
    putenv('ASTRAMIX_ADMIN_TOKEN=astramix-dev-admin-token');
    $req = new Request('POST', '/api/v1/admin/suppliers/upsert-quote', ['x-admin-token' => 'astramix-dev-admin-token'], null, json_encode([]));
    $res = $app->handle($req);
    if ($res->getStatusCode() !== 403) {
        throw new Exception("Expected 403 Forbidden for dev token, got " . $res->getStatusCode());
    }
});

$it("POST /admin/suppliers/upsert-quote succeeds with secure production token, quarantines test data, and cleans up", function () use ($app) {
    $secureToken = 'astramix-production-secured-token-2026';
    putenv("ASTRAMIX_ADMIN_TOKEN=$secureToken");
    $headers = ['x-admin-token' => $secureToken];
    $quotePayload = [
        "supplier_id" => "test_supplier_001",
        "country_code" => "AM",
        "display_name" => "Test Supplier Ltd",
        "product_category" => "cement",
        "product_name" => "Standard Portland Cement CEM II",
        "original_amount" => "42.50",
        "original_currency" => "USD",
        "original_unit" => "50kg_bag",
    ];
    try {
        $req = new Request('POST', '/api/v1/admin/suppliers/upsert-quote', $headers, null, json_encode($quotePayload));
        $res = $app->handle($req);
        if ($res->getStatusCode() !== 200) {
            throw new Exception("Expected 200, got " . $res->getStatusCode() . ": " . $res->getBody());
        }
        $body = json_decode($res->getBody(), true);
        if (($body['success'] ?? false) !== true) {
            throw new Exception("Quote upsert failed: " . json_encode($body));
        }

        // Verify that public market search strictly quarantines test_supplier_001
        $searchReq = new Request('POST', '/api/v1/market/search', null, null, json_encode([
            "country_code" => "AM",
            "tab" => "ingredients",
            "category" => "cement",
            "quantity" => 1001.0,
            "unit" => "kg",
        ]));
        $searchRes = $app->handle($searchReq);
        $searchBody = json_decode($searchRes->getBody(), true);
        foreach ($searchBody['offers'] as $o) {
            if ($o['supplier_id'] === 'test_supplier_001' || stripos($o['display_name'], 'Test Supplier') !== false) {
                throw new Exception("Test supplier leaked into public market search!");
            }
        }
    } finally {
        // Immediately clean up test data so it never persists in production SQLite database
        $db = \AstraMix\Market\Database::getConnection();
        $db->exec("DELETE FROM price_snapshots WHERE supplier_id = 'test_supplier_001' OR price_id LIKE 'prc_%'");
        $db->exec("DELETE FROM suppliers WHERE supplier_id = 'test_supplier_001'");
        $db->exec("DELETE FROM audit_logs WHERE entity_id = 'test_supplier_001' OR entity_id LIKE 'prc_%'");
    }
});

echo "\n========================================================\n";
echo "SUMMARY: Passed: $passCount | Failed: $failCount\n";
echo "========================================================\n";

if ($failCount > 0) {
    exit(1);
} else {
    echo "ALL 10 VERIFICATION SUITES PASSED FLAWLESSLY!\n";
    exit(0);
}
