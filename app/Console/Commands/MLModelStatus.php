<?php
// app/Console/Commands/MLModelStatus.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TrainedModel;
use App\Services\PHPMachineLearning;
use App\Services\SimpleMLService;

class MLModelStatus extends Command
{
    protected $signature = 'ml:status';
    
    protected $description = 'Check the status of ML models';

    public function handle()
    {
        $this->info('🤖 ML Model Status Check');
        $this->line('');

        // Check database models
        $models = TrainedModel::orderBy('updated_at', 'desc')->get();
        
        if ($models->isEmpty()) {
            $this->warn('📭 No trained models found in database.');
        } else {
            $this->info('📊 Database Models:');
            
            $tableData = [];
            foreach ($models as $model) {
                $tableData[] = [
                    $model->id,
                    $model->model_name,
                    $model->model_type,
                    $model->accuracy ? round($model->accuracy * 100, 2) . '%' : 'N/A',
                    $model->train_data_count,
                    $model->is_active ? '✅' : '❌',
                    $model->updated_at->diffForHumans()
                ];
            }
            
            $this->table(
                ['ID', 'Name', 'Type', 'Accuracy', 'Samples', 'Active', 'Updated'],
                $tableData
            );
        }

        $this->line('');

        // Check file system models
        $this->info('💾 File System Models:');
        
        // Check Rubix ML models
        try {
            $rubixService = app(PHPMachineLearning::class);
            $rubixInfo = $rubixService->getModelInfo();
            $status = $rubixInfo['is_trained'] ? '✅ Trained' : '❌ Not trained';
            $this->info("🔧 Rubix ML: {$status}");
            
            if ($rubixInfo['is_trained'] && isset($rubixInfo['updated_at'])) {
                $this->info("   Last updated: {$rubixInfo['updated_at']}");
            }
        } catch (\Exception $e) {
            $this->error("🔧 Rubix ML: ❌ Service unavailable");
            $this->info("   Error: " . $e->getMessage());
        }

        // Check Simple ML models
        try {
            $simpleService = app(SimpleMLService::class);
            $status = $simpleService->isModelTrained() ? '✅ Trained' : '❌ Not trained';
            $this->info("🔧 Simple ML: {$status}");
            
            // Check if model file exists
            $modelFile = storage_path('app/ml_models/simple_ml_model.json');
            if (file_exists($modelFile)) {
                $fileTime = filemtime($modelFile);
                $this->info("   Last updated: " . date('Y-m-d H:i:s', $fileTime));
            }
        } catch (\Exception $e) {
            $this->error("🔧 Simple ML: ❌ Service unavailable");
            $this->info("   Error: " . $e->getMessage());
        }

        $this->line('');
        $this->info('💡 Available Commands:');
        $this->line('  php artisan ml:train           - Train model with default settings');
        $this->line('  php artisan ml:train --service=simple - Train with simple ML');
        $this->line('  php artisan ml:train --force    - Force retrain existing model');
        $this->line('  php artisan ml:clear            - Clear all models');
        
        $this->line('');
        $this->info('📝 Note: These commands are manually registered and work without Kernel.');
    }
}