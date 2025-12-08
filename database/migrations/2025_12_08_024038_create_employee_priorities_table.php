<?php
// database/migrations/[timestamp]_create_employee_picking_priorities_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_picking_priorities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('category'); // Required field: e.g., 'skill_certified', 'senior', 'special_project'
            $table->json('metadata')->nullable(); // Additional data as JSON
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Allow multiple priorities per employee, but unique category per employee
            $table->unique(['employee_id', 'category']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_picking_priorities');
    }
};