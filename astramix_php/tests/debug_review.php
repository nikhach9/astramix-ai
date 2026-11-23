<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\MarketService;

try {
    $res = MarketService::submitCustomerReview(
        supplierId: 'am-araratcement',
        reviewerUserId: 'test_user_777',
        reviewerDisplayName: 'Armen S.',
        orderReference: 'ORD-TEST-777',
        serviceRating: 5,
        materialRating: 5,
        title: 'Top Quality Concrete CEM II',
        reviewText: 'Fast delivery to site, slump test was completely within tolerance.',
        verifiedPurchase: true
    );
    echo "SUCCESS: " . json_encode($res) . "\n";
} catch (\Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}



