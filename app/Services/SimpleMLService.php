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
        'work_days_count' => -0.3,          // Negative: fewer days = better
        'rating_value' => 0.25,             // Positive: higher rating = better
        'test_score' => 0.2,                // Positive: passed test = better
        'gender' => 0.0,                    // Neutral by default
        'employee_type' => 0.1,             // Slight preference for bulanan
        'same_subsection' => 0.15,          // Positive: same subsection = better
        'same_section' => 0.1,              // Positive: same section = better
        'current_workload' => -0.2,         // Negative: lower workload = better
        'shift_priority' => 0.25,           // Positive: higher shift priority = better
        'has_priority' => 0.4,              // HAS PRIORITY = higher score
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
    $features = [
        'work_days_count' => floatval($item['work_days_count'] ?? 0),
        'rating_value' => floatval($item['rating_value'] ?? 3.0) / 5.0, // Normalize to 0-1
        'test_score' => floatval($item['test_score'] ?? 0.0),
        'gender' => floatval($item['gender'] ?? 0),
        'employee_type' => floatval($item['employee_type'] ?? 0),
        'same_subsection' => floatval($item['same_subsection'] ?? 0),
        'same_section' => floatval($item['same_section'] ?? 0),
        'current_workload' => min(1.0, floatval($item['current_workload'] ?? 0)),
        'shift_priority' => floatval($item['shift_priority'] ?? 0.5),
        'has_priority' => floatval($item['has_priority'] ?? 0), // Make sure this is included
    ];

    return $features;
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
                'feature_count' => count($this->weights),
                'features' => array_keys($this->weights) // Store feature names
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
        $predictions = [];
        foreach ($features as $featureSet) {
            $score = $this->fallbackScoring($featureSet);
            $predictions[] = $score;
        }
        
        return $predictions;
    }

    private function fallbackScoring($features)
    {
        $score = 0.0;
        
        // Base features (70% weight)
        $baseScore = 0.0;
        
        // Work days count (fewer days = higher priority)
        $workDays = $features['work_days_count'] ?? 0;
        $baseScore += max(0, 1 - ($workDays / 22)) * 0.3;
        
        // Rating value
        $rating = $features['rating_value'] ?? 3.0;
        $baseScore += ($rating / 5) * 0.25;
        
        // Test score
        $testScore = $features['test_score'] ?? 0.0;
        $baseScore += $testScore * 0.2;
        
        // Section match
        $sameSubsection = $features['same_subsection'] ?? 0;
        $sameSection = $features['same_section'] ?? 0;
        $baseScore += ($sameSubsection * 0.15 + $sameSection * 0.1);
        
        // Priority features (30% weight)
        $priorityScore = $this->calculatePriorityScore($features);
        
        // Combine: 70% base score + 30% priority score
        $score = ($baseScore * 0.7) + ($priorityScore * 0.3);
        
        return min(1.0, max(0.0, $score));
    }

    /**
     * Calculate priority score from features
     */
    private function calculatePriorityScore($features)
    {
        $priorityScore = 0.0;
        $priorityWeightSum = 0.0;
        
        // Priority category weights for fallback
        $categoryWeights = [
            'skill_certified' => 0.4,
            'senior' => 0.3,
            'special_project' => 0.5,
            'training' => 0.25,
            'performance' => 0.35,
            'operational' => 0.2,
            'quality_control' => 0.3,
            'machine_operator' => 0.35,
            'general_priority' => 0.3, // Added general priority
        ];

        // Calculate based on priority categories
        foreach ($categoryWeights as $category => $weight) {
            $hasCategory = $features["priority_{$category}"] ?? 0;
            if ($hasCategory > 0) {
                $priorityScore += $weight;
                $priorityWeightSum += $weight;
            }
        }

        // Normalize priority score
        if ($priorityWeightSum > 0) {
            $priorityScore = $priorityScore / $priorityWeightSum;
        }

        // Consider priority boost if available
        if (isset($features['priority_boost'])) {
            $boost = min(1.0, $features['priority_boost']);
            $priorityScore = max($priorityScore, $boost);
        }

        // Consider priority count
        if (isset($features['priority_count'])) {
            $count = intval($features['priority_count']);
            if ($count > 0) {
                // More priority categories = slightly higher score
                $priorityScore *= (1 + ($count * 0.1));
            }
        }

        return min(1.0, $priorityScore);
    }

    /**
     * Generate training data with priorities
     */
    public function prepareTrainingDataWithPriorities($employees, $assignedIds)
    {
        $trainingData = [];
        $priorityService = app(PickingPriorityService::class);
        
        foreach ($employees as $employee) {
            $wasAssigned = in_array($employee->id, $assignedIds) ? 1 : 0;
            
            // Get priority categories
            $priorityCategories = $employee->getPriorityCategories();
            
            $features = [
                'work_days_count' => $employee->work_days_30_days ?? 0,
                'rating_value' => $employee->average_rating ?? 3.0,
                'test_score' => ($employee->blind_test_points ?? 0) > 0 ? 1.0 : 0.0,
                'gender' => $employee->gender === 'male' ? 1 : 0,
                'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
                'same_subsection' => 0, // Will be set based on context
                'same_section' => 0,    // Will be set based on context
                'current_workload' => min(1.0, ($employee->total_assigned_hours ?? 0) / 80),
                'shift_priority' => $employee->shift_priority ?? 0.5,
                'priority_boost' => $employee->getPriorityBoostScore(),
                'priority_count' => count($priorityCategories),
                'was_assigned' => $wasAssigned,
            ];

            // Add binary flags for each priority category
            foreach (['skill_certified', 'senior', 'special_project', 'training', 'performance', 'operational', 'quality_control', 'machine_operator', 'general_priority'] as $category) {
                $features["priority_{$category}"] = in_array($category, $priorityCategories) ? 1 : 0;
            }

            $trainingData[] = $features;
        }

        return $trainingData;
    }

    /**
     * Predict with priority context
     */
    public function predictWithPriority($employees, $manpowerRequest)
    {
        $features = [];
        
        foreach ($employees as $employee) {
            $employeeFeatures = $this->prepareEmployeeFeatures($employee, $manpowerRequest);
            $features[] = $employeeFeatures;
        }
        
        return $this->predict($features);
    }

    /**
     * Prepare employee features including priorities
     */
    private function prepareEmployeeFeatures($employee, $manpowerRequest)
    {
        // Get priority categories
        $priorityCategories = $employee->getPriorityCategories();
        
        $features = [
            'work_days_count' => $employee->work_days_30_days ?? 0,
            'rating_value' => $employee->average_rating ?? 3.0,
            'test_score' => ($employee->blind_test_points ?? 0) > 0 ? 1.0 : 0.0,
            'gender' => $employee->gender === 'male' ? 1 : 0,
            'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
            'same_subsection' => $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0,
            'same_section' => $this->isSameSection($employee, $manpowerRequest) ? 1 : 0,
            'current_workload' => min(1.0, ($employee->total_assigned_hours ?? 0) / 80),
            'shift_priority' => $employee->shift_priority ?? 0.5,
            'priority_boost' => $employee->getPriorityBoostScore(),
            'priority_count' => count($priorityCategories),
        ];

        // Add binary flags for each priority category
        foreach (['skill_certified', 'senior', 'special_project', 'training', 'performance', 'operational', 'quality_control', 'machine_operator', 'general_priority'] as $category) {
            $features["priority_{$category}"] = in_array($category, $priorityCategories) ? 1 : 0;
        }

        return $features;
    }

    /**
     * Check if employee is in same subsection
     */
    private function isSameSubsection($employee, $manpowerRequest)
    {
        $employeeSubsections = $employee->subSections ?? [];
        foreach ($employeeSubsections as $subsection) {
            if ($subsection['id'] == $manpowerRequest->sub_section_id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if employee is in same section
     */
    private function isSameSection($employee, $manpowerRequest)
    {
        $employeeSubsections = $employee->subSections ?? [];
        foreach ($employeeSubsections as $subsection) {
            if (isset($subsection['section']) && $subsection['section']['id'] == $manpowerRequest->subSection->section_id) {
                return true;
            }
        }
        return false;
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

    /**
     * Get feature importance (weight magnitude)
     */
    public function getFeatureImportance()
    {
        $importances = [];
        
        foreach ($this->weights as $feature => $weight) {
            $importances[$feature] = [
                'weight' => $weight,
                'absolute_weight' => abs($weight),
                'importance_percent' => abs($weight) * 100,
            ];
        }
        
        // Sort by absolute weight (descending)
        uasort($importances, function($a, $b) {
            return $b['absolute_weight'] <=> $a['absolute_weight'];
        });
        
        return $importances;
    }
}