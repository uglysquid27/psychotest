<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('kraepelin_test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('kraepelin_test_id');
            $table->integer('score');
            $table->integer('total_questions');
            $table->integer('correct_answers');
            $table->integer('wrong_answers');
            $table->integer('unanswered');
            $table->integer('time_elapsed');
            $table->decimal('percentage', 5, 2);
            $table->json('test_data')->nullable();
            $table->json('answers')->nullable();
            $table->json('row_performance')->nullable();
            $table->json('column_performance')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('kraepelin_test_results');
    }
};