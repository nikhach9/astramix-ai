<?php
declare(strict_types=1);

namespace AstraMix\Sustainability;

use AstraMix\Core\ValidationException;
use AstraMix\Domain\InputSchema;

class CostEstimator
{
    public const DEFAULT_COST_FACTORS = [
        "cement" => 0.12,
        "fly_ash" => 0.04,
        "blast_furnace_slag" => 0.06,
        "water" => 0.002,
        "coarse_aggregate" => 0.015,
        "fine_aggregate" => 0.020,
        "superplasticizer" => 2.50,
    ];

    public static function estimate(
        array $materialQuantities,
        ?array $customCosts = null,
        bool $strictCustom = false,
        string $currency = "USD"
    ): array {
        $costs = self::DEFAULT_COST_FACTORS;
        if ($customCosts !== null) {
            foreach ($customCosts as $k => $v) {
                if ($v !== null && isset($costs[$k])) {
                    if (is_numeric($v)) {
                        $costs[$k] = (float)$v;
                    } elseif ($strictCustom) {
                        throw new ValidationException("Invalid unit cost for '$k'");
                    }
                }
            }
        }

        $breakdown = [];
        $total = 0.0;

        foreach (InputSchema::MATERIAL_FEATURE_ORDER as $mat) {
            $qty = isset($materialQuantities[$mat]) ? (float)$materialQuantities[$mat] : 0.0;
            if ($qty < 0.0) {
                throw new ValidationException("Quantity for '$mat' cannot be negative.");
            }
            $costFactor = $costs[$mat] ?? 0.0;
            $c = $qty * $costFactor;
            $breakdown[$mat] = $c;
            $total += $c;
        }

        return [
            "total" => $total,
            "total_cost_per_m3" => round($total, 2),
            "currency" => $currency,
            "breakdown" => $breakdown,
            "unit" => "currency_per_m3",
            "unit_costs_used" => $costs,
            "provenance" => [
                "price_source" => "ASTRAMIX_ENGINEERING_REF_V1",
                "notes" => "Engineering benchmark baseline prices",
            ],
        ];
    }
}
