<?php
// app/Console/Commands/TrainMLModel.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\MLTrainingDataService;
use App\Models\TrainedModel;
use App\Services\SimpleMLService;
use App\Services\PHPMachineLearning;
use Illuminate\Support\Facades\Log;

class TrainMLModel extends Command
{
    protected $signature = 'ml:train 
                            {--days=90 : Number of days of historical data to use}
                            {--force : Force retrain even if model exists}
                            {--service=auto : ML service to use (rubix, simple, auto)}
                            {--include-priorities : Include priority picking features}
                            {--analyze : Show detailed priority analysis}
                            {--test-size=0.2 : Test size for validation (0.1 to 0.3)}';
    
    protected $description = 'Train the ML model for manpower recommendations with priority picking';

    public function handle()
    {
        $this->info('🚀 Starting ML Model Training with Priority Picking');
        $this->line('');

        $includePriorities = $this->option('include-priorities');
        $analyze = $this->option('analyze');
        
        if ($includePriorities) {
            $this->info('🎯 Priority picking features will be included in training');
        }

        $serviceType = $this->option('service') ?? 'auto';
        $mlService = $this->getMLService($serviceType);
        
        if (!$mlService) {
            $this->error('❌ No suitable ML service found. Using simple ML service as fallback.');
            $mlService = app(SimpleMLService::class);
        }

        $dataService = app(MLTrainingDataService::class);

        // Check if model already exists
        if (!$this->option('force') && $mlService->isModelTrained()) {
            $modelInfo = $mlService->getModelInfo();
            $this->info('✅ ML model is already trained. Use --force to retrain.');
            $this->info('📊 Model type: ' . get_class($mlService));
            $this->info('🎯 Accuracy: ' . round(($modelInfo['accuracy'] ?? 0) * 100, 2) . '%');
            
            if (isset($modelInfo['updated_at'])) {
                $this->info('📅 Last updated: ' . $modelInfo['updated_at']);
            }
            
            if ($analyze) {
                $this->showPriorityAnalysis($mlService, $dataService);
            }
            
            return 0;
        }

        $this->info('📊 Collecting training data...');
        
        // Collect base training data
        $trainingData = $dataService->collectTrainingData(
            $this->option('days')
        );

        // If including priorities, add priority-specific data
        if ($includePriorities) {
            $this->info('🎯 Collecting priority-specific data...');
            $priorityData = $dataService->collectPriorityTrainingData(
                $this->option('days')
            );
            
            if (!empty($priorityData)) {
                $trainingData = array_merge($trainingData, $priorityData);
                $this->info('✅ Added ' . count($priorityData) . ' priority-specific samples');
            }
        }

        if (count($trainingData) < 10) {
            $this->error('❌ Insufficient training data. Need at least 10 records.');
            $this->info('📝 Current records: ' . count($trainingData));
            $this->info('💡 Try running with more days: --days=180');
            return 1;
        }

        $this->info("📈 Collected " . count($trainingData) . " training records");
        
        // Show data distribution
        $this->showDataDistribution($trainingData);
        
        if ($analyze) {
            $this->showPriorityAnalysis($mlService, $dataService);
        }

        $this->info("🤖 Training ML model using: " . get_class($mlService));
        $this->info('🚀 Training in progress...');
        
        // Split data if test size is specified
        $testSize = floatval($this->option('test-size'));
        if ($testSize > 0 && $testSize < 1) {
            shuffle($trainingData);
            $splitIndex = intval(count($trainingData) * (1 - $testSize));
            $trainSet = array_slice($trainingData, 0, $splitIndex);
            $testSet = array_slice($trainingData, $splitIndex);
            
            $this->info("📊 Training set: " . count($trainSet) . " records");
            $this->info("🧪 Test set: " . count($testSet) . " records");
            
            $result = $mlService->train($trainSet);
            
            // If ML service supports validation, test on validation set
            if (method_exists($mlService, 'validate')) {
                $this->info("🧪 Running validation on test set...");
                $validationResult = $mlService->validate($testSet);
                if (isset($validationResult['accuracy'])) {
                    $this->info("🎯 Test accuracy: " . round($validationResult['accuracy'] * 100, 2) . "%");
                }
            }
        } else {
            $result = $mlService->train($trainingData);
        }

        if ($result['success']) {
            // Save model metadata
            $modelType = $this->getModelType(get_class($mlService));
            
            $modelData = [
                'model_type' => $modelType,
                'model_name' => 'manpower_priority_' . $modelType . '_v' . time(),
                'file_path' => $result['model_path'] ?? 'storage/app/ml_models/',
                'accuracy' => $result['accuracy'] ?? 0.0,
                'train_data_count' => $result['training_samples'],
                'feature_importance' => $result['final_weights'] ?? $result['feature_importance'] ?? null,
                'includes_priorities' => $includePriorities,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ];

            if (isset($result['test_accuracy'])) {
                $modelData['test_accuracy'] = $result['test_accuracy'];
            }

            TrainedModel::updateOrCreate(
                ['model_type' => $modelType],
                $modelData
            );

            $this->info("");
            $this->info("✅ Model trained successfully!");
            $this->info("🎯 Accuracy: " . round(($result['accuracy'] ?? 0) * 100, 2) . "%");
            
            if (isset($result['test_accuracy'])) {
                $this->info("🧪 Test accuracy: " . round($result['test_accuracy'] * 100, 2) . "%");
            }
            
            $this->info("📚 Training records: " . $result['training_samples']);
            $this->info("🔧 Model type: " . $modelType);
            $this->info("🎯 Includes priorities: " . ($includePriorities ? 'Yes' : 'No'));
            
            // Show feature weights/importance
            if (method_exists($mlService, 'getFeatureImportance')) {
                $this->showFeatureImportance($mlService);
            } elseif (isset($result['final_weights'])) {
                $this->showFeatureWeights($result['final_weights']);
            }
            
            // Show priority statistics
            if ($includePriorities) {
                $stats = $dataService->getPriorityStatistics($this->option('days'));
                $this->showPriorityStatistics($stats);
            }
            
            $this->info("");
            $this->info('💡 The model is now ready to use in your manpower requests!');
            $this->info('💡 Priority picking is now integrated into the recommendation system.');
            
        } else {
            $this->error('❌ Training failed: ' . ($result['error'] ?? 'Unknown error'));
            Log::error('ML Training failed', ['error' => $result['error'] ?? 'Unknown']);
            return 1;
        }

        return 0;
    }

    private function getMLService($serviceType)
    {
        switch ($serviceType) {
            case 'rubix':
                if (class_exists('Rubix\ML\Classifiers\RandomForest')) {
                    return app(PHPMachineLearning::class);
                }
                $this->warn('Rubix ML not available, falling back to simple ML...');
                return app(SimpleMLService::class);
                
            case 'simple':
                return app(SimpleMLService::class);
                
            case 'auto':
            default:
                // Try Rubix ML first, fallback to simple
                if (class_exists('Rubix\ML\Classifiers\RandomForest')) {
                    $this->info('🔍 Using Rubix ML (advanced)');
                    return app(PHPMachineLearning::class);
                } else {
                    $this->info('🔍 Using Simple ML (fallback)');
                    return app(SimpleMLService::class);
                }
        }
    }

    private function getModelType($serviceClass)
    {
        if (str_contains($serviceClass, 'SimpleMLService')) {
            return 'simple_logistic';
        } elseif (str_contains($serviceClass, 'PHPMachineLearning')) {
            return 'rubix_hybrid';
        } else {
            return 'unknown';
        }
    }

    private function showDataDistribution($trainingData)
    {
        $positive = count(array_filter($trainingData, function($item) {
            return ($item['was_assigned'] ?? 0) === 1;
        }));
        
        $negative = count(array_filter($trainingData, function($item) {
            return ($item['was_assigned'] ?? 0) === 0;
        }));
        
        $this->info("📊 Data distribution:");
        $this->info("   ✅ Positive (assigned): " . $positive . " (" . round($positive / count($trainingData) * 100, 1) . "%)");
        $this->info("   ❌ Negative (not assigned): " . $negative . " (" . round($negative / count($trainingData) * 100, 1) . "%)");
        
        // Count priority features if present
        $withPriority = 0;
        $priorityCategories = [];
        
        foreach ($trainingData as $item) {
            if (($item['priority_count'] ?? 0) > 0) {
                $withPriority++;
            }
            
            // Count priority categories
            foreach ($item as $key => $value) {
                if (str_starts_with($key, 'priority_') && $key !== 'priority_boost' && $key !== 'priority_count') {
                    if ($value > 0) {
                        $category = str_replace('priority_', '', $key);
                        if (!isset($priorityCategories[$category])) {
                            $priorityCategories[$category] = 0;
                        }
                        $priorityCategories[$category]++;
                    }
                }
            }
        }
        
        if ($withPriority > 0) {
            $this->info("🎯 With priority features: " . $withPriority . " (" . round($withPriority / count($trainingData) * 100, 1) . "%)");
        }
        
        if (!empty($priorityCategories)) {
            $this->info("📋 Priority category distribution:");
            foreach ($priorityCategories as $category => $count) {
                $this->info("   - " . ucfirst(str_replace('_', ' ', $category)) . ": " . $count);
            }
        }
    }

    private function showFeatureImportance($mlService)
    {
        try {
            $importances = $mlService->getFeatureImportance();
            
            if (empty($importances)) {
                return;
            }
            
            $this->info("");
            $this->info("⚖️ Feature Importance:");
            
            $tableData = [];
            foreach ($importances as $feature => $data) {
                $tableData[] = [
                    'Feature' => $feature,
                    'Weight' => round($data['weight'] ?? $data, 4),
                    'Importance' => isset($data['importance_percent']) ? 
                        round($data['importance_percent'], 2) . '%' : 'N/A'
                ];
            }
            
            // Sort by absolute importance
            usort($tableData, function($a, $b) {
                return abs($b['Weight']) <=> abs($a['Weight']);
            });
            
            $this->table(['Feature', 'Weight', 'Importance'], $tableData);
            
            // Highlight priority features
            $priorityFeatures = array_filter($tableData, function($row) {
                return str_starts_with($row['Feature'], 'priority_');
            });
            
            if (!empty($priorityFeatures)) {
                $this->info("🎯 Priority feature summary:");
                foreach ($priorityFeatures as $feature) {
                    $this->info("   - {$feature['Feature']}: weight = " . round($feature['Weight'], 4));
                }
            }
            
        } catch (\Exception $e) {
            $this->warn("⚠️ Could not get feature importance: " . $e->getMessage());
        }
    }

    private function showFeatureWeights($weights)
    {
        if (empty($weights)) {
            return;
        }
        
        $this->info("");
        $this->info("⚖️ Feature Weights:");
        
        $tableData = [];
        foreach ($weights as $feature => $weight) {
            $tableData[] = [
                'Feature' => $feature,
                'Weight' => round($weight, 4),
                'Impact' => $weight > 0 ? 'Positive' : ($weight < 0 ? 'Negative' : 'Neutral')
            ];
        }
        
        // Sort by absolute weight
        usort($tableData, function($a, $b) {
            return abs($b['Weight']) <=> abs($a['Weight']);
        });
        
        $this->table(['Feature', 'Weight', 'Impact'], $tableData);
    }

    private function showPriorityStatistics($stats)
    {
        $this->info("");
        $this->info("📊 Priority Statistics:");
        
        $tableData = [
            ['Total Assignments', $stats['total_assignments'] ?? 0],
            ['Assignments with Priority', $stats['assignments_with_priority'] ?? 0],
            ['Assignments without Priority', $stats['assignments_without_priority'] ?? 0],
            ['Priority Assignment Rate', $stats['total_assignments'] > 0 ? 
                round(($stats['assignments_with_priority'] / $stats['total_assignments']) * 100, 1) . '%' : '0%'],
            ['Average Priority Boost', round($stats['avg_priority_boost'] ?? 0, 2)],
        ];
        
        $this->table(['Metric', 'Value'], $tableData);
        
        if (!empty($stats['priority_categories'])) {
            $this->info("📋 Priority Category Distribution:");
            $categoryTable = [];
            foreach ($stats['priority_categories'] as $category => $count) {
                $categoryTable[] = [
                    'Category' => ucfirst(str_replace('_', ' ', $category)),
                    'Count' => $count,
                    'Percentage' => $stats['total_assignments'] > 0 ? 
                        round(($count / $stats['total_assignments']) * 100, 1) . '%' : '0%'
                ];
            }
            
            $this->table(['Category', 'Count', 'Percentage'], $categoryTable);
        }
        
        if (!empty($stats['success_rate_by_category'])) {
            $this->info("🎯 Success Rate by Priority Category:");
            $successTable = [];
            foreach ($stats['success_rate_by_category'] as $category => $rate) {
                $successTable[] = [
                    'Category' => ucfirst(str_replace('_', ' ', $category)),
                    'Success Rate' => round($rate, 1) . '%'
                ];
            }
            
            $this->table(['Category', 'Success Rate'], $successTable);
        }
    }

    private function showPriorityAnalysis($mlService, $dataService)
    {
        $this->info("");
        $this->info("📈 Priority Impact Analysis:");
        
        // Get current model weights/importance
        if (method_exists($mlService, 'getFeatureImportance')) {
            $importances = $mlService->getFeatureImportance();
            $priorityWeights = [];
            
            foreach ($importances as $feature => $data) {
                if (str_starts_with($feature, 'priority_')) {
                    $weight = $data['weight'] ?? $data;
                    $priorityWeights[$feature] = $weight;
                }
            }
            
            if (!empty($priorityWeights)) {
                $this->info("⚖️ Current priority feature weights:");
                arsort($priorityWeights);
                
                foreach ($priorityWeights as $feature => $weight) {
                    $category = str_replace('priority_', '', $feature);
                    $this->info("   - " . ucfirst(str_replace('_', ' ', $category)) . ": " . round($weight, 4));
                }
            }
        }
        
        // Get priority statistics
        $stats = $dataService->getPriorityStatistics($this->option('days'));
        
        $this->info("📊 Priority assignment analysis:");
        if ($stats['total_assignments'] > 0) {
            $priorityRate = ($stats['assignments_with_priority'] / $stats['total_assignments']) * 100;
            $this->info("   - Priority assignment rate: " . round($priorityRate, 1) . "%");
            
            if ($stats['avg_priority_boost'] > 0) {
                $this->info("   - Average priority boost: " . round($stats['avg_priority_boost'], 2));
            }
        }
    }
}       