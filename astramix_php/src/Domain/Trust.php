<?php
declare(strict_types=1);

namespace AstraMix\Domain;

class Trust
{
    public const RMSE_METRIC = 4.62;
    public const MAE_METRIC = 3.03;
    public const CONFIDENCE_DISCLAIMER = "Approximate error estimate based on held-out validation metrics; not a certified confidence interval.";

    private static ?array $cachedEnvelope = null;

    public static function loadTrainingEnvelope(?string $path = null): array
    {
        if (self::$cachedEnvelope !== null && $path === null) {
            return self::$cachedEnvelope;
        }

        $envelopePath = $path ?? (dirname(__DIR__, 2) . '/data/models/training_envelope_v0_1.json');
        if (file_exists($envelopePath)) {
            $content = file_get_contents($envelopePath);
            if ($content !== false) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    if ($path === null) {
                        self::$cachedEnvelope = $decoded;
                    }
                    return $decoded;
                }
            }
        }

        // Safe fallback matching processed dataset
        $fallback = [
            "cement" => ["min" => 102.0, "max" => 540.0],
            "blast_furnace_slag" => ["min" => 0.0, "max" => 359.4],
            "fly_ash" => ["min" => 0.0, "max" => 200.1],
            "water" => ["min" => 121.75, "max" => 247.0],
            "superplasticizer" => ["min" => 0.0, "max" => 32.2],
            "coarse_aggregate" => ["min" => 801.0, "max" => 1145.0],
            "fine_aggregate" => ["min" => 594.0, "max" => 992.6],
            "age" => ["min" => 1.0, "max" => 365.0],
        ];
        if ($path === null) {
            self::$cachedEnvelope = $fallback;
        }
        return $fallback;
    }

    public static function checkTrainingEnvelope(array $mix, ?array $envelope = null): array
    {
        $envelope = $envelope ?? self::loadTrainingEnvelope();
        $warnings = [];

        $normalized = $mix;
        if (isset($normalized["ageDays"]) && !isset($normalized["age"])) {
            $normalized["age"] = $normalized["ageDays"];
        }

        foreach ($envelope as $feature => $bounds) {
            if (isset($normalized[$feature])) {
                $val = (float)$normalized[$feature];
                $minVal = (float)$bounds["min"];
                $maxVal = (float)$bounds["max"];
                if ($val < $minVal || $val > $maxVal) {
                    $warnings[] = "Input value for {$feature}={$val} is outside the training range [{$minVal}, {$maxVal}]. Prediction may be less reliable.";
                }
            }
        }

        return $warnings;
    }

    public static function checkSplitComparisonNotes(array $mix): array
    {
        $notes = [];
        $schema = InputSchema::loadVersionedInputSchema();
        $features = $schema["features"] ?? InputSchema::ACTIVE_FEATURE_BOUNDS;

        foreach ($features as $fieldName => $spec) {
            if (!isset($mix[$fieldName])) {
                continue;
            }
            $val = (float)$mix[$fieldName];
            $trainBounds = $spec["train_split_bounds"] ?? [];
            $tMin = (float)($trainBounds["min"] ?? $spec["min"]);
            $tMax = (float)($trainBounds["max"] ?? $spec["max"]);
            if ($val < $tMin || $val > $tMax) {
                $notes[] = "{$spec['label']} ({$fieldName}={$val} {$spec['unit']}) is within the 1,030-row UCI reference range [{$spec['min']}, {$spec['max']}], and at the edge of the 824-row training split [{$tMin}, {$tMax}].";
            }
        }
        return $notes;
    }

    public static function buildPredictionWarnings(array $mix): array
    {
        $envelope = self::loadTrainingEnvelope();
        $warnings = self::checkTrainingEnvelope($mix, $envelope);
        return [
            "warnings" => $warnings,
            "is_out_of_distribution" => count($warnings) > 0,
            "estimated_error_rmse_mpa" => self::RMSE_METRIC,
            "estimated_error_mae_mpa" => self::MAE_METRIC,
            "confidence_note" => self::CONFIDENCE_DISCLAIMER,
        ];
    }
}
