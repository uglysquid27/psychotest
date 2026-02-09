<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ketelitian_test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Test results
            $table->integer('score')->default(0);
            $table->integer('total_questions')->default(0);
            $table->integer('correct_answers')->default(0);
            $table->integer('wrong_answers')->default(0);
            $table->integer('unanswered')->default(0);
            
            // Timing
            $table->integer('time_elapsed')->default(0); // in seconds
            
            // Performance metrics
            $table->decimal('percentage', 5, 2)->default(0.00);
            
            // Detailed data
            $table->json('answers')->nullable(); // Store user answers
            $table->json('questions')->nullable(); // Store questions data
            $table->json('performance_by_question')->nullable(); // Performance per question
            
            // Additional metrics
            $table->decimal('accuracy', 5, 2)->default(0.00);
            $table->decimal('completion_rate', 5, 2)->default(0.00);
            $table->decimal('average_time_per_question', 5, 2)->nullable();
            
            // Test metadata
            $table->string('test_version')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // Indexes for better query performance
            $table->index(['user_id', 'created_at']);
            $table->index('score');
            $table->index('percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ketelitian_test_results');
    }
};