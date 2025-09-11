<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class ResetEmployeeStatus extends Command
{
    protected $signature = 'employees:reset-status';
    protected $description = 'Reset all employee statuses to available';

    public function handle()
    {
        // Check if this cron job is enabled
        $cronJobSetting = DB::table('cron_job_settings')
            ->where('command', $this->signature)
            ->first();

        if (!$cronJobSetting || !$cronJobSetting->is_enabled) {
            $this->info('Cron job is disabled. Skipping execution.');
            \Log::info('Cron job employees:reset-status is disabled. Skipping execution.');
            return 0;
        }

        $updatedCount = Employee::where('status', '!=', 'available')
            ->where('status', '!=', 'deactivated') // Exclude deactivated employees
            ->update(['status' => 'available']);
            
        $this->info("Successfully reset {$updatedCount} employee statuses to 'available'");
        \Log::info("Employee statuses reset to available: {$updatedCount} employees affected");
        
        return 0;
    }
}