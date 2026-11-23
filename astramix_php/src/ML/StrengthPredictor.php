<?php
declare(strict_types=1);

namespace AstraMix\ML;

use AstraMix\Domain\InputSchema;
use AstraMix\Domain\Trust;

class StrengthPredictor
{
    private TreeEnsemble $ensemble;

    public function __construct(?TreeEnsemble $ensemble = null)
    {
        $this->ensemble = $ensemble ?? TreeEnsemble::getInstance();
    }

    public function normalizeMix(array $rawMix): array
    {
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
            $norm[$mappedKey] = $v;
        }

        $result = [];
        foreach (InputSchema::CANONICAL_FEATURE_ORDER as $feat) {
            $val = $norm[$feat] ?? null;
            if ($feat === 'age') {
                $result['age'] = InputSchema::parseStrictIntegerAge($val ?? 28, 'age', 'Curing age');
            } else {
                $label = InputSchema::ACTIVE_FEATURE_BOUNDS[$feat]['label'] ?? $feat;
                $default = InputSchema::ACTIVE_FEATURE_BOUNDS[$feat]['default_value'] ?? 0.0;
                $result[$feat] = InputSchema::parseStrictFiniteFloat($val ?? $default, $feat, $label);
            }
        }

        return $result;
    }

    public function predict(array $rawMix): array
    {
        $mix = $this->normalizeMix($rawMix);

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
            "model_version" => "v0.1",
            "features_used" => InputSchema::CANONICAL_FEATURE_ORDER,
            "raw_prediction" => $rawPred,
            "normalized_mix" => $mix,
        ];
    }
}
