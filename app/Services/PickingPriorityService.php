<?php
// app/Services/PickingPriorityService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePickingPriority;

class PickingPriorityService
{
    /**
     * Check if employee has any priority (simple boolean check)
     */
    public function hasPriority(Employee $employee): bool
    {
        return $employee->pickingPriorities()->exists();
    }

    /**
     * Get all employees with priority (simple list)
     */
    public function getEmployeesWithPriority()
    {
        return Employee::whereHas('pickingPriorities')
            ->with(['subSections.section'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Add priority to employee (no category needed)
     */
    public function addPriority(array $data): EmployeePickingPriority
    {
        return EmployeePickingPriority::create([
            'employee_id' => $data['employee_id'],
            'category' => 'priority', // Fixed category
            'metadata' => $data['metadata'] ?? [
                'added_at' => now()->toDateString(),
                'added_by' => auth()->user()->name ?? 'System',
            ],
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * Remove priority from employee
     */
    public function removePriority(int $employeeId): bool
    {
        return EmployeePickingPriority::where('employee_id', $employeeId)
            ->delete() > 0;
    }

    /**
     * Get priority stats (simplified)
     */
    public function getStats(): array
    {
        $totalEmployees = Employee::count();
        $withPriority = Employee::whereHas('pickingPriorities')->count();
        $withoutPriority = $totalEmployees - $withPriority;
        
        return [
            'total_employees' => $totalEmployees,
            'with_priority' => $withPriority,
            'without_priority' => $withoutPriority,
            'priority_percentage' => $totalEmployees > 0 ? round(($withPriority / $totalEmployees) * 100, 2) : 0,
        ];
    }

    /**
     * Get category statistics (new method)
     */
    public function getCategoryStats(): array
    {
        return EmployeePickingPriority::selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();
    }

    /**
     * Sort employees by priority (priority employees first)
     */
    public function sortByPriority($employees)
    {
        return $employees->sortByDesc(function ($employee) {
            return $this->hasPriority($employee) ? 1 : 0;
        });
    }

    /**
     * Filter to show only priority employees
     */
    public function filterPriority($employees)
    {
        return $employees->filter(function ($employee) {
            return $this->hasPriority($employee);
        });
    }
}