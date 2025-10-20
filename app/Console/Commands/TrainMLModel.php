<?php
// app/Console/Commands/TrainMLModel.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\MLTrainingDataService;
use App\Models\TrainedModel;
use Illuminate\Support\Facades\Log;

class TrainMLModel extends Command
{
    protected $signature = 'ml:train 
                            {--days=90 : Number of days of historical data to use}
                            {--force : Force retrain even if model exists}
                            {--service=auto : ML service to use (rubix, simple, auto)}';
    
    protected $description = 'Train the ML model for manpower recommendations';

    public function handle()
    {
        $this->info('🚀 Starting ML Model Training');
        $this->line('');

        $serviceType = $this->option('service') ?? 'auto';
        $mlService = $this->getMLService($serviceType);
        
        if (!$mlService) {
            $this->error('❌ No suitable ML service found. Using simple ML service as fallback.');
            $mlService = app(\App\Services\SimpleMLService::class);
        }

        $dataService = app(MLTrainingDataService::class);

        // Check if model already exists
        if (!$this->option('force') && $mlService->isModelTrained()) {
            $this->info('✅ ML model is already trained. Use --force to retrain.');
            $this->info('📊 Model type: ' . get_class($mlService));
            return 0;
        }

        $this->info('📊 Collecting training data...');
        
        $trainingData = $dataService->collectTrainingData(
            $this->option('days')
        );

        if (count($trainingData) < 10) {
            $this->error('❌ Insufficient training data. Need at least 10 records.');
            $this->info('📝 Current records: ' . count($trainingData));
            $this->info('💡 Try running with more days: --days=180');
            return 1;
        }

        $this->info("📈 Collected " . count($trainingData) . " training records");
        $this->info("🤖 Training ML model using: " . get_class($mlService));

        $this->info('🚀 Training in progress...');
        
        $result = $mlService->train($trainingData);

        if ($result['success']) {
            // Save model metadata
            $modelType = $this->getModelType(get_class($mlService));
            
            TrainedModel::updateOrCreate(
                ['model_type' => $modelType],
                [
                    'model_name' => 'manpower_priority_' . $modelType . '_v' . time(),
                    'file_path' => $result['model_path'] ?? 'storage/app/ml_models/',
                    'accuracy' => $result['accuracy'] ?? 0.0,
                    'train_data_count' => $result['training_samples'],
                    'feature_importance' => $result['final_weights'] ?? $result['feature_importance'] ?? null,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            );

            $this->info("");
            $this->info("✅ Model trained successfully!");
            $this->info("🎯 Accuracy: " . round(($result['accuracy'] ?? 0) * 100, 2) . "%");
            $this->info("📚 Training records: " . $result['training_samples']);
            $this->info("🔧 Model type: " . $modelType);
            
            // Show feature weights if available
            if (isset($result['final_weights'])) {
                $this->info("");
                $this->info("⚖️ Feature weights:");
                foreach ($result['final_weights'] as $feature => $weight) {
                    $this->info("   - {$feature}: " . round($weight, 4));
                }
            }
            
            $this->info("");
            $this->info('💡 The model is now ready to use in your manpower requests!');
            
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
                    return app(\App\Services\PHPMachineLearning::class);
                }
                $this->warn('Rubix ML not available, falling back to simple ML...');
                return app(\App\Services\SimpleMLService::class);
                
            case 'simple':
                return app(\App\Services\SimpleMLService::class);
                
            case 'auto':
            default:
                // Try Rubix ML first, fallback to simple
                if (class_exists('Rubix\ML\Classifiers\RandomForest')) {
                    $this->info('🔍 Using Rubix ML (advanced)');
                    return app(\App\Services\PHPMachineLearning::class);
                } else {
                    $this->info('🔍 Using Simple ML (fallback)');
                    return app(\App\Services\SimpleMLService::class);
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
}