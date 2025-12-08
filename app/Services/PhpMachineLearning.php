<?php
// app/Services/PHPMachineLearning.php

namespace App\Services;

use Rubix\ML\Datasets\Labeled;
use Rubix\ML\Datasets\Unlabeled;
use Rubix\ML\Classifiers\RandomForest;
use Rubix\ML\Classifiers\ClassificationTree;
use Rubix\ML\CrossValidation\Reports\ConfusionMatrix;
use Illuminate\Support\Facades\Log;
use Exception;

class PHPMachineLearning
{
    private $estimator;
    private $isTrained = false;
    private $modelPath;
    private $trainingAccuracy = 0.0;
    private $testAccuracy = 0.0;

    public function __construct()
    {
        $this->modelPath = storage_path('app/ml_models/');
        $this->ensureDirectoryExists();
        
        // Initialize with Random Forest (ensemble of decision trees)
        $this->estimator = new RandomForest(new ClassificationTree(10), 100, 0.1);
        
        // Try to load existing model
        $this->loadModel();
    }

    public function train(array $trainingData)
    {
        try {
            // Validate training data
            if (count($trainingData) < 10) {
                throw new Exception("Insufficient training data. Need at least 10 records.");
            }

            // Prepare features and labels
            $samples = [];
            $labels = [];
            
            foreach ($trainingData as $item) {
                if (!is_array($item)) {
                    Log::warning("Skipping non-array training item");
                    continue;
                }
                
                $features = $this->extractFeatures($item);
                if ($features === null) {
                    Log::warning("Skipping item with null features");
                    continue;
                }
                
                $samples[] = $features;
                $labels[] = $item['was_assigned'] ?? 0;
            }

            if (count($samples) < 10) {
                throw new Exception("Insufficient valid training data after validation. Need at least 10 valid records.");
            }

            // Create labeled dataset
            $dataset = new Labeled($samples, $labels);
            
            Log::info("Training ML model with Rubix ML", [
                'samples_count' => count($samples),
                'features_count' => count($samples[0] ?? []),
                'positive_examples' => array_sum($labels),
                'negative_examples' => count($labels) - array_sum($labels)
            ]);

            // Train the model
            $this->estimator->train($dataset);
            $this->isTrained = true;
            
            // Calculate training accuracy
            $this->trainingAccuracy = $this->calculateTrainingAccuracy($dataset);
            
            // Save the model
            $this->saveModel();

            return [
                'success' => true,
                'accuracy' => $this->trainingAccuracy,
                'training_samples' => count($samples),
                'feature_importance' => $this->getFeatureImportance(),
                'model_type' => 'rubix_random_forest',
                'updated_at' => now()->toISOString()
            ];

        } catch (Exception $e) {
            Log::error("Rubix ML Training failed: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function validate(array $testData)
    {
        try {
            if (empty($testData) || !$this->isTrained) {
                return ['accuracy' => 0];
            }

            $samples = [];
            $trueLabels = [];
            
            foreach ($testData as $item) {
                if (!is_array($item)) {
                    continue;
                }
                
                $features = $this->extractFeatures($item);
                if ($features === null) {
                    continue;
                }
                
                $samples[] = $features;
                $trueLabels[] = $item['was_assigned'] ?? 0;
            }

            if (empty($samples)) {
                return ['accuracy' => 0];
            }

            $dataset = new Unlabeled($samples);
            $predictions = $this->estimator->predict($dataset);
            
            // Calculate accuracy
            $correct = 0;
            for ($i = 0; $i < count($trueLabels); $i++) {
                if ($predictions[$i] == $trueLabels[$i]) {
                    $correct++;
                }
            }
            
            $this->testAccuracy = $correct / count($trueLabels);
            
            return [
                'accuracy' => $this->testAccuracy,
                'test_samples' => count($samples),
                'correct_predictions' => $correct
            ];

        } catch (Exception $e) {
            Log::error("Validation failed: " . $e->getMessage());
            return ['accuracy' => 0];
        }
    }

    public function predict(array $features)
    {
        if (!$this->isTrained) {
            Log::warning("Rubix ML Model not trained, using fallback scoring");
            return array_fill(0, count($features), 0.5);
        }

        try {
            $samples = [];
            foreach ($features as $featureSet) {
                $extracted = $this->extractFeaturesForPrediction($featureSet);
                if ($extracted !== null) {
                    $samples[] = $extracted;
                } else {
                    $samples[] = array_fill(0, 19, 0); // Default feature vector
                }
            }

            $dataset = new Unlabeled($samples);
            $predictions = $this->estimator->predict($dataset);
            
            // Convert predictions to probabilities
            $probabilities = [];
            foreach ($predictions as $prediction) {
                $probabilities[] = $prediction ? 0.8 : 0.2; // Convert binary to probability
            }

            return $probabilities;

        } catch (Exception $e) {
            Log::error("Prediction failed: " . $e->getMessage());
            return array_fill(0, count($features), 0.5);
        }
    }

    private function extractFeatures($item)
    {
        try {
            if (!is_array($item)) {
                return null;
            }

            $features = [
                floatval($item['work_days_count'] ?? 0),
                floatval($item['rating_value'] ?? 3.0) / 5.0, // Normalize to 0-1
                floatval($item['test_score'] ?? 0.0),
                floatval($item['gender'] ?? 0),
                floatval($item['employee_type'] ?? 0),
                floatval($item['same_subsection'] ?? 0),
                floatval($item['same_section'] ?? 0),
                min(1.0, floatval($item['current_workload'] ?? 0)),
                floatval($item['shift_priority'] ?? 0.5),
                floatval($item['priority_boost'] ?? 1.0),
                floatval($item['priority_count'] ?? 0),
            ];

            // Add priority category features
            $priorityCategories = [
                'skill_certified', 'senior', 'special_project', 'training', 
                'performance', 'operational', 'quality_control', 'machine_operator',
                'general_priority'
            ];

            foreach ($priorityCategories as $category) {
                $features[] = floatval($item["priority_{$category}"] ?? 0);
            }

            return $features;

        } catch (Exception $e) {
            Log::warning("Feature extraction failed: " . $e->getMessage());
            return null;
        }
    }

    private function extractFeaturesForPrediction($features)
    {
        try {
            $extracted = [
                floatval($features['work_days_count'] ?? 0),
                floatval($features['rating_value'] ?? 3.0) / 5.0,
                floatval($features['test_score'] ?? 0.0),
                floatval($features['gender'] ?? 0),
                floatval($features['employee_type'] ?? 0),
                floatval($features['same_subsection'] ?? 0),
                floatval($features['same_section'] ?? 0),
                min(1.0, floatval($features['current_workload'] ?? 0)),
                floatval($features['shift_priority'] ?? 0.5),
                floatval($features['priority_boost'] ?? 1.0),
                floatval($features['priority_count'] ?? 0),
            ];

            // Add priority category features
            $priorityCategories = [
                'skill_certified', 'senior', 'special_project', 'training', 
                'performance', 'operational', 'quality_control', 'machine_operator',
                'general_priority'
            ];

            foreach ($priorityCategories as $category) {
                $extracted[] = floatval($features["priority_{$category}"] ?? 0);
            }

            return $extracted;

        } catch (Exception $e) {
            Log::warning("Prediction feature extraction failed: " . $e->getMessage());
            return null;
        }
    }

    private function calculateTrainingAccuracy($dataset)
    {
        try {
            $predictions = $this->estimator->predict($dataset);
            $trueLabels = $dataset->labels();
            
            $correct = 0;
            for ($i = 0; $i < count($trueLabels); $i++) {
                if ($predictions[$i] == $trueLabels[$i]) {
                    $correct++;
                }
            }
            
            return $correct / count($trueLabels);
        } catch (Exception $e) {
            Log::error("Training accuracy calculation failed: " . $e->getMessage());
            return 0.0;
        }
    }

    private function saveModel()
    {
        try {
            if (!$this->isTrained) {
                return false;
            }

            $modelData = [
                'estimator' => serialize($this->estimator),
                'is_trained' => true,
                'accuracy' => $this->trainingAccuracy,
                'test_accuracy' => $this->testAccuracy,
                'updated_at' => now()->toISOString(),
                'model_type' => 'rubix_random_forest'
            ];

            $success = file_put_contents($this->modelPath . 'rubix_ml_model.ser', 
                serialize($modelData));
            
            if ($success === false) {
                throw new Exception("Failed to write model file");
            }

            Log::info("Rubix ML Model saved successfully", [
                'model_path' => $this->modelPath . 'rubix_ml_model.ser',
                'accuracy' => $this->trainingAccuracy
            ]);

            return true;

        } catch (Exception $e) {
            Log::error("Failed to save Rubix ML model: " . $e->getMessage());
            return false;
        }
    }

    private function loadModel()
    {
        try {
            $modelFile = $this->modelPath . 'rubix_ml_model.ser';
            
            if (!file_exists($modelFile)) {
                Log::warning("Rubix ML model file not found", ['file' => $modelFile]);
                return false;
            }

            $modelContent = file_get_contents($modelFile);
            if (empty($modelContent)) {
                Log::warning("Rubix ML model file is empty", ['file' => $modelFile]);
                return false;
            }

            $data = unserialize($modelContent);
            
            if (!$data || !isset($data['estimator'])) {
                Log::error("Failed to unserialize Rubix ML model");
                return false;
            }

            $this->estimator = unserialize($data['estimator']);
            $this->isTrained = $data['is_trained'] ?? false;
            $this->trainingAccuracy = $data['accuracy'] ?? 0.0;
            $this->testAccuracy = $data['test_accuracy'] ?? 0.0;

            return true;

        } catch (Exception $e) {
            Log::error("Failed to load Rubix ML model: " . $e->getMessage());
            return false;
        }
    }

    private function ensureDirectoryExists()
    {
        if (!is_dir($this->modelPath)) {
            if (!mkdir($this->modelPath, 0755, true)) {
                throw new Exception("Failed to create model directory: " . $this->modelPath);
            }
        }
    }

    public function isModelTrained()
    {
        return $this->isTrained;
    }

    public function getModelInfo()
    {
        $modelFile = $this->modelPath . 'rubix_ml_model.ser';
        if (file_exists($modelFile)) {
            $data = unserialize(file_get_contents($modelFile));
            return $data ?? ['is_trained' => false];
        }
        
        return ['is_trained' => false];
    }

    public function getFeatureImportance()
    {
        if (!$this->isTrained) {
            return [];
        }

        try {
            $featureNames = [
                'work_days_count', 'rating_value', 'test_score', 'gender',
                'employee_type', 'same_subsection', 'same_section', 
                'current_workload', 'shift_priority', 'priority_boost',
                'priority_count', 'priority_skill_certified', 'priority_senior',
                'priority_special_project', 'priority_training', 'priority_performance',
                'priority_operational', 'priority_quality_control', 
                'priority_machine_operator', 'priority_general_priority'
            ];

            $importances = [];
            
            // For RandomForest, we can estimate feature importance
            // This is a simplified version - Rubix ML doesn't have built-in feature importance for RandomForest
            foreach ($featureNames as $index => $name) {
                $importances[$name] = [
                    'index' => $index,
                    'importance_percent' => 100 / count($featureNames), // Equal distribution for now
                    'weight' => 0.0
                ];
            }

            return $importances;

        } catch (Exception $e) {
            Log::warning("Feature importance calculation failed: " . $e->getMessage());
            return [];
        }
    }

    public function resetModel()
    {
        $this->estimator = new RandomForest(new ClassificationTree(10), 100, 0.1);
        $this->isTrained = false;
        $this->trainingAccuracy = 0.0;
        $this->testAccuracy = 0.0;
        
        $modelFile = $this->modelPath . 'rubix_ml_model.ser';
        if (file_exists($modelFile)) {
            unlink($modelFile);
        }
        
        return true;
    }
}