<?php
declare(strict_types=1);

namespace AstraMix\ML;

use RuntimeException;

class TreeEnsemble
{
    private float $baseScore;
    private array $trees = [];
    private static ?self $instance = null;

    public function __construct(string $modelJsonPath)
    {
        if (!file_exists($modelJsonPath)) {
            throw new RuntimeException("XGBoost model file not found at: $modelJsonPath");
        }

        $content = file_get_contents($modelJsonPath);
        if ($content === false) {
            throw new RuntimeException("Failed to read XGBoost model file at: $modelJsonPath");
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            throw new RuntimeException("Invalid JSON format in XGBoost model file: " . json_last_error_msg());
        }

        $learner = $data['learner'] ?? [];
        $baseScoreRaw = $learner['learner_model_param']['base_score'] ?? '35.857864';
        $this->baseScore = (float)$baseScoreRaw;

        $rawTrees = $learner['gradient_booster']['model']['trees'] ?? [];
        foreach ($rawTrees as $t) {
            $this->trees[] = [
                'left_children' => $t['left_children'],
                'right_children' => $t['right_children'],
                'split_indices' => $t['split_indices'],
                'split_conditions' => $t['split_conditions'],
                'base_weights' => $t['base_weights'],
                'default_left' => $t['default_left'] ?? [],
            ];
        }
    }

    public static function getInstance(?string $modelJsonPath = null): self
    {
        if (self::$instance === null) {
            $path = $modelJsonPath ?? (dirname(__DIR__, 2) . '/data/models/xgboost_model.json');
            self::$instance = new self($path);
        }
        return self::$instance;
    }

    /**
     * Predict continuous output from an ordered 8-element feature array:
     * [cement, blast_furnace_slag, fly_ash, water, superplasticizer, coarse_aggregate, fine_aggregate, age]
     */
    public function predict(array $featureVector): float
    {
        $sum = $this->baseScore;

        foreach ($this->trees as $tree) {
            $nodeId = 0;
            $leftChildren = $tree['left_children'];
            $rightChildren = $tree['right_children'];
            $splitIndices = $tree['split_indices'];
            $splitConditions = $tree['split_conditions'];
            $baseWeights = $tree['base_weights'];

            // While not a leaf node (in XGBoost JSON, leaf nodes have left_children[nodeId] == -1)
            while ($leftChildren[$nodeId] !== -1) {
                $featIdx = $splitIndices[$nodeId];
                $threshold = $splitConditions[$nodeId];
                $featVal = $featureVector[$featIdx];

                // XGBoost split condition: if featVal < threshold, go left; else go right
                if ($featVal < $threshold) {
                    $nodeId = $leftChildren[$nodeId];
                } else {
                    $nodeId = $rightChildren[$nodeId];
                }
            }

            $sum += $baseWeights[$nodeId];
        }

        return $sum;
    }

    public function getBaseScore(): float
    {
        return $this->baseScore;
    }

    public function getTreeCount(): int
    {
        return count($this->trees);
    }
}
