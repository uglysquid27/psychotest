<?php
// database/migrations/xxxx_xx_xx_xxxxxx_create_employee_test_assignments_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_test_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('nik');
            $table->string('test_type'); // 'kraepelin', 'ketelitian', 'hitungan', 'deret'
            $table->string('test_name');
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->string('status')->default('assigned'); // assigned, in_progress, completed, expired
            $table->timestamp('due_date')->nullable();
            $table->integer('score')->nullable();
            $table->decimal('percentage', 5, 2)->nullable();
            $table->json('test_data')->nullable(); // Store any test-specific data
            $table->json('results')->nullable(); // Store test results
            $table->integer('attempts')->default(0);
            $table->timestamp('last_attempt_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('nik');
            $table->index(['nik', 'test_type']);
            $table->index('status');
            $table->index(['nik', 'status']);
            
            // Foreign key constraint
            $table->foreign('nik')->references('nik')->on('employees')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_test_assignments');
    }
};