<?php
require_once __DIR__ . '/../src/autoload.php';
use AstraMix\Market\Database;

$db = Database::getConnection();
$cols = $db->query("PRAGMA table_info(reviews)")->fetchAll(PDO::FETCH_ASSOC);
file_put_contents(__DIR__ . '/reviews_schema.json', json_encode($cols, JSON_PRETTY_PRINT));
echo "Written schema with " . count($cols) . " columns\n";
