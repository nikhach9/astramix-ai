<?php
declare(strict_types=1);

namespace AstraMix\ML;

use RuntimeException;

class TreeEnsemble
{
    private float $baseScore;
    private array $trees = [];
    private static array $instances = [];
    private array $coefficients = [];
    private bool $lessOrEqual = false;
    private bool $float32 = true;

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

        if (($data['format'] ?? null) === 'astramix-regression-v1') {
            $this->baseScore = (float)$data['base_score'];
            $this->trees = $data['trees'];
            $this->coefficients = $data['coefficients'] ?? [];
            $this->lessOrEqual = true;
            $this->float32 = ($data['input_dtype'] ?? 'float32') === 'float32';
            return;
        }
        $learner = $data['learner'] ?? [];
        $baseScoreRaw = $learner['learner_model_param']['base_score'] ?? throw new RuntimeException('Model base score is missing.');
        $this->baseScore = (float)$baseScoreRaw;

        $rawTrees = $learner['gradient_booster']['model']['trees'] ?? [];
        foreach ($rawTrees as $t) {
            $this->trees[] = [
                'left_children' => $t['left_children'],
                'right_children' => $t['right_children'],
                'split_indices' => $t['split_indices'],
                'split_conditions' => array_map(static fn($v) => unpack('f', pack('f', (float)$v))[1], $t['split_conditions']),
                'base_weights' => $t['base_weights'],
                'default_left' => $t['default_left'] ?? [],
            ];
        }
    }

    public static function getInstance(?string $modelJsonPath = null): self
    {
        $expectedHash = null;
        if ($modelJsonPath === null) {
            $root = dirname(__DIR__, 2) . '/data/models/';
            $manifest = json_decode(file_get_contents($root . 'active_model.json'), true, 512, JSON_THROW_ON_ERROR);
            $modelJsonPath = $root . $manifest['model_file'];
            $metadata = \AstraMix\Domain\Trust::modelMetadata();
            $expectedHash = $metadata['portable_model_sha256'];
        }
        $key = $modelJsonPath . ':' . filemtime($modelJsonPath) . ':' . filesize($modelJsonPath) . ':' . $expectedHash;
        if (!isset(self::$instances[$key])) {
            if ($expectedHash !== null && hash_file('sha256', $modelJsonPath) !== $expectedHash) {
                throw new RuntimeException('Model file does not match its validation metadata.');
            }
            self::$instances[$key] = new self($modelJsonPath);
        }
        return self::$instances[$key];
    }

    /**
     * Predict continuous output from an ordered 8-element feature array:
     * [cement, blast_furnace_slag, fly_ash, water, superplasticizer, coarse_aggregate, fine_aggregate, age]
     */
    public function predict(array $featureVector): float
    {
        if (count($featureVector) !== 8) {
            throw new RuntimeException('The model expects eight ordered features.');
        }
        if ($this->float32) {
            $featureVector = array_map(static fn($v) => unpack('f', pack('f', (float)$v))[1], $featureVector);
        }
        $sum = $this->baseScore;
        foreach ($this->coefficients as $i => $coefficient) {
            $sum += $coefficient * $featureVector[$i];
        }
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
                if ($this->lessOrEqual ? $featVal <= $threshold : $featVal < $threshold) {
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
