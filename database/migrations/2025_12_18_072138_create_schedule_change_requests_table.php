<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('schedule_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('requested_status'); // accepted, rejected
            $table->string('current_status'); // Store current status before change
            $table->text('reason')->nullable();
            $table->string('approval_status')->default('pending'); // pending, approved, rejected
            $table->foreignId('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            $table->timestamps();
            
            $table->index(['approval_status', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('schedule_change_requests');
    }
};