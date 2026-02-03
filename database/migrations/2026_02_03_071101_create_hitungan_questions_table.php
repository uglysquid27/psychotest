<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('hitungan_questions', function (Blueprint $table) {
            $table->id();
            $table->text('question'); // The arithmetic question
            $table->decimal('answer', 10, 2); // The correct answer
            $table->boolean('is_active')->default(true);
            $table->integer('difficulty_level')->default(1); // 1-3
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('hitungan_questions');
    }
};