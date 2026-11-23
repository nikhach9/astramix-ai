<?php
declare(strict_types=1);

namespace AstraMix\Market;

use AstraMix\Core\ValidationException;
use Normalizer;

class Locations
{
    public const GEONAMES_ATTRIBUTION = "Location suggestions: © GeoNames (https://www.geonames.org/), licensed under CC BY 4.0. Coordinates represent locality points, not verified supplier store locations.";

    private static array $countryCache = [];
    private static ?array $manifestCache = null;

    public static function normalizeLocationText(string $value): string
    {
        $raw = mb_strtolower(trim($value), 'UTF-8');
        if (class_exists('Normalizer')) {
            $normalized = Normalizer::normalize($raw, Normalizer::FORM_D);
            if ($normalized !== false) {
                $raw = preg_replace('/\pM/u', '', $normalized);
            }
        }
        $cleaned = preg_replace('/[^\p{L}\p{N}\s-]/u', ' ', $raw);
        $cleaned = str_replace('-', ' ', $cleaned ?? '');
        return trim(preg_replace('/\s+/u', ' ', $cleaned ?? '') ?? '');
    }

    public static function getLocationsDir(): string
    {
        $env = getenv('ASTRAMIX_LOCATIONS_DIR');
        if ($env && is_dir($env)) {
            return $env;
        }
        $local = dirname(__DIR__, 2) . '/data/locations';
        if (is_dir($local)) {
            return $local;
        }
        return dirname(__DIR__, 3) . '/data/research_pack_50/astramix_market_fix/locations';
    }

    public static function getManifestPath(): string
    {
        $local = dirname(__DIR__, 2) . '/data/market/country_discovery_manifest.json';
        if (file_exists($local)) {
            return $local;
        }
        return dirname(__DIR__, 3) . '/data/research_pack_50/astramix_market_fix/country_discovery_manifest.json';
    }

    public static function loadCountryRecords(string $countryCode): array
    {
        $code = strtoupper(trim($countryCode));
        if (strlen($code) !== 2 || !ctype_alpha($code)) {
            throw new ValidationException("country_code must be an ISO 3166-1 alpha-2 code");
        }

        if (isset(self::$countryCache[$code])) {
            return self::$countryCache[$code];
        }

        $dir = self::getLocationsDir();
        $file = $dir . '/' . $code . '.json';
        if (!file_exists($file)) {
            throw new ValidationException("Unsupported country_code: $code");
        }

        $content = file_get_contents($file);
        if ($content === false) {
            throw new ValidationException("Failed to read location data for $code");
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            return [];
        }

        $records = isset($data['records']) ? $data['records'] : $data;
        self::$countryCache[$code] = $records;
        return $records;
    }

    public static function loadManifest(): array
    {
        if (self::$manifestCache !== null) {
            return self::$manifestCache;
        }

        $path = self::getManifestPath();
        if (!file_exists($path)) {
            return [];
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return [];
        }

        $data = json_decode($content, true);
        $map = [];
        if (isset($data['countries']) && is_array($data['countries'])) {
            foreach ($data['countries'] as $c) {
                if (isset($c['country_code'])) {
                    $map[strtoupper($c['country_code'])] = $c;
                }
            }
        }

        self::$manifestCache = $map;
        return $map;
    }

    public static function formatSuggestion(array $rec): array
    {
        $name = $rec['name'] ?? $rec['ascii_name'] ?? '';
        $admin1 = $rec['admin1_code'] ?? null;
        $admin1Name = $rec['admin1_name'] ?? null;
        $cc = $rec['country_code'] ?? '';

        if ($admin1Name && strtolower($admin1Name) !== strtolower($name)) {
            $displayLabel = "$name, $admin1Name, $cc";
        } elseif ($admin1 && !is_numeric($admin1)) {
            $displayLabel = "$name, $admin1, $cc";
        } else {
            $displayLabel = "$name, $cc";
        }

        return [
            "id" => $rec['id'] ?? null,
            "geoname_id" => $rec['geoname_id'] ?? null,
            "name" => $name,
            "ascii_name" => $rec['ascii_name'] ?? $name,
            "country_code" => $cc,
            "admin1_code" => $admin1,
            "admin1_name" => $admin1Name,
            "latitude" => isset($rec['latitude']) ? (float)$rec['latitude'] : null,
            "longitude" => isset($rec['longitude']) ? (float)$rec['longitude'] : null,
            "population" => isset($rec['population']) ? (int)$rec['population'] : 0,
            "feature_code" => $rec['feature_code'] ?? null,
            "timezone" => $rec['timezone'] ?? null,
            "display_label" => $displayLabel,
        ];
    }

    public static function suggestLocations(string $countryCode, string $query = "", int $limit = 8): array
    {
        if ($limit < 1 || $limit > 20) {
            throw new ValidationException("limit must be between 1 and 20");
        }

        $qStr = trim($query);
        if (strlen($qStr) > 120) {
            throw new ValidationException("query is too long (maximum 120 characters)");
        }

        $records = self::loadCountryRecords($countryCode);

        $qNorm = self::normalizeLocationText($qStr);
        $qRaw = mb_strtolower($qStr, 'UTF-8');

        if ($qNorm === "" && $qRaw === "") {
            usort($records, function ($a, $b) {
                $popA = (int)($a['population'] ?? 0);
                $popB = (int)($b['population'] ?? 0);
                if ($popA !== $popB) {
                    return $popB <=> $popA;
                }
                return strcmp($a['name'] ?? '', $b['name'] ?? '');
            });

            $top = array_slice($records, 0, $limit);
            return array_map([self::class, 'formatSuggestion'], $top);
        }

        $scored = [];
        foreach ($records as $rec) {
            $name = $rec['name'] ?? '';
            $asciiName = $rec['ascii_name'] ?? '';
            $aliases = (array)($rec['aliases'] ?? []);
            $normTerms = (array)($rec['search_terms'] ?? []);

            $rawCandidates = [mb_strtolower($name, 'UTF-8'), mb_strtolower($asciiName, 'UTF-8')];
            foreach ($aliases as $a) {
                $rawCandidates[] = mb_strtolower((string)$a, 'UTF-8');
            }

            $normCandidates = [
                self::normalizeLocationText($name),
                self::normalizeLocationText($asciiName),
            ];
            foreach ($normTerms as $t) {
                $normCandidates[] = (string)$t;
            }

            $rank = null;
            if (in_array($qRaw, array_slice($rawCandidates, 0, 2), true) || ($qNorm !== '' && in_array($qNorm, array_slice($normCandidates, 0, 2), true))) {
                $rank = 0;
            } elseif (in_array($qRaw, $rawCandidates, true) || ($qNorm !== '' && in_array($qNorm, $normCandidates, true))) {
                $rank = 1;
            } else {
                $prefixPrimary = false;
                if ($qRaw !== '') {
                    foreach (array_slice($rawCandidates, 0, 2) as $c) {
                        if (str_starts_with($c, $qRaw)) { $prefixPrimary = true; break; }
                    }
                }
                if (!$prefixPrimary && $qNorm !== '') {
                    foreach (array_slice($normCandidates, 0, 2) as $c) {
                        if (str_starts_with($c, $qNorm)) { $prefixPrimary = true; break; }
                    }
                }
                if ($prefixPrimary) {
                    $rank = 2;
                } else {
                    $prefixAny = false;
                    if ($qRaw !== '') {
                        foreach ($rawCandidates as $c) {
                            if (str_starts_with($c, $qRaw)) { $prefixAny = true; break; }
                        }
                    }
                    if (!$prefixAny && $qNorm !== '') {
                        foreach ($normCandidates as $c) {
                            if (str_starts_with($c, $qNorm)) { $prefixAny = true; break; }
                        }
                    }
                    if ($prefixAny) {
                        $rank = 3;
                    } elseif ($qNorm !== '' && strlen($qNorm) >= 3) {
                        foreach ($normCandidates as $c) {
                            if (str_contains(" $c", " $qNorm")) {
                                $rank = 4;
                                break;
                            }
                        }
                    }
                }
            }

            if ($rank !== null) {
                $pop = (int)($rec['population'] ?? 0);
                $scored[] = [
                    'rank' => $rank,
                    'pop' => -$pop,
                    'name' => $name,
                    'rec' => $rec,
                ];
            }
        }

        usort($scored, function ($a, $b) {
            if ($a['rank'] !== $b['rank']) {
                return $a['rank'] <=> $b['rank'];
            }
            if ($a['pop'] !== $b['pop']) {
                return $a['pop'] <=> $b['pop'];
            }
            return strcmp($a['name'], $b['name']);
        });

        $top = array_slice($scored, 0, $limit);
        return array_map(function ($item) {
            return self::formatSuggestion($item['rec']);
        }, $top);
    }

    public static function getCountryLocationSuggestionPayload(
        string $countryCode,
        string $query = "",
        int $limit = 8
    ): array {
        $code = strtoupper(trim($countryCode));
        $suggestions = self::suggestLocations($code, $query, $limit);

        $manifest = self::loadManifest();
        $meta = $manifest[$code] ?? [];

        return [
            "country_code" => $code,
            "country_name" => $meta['country_name'] ?? $code,
            "currency" => $meta['currency'] ?? null,
            "market_refresh_status" => $meta['market_refresh_status'] ?? "locality_and_prior_lead_fallback_not_part_of_50_market_refresh",
            "query" => $query,
            "limit" => $limit,
            "count" => count($suggestions),
            "suggestions" => $suggestions,
            "attribution" => self::GEONAMES_ATTRIBUTION,
        ];
    }
}
