<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Models\Permit;
use App\Models\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ResetEmployeeCutiStatus extends Command
{
    protected $signature = 'employees:reset-cuti-status';
    protected $description = 'Reset cuti status to "no" for employees whose leave period has ended or had rejected schedules yesterday';

    public function handle()
    {
        // Check if this cron job is enabled
        $cronJobSetting = DB::table('cron_job_settings')
            ->where('command', $this->signature)
            ->first();

        if (!$cronJobSetting || !$cronJobSetting->is_enabled) {
            $this->info('Cron job is disabled. Skipping execution.');
            \Log::info('Cron job employees:reset-cuti-status is disabled. Skipping execution.');
            return 0;
        }

        $today = Carbon::today();
        $yesterday = $today->copy()->subDay();
        $updatedCount = 0;

        // Find all approved permits that have ended (end_date is before today)
        $endedPermits = Permit::where('status', 'approved')
            ->where('permit_type', 'cuti') // Only process cuti type permits
            ->whereDate('end_date', '<', $today)
            ->with('employee')
            ->get();

        foreach ($endedPermits as $permit) {
            // Check if the employee still has cuti status as "yes"
            if ($permit->employee && $permit->employee->cuti === 'yes') {
                // Reset the cuti status to "no"
                $permit->employee->update(['cuti' => 'no']);
                $updatedCount++;
                
                $this->info("Reset cuti status for employee: {$permit->employee->name} (ID: {$permit->employee->id}) - Reason: Permit ended");
                \Log::info("Reset cuti status for employee: {$permit->employee->name} (ID: {$permit->employee->id}) - Permit ID: {$permit->id} - Reason: Permit ended");
            }
        }

        // Check for employees with rejected schedules yesterday
        $rejectedSchedules = Schedule::where('status', 'rejected')
            ->whereDate('date', $yesterday)
            ->with('employee')
            ->get();

        foreach ($rejectedSchedules as $schedule) {
            // Check if the employee exists and has cuti status as "yes"
            if ($schedule->employee && $schedule->employee->cuti === 'yes') {
                // Reset the cuti status to "no"
                $schedule->employee->update(['cuti' => 'no']);
                $updatedCount++;
                
                $this->info("Reset cuti status for employee: {$schedule->employee->name} (ID: {$schedule->employee->id}) - Reason: Rejected schedule yesterday");
                \Log::info("Reset cuti status for employee: {$schedule->employee->name} (ID: {$schedule->employee->id}) - Schedule ID: {$schedule->id} - Reason: Rejected schedule yesterday");
            }
        }

        $this->info("Successfully reset cuti status for {$updatedCount} employees");
        \Log::info("Employee cuti status reset completed: {$updatedCount} employees affected");
        
        return 0;
    }
}