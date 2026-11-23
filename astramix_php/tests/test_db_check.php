<?php
$dbPath = __DIR__ . '/../data/market/astramix_market.db';
$pdo = new PDO('sqlite:' . $dbPath);
echo "AUDIT_LOGS COLUMNS:\n";
foreach ($pdo->query("PRAGMA table_info(audit_logs)")->fetchAll(PDO::FETCH_ASSOC) as $col) {
    echo $col['name'] . " (" . $col['type'] . ", notnull=" . $col['notnull'] . ")\n";
}
