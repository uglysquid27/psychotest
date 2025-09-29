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
       Schema::create('work_equipments', function (Blueprint $table) {
            $table->id();
            // $table->unsignedBigInteger('emp_id'); // employee id
            $table->integer('amount');
            $table->string('size');
            $table->string('type');
            $table->string('photo')->nullable(); // simpan path foto
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_equipments');
    }
};
