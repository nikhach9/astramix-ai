<?php
declare(strict_types=1);

namespace AstraMix\Sustainability;

use AstraMix\Core\ValidationException;
use AstraMix\Domain\InputSchema;

class CarbonEstimator
{
    public const DEFAULT_CO2_FACTORS = [
        "cement" => 0.90,
        "fly_ash" => 0.01,
        "blast_furnace_slag" => 0.07,
        "water" => 0.0003,
        "coarse_aggregate" => 0.005,
        "fine_aggregate" => 0.005,
        "superplasticizer" => 0.70,
    ];

    public static function estimate(array $materialQuantities, ?array $customFactors = null, bool $strictCustom = false): array
    {
        $factors = self::DEFAULT_CO2_FACTORS;
        if ($customFactors !== null) {
            foreach ($customFactors as $k => $v) {
                if ($v !== null && isset($factors[$k])) {
                    if (is_numeric($v)) {
                        $factors[$k] = (float)$v;
                    } elseif ($strictCustom) {
                        throw new ValidationException("Invalid emission factor for '$k'");
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
            $factor = $factors[$mat] ?? 0.0;
            $emissions = $qty * $factor;
            $breakdown[$mat] = $emissions;
            $total += $emissions;
        }

        return [
            "total" => $total,
            "total_co2_kg_per_m3" => round($total, 3),
            "breakdown" => $breakdown,
            "unit" => "kg_co2e_per_m3",
            "factors_used" => $factors,
            "provenance" => [
                "dataset" => "ICE_V3_CRADLE_TO_GATE_A1_A3",
                "scope" => "A1-A3 embodied cradle-to-gate carbon",
            ],
        ];
    }
}
