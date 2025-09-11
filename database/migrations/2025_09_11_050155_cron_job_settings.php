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
        Schema::create('cron_job_settings', function (Blueprint $table) {
            $table->id();
            $table->string('job_name')->unique()->comment('The name of the cron job');
            $table->boolean('is_enabled')->default(true)->comment('Whether the cron job is enabled');
            $table->text('description')->nullable()->comment('Description of what the cron job does');
            $table->string('command')->nullable()->comment('The artisan command associated with the job');
            $table->timestamps();
        });

        // Insert default settings for the existing cron jobs
        DB::table('cron_job_settings')->insert([
            [
                'job_name' => 'reset_cuti_status',
                'is_enabled' => true,
                'description' => 'Reset cuti status to "no" for employees whose leave period has ended',
                'command' => 'employees:reset-cuti-status',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'job_name' => 'reset_employee_status',
                'is_enabled' => true,
                'description' => 'Reset all employee statuses to available',
                'command' => 'employees:reset-status',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'job_name' => 'update_status_and_workload',
                'is_enabled' => true,
                'description' => 'Update employee status to available and calculate workloads based on manpower requests',
                'command' => 'employees:update-status-workload',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cron_job_settings');
    }
};