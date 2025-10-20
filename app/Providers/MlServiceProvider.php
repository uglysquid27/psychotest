<?php
// app/Providers/MLServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\PHPMachineLearning;
use App\Services\SimpleMLService;
use App\Services\MLTrainingDataService;

class MLServiceProvider extends ServiceProvider
{
    public function register()
    {
        // Register ML services
        $this->app->singleton(PHPMachineLearning::class, function ($app) {
            return new PHPMachineLearning();
        });

        $this->app->singleton(SimpleMLService::class, function ($app) {
            return new SimpleMLService();
        });

        $this->app->singleton(MLTrainingDataService::class, function ($app) {
            return new MLTrainingDataService();
        });

        // Register commands for manual execution
        $this->registerCommands();
    }

    public function boot()
    {
        // You can publish config if needed
        // $this->publishes([...], 'ml-service');
    }

    private function registerCommands()
    {
        // This makes commands available for manual execution
        // They won't appear in 'php artisan' list but can be executed directly
        $this->app->singleton('command.ml.train', function ($app) {
            return new \App\Console\Commands\TrainMLModel();
        });

        $this->app->singleton('command.ml.status', function ($app) {
            return new \App\Console\Commands\MLModelStatus();
        });

        $this->app->singleton('command.ml.clear', function ($app) {
            return new \App\Console\Commands\ClearMLModels();
        });
    }
}