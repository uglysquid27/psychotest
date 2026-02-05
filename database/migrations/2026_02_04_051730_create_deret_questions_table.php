<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('deret_questions', function (Blueprint $table) {
            $table->id();
            $table->json('sequence'); // Store array of numbers with null for missing value
            $table->integer('answer'); // Correct answer for the missing value
            $table->string('pattern_type')->nullable()->default('arithmetic'); // Arithmetic, geometric, etc.
            $table->integer('difficulty_level')->default(1); // 1: Easy, 2: Medium, 3: Hard
            $table->boolean('is_active')->default(true);
            $table->text('explanation')->nullable(); // Explanation of the pattern
            $table->timestamps();
            
            // Add index for performance
            $table->index('is_active');
            $table->index('difficulty_level');
        });
    }

    public function down()
    {
        Schema::dropIfExists('deret_questions');
    }
};