// database/migrations/xxxx_xx_xx_create_ketelitian_questions_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ketelitian_questions', function (Blueprint $table) {
            $table->id();
            $table->text('left_text'); // Text on the left side
            $table->text('right_text'); // Text on the right side
            $table->enum('answer', ['S', 'T']); // S for Same, T for Different
            $table->boolean('is_active')->default(true); // To enable/disable questions
            $table->integer('difficulty_level')->default(1); // 1-3: Easy, Medium, Hard
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ketelitian_questions');
    }
};