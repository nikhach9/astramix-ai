<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\Database;

$db = Database::getConnection();
$cols = $db->query("PRAGMA table_info(suppliers)")->fetchAll(PDO::FETCH_ASSOC);
echo "Suppliers columns: " . implode(', ', array_column($cols, 'name')) . "\n";
$sups = $db->query("SELECT supplier_id, display_name, country_code, is_active, data_origin FROM suppliers WHERE country_code = 'CM'")->fetchAll(PDO::FETCH_ASSOC);
echo "Suppliers in CM: " . count($sups) . "\n";
foreach ($sups as $s) {
    echo "  - {$s['supplier_id']}: {$s['display_name']} (origin: {$s['data_origin']})\n";
}

$prices = $db->query("SELECT price_id, supplier_id, country_code, product_category, product_name, is_active FROM price_snapshots WHERE country_code = 'CM'")->fetchAll(PDO::FETCH_ASSOC);
echo "\nPrice snapshots in CM: " . count($prices) . "\n";
foreach ($prices as $p) {
    echo "  - {$p['price_id']}: {$p['supplier_id']} / {$p['product_category']} / {$p['product_name']}\n";
}

$branches = $db->query("SELECT branch_id, supplier_id, country_code, city, branch_name FROM branches WHERE country_code = 'CM' LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
echo "\nBranches in CM: " . count($branches) . "\n";
foreach ($branches as $b) {
    echo "  - {$b['branch_id']}: {$b['city']} / {$b['branch_name']}\n";
}
