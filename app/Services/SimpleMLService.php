<?php
// app/Services/SimpleMLService.php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class SimpleMLService
{
    private $weights = [];
    private $bias = 0;
    private $isTrained = false;
    private $modelPath;
    private $trainingAccuracy = 0.0;

    public function __construct()
    {
        $this->modelPath = storage_path('app/ml_models/');
        $this->ensureDirectoryExists();
        $this->initializeWeights();
        
        // AUTO-LOAD MODEL ON CONSTRUCTION
        $this->loadModel();
    }

   private function initializeWeights()
{
    // Initialize with reasonable weights based on domain knowledge
    $this->weights = [
        'work_days_count' => -0.3,  // Negative: fewer days = better
        'rating_value' => 0.25,     // Positive: higher rating = better
        'test_score' => 0.2,        // Positive: passed test = better
        'gender' => 0.0,            // Neutral by default
        'employee_type' => 0.1,     // Slight preference for bulanan
        'same_subsection' => 0.15,  // Positive: same subsection = better
        'same_section' => 0.1,      // Positive: same section = better
        'current_workload' => -0.2, // Negative: lower workload = better
        'shift_priority' => 0.25    // NEW: Positive: higher shift priority = better
    ];
    $this->bias = 0.5;
}

    public function train(array $trainingData)
    {
        try {
            $learningRate = 0.01;
            $epochs = 100;

            // Validate training data
            if (count($trainingData) < 10) {
                throw new \Exception("Insufficient training data. Need at least 10 records.");
            }

            Log::info("Starting ML training", [
                'training_samples' => count($trainingData),
                'epochs' => $epochs,
                'learning_rate' => $learningRate
            ]);

            for ($epoch = 0; $epoch < $epochs; $epoch++) {
                $totalError = 0;
                $processedSamples = 0;

                foreach ($trainingData as $item) {
                    $prediction = $this->predictSingle($this->extractFeatures($item));
                    $error = ($item['was_assigned'] ?? 0) - $prediction;
                    $totalError += abs($error);
                    $processedSamples++;

                    // Update weights
                    $features = $this->extractFeatures($item);
                    foreach ($this->weights as $feature => $weight) {
                        if (isset($features[$feature])) {
                            $this->weights[$feature] += $learningRate * $error * $features[$feature];
                        }
                    }
                    $this->bias += $learningRate * $error;
                }

                $averageError = $totalError / $processedSamples;
                
                // Stop if error is small enough or if we're not improving
                if ($averageError < 0.1) {
                    Log::info("Training converged early", [
                        'epoch' => $epoch,
                        'average_error' => $averageError
                    ]);
                    break;
                }

                // Log progress every 10 epochs
                if ($epoch % 10 === 0) {
                    Log::debug("Training progress", [
                        'epoch' => $epoch,
                        'average_error' => $averageError,
                        'total_error' => $totalError
                    ]);
                }
            }

            $this->isTrained = true;
            
            // Calculate accuracy using the training data
            $this->trainingAccuracy = $this->calculateAccuracy($trainingData);
            
            $this->saveModel();

            Log::info("ML training completed successfully", [
                'accuracy' => $this->trainingAccuracy,
                'final_weights' => $this->weights,
                'final_bias' => $this->bias
            ]);

            return [
                'success' => true,
                'accuracy' => $this->trainingAccuracy,
                'training_samples' => count($trainingData),
                'final_weights' => $this->weights,
                'final_bias' => $this->bias
            ];

        } catch (\Exception $e) {
            Log::error("Simple ML Training failed: " . $e->getMessage());
            return [
                'success' => false, 
                'error' => $e->getMessage()
            ];
        }
    }

    public function predict(array $features)
    {
        if (!$this->isTrained) {
            Log::warning("ML Model not trained, using fallback scoring");
            return $this->fallbackPrediction($features);
        }

        try {
            $predictions = [];
            foreach ($features as $featureSet) {
                $predictions[] = $this->predictSingle($featureSet);
            }

            Log::debug("ML Predictions generated", [
                'predictions_count' => count($predictions),
                'sample_predictions' => array_slice($predictions, 0, 5)
            ]);

            return $predictions;

        } catch (\Exception $e) {
            Log::error("Simple ML Prediction failed: " . $e->getMessage());
            return $this->fallbackPrediction($features);
        }
    }

    private function predictSingle($features)
    {
        $score = $this->bias;

        foreach ($this->weights as $feature => $weight) {
            if (isset($features[$feature])) {
                $score += $weight * $features[$feature];
            }
        }

        // Sigmoid activation function with bounds checking
        try {
            $result = 1 / (1 + exp(-$score));
            return max(0.0, min(1.0, $result)); // Ensure result is between 0 and 1
        } catch (\Exception $e) {
            Log::warning("Sigmoid calculation failed, using fallback", [
                'score' => $score,
                'error' => $e->getMessage()
            ]);
            return 0.5;
        }
    }

    
private function extractFeatures($item)
{
    return [
        'work_days_count' => floatval($item['work_days_count'] ?? 0),
        'rating_value' => floatval($item['rating_value'] ?? 3.0) / 5.0, // Normalize to 0-1
        'test_score' => floatval($item['test_score'] ?? 0.0),
        'gender' => floatval($item['gender'] ?? 0),
        'employee_type' => floatval($item['employee_type'] ?? 0),
        'same_subsection' => floatval($item['same_subsection'] ?? 0),
        'same_section' => floatval($item['same_section'] ?? 0),
        'current_workload' => min(1.0, floatval($item['current_workload'] ?? 0)),
        'shift_priority' => floatval($item['shift_priority'] ?? 0.5) // NEW: Add shift priority
    ];
}

    private function calculateAccuracy($trainingData)
    {
        if (empty($trainingData)) {
            Log::warning("Cannot calculate accuracy: training data is empty");
            return 0.0;
        }

        $correct = 0;
        $total = count($trainingData);

        foreach ($trainingData as $item) {
            $prediction = $this->predictSingle($this->extractFeatures($item));
            $predictedClass = $prediction > 0.5 ? 1 : 0;
            $actualClass = $item['was_assigned'] ?? 0;
            
            if ($predictedClass == $actualClass) {
                $correct++;
            }
        }

        $accuracy = $correct / $total;
        
        Log::debug("Accuracy calculation", [
            'correct' => $correct,
            'total' => $total,
            'accuracy' => $accuracy
        ]);

        return $accuracy;
    }

    private function saveModel()
    {
        try {
            $modelData = [
                'weights' => $this->weights,
                'bias' => $this->bias,
                'is_trained' => true,
                'accuracy' => $this->trainingAccuracy,
                'updated_at' => now()->toISOString(),
                'feature_count' => count($this->weights)
            ];

            $success = file_put_contents($this->modelPath . 'simple_ml_model.json', 
                json_encode($modelData, JSON_PRETTY_PRINT));
            
            if ($success === false) {
                throw new \Exception("Failed to write model file");
            }

            Log::info("ML Model saved successfully", [
                'model_path' => $this->modelPath . 'simple_ml_model.json',
                'weights_count' => count($this->weights),
                'accuracy' => $this->trainingAccuracy
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to save ML model: " . $e->getMessage());
            return false;
        }
    }

    private function loadModel()
    {
        try {
            $modelFile = $this->modelPath . 'simple_ml_model.json';
            
            if (!file_exists($modelFile)) {
                Log::warning("ML model file not found", ['file' => $modelFile]);
                return false;
            }

            $modelContent = file_get_contents($modelFile);
            if (empty($modelContent)) {
                Log::warning("ML model file is empty", ['file' => $modelFile]);
                return false;
            }

            $data = json_decode($modelContent, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("Failed to decode ML model JSON: " . json_last_error_msg());
                return false;
            }

            if (!isset($data['weights']) || !isset($data['bias']) || !isset($data['is_trained'])) {
                Log::error("ML model file missing required fields");
                return false;
            }

            $this->weights = $data['weights'];
            $this->bias = $data['bias'];
            $this->isTrained = $data['is_trained'];
            $this->trainingAccuracy = $data['accuracy'] ?? 0.0;

            Log::info("ML Model loaded successfully", [
                'model_file' => $modelFile,
                'is_trained' => $this->isTrained,
                'accuracy' => $this->trainingAccuracy,
                'weights_count' => count($this->weights)
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to load ML model: " . $e->getMessage());
            return false;
        }
    }

    private function ensureDirectoryExists()
    {
        if (!is_dir($this->modelPath)) {
            if (!mkdir($this->modelPath, 0755, true)) {
                throw new \Exception("Failed to create model directory: " . $this->modelPath);
            }
        }
    }

    public function isModelTrained()
    {
        return $this->isTrained;
    }

    public function getModelInfo()
    {
        $modelFile = $this->modelPath . 'simple_ml_model.json';
        if (file_exists($modelFile)) {
            $data = json_decode(file_get_contents($modelFile), true);
            return $data ?? ['is_trained' => false];
        }
        
        return ['is_trained' => false];
    }

    public function getWeights()
    {
        return $this->weights;
    }

    public function getBias()
    {
        return $this->bias;
    }

    public function getAccuracy()
    {
        return $this->trainingAccuracy;
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

    /**
     * Reset the model to untrained state
     */
    public function resetModel()
    {
        $this->initializeWeights();
        $this->isTrained = false;
        $this->trainingAccuracy = 0.0;
        
        // Delete model file
        $modelFile = $this->modelPath . 'simple_ml_model.json';
        if (file_exists($modelFile)) {
            unlink($modelFile);
        }
        
        return true;
    }
}