<?php
declare(strict_types=1);

namespace AstraMix\Market;

class DataQualityValidator
{
    public const STATUS_PUBLISHED_SNAPSHOT = 'published_price_snapshot';
    public const STATUS_QUOTE_REQUIRED = 'supplier_quotation_required';
    public const STATUS_NEEDS_REVALIDATION = 'price_needs_revalidation';
    public const STATUS_CONFLICTING_SOURCES = 'conflicting_source_prices';
    public const STATUS_UNVERIFIED_SUPPLIER = 'supplier_information_unverified';

    public const VALID_STATUSES = [
        self::STATUS_PUBLISHED_SNAPSHOT,
        self::STATUS_QUOTE_REQUIRED,
        self::STATUS_NEEDS_REVALIDATION,
        self::STATUS_CONFLICTING_SOURCES,
        self::STATUS_UNVERIFIED_SUPPLIER,
    ];

    /**
     * Regional price bounds per kg (mass) or per m3 (volume).
     * [min_per_unit, max_per_unit]
     */
    public const PLAUSIBILITY_BOUNDS = [
        'cement' => [
            'AMD' => ['min' => 30.0, 'max' => 160.0],    // 1500 - 8000 AMD per 50kg bag
            'EUR' => ['min' => 0.05, 'max' => 0.60],     // €1.25 - €15 per 25kg bag
            'USD' => ['min' => 0.04, 'max' => 0.70],     // $2 - $35 per 50kg bag
            'XAF' => ['min' => 40.0, 'max' => 300.0],    // 2000 - 15000 XAF per 50kg bag
            'XOF' => ['min' => 40.0, 'max' => 300.0],
            'GHS' => ['min' => 0.5, 'max' => 6.0],
            'NGN' => ['min' => 50.0, 'max' => 400.0],
            'PKR' => ['min' => 10.0, 'max' => 60.0],
            'INR' => ['min' => 4.0, 'max' => 25.0],
        ],
        'ready_mix' => [
            'AMD' => ['min' => 15000.0, 'max' => 80000.0], // per m3
            'EUR' => ['min' => 45.0, 'max' => 350.0],
            'USD' => ['min' => 50.0, 'max' => 400.0],
            'XAF' => ['min' => 40000.0, 'max' => 250000.0],
            'GBP' => ['min' => 40.0, 'max' => 300.0],
            'CAD' => ['min' => 60.0, 'max' => 450.0],
            'AUD' => ['min' => 70.0, 'max' => 500.0],
        ],
        'aggregates' => [
            'AMD' => ['min' => 2.0, 'max' => 50.0],       // per kg
            'EUR' => ['min' => 0.005, 'max' => 0.20],
            'USD' => ['min' => 0.005, 'max' => 0.20],
        ],
        'sand' => [
            'AMD' => ['min' => 2.0, 'max' => 50.0],       // per kg
            'EUR' => ['min' => 0.005, 'max' => 0.20],
            'USD' => ['min' => 0.005, 'max' => 0.20],
        ],
    ];

    /**
     * Check if an entity is a development, test, fixture, or mock record.
     */
    public static function isTestEntity(?string $id, ?string $name, ?string $origin = null): bool
    {
        $checkString = strtolower(($id ?? '') . ' ' . ($name ?? '') . ' ' . ($origin ?? ''));
        $testPatterns = [
            'test_supplier',
            'test supplier',
            'mock_',
            'mock supplier',
            'fixture_',
            'dummy_',
            'sample_supplier',
            'sample supplier',
        ];

        foreach ($testPatterns as $p) {
            if (str_contains($checkString, $p)) {
                return true;
            }
        }

        if (in_array(strtolower($origin ?? ''), ['test', 'dev', 'fixture', 'mock'], true)) {
            return true;
        }

        return false;
    }

    /**
     * Validate an offer's pricing plausibility and data integrity.
     */
    public static function validatePriceSnapshot(array $snapshot, string $countryCode, string $countryCurrency): array
    {
        $issues = [];
        $isQuarantined = false;
        $isSuspicious = false;
        $status = self::STATUS_PUBLISHED_SNAPSHOT;
        $warning = null;

        $pId = $snapshot['price_id'] ?? '';
        $sId = $snapshot['supplier_id'] ?? '';
        $pName = $snapshot['product_name'] ?? '';
        $cat = strtolower($snapshot['category'] ?? $snapshot['product_category'] ?? '');
        $unit = $snapshot['unit'] ?? $snapshot['original_unit'] ?? null;
        $curr = strtoupper($snapshot['currency'] ?? $snapshot['original_currency'] ?? 'USD');
        $amt = isset($snapshot['amount_numeric']) ? (float)$snapshot['amount_numeric'] : null;
        $packKg = isset($snapshot['pack_mass_kg']) && is_numeric($snapshot['pack_mass_kg']) ? (float)$snapshot['pack_mass_kg'] : null;
        $rawStatus = strtolower($snapshot['price_status'] ?? '');
        $dataOrigin = $snapshot['data_origin'] ?? '';

        // 1. Detect test / fixture records
        if (self::isTestEntity($sId, $pName, $dataOrigin) || self::isTestEntity($pId, null, null)) {
            $issues[] = 'test_fixture_detected';
            $isQuarantined = true;
            $status = self::STATUS_UNVERIFIED_SUPPLIER;
            $warning = 'Test or fixture entity detected; quarantined from public marketplace.';
            return [
                'is_valid' => false,
                'is_suspicious' => true,
                'is_quarantined' => true,
                'status' => $status,
                'issues' => $issues,
                'warning' => $warning,
            ];
        }

        // 2. Check for documented conflicting source prices
        if ($rawStatus === 'conflicting_source_prices' || str_contains(strtolower($snapshot['notes'] ?? ''), 'conflicting') || str_contains(strtolower($snapshot['notes'] ?? ''), 'discrepancy')) {
            $issues[] = 'conflicting_source_prices';
            $status = self::STATUS_CONFLICTING_SOURCES;
            $warning = 'Conflicting prices observed between supplier catalog and product pages. Direct merchant quote required.';
        }

        // 3. Currency alignment with country
        $countryCurrency = strtoupper($countryCurrency);
        if ($curr !== $countryCurrency) {
            $issues[] = 'currency_mismatch';
            $isSuspicious = true;
            if ($warning === null) {
                $warning = "Quoted currency ($curr) differs from local market currency ($countryCurrency). Confirm applicable exchange rate.";
            }
        }

        // 4. Plausibility bounds check
        if ($amt !== null && $amt > 0) {
            $normPricePerKgOrM3 = null;

            if ($cat === 'ready_mix' && ($unit === 'm3' || $unit === 'cy' || $unit === null)) {
                $mult = ($unit === 'cy') ? 1.30795 : 1.0;
                $normPricePerKgOrM3 = $amt * $mult;
            } elseif ($packKg !== null && $packKg > 0) {
                $normPricePerKgOrM3 = $amt / $packKg;
            } elseif ($unit === 'tonne') {
                $normPricePerKgOrM3 = $amt / 1000.0;
            } elseif ($unit === 'kg') {
                $normPricePerKgOrM3 = $amt;
            }

            if ($normPricePerKgOrM3 !== null && isset(self::PLAUSIBILITY_BOUNDS[$cat][$curr])) {
                $bounds = self::PLAUSIBILITY_BOUNDS[$cat][$curr];
                if ($normPricePerKgOrM3 < $bounds['min']) {
                    $issues[] = 'unrealistically_low_price';
                    $isSuspicious = true;
                    $status = self::STATUS_NEEDS_REVALIDATION;
                    $warning = sprintf(
                        "Quoted price (%.2f %s) is unrealistically low for %s in %s (below expected market baseline %.2f %s). Merchant revalidation required.",
                        $amt, $curr, $cat, $countryCode, $bounds['min'], $curr
                    );
                } elseif ($normPricePerKgOrM3 > $bounds['max']) {
                    $issues[] = 'unrealistically_high_price';
                    $isSuspicious = true;
                    $status = self::STATUS_NEEDS_REVALIDATION;
                    $warning = sprintf(
                        "Quoted price (%.2f %s) is unusually high for %s in %s. Merchant quote revalidation required.",
                        $amt, $curr, $cat, $countryCode
                    );
                }
            }
        }

        // 5. Unit completeness check
        if ($unit === null || trim($unit) === '') {
            $issues[] = 'missing_pricing_unit';
            $status = self::STATUS_QUOTE_REQUIRED;
            if ($warning === null) {
                $warning = "Pricing unit is unspecified on the source record; merchant quote required.";
            }
        } elseif (in_array(strtolower($unit), ['item', 'kit', 'piece', 'unit', 'unspecified'], true)) {
            $issues[] = 'discrete_ambiguous_unit';
            $status = self::STATUS_QUOTE_REQUIRED;
            if ($warning === null) {
                $warning = "Pricing unit ('$unit') is ambiguous for concrete engineering calculations. Merchant quote required.";
            }
        }

        return [
            'is_valid' => empty($issues),
            'is_suspicious' => $isSuspicious,
            'is_quarantined' => $isQuarantined,
            'status' => $status,
            'issues' => $issues,
            'warning' => $warning,
        ];
    }
}
