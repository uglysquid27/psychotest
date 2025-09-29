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

    public function destroy(WorkEquipment $equipment)
    {
        $equipment->delete();

        return redirect()->route('equipments.index')->with('success', 'Equipment deleted successfully.');
    }

    // 👇 FIXED METHOD: Get employees for assign modal
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

            // FIXED: Use proper relationship and fix ambiguous column issue
            $employees = Employee::with(['handovers' => function($q) use ($equipmentId, $selectedSize) {
                    $q->where('equipment_id', $equipmentId);
                    if ($selectedSize) {
                        $q->where('size', $selectedSize);
                    }
                }])
                ->with(['subSections.section'])
                ->when($search, function($q) use ($search) {
                    $q->where(function($query) use ($search) {
                        // Exact match for NIK if it looks like a number
                        if (is_numeric($search)) {
                            $query->where('employees.nik', '=', $search) // Specify table
                                  ->orWhere('employees.name', 'like', "%{$search}%");
                        } else {
                            // Partial match for names
                            $query->where('employees.name', 'like', "%{$search}%")
                                  ->orWhere('employees.nik', 'like', "%{$search}%");
                        }
                    });
                })
                ->when($section, function($q) use ($section) {
                    // FIXED: Specify table for section filtering
                    $q->whereHas('subSections.section', function($query) use ($section) {
                        if (is_numeric($section)) {
                            $query->where('sections.id', $section); // Specify sections table
                        } else {
                            $query->where('sections.name', 'like', "%{$section}%");
                        }
                    });
                })
                ->when($subsection, function($q) use ($subsection) {
                    // FIXED: Specify table for subsection filtering
                    $q->whereHas('subSections', function($query) use ($subsection) {
                        if (is_numeric($subsection)) {
                            $query->where('sub_sections.id', $subsection); // Specify sub_sections table
                        } else {
                            $query->where('sub_sections.name', 'like', "%{$subsection}%");
                        }
                    });
                })
                ->paginate(10, ['*'], 'page', $page);

            // Fix sections data structure
            $allSections = SubSection::with('section')->get();
            $groupedSections = [];
            
            foreach ($allSections as $subSection) {
                if ($subSection->section) {
                    $sectionName = $subSection->section->name;
                    if (!isset($groupedSections[$sectionName])) {
                        $groupedSections[$sectionName] = [];
                    }
                    // FIXED: Return only the name for the dropdown
                    $groupedSections[$sectionName][] = $subSection->name;
                }
            }

            return response()->json([
                'employees' => $employees,
                'sections' => $groupedSections,
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|max:255',
            'amount' => 'nullable|integer|min:0',
            'size' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        // Auto-uppercase the type
        $validated['type'] = strtoupper($validated['type']);

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

        // Auto-uppercase the type
        $validated['type'] = strtoupper($validated['type']);

        if ($validated['size'])
            $validated['amount'] = null;

        $equipment->update($validated);

        Log::info('Equipment updated', ['id' => $equipment->id, 'data' => $validated]);

        return redirect()->route('equipments.index')->with('success', 'Equipment updated successfully.');
    }

    public function assignStoreModal(Request $request)
    {
        try {
            $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'equipment_id' => 'required|exists:work_equipments,id',
                'photo' => 'nullable|string',
                'size' => 'nullable|string',
            ]);

            $equipment = WorkEquipment::findOrFail($request->equipment_id);

            // Check if equipment has stock available
            if ($equipment->size) {
                // Equipment with sizes
                if ($request->size) {
                    $sizes = explode(',', $equipment->size);
                    $updatedSizes = [];
                    $sizeFound = false;

                    foreach ($sizes as $sizeItem) {
                        list($sizeName, $amount) = explode(':', $sizeItem);
                        
                        if ($sizeName === $request->size) {
                            if ((int)$amount <= 0) {
                                return response()->json([
                                    'success' => false,
                                    'message' => 'Stock for size ' . $request->size . ' is out of stock.'
                                ], 400);
                            }
                            
                            $newAmount = (int)$amount - 1;
                            $updatedSizes[] = $sizeName . ':' . $newAmount;
                            $sizeFound = true;
                        } else {
                            $updatedSizes[] = $sizeItem;
                        }
                    }

                    if (!$sizeFound) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Size ' . $request->size . ' not found for this equipment.'
                        ], 400);
                    }

                    $equipment->size = implode(',', $updatedSizes);
                }
            } else {
                // Equipment without sizes
                if ($equipment->amount <= 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Equipment is out of stock.'
                    ], 400);
                }
                
                $equipment->amount = $equipment->amount - 1;
            }

            // REMOVED: Duplicate assignment check - allow multiple assignments to same employee
            // Create handover record (allow duplicates)
            $handover = Handover::create([
                'employee_id' => $request->employee_id,
                'equipment_id' => $request->equipment_id,
                'size' => $request->size,
                'date' => now(),
                'photo' => $request->photo,
            ]);

            // Save the equipment with updated stock
            $equipment->save();

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

    public function assignPage(Request $request, $equipment = null)
    {
        // If equipment ID is provided, use the old behavior
        if ($equipment) {
            $equipment = WorkEquipment::findOrFail($equipment);
            $selectedSize = $request->input('size');

            $employees = Employee::whereHas('handovers', function($q) use ($equipment, $selectedSize) {
                    $q->where('equipment_id', $equipment->id);
                    if ($selectedSize) {
                        $q->where('size', $selectedSize);
                    }
                })
                ->with(['handovers' => function($q) use ($equipment, $selectedSize) {
                    $q->where('equipment_id', $equipment->id);
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

        // New behavior: show all handovers
        $handovers = Handover::with(['employee', 'equipment'])
            ->when($request->search, function($q) use ($request) {
                $q->where(function($query) use ($request) {
                    $query->whereHas('employee', function($empQuery) use ($request) {
                        $empQuery->where('name', 'like', "%{$request->search}%")
                                ->orWhere('nik', 'like', "%{$request->search}%");
                    })->orWhereHas('equipment', function($eqQuery) use ($request) {
                        $eqQuery->where('type', 'like', "%{$request->search}%");
                    });
                });
            })
            ->orderBy('date', 'desc')
            ->paginate(10)
            ->withQueryString();

        return inertia('apd/Assign', [
            'handovers' => $handovers,
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

        $equipment = WorkEquipment::findOrFail($id);

        // Check if equipment has stock available
        if ($equipment->size) {
            // Equipment with sizes
            if ($request->size) {
                $sizes = explode(',', $equipment->size);
                $updatedSizes = [];
                $sizeFound = false;

                foreach ($sizes as $sizeItem) {
                    list($sizeName, $amount) = explode(':', $sizeItem);
                    
                    if ($sizeName === $request->size) {
                        if ((int)$amount <= 0) {
                            return redirect()->back()->with('error', 'Stock for size ' . $request->size . ' is out of stock.');
                        }
                        
                        $newAmount = (int)$amount - 1;
                        $updatedSizes[] = $sizeName . ':' . $newAmount;
                        $sizeFound = true;
                    } else {
                        $updatedSizes[] = $sizeItem;
                    }
                }

                if (!$sizeFound) {
                    return redirect()->back()->with('error', 'Size ' . $request->size . ' not found for this equipment.');
                }

                $equipment->size = implode(',', $updatedSizes);
            }
        } else {
            // Equipment without sizes
            if ($equipment->amount <= 0) {
                return redirect()->back()->with('error', 'Equipment is out of stock.');
            }
            
            $equipment->amount = $equipment->amount - 1;
        }

        // REMOVED: Duplicate assignment check - allow multiple assignments
        $handover = Handover::create([
            'employee_id' => $request->employee_id,
            'equipment_id' => $id,
            'size' => $request->size,
            'date' => now(),
            'photo' => $request->photo,
        ]);

        // Save the equipment with updated stock
        $equipment->save();

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