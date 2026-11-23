<?php
declare(strict_types=1);

namespace AstraMix\Market;

use PDO;
use RuntimeException;

class Database
{
    private static ?PDO $pdo = null;

    public static function getConnection(?string $customDbPath = null): PDO
    {
        if (self::$pdo !== null && $customDbPath === null) {
            return self::$pdo;
        }

        $driver = getenv('ASTRAMIX_DB_DRIVER') ?: 'sqlite';
        if (strtolower($driver) === 'mysql' || getenv('MYSQL_HOST') || getenv('DB_HOST')) {
            $host = getenv('MYSQL_HOST') ?: getenv('DB_HOST') ?: '127.0.0.1';
            $port = getenv('MYSQL_PORT') ?: getenv('DB_PORT') ?: '3306';
            $dbname = getenv('MYSQL_DATABASE') ?: getenv('DB_NAME') ?: 'astramix_market';
            $user = getenv('MYSQL_USER') ?: getenv('DB_USER') ?: 'root';
            $pass = getenv('MYSQL_PASSWORD') ?: getenv('DB_PASSWORD') ?: '';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            if ($customDbPath === null) {
                self::$pdo = $pdo;
            }
            return $pdo;
        }

        // Default: SQLite
        $dbPath = $customDbPath ?? getenv('ASTRAMIX_MARKET_DB_PATH');
        if (!$dbPath) {
            $dbPath = dirname(__DIR__, 2) . '/data/market/astramix_market.db';
        }

        if (!file_exists($dbPath)) {
            $dir = dirname($dbPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
        }

        $dsn = 'sqlite:' . $dbPath;
        $pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("PRAGMA foreign_keys = ON;");

        if ($customDbPath === null) {
            self::$pdo = $pdo;
        }
        return $pdo;
    }
}
