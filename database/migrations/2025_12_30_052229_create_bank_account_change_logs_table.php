<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bank_account_change_logs', function (Blueprint $table) {
            $table->id();
            $table->string('nik')->index();
            $table->string('old_account_number')->nullable();
            $table->string('old_bank')->nullable();
            $table->string('new_account_number');
            $table->string('new_bank');
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->text('remarks')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('employees');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('bank_account_change_logs');
    }
};