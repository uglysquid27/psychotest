<?php
// app/Services/PHPMachineLearning.php

namespace App\Services;

use Phpml\Classification\DecisionTree;
use Phpml\Regression\LeastSquares;
use Phpml\Dataset\ArrayDataset;
use Phpml\Metric\Accuracy;
use Phpml\ModelManager;
use Illuminate\Support\Facades\Log;

class PHPMachineLearning
{
    private $classifier;
    private $regressor;
    private $isTrained = false;
    private $modelPath;

    public function __construct()
    {
        $this->modelPath = storage_path('app/ml_models/');
        $this->ensureDirectoryExists();
    }

    public function train(array $trainingData)
    {
        try {
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

            // Train Decision Tree Classifier with regularization
            $this->classifier = new DecisionTree(
                10,      // max depth
                5,       // min samples split
                0.0001   // min impurity decrease (regularization)
            );

            $this->classifier->train($samples, $labels);

            // Train Linear Regression with regularization
            // Use only non-collinear features for regression
            $regressionSamples = $this->prepareRegressionFeatures($trainingData);
            $this->regressor = new LeastSquares();
            $this->regressor->train($regressionSamples, $targets);

            $this->isTrained = true;

            // Test accuracy
            $predictions = $this->classifier->predict($samples);
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
        // Remove collinear features and add some noise to prevent singularity
        return [
            floatval($item['work_days_count'] ?? 0) + $this->addSmallNoise(),
            floatval($item['rating_value'] ?? 3.0),
            floatval($item['test_score'] ?? 0.0),
            // Remove one of the collinear features (gender/employee_type)
            floatval($item['employee_type'] ?? 0),
            // Combine subsection and section into one feature to avoid collinearity
            $this->combineSectionFeatures(
                floatval($item['same_subsection'] ?? 0),
                floatval($item['same_section'] ?? 0)
            ),
            floatval($item['current_workload'] ?? 0) + $this->addSmallNoise(),
        ];
    }

    private function prepareRegressionFeatures(array $trainingData)
    {
        $samples = [];
        foreach ($trainingData as $item) {
            // Use only non-collinear features for regression
            $samples[] = [
                floatval($item['work_days_count'] ?? 0) + $this->addSmallNoise(),
                floatval($item['rating_value'] ?? 3.0),
                floatval($item['test_score'] ?? 0.0),
                floatval($item['current_workload'] ?? 0) + $this->addSmallNoise(),
            ];
        }
        return $samples;
    }

    private function combineSectionFeatures($sameSubsection, $sameSection)
    {
        // Combine into single feature: 2=same subsection, 1=same section, 0=neither
        if ($sameSubsection > 0) return 2.0;
        if ($sameSection > 0) return 1.0;
        return 0.0;
    }

    private function addSmallNoise()
    {
        // Add tiny random noise to prevent perfect collinearity
        return (mt_rand(0, 1000) / 1000000); // 0.000001 to 0.001
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

            // Get classifier predictions
            $rfPredictions = $this->classifier->predict($samples);
            
            // Get regression scores (using reduced feature set)
            $regressionSamples = [];
            foreach ($features as $featureSet) {
                $regressionSamples[] = [
                    floatval($featureSet['work_days_count'] ?? 0),
                    floatval($featureSet['rating_value'] ?? 3.0),
                    floatval($featureSet['test_score'] ?? 0.0),
                    floatval($featureSet['current_workload'] ?? 0),
                ];
            }
            $regScores = $this->regressor->predict($regressionSamples);

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

            // Hybrid scoring with better probability estimation
            $predictions = [];
            for ($i = 0; $i < count($rfPredictions); $i++) {
                // Use confidence from decision tree depth or other heuristics
                $rfScore = $this->estimateTreeConfidence($rfPredictions[$i], $samples[$i]);
                $predictions[] = 0.6 * $rfScore + 0.4 * $normalizedRegScores[$i];
            }

            return $predictions;

        } catch (\Exception $e) {
            Log::error("PHP-ML Prediction failed: " . $e->getMessage());
            return $this->fallbackPrediction($features);
        }
    }

    private function estimateTreeConfidence($prediction, $features)
    {
        // Simple confidence estimation based on feature values
        // You can enhance this based on your domain knowledge
        $baseConfidence = $prediction == 1 ? 0.7 : 0.3;
        
        // Adjust confidence based on strong indicators
        if ($features[2] > 0.8) { // test_score
            $baseConfidence += 0.1;
        }
        if ($features[4] == 2.0) { // same subsection
            $baseConfidence += 0.15;
        }
        
        return min(0.95, max(0.05, $baseConfidence));
    }

    private function fallbackPrediction($features)
    {
        // Simple rule-based fallback
        $predictions = [];
        foreach ($features as $featureSet) {
            $score = 0.0;
            
            // Work days count (fewer days = higher priority)
            $workDays = $featureSet['work_days_count'] ?? 0;
            $score += max(0, 1 - ($workDays / 22)) * 0.3;
            
            // Rating value
            $rating = $featureSet['rating_value'] ?? 3.0;
            $score += ($rating / 5) * 0.25;
            
            // Test score
            $testScore = $featureSet['test_score'] ?? 0.0;
            $score += $testScore * 0.2;
            
            // Section match (combined)
            $sameSubsection = $featureSet['same_subsection'] ?? 0;
            $sameSection = $featureSet['same_section'] ?? 0;
            $sectionScore = 0.0;
            if ($sameSubsection > 0) $sectionScore = 0.2;
            elseif ($sameSection > 0) $sectionScore = 0.1;
            $score += $sectionScore;
            
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
            
            // Save training status
            file_put_contents(
                $this->modelPath . 'training_status.json',
                json_encode([
                    'is_trained' => true, 
                    'updated_at' => now()->toISOString(),
                    'feature_count' => 6 // Updated feature count
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
                file_exists($this->modelPath . 'regressor.phpml')) {
                
                $this->classifier = $modelManager->restoreFromFile($this->modelPath . 'classifier.phpml');
                $this->regressor = $modelManager->restoreFromFile($this->modelPath . 'regressor.phpml');
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