<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use AstraMix\Core\App;
use AstraMix\Core\Request;
use AstraMix\Market\Units;
use AstraMix\Market\MarketService;

echo "========================================================\n";
echo "   AstraMix AI Materials Market Pricing Engine Tests   \n";
echo "========================================================\n\n";

$passCount = 0;
$failCount = 0;

$assert = function (string $description, callable $test) use (&$passCount, &$failCount) {
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

// 1. Core Italy Leroy Merlin Case: 1,461 kg of 25 kg cement bags @ €4.40
$assert("Italy case: 1,461 kg of 25 kg cement bags @ €4.40 = €259.60 for 59 bags", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1461.0,
        requestedUnit: 'kg',
        unitPrice: 4.40,
        originalUnit: 'bag',
        currency: 'EUR',
        packMassKg: 25.0,
        productName: 'Cemento 25 kg',
        productCategory: 'cement'
    );

    if ($res['bags_needed'] !== 59) {
        throw new Exception("Expected 59 bags needed, got: " . var_export($res['bags_needed'], true));
    }
    if ((float)$res['purchased_kg'] !== 1475.0) {
        throw new Exception("Expected 1,475.00 kg purchased, got: " . $res['purchased_kg']);
    }
    if ((float)$res['surplus_kg'] !== 14.0) {
        throw new Exception("Expected 14.00 kg surplus, got: " . $res['surplus_kg']);
    }
    if ($res['material_subtotal'] !== "259.60") {
        throw new Exception("Expected €259.60 material subtotal, got: " . $res['material_subtotal']);
    }
    if ($res['reference_subtotal'] !== "259.60") {
        throw new Exception("Expected €259.60 reference subtotal, got: " . $res['reference_subtotal']);
    }
    if ($res['normalized_unit_price'] !== "0.1760") {
        throw new Exception("Expected 0.1760 EUR/kg normalized price, got: " . $res['normalized_unit_price']);
    }
    if ($res['currency'] !== "EUR") {
        throw new Exception("Expected EUR currency, got: " . $res['currency']);
    }
    if ($res['is_complete_total'] !== false) {
        throw new Exception("Expected is_complete_total false due to unconfirmed delivery/VAT, got true");
    }
    if (!in_array("delivery_fee", $res['missing_cost_components'], true)) {
        throw new Exception("Expected missing delivery_fee in missing_cost_components");
    }
});

// 2. Bulk Tonne Pricing: 1,461 kg @ $25.00/tonne
$assert("Bulk tonne calculation: 1,461 kg @ $25.00/tonne = $36.53", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1461.0,
        requestedUnit: 'kg',
        unitPrice: 25.00,
        originalUnit: 'tonne',
        currency: 'USD',
        productName: 'Bulk Construction Sand',
        productCategory: 'sand'
    );

    // 1461 / 1000 = 1.461 tonnes * 25.00 = 36.525 -> 36.53
    if ($res['material_subtotal'] !== "36.53") {
        throw new Exception("Expected $36.53 material subtotal, got: " . $res['material_subtotal']);
    }
    if ($res['bags_needed'] !== null) {
        throw new Exception("Bulk order should have bags_needed = null, got: " . var_export($res['bags_needed'], true));
    }
    if ($res['normalized_unit_price'] !== "0.0250") {
        throw new Exception("Expected 0.0250 USD/kg normalized unit price, got: " . $res['normalized_unit_price']);
    }
});

// 3. Direct Kilogram Pricing: 250 kg @ $0.15/kg
$assert("Direct kg calculation: 250 kg @ $0.15/kg = $37.50", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 250.0,
        requestedUnit: 'kg',
        unitPrice: 0.15,
        originalUnit: 'kg',
        currency: 'USD',
        productName: 'Portland Cement loose',
        productCategory: 'cement'
    );

    if ($res['material_subtotal'] !== "37.50") {
        throw new Exception("Expected $37.50 material subtotal, got: " . $res['material_subtotal']);
    }
    if ($res['bags_needed'] !== null) {
        throw new Exception("Direct kg order should have bags_needed = null, got: " . var_export($res['bags_needed'], true));
    }
});

// 4. Volume pricing with density: 1,461 kg @ $120.00/m³ with density 1500 kg/m³
$assert("Volume with verified density: 1,461 kg @ $120.00/m³ (1500 kg/m³) = $116.88", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1461.0,
        requestedUnit: 'kg',
        unitPrice: 120.00,
        originalUnit: 'm3',
        currency: 'USD',
        bulkDensityKgPerM3: 1500.0,
        productName: 'Coarse Aggregate bulk',
        productCategory: 'aggregates'
    );

    // 1461 kg / 1500 kg/m3 = 0.974 m3 * $120 = 116.88
    if ($res['material_subtotal'] !== "116.88") {
        throw new Exception("Expected $116.88 material subtotal, got: " . $res['material_subtotal']);
    }
});

// 5. Volume pricing without density must be flagged as ambiguous
$assert("Volume without verified bulk density is flagged ambiguous with null subtotal", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1461.0,
        requestedUnit: 'kg',
        unitPrice: 120.00,
        originalUnit: 'm3',
        currency: 'USD',
        bulkDensityKgPerM3: null,
        productName: 'Coarse Aggregate uncalibrated',
        productCategory: 'aggregates'
    );

    if ($res['is_ambiguous_unit'] !== true) {
        throw new Exception("Expected is_ambiguous_unit to be true");
    }
    if ($res['material_subtotal'] !== null) {
        throw new Exception("Expected material_subtotal to be null, got: " . $res['material_subtotal']);
    }
    if ($res['quote_completeness'] !== 'bulk_density_missing') {
        throw new Exception("Expected quote_completeness 'bulk_density_missing', got: " . $res['quote_completeness']);
    }
});

// 6. Ambiguous discrete units ('item', 'kit') flagged with null subtotal
$assert("Discrete units ('item', 'kit') flagged ambiguous with merchant quote required", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1000.0,
        requestedUnit: 'kg',
        unitPrice: 50.00,
        originalUnit: 'item',
        currency: 'AMD',
        productName: 'Specialty Additive Item',
        productCategory: 'superplasticizer'
    );

    if ($res['is_ambiguous_unit'] !== true) {
        throw new Exception("Expected is_ambiguous_unit to be true");
    }
    if ($res['material_subtotal'] !== null) {
        throw new Exception("Expected material_subtotal to be null, got: " . $res['material_subtotal']);
    }
    if ($res['quote_completeness'] !== 'unit_unconfirmed_snapshot') {
        throw new Exception("Expected quote_completeness 'unit_unconfirmed_snapshot', got: " . $res['quote_completeness']);
    }
});

// 7. Bag unit missing pack_mass_kg flagged with null subtotal
$assert("Packaged material with missing pack_mass_kg flagged as pack_mass_missing", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1000.0,
        requestedUnit: 'kg',
        unitPrice: 8.50,
        originalUnit: 'bag',
        currency: 'GHS',
        packMassKg: null,
        productName: 'Diamond Cement Bag',
        productCategory: 'cement'
    );

    if ($res['is_ambiguous_unit'] !== true) {
        throw new Exception("Expected is_ambiguous_unit to be true");
    }
    if ($res['material_subtotal'] !== null) {
        throw new Exception("Expected material_subtotal to be null, got: " . $res['material_subtotal']);
    }
    if ($res['quote_completeness'] !== 'pack_mass_missing') {
        throw new Exception("Expected quote_completeness 'pack_mass_missing', got: " . $res['quote_completeness']);
    }
});

// 8. Zero-decimal currency preservation (e.g. AMD, XAF)
$assert("Zero-decimal currencies (AMD) formatted without trailing cents", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 2000.0,
        requestedUnit: 'kg',
        unitPrice: 2800,
        originalUnit: 'bag',
        currency: 'AMD',
        packMassKg: 50.0,
        productName: 'Cement 50 kg bag',
        productCategory: 'cement'
    );

    // 2000 / 50 = 40 bags * 2800 = 112000 AMD
    if ($res['bags_needed'] !== 40) {
        throw new Exception("Expected 40 bags, got: " . $res['bags_needed']);
    }
    if ($res['material_subtotal'] !== "112000") {
        throw new Exception("Expected '112000' material subtotal, got: " . $res['material_subtotal']);
    }
});

// 9. Fully confirmed complete order with tax and delivery
$assert("Fully confirmed order computes complete delivered total without double-counting", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1000.0,
        requestedUnit: 'kg',
        unitPrice: 5.00,
        originalUnit: 'bag',
        currency: 'EUR',
        packMassKg: 25.0,
        deliveryInclusion: 'included',
        taxIncluded: true,
        productName: 'Cement 25 kg with delivery and tax',
        productCategory: 'cement'
    );

    // 1000 / 25 = 40 bags * 5.00 = 200.00 EUR
    if ($res['is_complete_total'] !== true) {
        throw new Exception("Expected is_complete_total true");
    }
    if ($res['delivered_total'] !== "200.00") {
        throw new Exception("Expected delivered_total '200.00', got: " . $res['delivered_total']);
    }
    if ($res['delivery_fee'] !== "0.00") {
        throw new Exception("Expected delivery_fee '0.00', got: " . $res['delivery_fee']);
    }
    if ($res['vat_amount'] !== "0.00") {
        throw new Exception("Expected vat_amount '0.00', got: " . $res['vat_amount']);
    }
});

// 10. API Endpoint POST /api/v1/market/calculate-order with mode 'ingredient_order'
$assert("API POST /market/calculate-order handles ingredient_order mode", function () use ($app) {
    $payload = [
        "mode" => "ingredient_order",
        "required_quantity" => 1461.0,
        "requested_unit" => "kg",
        "unit_price" => 4.40,
        "original_unit" => "bag",
        "currency" => "EUR",
        "pack_mass_kg" => 25.0,
        "product_name" => "Cemento 25 kg",
        "product_category" => "cement"
    ];
    $req = new Request('POST', '/api/v1/market/calculate-order', null, null, json_encode($payload));
    $res = $app->handle($req);

    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got: " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    if (($body['bags_needed'] ?? 0) !== 59) {
        throw new Exception("Expected 59 bags in API response, got: " . ($body['bags_needed'] ?? 'null'));
    }
    if (($body['material_subtotal'] ?? '') !== "259.60") {
        throw new Exception("Expected material_subtotal 259.60, got: " . ($body['material_subtotal'] ?? 'null'));
    }
});

// 11. API Search Market integration for Italy Leroy Merlin
$assert("API POST /market/search returns correct Leroy Merlin whole-bag calculation", function () use ($app) {
    $payload = [
        "country_code" => "IT",
        "tab" => "ingredients",
        "category" => "cement",
        "quantity" => 1461.0,
        "unit" => "kg"
    ];
    $req = new Request('POST', '/api/v1/market/search', null, null, json_encode($payload));
    $res = $app->handle($req);

    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got: " . $res->getStatusCode() . ": " . $res->getBody());
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
        throw new Exception("Leroy Merlin offer not found in Italy search results");
    }
    if ($leroy['reference_subtotal'] !== "259.60") {
        throw new Exception("Expected Leroy Merlin reference_subtotal €259.60, got: " . $leroy['reference_subtotal']);
    }
    if ($leroy['bags_needed'] !== 59) {
        throw new Exception("Expected 59 bags_needed in offer card, got: " . $leroy['bags_needed']);
    }
    if (empty($leroy['line_items'])) {
        throw new Exception("Expected non-empty line_items in offer card");
    }
    $li = $leroy['line_items'][0];
    if ($li['bags_needed'] !== 59 || (float)$li['purchased_kg'] !== 1475.0) {
        throw new Exception("Line item details incorrect: " . json_encode($li));
    }
});

// 12. Armenia ShinShin Group: 1,001 kg of 50 kg cement bags @ 3,800 AMD
$assert("Armenia case: 1,001 kg of 50 kg cement bags @ 3,800 AMD = 79,800 AMD for 21 bags", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1001.0,
        requestedUnit: 'kg',
        unitPrice: 3800.0,
        originalUnit: 'bag',
        currency: 'AMD',
        packMassKg: 50.0,
        productName: 'Ararat M400 Cement 50 kg',
        productCategory: 'cement'
    );

    if ($res['bags_needed'] !== 21) {
        throw new Exception("Expected 21 bags needed, got: " . var_export($res['bags_needed'], true));
    }
    if ((float)$res['purchased_kg'] !== 1050.0) {
        throw new Exception("Expected 1,050.00 kg purchased, got: " . $res['purchased_kg']);
    }
    if ((float)$res['surplus_kg'] !== 49.0) {
        throw new Exception("Expected 49.00 kg surplus, got: " . $res['surplus_kg']);
    }
    if ($res['material_subtotal'] !== "79800") {
        throw new Exception("Expected 79,800 AMD material subtotal, got: " . $res['material_subtotal']);
    }
    if ($res['reference_subtotal'] !== "79800") {
        throw new Exception("Expected 79,800 AMD reference subtotal, got: " . $res['reference_subtotal']);
    }
});

// 13. Discrete 43 AMD per 50 kg bag calculation: 1,001 kg = 21 bags * 43 AMD = 903 AMD before adjustments
$assert("Discrete 43 AMD calculation: 1,001 kg of 50 kg bags @ 43 AMD = 903 AMD (21 bags * 43)", function () {
    $res = Units::calculateIngredientOrder(
        requiredQuantity: 1001.0,
        requestedUnit: 'kg',
        unitPrice: 43.0,
        originalUnit: 'bag',
        currency: 'AMD',
        packMassKg: 50.0,
        productName: 'Standard Portland Cement CEM II',
        productCategory: 'cement'
    );

    if ($res['bags_needed'] !== 21) {
        throw new Exception("Expected 21 bags needed, got: " . var_export($res['bags_needed'], true));
    }
    if ($res['material_subtotal'] !== "903") {
        throw new Exception("Expected 903 AMD material subtotal, got: " . $res['material_subtotal']);
    }
    if ((float)$res['purchased_kg'] !== 1050.0) {
        throw new Exception("Expected 1050 kg purchased, got: " . $res['purchased_kg']);
    }
    if ((float)$res['surplus_kg'] !== 49.0) {
        throw new Exception("Expected 49 kg surplus, got: " . $res['surplus_kg']);
    }
});

// 14. DataQualityValidator unit verification
$assert("DataQualityValidator catches test entities, currency mismatches, and implausible prices", function () {
    // A. Detect test entities
    if (!\AstraMix\Market\DataQualityValidator::isTestEntity("test_supplier_001", "Test Supplier Ltd")) {
        throw new Exception("Expected test entity to be detected");
    }
    if (!\AstraMix\Market\DataQualityValidator::isTestEntity("sup_123", "Acme Cement", "test")) {
        throw new Exception("Expected origin 'test' to be detected");
    }
    if (\AstraMix\Market\DataQualityValidator::isTestEntity("shin_shin", "ShinShin Group", "verified")) {
        throw new Exception("ShinShin Group should NOT be flagged as test entity");
    }

    // B. Detect 43 AMD price snapshot as unrealistically low (0.86 AMD/kg vs min 30 AMD/kg)
    $val = \AstraMix\Market\DataQualityValidator::validatePriceSnapshot([
        'supplier_id' => 'sup_real',
        'product_name' => 'Cement 50kg',
        'category' => 'cement',
        'amount_numeric' => 43.0,
        'unit' => 'bag',
        'pack_mass_kg' => 50.0,
        'currency' => 'AMD',
    ], 'AM', 'AMD');

    if ($val['is_valid'] !== false || !in_array('unrealistically_low_price', $val['issues'], true)) {
        throw new Exception("Expected 43 AMD to be flagged as unrealistically low price");
    }

    // C. Detect currency mismatch (USD in Armenia)
    $valCurr = \AstraMix\Market\DataQualityValidator::validatePriceSnapshot([
        'supplier_id' => 'sup_real',
        'product_name' => 'Cement 50kg',
        'category' => 'cement',
        'amount_numeric' => 42.50,
        'unit' => 'bag',
        'pack_mass_kg' => 50.0,
        'currency' => 'USD',
    ], 'AM', 'AMD');

    if (!in_array('currency_mismatch', $valCurr['issues'], true)) {
        throw new Exception("Expected currency_mismatch issue for USD in AM");
    }
});

// 15. Live Armenia search: ShinShin Group has conflicting_source_prices status and Test Supplier is quarantined
$assert("API POST /market/search in Armenia returns ShinShin Group with conflicting_source_prices and no test suppliers", function () use ($app) {
    $payload = [
        "country_code" => "AM",
        "tab" => "ingredients",
        "category" => "cement",
        "quantity" => 1001.0,
        "unit" => "kg"
    ];
    $req = new Request('POST', '/api/v1/market/search', null, null, json_encode($payload));
    $res = $app->handle($req);

    if ($res->getStatusCode() !== 200) {
        throw new Exception("Expected 200, got: " . $res->getStatusCode() . ": " . $res->getBody());
    }
    $body = json_decode($res->getBody(), true);
    $shinshin = null;
    foreach ($body['offers'] as $o) {
        if (stripos($o['display_name'], 'Test Supplier') !== false) {
            throw new Exception("Test Supplier Ltd must NOT appear in public marketplace search results");
        }
        if (stripos($o['display_name'], 'ShinShin') !== false) {
            $shinshin = $o;
        }
    }
    if (!$shinshin) {
        throw new Exception("ShinShin Group offer not found in Armenia search results");
    }
    if ($shinshin['bags_needed'] !== 21) {
        throw new Exception("Expected 21 bags_needed for ShinShin, got: " . var_export($shinshin['bags_needed'], true));
    }
    if ($shinshin['reference_subtotal'] !== "79800") {
        throw new Exception("Expected 79,800 AMD reference_subtotal for ShinShin, got: " . $shinshin['reference_subtotal']);
    }
    if ($shinshin['quote_completeness'] !== 'conflicting_source_prices') {
        throw new Exception("Expected quote_completeness 'conflicting_source_prices' for ShinShin, got: " . $shinshin['quote_completeness']);
    }
});

echo "\n========================================================\n";
echo "SUMMARY: Passed: $passCount | Failed: $failCount\n";
echo "========================================================\n";

if ($failCount > 0) {
    exit(1);
} else {
    echo "ALL MATERIALS MARKET PRICING ENGINE TESTS PASSED!\n";
    exit(0);
}
