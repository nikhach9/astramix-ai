<?php
declare(strict_types=1);

namespace AstraMix\ML;

use AstraMix\Domain\InputSchema;
use AstraMix\Domain\Trust;
use AstraMix\Core\ValidationException;

class StrengthPredictor
{
    private TreeEnsemble $ensemble;

    public function __construct(?TreeEnsemble $ensemble = null)
    {
        $this->ensemble = $ensemble ?? TreeEnsemble::getInstance();
    }

    public function normalizeMix(mixed $rawMix, bool $validateRatios = true): array
    {
        if (!is_array($rawMix)) {
            throw new ValidationException('Mix must be an object containing all eight inputs.');
        }
        $norm = [];
        $keyMap = [
            'ageDays' => 'age',
            'blastFurnaceSlag' => 'blast_furnace_slag',
            'flyAsh' => 'fly_ash',
            'superPlasticizer' => 'superplasticizer',
            'coarseAggregate' => 'coarse_aggregate',
            'fineAggregate' => 'fine_aggregate',
        ];

        foreach ($rawMix as $k => $v) {
            $mappedKey = $keyMap[$k] ?? $k;
            if (!in_array($mappedKey, InputSchema::CANONICAL_FEATURE_ORDER, true)) {
                throw new ValidationException("Unknown mix field: $k");
            }
            if (array_key_exists($mappedKey, $norm)) {
                throw new ValidationException("Duplicate mix field: $mappedKey");
            }
            $norm[$mappedKey] = $v;
        }

        $result = [];
        foreach (InputSchema::CANONICAL_FEATURE_ORDER as $feat) {
            if (!array_key_exists($feat, $norm)) {
                throw new ValidationException("Missing required mix field: $feat");
            }
            $val = $norm[$feat];
            if ($feat === 'age') {
                $result['age'] = InputSchema::parseStrictIntegerAge($val, 'age', 'Curing age');
            } else {
                $label = InputSchema::ACTIVE_FEATURE_BOUNDS[$feat]['label'] ?? $feat;
                $result[$feat] = InputSchema::parseStrictFiniteFloat($val, $feat, $label);
            }
        }

        foreach ($result as $key => $value) {
            $bounds = InputSchema::ACTIVE_FEATURE_BOUNDS[$key];
            if ($value < $bounds['min'] || $value > $bounds['max']) {
                throw new ValidationException("$key is outside the supported range [{$bounds['min']}, {$bounds['max']}].");
            }
        }
        if ($validateRatios) {
            $ratio = InputSchema::computeWaterBinderRatio($result['water'], $result['cement'], $result['blast_furnace_slag'], $result['fly_ash']);
            if ($ratio < .2 || $ratio > 1.) {
                throw new ValidationException('Water/binder ratio must be between 0.20 and 1.00.');
            }
        }
        return $result;
    }

    public function predict(mixed $rawMix, bool $validateRatios = true): array
    {
        $mix = $this->normalizeMix($rawMix, $validateRatios);

        $vector = [
            $mix['cement'],
            $mix['blast_furnace_slag'],
            $mix['fly_ash'],
            $mix['water'],
            $mix['superplasticizer'],
            $mix['coarse_aggregate'],
            $mix['fine_aggregate'],
            (float)$mix['age'],
        ];

        $rawPred = $this->ensemble->predict($vector);
        $predictedMpa = max(0.0, $rawPred);

        $wc = InputSchema::computeWaterCementRatio($mix['water'], $mix['cement']);
        $wb = InputSchema::computeWaterBinderRatio(
            $mix['water'],
            $mix['cement'],
            $mix['blast_furnace_slag'],
            $mix['fly_ash']
        );

        $trustInfo = Trust::buildPredictionWarnings($mix);

        return [
            "predicted_strength_mpa" => round($predictedMpa, 2),
            "water_cement_ratio" => round($wc, 4),
            "water_binder_ratio" => round($wb, 4),
            "is_out_of_distribution" => $trustInfo["is_out_of_distribution"],
            "warnings" => $trustInfo["warnings"],
            "estimated_error_rmse_mpa" => $trustInfo["estimated_error_rmse_mpa"],
            "estimated_error_mae_mpa" => $trustInfo["estimated_error_mae_mpa"],
            "confidence_note" => $trustInfo["confidence_note"],
            "model_version" => Trust::modelMetadata()["model_version"],
            "model_name" => Trust::modelMetadata()["best_model_name"],
            "model_sha256" => Trust::modelMetadata()["model_sha256"],
            "validation_protocol" => Trust::modelMetadata()["validation_protocol"],
            "features_used" => InputSchema::CANONICAL_FEATURE_ORDER,
            "raw_prediction" => $rawPred,
            "normalized_mix" => $mix,
        ];
    }
}
