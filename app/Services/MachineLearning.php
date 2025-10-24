<?php

namespace App\Services;

use Rubix\ML\Classifiers\RandomForest;
use Rubix\ML\Classifiers\ClassificationTree;
use Rubix\ML\Regressors\Ridge;
use Rubix\ML\Datasets\Labeled;
use Rubix\ML\Datasets\Unlabeled;
use Rubix\ML\PersistentModel;
use Rubix\ML\Persisters\Filesystem;
use Rubix\ML\CrossValidation\Metrics\Accuracy;
use Rubix\ML\CrossValidation\Metrics\RMSE;
use Illuminate\Support\Facades\Log;

class MachineLearning
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
                $samples[] = [
                    floatval($item['work_days_count'] ?? 0),
                    floatval($item['rating_value'] ?? 3.0),
                    floatval($item['test_score'] ?? 0.0),
                    floatval($item['gender'] ?? 0),
                    floatval($item['employee_type'] ?? 0),
                    floatval($item['same_subsection'] ?? 0),
                    floatval($item['same_section'] ?? 0),
                    floatval($item['current_workload'] ?? 0),
                    floatval($item['shift_priority'] ?? 0.5)
                ];
                $labels[] = intval($item['was_assigned'] ?? 0);
                $targets[] = floatval($item['was_assigned'] ?? 0);
            }

            // Train Random Forest Classifier
            $this->classifier = new RandomForest(new ClassificationTree(10), 100, 0.1);
            $classifierDataset = new Labeled($samples, $labels);
            $this->classifier->train($classifierDataset);

            // Train Ridge Regression
            $this->regressor = new Ridge(0.01);
            $regressorDataset = new Labeled($samples, $targets);
            $this->regressor->train($regressorDataset);

            $this->isTrained = true;

            // Calculate accuracy
            $predictions = $this->classifier->predict($classifierDataset);
            $accuracy = new Accuracy();
            $accuracyScore = $accuracy->score($predictions, $labels);

            $this->saveModels();

            return [
                'success' => true,
                'accuracy' => $accuracyScore,
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
                $samples[] = [
                     floatval($featureSet['work_days_count'] ?? 0),
                floatval($featureSet['rating_value'] ?? 3.0),
                floatval($featureSet['test_score'] ?? 0.0),
                floatval($featureSet['gender'] ?? 0),
                floatval($featureSet['employee_type'] ?? 0),
                floatval($featureSet['same_subsection'] ?? 0),
                floatval($featureSet['same_section'] ?? 0),
                floatval($featureSet['current_workload'] ?? 0),
                floatval($featureSet['shift_priority'] ?? 0.5)
                ];
            }

            $dataset = new Unlabeled($samples);

            // Get classifier probabilities
            $classProbabilities = $this->classifier->proba($dataset);
            $rfScores = array_column($classProbabilities, 1); // Probability of class 1

            // Get regression scores
            $regScores = $this->regressor->predict($dataset);

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
            for ($i = 0; $i < count($rfScores); $i++) {
                $predictions[] = 0.6 * $rfScores[$i] + 0.4 * $normalizedRegScores[$i];
            }

            return $predictions;

        } catch (\Exception $e) {
            Log::error("PHP-ML Prediction failed: " . $e->getMessage());
            return $this->fallbackPrediction($features);
        }
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
            
            // Section match
            $sameSubsection = $featureSet['same_subsection'] ?? 0;
            $sameSection = $featureSet['same_section'] ?? 0;
            $score += ($sameSubsection * 0.15 + $sameSection * 0.1);
            
            $predictions[] = min(1.0, max(0.0, $score));
        }
        
        return $predictions;
    }

    private function saveModels()
    {
        try {
            // Save classifier
            $classifierPersister = new Filesystem($this->modelPath . 'classifier.rbx');
            $persistentClassifier = new PersistentModel($this->classifier, $classifierPersister);
            $persistentClassifier->save();

            // Save regressor
            $regressorPersister = new Filesystem($this->modelPath . 'regressor.rbx');
            $persistentRegressor = new PersistentModel($this->regressor, $regressorPersister);
            $persistentRegressor->save();

            // Save training status
            file_put_contents(
                $this->modelPath . 'training_status.json',
                json_encode([
                    'is_trained' => true, 
                    'updated_at' => now()->toISOString(),
                    'models' => ['classifier.rbx', 'regressor.rbx']
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
            if (file_exists($this->modelPath . 'classifier.rbx') &&
                file_exists($this->modelPath . 'regressor.rbx')) {
                
                $classifierPersister = new Filesystem($this->modelPath . 'classifier.rbx');
                $this->classifier = PersistentModel::load($classifierPersister);

                $regressorPersister = new Filesystem($this->modelPath . 'regressor.rbx');
                $this->regressor = PersistentModel::load($regressorPersister);

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
                $this->modelPath . 'classifier.rbx',
                $this->modelPath . 'regressor.rbx',
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
}