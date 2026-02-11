// database/migrations/xxxx_xx_xx_create_kraepelin_settings_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kraepelin_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('rows')->default(45);
            $table->integer('columns')->default(60);
            $table->integer('time_per_column')->default(15); // in seconds
            $table->enum('difficulty', ['mudah', 'sedang', 'sulit'])->default('sedang');
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kraepelin_settings');
    }
};