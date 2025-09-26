<?php
// [file name]: EquipmentController.php

namespace App\Http\Controllers;

use App\Models\WorkEquipment;
use App\Models\Handover;
use App\Models\Employee;
use App\Models\SubSection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class EquipmentController extends Controller
{
    public function index()
    {
        $equipments = WorkEquipment::orderBy('type')->get();

        return Inertia::render('apd/Index', [
            'equipments' => $equipments,
        ]);
    }

    public function create()
    {
        return Inertia::render('apd/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|max:255',
            'amount' => 'nullable|integer|min:0',
            'size' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        if ($validated['size'])
            $validated['amount'] = null;

        $equipment = WorkEquipment::create($validated);

        Log::info('New equipment created', ['id' => $equipment->id, 'data' => $validated]);

        return redirect()->route('equipments.index')->with('success', 'Equipment created successfully.');
    }

    public function update(Request $request, WorkEquipment $equipment)
    {
        $validated = $request->validate([
            'type' => 'required|string|max:255',
            'amount' => 'nullable|integer|min:0',
            'size' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        if ($validated['size'])
            $validated['amount'] = null;

        $equipment->update($validated);

        Log::info('Equipment updated', ['id' => $equipment->id, 'data' => $validated]);

        return redirect()->route('equipments.index')->with('success', 'Equipment updated successfully.');
    }

    public function destroy(WorkEquipment $equipment)
    {
        $equipment->delete();

        return redirect()->route('equipments.index')->with('success', 'Equipment deleted successfully.');
    }

    // 👇 NEW METHOD: Get employees for assign modal
  public function getEmployeesForAssign(Request $request)
{
    try {
        $equipmentId = $request->input('equipment_id');
        $selectedSize = $request->input('size');
        $search = $request->input('search');
        $section = $request->input('section');
        $subsection = $request->input('subsection');
        $page = $request->input('page', 1);

        // Validate equipment_id is provided
        if (!$equipmentId) {
            return response()->json([
                'error' => 'Equipment ID is required'
            ], 400);
        }

        // Validate equipment exists
        $equipment = WorkEquipment::find($equipmentId);
        if (!$equipment) {
            return response()->json([
                'error' => 'Equipment not found'
            ], 404);
        }

        // Fix: Use correct relationship names
        $employees = Employee::with(['handover' => function($q) use ($equipmentId, $selectedSize) {
                $q->where('equipment_id', $equipmentId);
                if ($selectedSize) {
                    $q->where('size', $selectedSize);
                }
            }])
            ->with(['subSections.section'])
            ->when($search, function($q) use ($search) {
                $q->where(function($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                          ->orWhere('nik', 'like', "%{$search}%");
                });
            })
            ->when($section, function($q) use ($section) {
                $q->whereHas('subSections.section', function($query) use ($section) {
                    $query->where('id', $section);
                });
            })
            ->when($subsection, function($q) use ($subsection) {
                $q->whereHas('subSections', function($query) use ($subsection) {
                    $query->where('id', $subsection);
                });
            })
            ->paginate(10, ['*'], 'page', $page);

        $sections = SubSection::with('section')->get()->groupBy('section.name');

        return response()->json([
            'employees' => $employees,
            'sections' => $sections,
            'selectedSize' => $selectedSize,
        ]);

    } catch (\Exception $e) {
        \Log::error('Error in getEmployeesForAssign: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'error' => 'Server error: ' . $e->getMessage()
        ], 500);
    }
}

    // 👇 NEW METHOD: Store assignment from modal
public function assignStoreModal(Request $request)
{
    try {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'equipment_id' => 'required|exists:work_equipments,id',
            'photo' => 'nullable|string', // Make photo optional
            'size' => 'nullable|string',
        ]);

        $handover = Handover::updateOrCreate(
            [
                'employee_id' => $request->employee_id,
                'equipment_id' => $request->equipment_id,
                'size' => $request->size,
            ],
            [
                'date' => now(),
                'photo' => $request->photo, // Can be null
            ]
        );

        return response()->json([
            'success' => true, 
            'message' => 'Equipment assigned successfully.',
            'handover' => $handover
        ]);

    } catch (\Exception $e) {
        \Log::error('Error in assignStoreModal: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to assign equipment: ' . $e->getMessage()
        ], 500);
    }
}

    // 👇 KEEP EXISTING METHODS for backward compatibility
public function assignPage(Request $request, $id)
{
    $equipment = WorkEquipment::findOrFail($id);
    $selectedSize = $request->input('size');

    // Only get employees who already have handovers for this equipment
    $employees = Employee::whereHas('handovers', function($q) use ($id, $selectedSize) {
            $q->where('equipment_id', $id);
            if ($selectedSize) {
                $q->where('size', $selectedSize);
            }
        })
        ->with(['handovers' => function($q) use ($id, $selectedSize) {
            $q->where('equipment_id', $id);
            if ($selectedSize) {
                $q->where('size', $selectedSize);
            }
        }])
        ->when($request->search, function($q) use ($request) {
            $q->where(function($query) use ($request) {
                $query->where('name', 'like', "%{$request->search}%")
                      ->orWhere('nik', 'like', "%{$request->search}%");
            });
        })
        ->paginate(10)
        ->withQueryString();

    return inertia('apd/Assign', [
        'equipment' => $equipment,
        'employees' => $employees,
        'selectedSize' => $selectedSize,
        'filters' => $request->only('search'),
    ]);
}

    public function assignStore(Request $request, $id)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'photo' => 'nullable|string',
            'size' => 'nullable|string',
        ]);

        $handover = Handover::updateOrCreate(
            [
                'employee_id' => $request->employee_id,
                'equipment_id' => $id,
                'size' => $request->size,
            ],
            [
                'date' => now(),
                'photo' => $request->photo,
            ]
        );

        return redirect()->route('equipments.assign.page', [
            'equipment' => $id,
            'size' => $request->size,
        ])->with('success', 'Handover saved successfully.');
    }

    public function handoverUpdate(Request $request, Handover $handover)
    {
        $request->validate([
            'photo' => 'required|string',
        ]);

        $handover->update([
            'photo' => $request->photo,
            'date' => now()->toDateString(),
        ]);

        return back()->with('success', 'Handover updated.');
    }
}