<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\MarketService;

try {
    $res = MarketService::searchMarket(
        tab: 'ingredients',
        countryCode: 'CM',
        category: 'cement',
        quantity: 500.0,
        unit: 'kg',
        page: 1,
        pageSize: 10
    );
    echo "Found offers: " . count($res['offers'] ?? []) . "\n";
    echo "Total count: " . ($res['total_count'] ?? 0) . "\n";
    foreach ($res['offers'] ?? [] as $o) {
        echo "  - {$o['supplier_id']}: {$o['supplier_name']}\n";
    }
} catch (\Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
