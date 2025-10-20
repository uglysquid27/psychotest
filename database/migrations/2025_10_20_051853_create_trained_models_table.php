<?php
// database/migrations/2024_01_01_000000_create_trained_models_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTrainedModelsTable extends Migration
{
    public function up()
    {
        Schema::create('trained_models', function (Blueprint $table) {
            $table->id();
            $table->string('model_name');
            $table->string('model_type'); // 'rubix_hybrid', 'simple_logistic', etc.
            $table->string('file_path'); // Path to model file
            $table->decimal('accuracy', 5, 4)->nullable(); // 0.0000 to 1.0000
            $table->integer('train_data_count')->default(0);
            $table->json('feature_importance')->nullable(); // Store feature weights/importance
            $table->boolean('is_active')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Index for faster queries
            $table->index(['model_type', 'is_active']);
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('trained_models');
    }
}