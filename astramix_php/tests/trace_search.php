<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\MarketService;

try {
    $res = MarketService::searchMarket(
        countryCode: 'IT',
        tab: 'ingredients',
        category: 'cement',
        quantity: 1461.0,
        unit: 'kg'
    );
    echo "SUCCESS: Found " . count($res['offers']) . " offers\n";
    foreach ($res['offers'] as $o) {
        echo "Offer: " . $o['display_name'] . " - " . ($o['reference_subtotal'] ?? 'null') . "\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "IN: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
