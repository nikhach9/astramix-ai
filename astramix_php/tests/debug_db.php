<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\Database;
use AstraMix\Market\MarketService;

$db = Database::getConnection();
$tables = $db->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: " . implode(', ', $tables) . "\n";

$cols = $db->query("PRAGMA table_info(reviews)")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo $c['name'] . ' (' . $c['type'] . ', notnull=' . $c['notnull'] . ')' . "\n";
}

$overview = MarketService::getMarketOverview();
echo "Overview: " . json_encode($overview, JSON_PRETTY_PRINT) . "\n";
