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
    protected $description = 'Update employee status to available and calculate workloads';

    public function handle()
    {
        try {
            DB::beginTransaction();

            // Update all employee statuses to 'available'
            $updatedCount = Employee::where('status', '!=', 'available')
                    ->update(['status' => 'available']);

            $this->info("Employee statuses updated to available: {$updatedCount} employees affected");

            // Calculate workloads
            $currentWeekStart = Carbon::now()->startOfWeek();
            $currentWeekEnd = Carbon::now()->endOfWeek();

            // Only process employees with valid NIK
            $employees = Employee::whereNotNull('nik')
                ->with([
                    'schedules' => function ($query) use ($currentWeekStart, $currentWeekEnd) {
                        $query->whereBetween('date', [$currentWeekStart, $currentWeekEnd]);
                    }
                ])->get();

            $employeesWithNullNik = Employee::whereNull('nik')->count();
            $this->info("Skipping {$employeesWithNullNik} employees with null NIK");

            $this->info("Processing {$employees->count()} employees for workload calculation");

            foreach ($employees as $employee) {
                // Calculate total work count (all time)
                $totalWorkCount = Schedule::where('employee_id', $employee->id)->count();

                // Calculate weekly work count (from preloaded schedules)
                $weeklyWorkCount = $employee->schedules->count();

                // Calculate workload point based on weekly work count
                $workloadPoint = $this->calculateWorkloadPoint($weeklyWorkCount);

                // Update existing record or create if doesn't exist
                Workload::updateOrCreate(
                    ['employee_id' => $employee->id],
                    [
                        'nik' => $employee->nik,
                        'week' => $weeklyWorkCount,
                        'total_work_count' => $totalWorkCount,
                        'workload_point' => $workloadPoint
                    ]
                );

                $this->line("Updated workload for employee: {$employee->name} (NIK: {$employee->nik})");
            }

            DB::commit();
            $this->info('Workload data updated successfully for employees with valid NIK');
            Log::info('Employee status and workload update completed successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error updating data: ' . $e->getMessage());
            Log::error('Error updating employee status and workloads: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
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