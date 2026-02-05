<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('deret_test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('score');
            $table->integer('total_questions');
            $table->integer('correct_answers');
            $table->integer('wrong_answers');
            $table->integer('unanswered');
            $table->integer('time_elapsed'); // in seconds
            $table->decimal('percentage', 5, 2);
            $table->json('answers'); // Store user answers
            $table->json('questions_used')->nullable(); // Store which questions were used
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('deret_test_results');
    }
};