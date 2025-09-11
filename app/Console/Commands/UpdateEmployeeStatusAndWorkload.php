<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Models\Schedule;
use App\Models\Workload;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UpdateEmployeeStatusAndWorkload extends Command
{
    protected $signature = 'employees:update-status-workload';
    protected $description = 'Update employee status to available and calculate workloads based on manpower requests';

    public function handle()
    {
        // Check if this cron job is enabled
        $cronJobSetting = DB::table('cron_job_settings')
            ->where('command', $this->signature)
            ->first();

        if (!$cronJobSetting || !$cronJobSetting->is_enabled) {
            $this->info('Cron job is disabled. Skipping execution.');
            Log::info('Cron job employees:update-status-workload is disabled. Skipping execution.');
            return 0;
        }

        try {
            DB::beginTransaction();

            // Update all employee statuses to 'available'
            $updatedCount = Employee::where('status', '!=', 'available')
                    ->update(['status' => 'available']);

            $this->info("Employee statuses updated to available: {$updatedCount} employees affected");

            // Calculate workloads for current week
            $currentWeekStart = Carbon::now()->startOfWeek();
            $currentWeekEnd = Carbon::now()->endOfWeek();

            // Get all employees with valid NIK
            $employees = Employee::whereNotNull('nik')->get();
            
            $employeesWithNullNik = Employee::whereNull('nik')->count();
            $this->info("Skipping {$employeesWithNullNik} employees with null NIK");
            $this->info("Processing {$employees->count()} employees for workload calculation");

            $processedCount = 0;
            $createdCount = 0;
            $updatedCount = 0;

            foreach ($employees as $employee) {
                // Get all schedules for this employee in the current week
                $weeklySchedules = Schedule::where('employee_id', $employee->id)
                    ->whereBetween('date', [$currentWeekStart, $currentWeekEnd])
                    ->where('status', 'accepted') // Only count accepted schedules
                    ->get();

                // Get unique manpower request IDs from weekly schedules
                $weeklyManPowerIds = $weeklySchedules->pluck('man_power_request_id')->unique();
                
                // Calculate weekly work count (number of unique manpower requests this week)
                $weeklyWorkCount = $weeklyManPowerIds->count();

                // Calculate total work count (all time unique manpower requests)
                $totalSchedules = Schedule::where('employee_id', $employee->id)
                    ->where('status', 'accepted')
                    ->get();
                
                $totalManPowerIds = $totalSchedules->pluck('man_power_request_id')->unique();
                $totalWorkCount = $totalManPowerIds->count();

                // Calculate workload point based on weekly work count
                $workloadPoint = $this->calculateWorkloadPoint($weeklyWorkCount);

                // Check if workload record exists for this employee
                $existingWorkload = Workload::where('employee_id', $employee->id)->first();

                if ($existingWorkload) {
                    // Update existing record
                    $existingWorkload->update([
                        'nik' => $employee->nik,
                        'week' => $weeklyWorkCount,
                        'total_work_count' => $totalWorkCount,
                        'workload_point' => $workloadPoint
                    ]);
                    $updatedCount++;
                } else {
                    // Create new record if it doesn't exist
                    Workload::create([
                        'employee_id' => $employee->id,
                        'nik' => $employee->nik,
                        'week' => $weeklyWorkCount,
                        'total_work_count' => $totalWorkCount,
                        'workload_point' => $workloadPoint
                    ]);
                    $createdCount++;
                }

                $processedCount++;
                $this->line("Processed employee: {$employee->name} (NIK: {$employee->nik}) - Weekly: {$weeklyWorkCount}, Total: {$totalWorkCount}, Point: {$workloadPoint}");
            }

            // Handle employees that might have been removed but still exist in workload table
            $this->syncWorkloadTable($employees);

            DB::commit();
            
            $this->info("Workload update completed!");
            $this->info("Processed: {$processedCount} employees");
            $this->info("Created: {$createdCount} new workload records");
            $this->info("Updated: {$updatedCount} existing workload records");
            
            Log::info("Employee status and workload update completed: {$processedCount} processed, {$createdCount} created, {$updatedCount} updated");

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error updating data: ' . $e->getMessage());
            Log::error('Error updating employee status and workloads: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
        }
    }

    /**
     * Sync workload table - remove records for employees that no longer exist
     * or have null NIK, and add missing records
     */
    private function syncWorkloadTable($currentEmployees)
    {
        // Get all employee IDs that should exist in workload table
        $validEmployeeIds = $currentEmployees->pluck('id')->toArray();

        // Remove workload records for employees that no longer exist or have null NIK
        $deletedCount = Workload::whereNotIn('employee_id', $validEmployeeIds)
            ->orWhereNull('nik')
            ->delete();

        if ($deletedCount > 0) {
            $this->info("Removed {$deletedCount} orphaned workload records");
        }

        // Find employees that are missing from workload table and create records for them
        $existingWorkloadEmployeeIds = Workload::pluck('employee_id')->toArray();
        $missingEmployees = Employee::whereNotNull('nik')
            ->whereNotIn('id', $existingWorkloadEmployeeIds)
            ->get();

        $newlyAddedCount = 0;
        foreach ($missingEmployees as $employee) {
            // Create default workload record for missing employees
            Workload::create([
                'employee_id' => $employee->id,
                'nik' => $employee->nik,
                'week' => 0,
                'total_work_count' => 0,
                'workload_point' => 1 // Default to low workload
            ]);
            $newlyAddedCount++;
        }

        if ($newlyAddedCount > 0) {
            $this->info("Added {$newlyAddedCount} missing employees to workload table");
        }
    }

    private function calculateWorkloadPoint($weeklyWorkCount)
    {
        if ($weeklyWorkCount <= 2) {
            return 1; // Low workload
        } elseif ($weeklyWorkCount <= 4) {
            return 2; // Medium workload
        } else {
            return 3; // High workload
        }
    }
}