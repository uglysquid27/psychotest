<?php
// app/Services/PHPMachineLearning.php

namespace App\Services;

use Phpml\Classification\DecisionTree;
use Phpml\Regression\LeastSquares;
use Phpml\Dataset\ArrayDataset;
use Phpml\Metric\Accuracy;
use Phpml\ModelManager;
use Phpml\Preprocessing\Normalizer;
use Illuminate\Support\Facades\Log;

class PHPMachineLearning
{
    private $classifier;
    private $regressor;
    private $isTrained = false;
    private $modelPath;
    private $normalizer;

    public function __construct()
    {
        $this->modelPath = storage_path('app/ml_models/');
        $this->ensureDirectoryExists();
        $this->normalizer = new Normalizer();
    }

    public function train(array $trainingData)
    {
        try {
            // Validate and prepare data
            if (count($trainingData) < 10) {
                throw new \Exception("Insufficient training data. Need at least 10 records.");
            }

            $samples = [];
            $labels = [];
            $targets = [];

            foreach ($trainingData as $item) {
                $features = $this->prepareFeatures($item);
                $samples[] = $features;
                $labels[] = intval($item['was_assigned'] ?? 0);
                $targets[] = floatval($item['was_assigned'] ?? 0);
            }

            $this->info("Training with " . count($samples) . " samples");

            // Normalize samples to prevent singular matrix
            $this->normalizer->fit($samples);
            $normalizedSamples = $this->normalizer->transform($samples);

            // Remove any potential NaN or infinite values
            $cleanedSamples = $this->cleanSamples($normalizedSamples);

            // Train Decision Tree Classifier
            $this->classifier = new DecisionTree(
                8,       // Reduced max depth
                3,       // Reduced min samples split
                0.001    // Increased min impurity decrease
            );

            $this->classifier->train($cleanedSamples, $labels);

            // For regression, use only non-collinear features
            $regressionSamples = $this->prepareRegressionFeatures($trainingData);
            $this->normalizer->fit($regressionSamples);
            $normalizedRegSamples = $this->normalizer->transform($regressionSamples);
            $cleanedRegSamples = $this->cleanSamples($normalizedRegSamples);

            $this->regressor = new LeastSquares();
            $this->regressor->train($cleanedRegSamples, $targets);

            $this->isTrained = true;

            // Calculate accuracy
            $predictions = $this->classifier->predict($cleanedSamples);
            $accuracy = Accuracy::score($labels, $predictions);

            $this->saveModels();

            return [
                'success' => true,
                'accuracy' => $accuracy,
                'training_samples' => count($samples),
                'model_path' => $this->modelPath
            ];

        } catch (\Exception $e) {
            Log::error("PHP-ML Training failed: " . $e->getMessage());
            return [
                'success' => false, 
                'error' => $e->getMessage()
            ];
        }
    }

    private function prepareFeatures(array $item)
    {
        // Use carefully selected non-collinear features
        return [
            // Core performance features
            floatval($item['work_days_count'] ?? 0),
            floatval($item['rating_value'] ?? 3.0),
            floatval($item['test_score'] ?? 0.0),
            
            // Single section feature (combined to avoid collinearity)
            $this->combineSectionFeatures(
                floatval($item['same_subsection'] ?? 0),
                floatval($item['same_section'] ?? 0)
            ),
            
            // Workload and shift features
            floatval($item['current_workload'] ?? 0),
            floatval($item['shift_priority'] ?? 0.5)
            
            // Removed: gender, employee_type (potentially collinear or low importance)
        ];
    }

    private function prepareRegressionFeatures(array $trainingData)
    {
        $samples = [];
        foreach ($trainingData as $item) {
            // Use only clearly independent features for regression
            $samples[] = [
                floatval($item['work_days_count'] ?? 0),
                floatval($item['rating_value'] ?? 3.0),
                floatval($item['test_score'] ?? 0.0),
                floatval($item['current_workload'] ?? 0),
                floatval($item['shift_priority'] ?? 0.5)
            ];
        }
        return $samples;
    }

    private function combineSectionFeatures($sameSubsection, $sameSection)
    {
        // Combine into single feature with clear hierarchy
        if ($sameSubsection > 0) return 2.0;  // Highest priority
        if ($sameSection > 0) return 1.0;     // Medium priority
        return 0.0;                           // Lowest priority
    }

    private function cleanSamples($samples)
    {
        $cleaned = [];
        foreach ($samples as $sample) {
            $cleanSample = [];
            foreach ($sample as $value) {
                // Replace NaN and infinite values with 0
                if (is_nan($value) || is_infinite($value)) {
                    $cleanSample[] = 0.0;
                } else {
                    $cleanSample[] = $value;
                }
            }
            $cleaned[] = $cleanSample;
        }
        return $cleaned;
    }

    public function predict(array $features)
    {
        if (!$this->isTrained) {
            $this->loadModels();
        }

        if (!$this->isTrained) {
            Log::warning("ML Model not trained, using fallback scoring");
            return $this->fallbackPrediction($features);
        }

        try {
            $samples = [];
            foreach ($features as $featureSet) {
                $samples[] = $this->prepareFeatures($featureSet);
            }

            // Normalize samples for prediction
            $normalizedSamples = $this->normalizer->transform($samples);
            $cleanedSamples = $this->cleanSamples($normalizedSamples);

            // Get classifier predictions
            $rfPredictions = $this->classifier->predict($cleanedSamples);
            
            // Get regression scores
            $regressionSamples = $this->prepareRegressionFeatures([$features[0]]);
            $normalizedRegSamples = $this->normalizer->transform($regressionSamples);
            $cleanedRegSamples = $this->cleanSamples($normalizedRegSamples);
            $regScores = $this->regressor->predict($cleanedRegSamples);

            // Normalize regression scores to 0-1
            $minReg = min($regScores);
            $maxReg = max($regScores);
            $rangeReg = $maxReg - $minReg;
            
            $normalizedRegScores = [];
            foreach ($regScores as $score) {
                if ($rangeReg > 0) {
                    $normalizedRegScores[] = ($score - $minReg) / $rangeReg;
                } else {
                    $normalizedRegScores[] = 0.5;
                }
            }

            // Hybrid scoring
            $predictions = [];
            for ($i = 0; $i < count($rfPredictions); $i++) {
                $rfScore = $rfPredictions[$i] == 1 ? 0.7 : 0.3;
                $predictions[] = 0.6 * $rfScore + 0.4 * $normalizedRegScores[$i];
            }

            return $predictions;

        } catch (\Exception $e) {
            Log::error("PHP-ML Prediction failed: " . $e->getMessage());
            return $this->fallbackPrediction($features);
        }
    }

    private function fallbackPrediction($features)
    {
        $predictions = [];
        foreach ($features as $featureSet) {
            $score = 0.0;
            
            // Work days count (fewer days = higher priority)
            $workDays = $featureSet['work_days_count'] ?? 0;
            $score += max(0, 1 - ($workDays / 22)) * 0.25;
            
            // Rating value
            $rating = $featureSet['rating_value'] ?? 3.0;
            $score += ($rating / 5) * 0.2;
            
            // Test score
            $testScore = $featureSet['test_score'] ?? 0.0;
            $score += $testScore * 0.15;
            
            // Section match (combined)
            $sameSubsection = $featureSet['same_subsection'] ?? 0;
            $sameSection = $featureSet['same_section'] ?? 0;
            $sectionScore = 0.0;
            if ($sameSubsection > 0) $sectionScore = 0.15;
            elseif ($sameSection > 0) $sectionScore = 0.1;
            $score += $sectionScore;
            
            // Shift priority
            $shiftPriority = $featureSet['shift_priority'] ?? 0.5;
            $score += $shiftPriority * 0.25;
            
            $predictions[] = min(1.0, max(0.0, $score));
        }
        
        return $predictions;
    }

    private function saveModels()
    {
        try {
            $modelManager = new ModelManager();
            
            // Save classifier
            $modelManager->saveToFile($this->classifier, $this->modelPath . 'classifier.phpml');
            
            // Save regressor
            $modelManager->saveToFile($this->regressor, $this->modelPath . 'regressor.phpml');
            
            // Save normalizer
            $modelManager->saveToFile($this->normalizer, $this->modelPath . 'normalizer.phpml');
            
            // Save training status
            file_put_contents(
                $this->modelPath . 'training_status.json',
                json_encode([
                    'is_trained' => true, 
                    'updated_at' => now()->toISOString(),
                    'feature_count' => 6
                ])
            );

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to save ML models: " . $e->getMessage());
            return false;
        }
    }

    private function loadModels()
    {
        try {
            $modelManager = new ModelManager();
            
            if (file_exists($this->modelPath . 'classifier.phpml') &&
                file_exists($this->modelPath . 'regressor.phpml') &&
                file_exists($this->modelPath . 'normalizer.phpml')) {
                
                $this->classifier = $modelManager->restoreFromFile($this->modelPath . 'classifier.phpml');
                $this->regressor = $modelManager->restoreFromFile($this->modelPath . 'regressor.phpml');
                $this->normalizer = $modelManager->restoreFromFile($this->modelPath . 'normalizer.phpml');
                $this->isTrained = true;
                
                return true;
            }
            
            return false;

        } catch (\Exception $e) {
            Log::error("Failed to load ML models: " . $e->getMessage());
            return false;
        }
    }

    private function ensureDirectoryExists()
    {
        if (!is_dir($this->modelPath)) {
            mkdir($this->modelPath, 0755, true);
        }
    }

    public function isModelTrained()
    {
        return $this->isTrained;
    }

    public function getModelInfo()
    {
        $statusFile = $this->modelPath . 'training_status.json';
        if (file_exists($statusFile)) {
            return json_decode(file_get_contents($statusFile), true);
        }
        
        return ['is_trained' => false];
    }

    public function deleteModels()
    {
        try {
            $files = [
                $this->modelPath . 'classifier.phpml',
                $this->modelPath . 'regressor.phpml',
                $this->modelPath . 'normalizer.phpml',
                $this->modelPath . 'training_status.json'
            ];

            foreach ($files as $file) {
                if (file_exists($file)) {
                    unlink($file);
                }
            }

            $this->isTrained = false;
            return true;

        } catch (\Exception $e) {
            Log::error("Failed to delete ML models: " . $e->getMessage());
            return false;
        }
    }

    private function info($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
    }
}