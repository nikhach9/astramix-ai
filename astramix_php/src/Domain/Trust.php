<?php
declare(strict_types=1);

namespace AstraMix\Domain;

class Trust
{
    public const CONFIDENCE_DISCLAIMER = 'Aggregate validation error, not a per-mix prediction interval. Range checks do not establish joint distribution coverage.';

    public static function modelMetadata(): array
    {
        $root = dirname(__DIR__, 2) . '/data/models/';
        $manifest = json_decode(file_get_contents($root . 'active_model.json'), true, 512, JSON_THROW_ON_ERROR);
        return json_decode(file_get_contents($root . $manifest['metadata_file']), true, 512, JSON_THROW_ON_ERROR);
    }

    public static function loadTrainingEnvelope(?string $path = null): array
    {
        return $path === null ? self::modelMetadata()['training_bounds'] : json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }

    public static function checkTrainingEnvelope(array $mix, ?array $envelope = null): array
    {
        $warnings = [];
        foreach ($envelope ?? self::loadTrainingEnvelope() as $key => $bounds) {
            if (isset($mix[$key]) && ($mix[$key] < $bounds['min'] || $mix[$key] > $bounds['max'])) {
                $warnings[] = "Input value for $key={$mix[$key]} is outside the training range [{$bounds['min']}, {$bounds['max']}]. Prediction may be less reliable.";
            }
        }
        return $warnings;
    }

    public static function checkSplitComparisonNotes(array $mix): array
    {
        return self::checkTrainingEnvelope($mix);
    }

    public static function buildPredictionWarnings(array $mix): array
    {
        $warnings = self::checkTrainingEnvelope($mix);
        $metrics = self::modelMetadata()['validation_metrics'];
        return ['warnings' => $warnings, 'is_out_of_distribution' => count($warnings) > 0,
            'range_check_only' => true, 'estimated_error_rmse_mpa' => $metrics['rmse'],
            'estimated_error_mae_mpa' => $metrics['mae'], 'confidence_note' => self::CONFIDENCE_DISCLAIMER];
    }
}
