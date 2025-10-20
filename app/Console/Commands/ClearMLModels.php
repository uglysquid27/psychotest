<?php
// app/Console/Commands/ClearMLModels.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TrainedModel;
use App\Services\PHPMachineLearning;
use App\Services\SimpleMLService;
use Illuminate\Support\Facades\File;

class ClearMLModels extends Command
{
    protected $signature = 'ml:clear {--force : Skip confirmation}';
    
    protected $description = 'Clear all ML models and training data';

    public function handle()
    {
        if (!$this->option('force')) {
            $this->warn('⚠️  This will delete ALL ML models and cannot be undone!');
            if (!$this->confirm('❓ Are you sure you want to continue?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('🗑️ Clearing ML models...');
        $this->line('');

        $deletedItems = [];

        // Clear database models
        $dbCount = TrainedModel::count();
        if ($dbCount > 0) {
            TrainedModel::truncate();
            $deletedItems[] = "Database models: {$dbCount} records";
        }

        // Clear Rubix ML models
        try {
            $rubixService = app(PHPMachineLearning::class);
            if ($rubixService->deleteModels()) {
                $deletedItems[] = "Rubix ML models";
            }
        } catch (\Exception $e) {
            $this->warn('⚠️ Could not clear Rubix ML models: ' . $e->getMessage());
        }

        // Clear Simple ML models
        try {
            $modelFile = storage_path('app/ml_models/simple_ml_model.json');
            if (file_exists($modelFile)) {
                unlink($modelFile);
                $deletedItems[] = "Simple ML model";
            }
        } catch (\Exception $e) {
            $this->warn('⚠️ Could not clear Simple ML model file: ' . $e->getMessage());
        }

        // Clear any other model files
        $modelDir = storage_path('app/ml_models/');
        if (is_dir($modelDir)) {
            $files = glob($modelDir . '*.rbx');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                    $deletedItems[] = "Model file: " . basename($file);
                }
            }
            
            // Clear status file
            $statusFile = $modelDir . 'training_status.json';
            if (file_exists($statusFile)) {
                unlink($statusFile);
            }
        }

        if (empty($deletedItems)) {
            $this->info('✅ No ML models found to clear.');
        } else {
            $this->info('✅ Successfully cleared:');
            foreach ($deletedItems as $item) {
                $this->info("   - {$item}");
            }
        }

        $this->line('');
        $this->info('💡 Run "php artisan ml:train" to train new models.');

        return 0;
    }
}