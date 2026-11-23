<?php
declare(strict_types=1);

namespace AstraMix\Domain;

use AstraMix\Core\ValidationException;

class InputSchema
{
    public const SCHEMA_VERSION = "1.0.0";

    public const CANONICAL_FEATURE_ORDER = [
        "cement",
        "blast_furnace_slag",
        "fly_ash",
        "water",
        "superplasticizer",
        "coarse_aggregate",
        "fine_aggregate",
        "age",
    ];

    public const MATERIAL_FEATURE_ORDER = [
        "cement",
        "blast_furnace_slag",
        "fly_ash",
        "water",
        "superplasticizer",
        "coarse_aggregate",
        "fine_aggregate",
    ];

    public const ACTIVE_FEATURE_BOUNDS = [
        "cement" => [
            "name" => "cement",
            "label" => "Cement",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 102.0,
            "max" => 540.0,
            "step_default" => 1.0,
            "default_value" => 350.0,
        ],
        "blast_furnace_slag" => [
            "name" => "blast_furnace_slag",
            "label" => "Blast furnace slag",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 0.0,
            "max" => 359.4,
            "step_default" => 1.0,
            "default_value" => 0.0,
        ],
        "fly_ash" => [
            "name" => "fly_ash",
            "label" => "Fly ash",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 0.0,
            "max" => 200.1,
            "step_default" => 1.0,
            "default_value" => 0.0,
        ],
        "water" => [
            "name" => "water",
            "label" => "Mixing water",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 121.75,
            "max" => 247.0,
            "step_default" => 0.5,
            "default_value" => 175.0,
        ],
        "superplasticizer" => [
            "name" => "superplasticizer",
            "label" => "Superplasticizer",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 0.0,
            "max" => 32.2,
            "step_default" => 0.1,
            "default_value" => 2.5,
        ],
        "coarse_aggregate" => [
            "name" => "coarse_aggregate",
            "label" => "Coarse aggregate",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 801.0,
            "max" => 1145.0,
            "step_default" => 5.0,
            "default_value" => 1040.0,
        ],
        "fine_aggregate" => [
            "name" => "fine_aggregate",
            "label" => "Fine aggregate",
            "unit" => "kg/m³",
            "type" => "float",
            "required" => true,
            "min" => 594.0,
            "max" => 992.6,
            "step_default" => 5.0,
            "default_value" => 760.0,
        ],
        "age" => [
            "name" => "age",
            "label" => "Curing age",
            "unit" => "days",
            "type" => "integer",
            "required" => true,
            "min" => 1.0,
            "max" => 365.0,
            "step_default" => 1.0,
            "default_value" => 28,
        ],
    ];

    public static function parseStrictFiniteFloat(mixed $value, string $fieldName, string $label): float
    {
        if ($value === null) {
            throw new ValidationException("$label ($fieldName) is required.", [
                ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) is required."]
            ]);
        }
        if (is_bool($value)) {
            throw new ValidationException("$label ($fieldName) must be a valid finite number, not a boolean.", [
                ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a valid finite number, not a boolean."]
            ]);
        }
        if (is_string($value)) {
            $stripped = trim($value);
            if ($stripped === "") {
                throw new ValidationException("$label ($fieldName) is required.", [
                    ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) is required."]
                ]);
            }
            $lowered = strtolower($stripped);
            if (in_array($lowered, ["nan", "inf", "+inf", "-inf", "infinity", "+infinity", "-infinity"])) {
                throw new ValidationException("$label ($fieldName) must be a finite number (NaN/Infinity not allowed).", [
                    ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a finite number (NaN/Infinity not allowed)."]
                ]);
            }
            if (!is_numeric($stripped)) {
                throw new ValidationException("$label ($fieldName) must be a valid finite number.", [
                    ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a valid finite number."]
                ]);
            }
            $num = (float)$stripped;
        } elseif (is_int($value) || is_float($value)) {
            $num = (float)$value;
        } else {
            throw new ValidationException("$label ($fieldName) must be a valid finite number.", [
                ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a valid finite number."]
            ]);
        }

        if (!is_finite($num)) {
            throw new ValidationException("$label ($fieldName) must be a finite number (NaN/Infinity not allowed).", [
                ["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a finite number (NaN/Infinity not allowed)."]
            ]);
        }
        return $num;
    }

    public static function parseStrictIntegerAge(mixed $value, string $fieldName = "age", string $label = "Curing age"): int
    {
        $num = self::parseStrictFiniteFloat($value, $fieldName, $label);
        if (floor($num) != $num) {
            throw new ValidationException(
                "$label ($fieldName) must be a whole integer number of days (received fractional value $value).",
                [["loc" => ["body", $fieldName], "msg" => "$label ($fieldName) must be a whole integer number of days."]]
            );
        }
        return (int)$num;
    }

    public static function computeWaterCementRatio(float $water, float $cement): float
    {
        if ($cement <= 0.0) {
            throw new ValidationException("Cement content must be strictly positive (cement > 0) to compute water/cement ratio.");
        }
        return $water / $cement;
    }

    public static function computeWaterBinderRatio(float $water, float $cement, float $slag = 0.0, float $flyAsh = 0.0): float
    {
        $binder = $cement + $slag + $flyAsh;
        if ($binder <= 0.0) {
            throw new ValidationException("Total binder content (cement + slag + fly_ash) must be strictly positive to compute water/binder ratio.");
        }
        return $water / $binder;
    }

    public static function loadVersionedInputSchema(): array
    {
        $schemaPath = dirname(__DIR__, 2) . '/data/models/input_schema_v1.json';
        if (file_exists($schemaPath)) {
            $content = file_get_contents($schemaPath);
            if ($content !== false) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        return [
            "schema_version" => self::SCHEMA_VERSION,
            "model_version" => "unversioned",
            "best_model_name" => null,
            "canonical_feature_order" => self::CANONICAL_FEATURE_ORDER,
            "features" => self::ACTIVE_FEATURE_BOUNDS,
        ];
    }
}
