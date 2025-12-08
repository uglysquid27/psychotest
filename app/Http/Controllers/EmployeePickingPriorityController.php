<?php
// app/Http/Controllers/EmployeePickingPriorityController.php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeePickingPriority;
use App\Services\PickingPriorityService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeePickingPriorityController extends Controller
{

public function index(Request $request)
{
    $employees = Employee::with(['pickingPriorities', 'subSections.section'])
        ->whereHas('pickingPriorities') // Only show employees with priorities
        ->when($request->search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%");
            });
        })
        ->when($request->category, function ($query, $category) {
            $query->whereHas('pickingPriorities', function ($q) use ($category) {
                $q->where('category', $category);
            });
        })
        ->orderBy('name')
        ->paginate(20);

    // Transform the data for the frontend
    $employees->getCollection()->transform(function ($employee) {
        return [
            'id' => $employee->id,
            'name' => $employee->name,
            'nik' => $employee->nik,
            'type' => $employee->type,
            'status' => $employee->status,
            'sub_sections' => $employee->subSections->map(function ($subSection) {
                return [
                    'id' => $subSection->id,
                    'name' => $subSection->name,
                    'section' => $subSection->section ? [
                        'id' => $subSection->section->id,
                        'name' => $subSection->section->name,
                    ] : null,
                ];
            }),
            'picking_priorities' => $employee->pickingPriorities->map(function ($priority) {
                return [
                    'id' => $priority->id,
                    'category' => $priority->category,
                    'category_name' => $priority->category_name,
                    'weight_multiplier' => $priority->weight_multiplier,
                    'metadata' => $priority->metadata,
                    'created_at' => $priority->created_at,
                ];
            }),
        ];
    });

    $categoryStats = $this->priorityService->getCategoryStats();

    return Inertia::render('EmployeePriorities/Index', [
        'employees' => $employees,
        'categoryStats' => $categoryStats,
        'filters' => $request->only(['search', 'category']),
    ]);
}

    // Add this method to EmployeePickingPriorityController.php
    public function create()
    {
        $employees = Employee::with(['subSections.section'])
            ->whereDoesntHave('pickingPriorities') // Show only employees without priorities
            ->orderBy('name')
            ->get()
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'nik' => $employee->nik,
                    'type' => $employee->type,
                    'gender' => $employee->gender,
                    'status' => $employee->status,
                    'sub_sections' => $employee->subSections->map(function ($subSection) {
                        return [
                            'id' => $subSection->id,
                            'name' => $subSection->name,
                            'section' => $subSection->section->name ?? null,
                        ];
                    }),
                ];
            });

        return Inertia::render('EmployeePriorities/Create', [
            'employees' => $employees,
        ]);
    }

    protected $priorityService;

    public function __construct(PickingPriorityService $priorityService)
    {
        $this->priorityService = $priorityService;
    }

    // In EmployeePickingPriorityController.php, update the store method:
   public function store(Request $request)
{
    $validated = $request->validate([
        'employee_id' => 'required|exists:employees,id',
    ]);

    try {
        // Check if employee already has priority
        $existingPriority = EmployeePickingPriority::where('employee_id', $validated['employee_id'])->first();
        
        if ($existingPriority) {
            return redirect()->back()
                ->with('error', 'This employee already has priority.');
        }

        // Simple priority - no category needed
        $this->priorityService->addPriority([
            'employee_id' => $validated['employee_id']
        ]);
        
        return redirect()->route('employee-picking-priorities.index')
            ->with('success', 'Priority added successfully');
    } catch (\Exception $e) {
        return redirect()->back()
            ->with('error', 'Failed to add priority: ' . $e->getMessage());
    }
}

    public function destroy(Request $request, $id)
    {
        $validated = $request->validate([
            'category' => 'required|string',
        ]);

        try {
            $this->priorityService->removePriority($id, $validated['category']);

            return redirect()->back()
                ->with('success', 'Priority removed successfully');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to remove priority: ' . $e->getMessage());
        }
    }

    public function categories()
    {
        $categories = $this->priorityService->getCategoryStats();

        $employeesByCategory = [];
        foreach ($categories as $key => $category) {
            $employeesByCategory[$key] = Employee::whereHas('pickingPriorities', function ($q) use ($key) {
                $q->where('category', $key);
            })->with(['subSections.section'])->get();
        }

        return Inertia::render('EmployeePriorities/Categories', [
            'categories' => $categories,
            'employeesByCategory' => $employeesByCategory,
        ]);
    }
}