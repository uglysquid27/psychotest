<?php

namespace App\Http\Controllers;

use App\Models\WorkEquipment;
use App\Models\Handover;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class EquipmentController extends Controller
{
    /**
     * Display a listing of the equipment.
     */
    public function index()
    {
        $equipments = WorkEquipment::orderBy('type')->get();

        return Inertia::render('apd/Index', [
            'equipments' => $equipments,
        ]);
    }

    /**
     * Store a newly created equipment type.
     */
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

    /**
     * Remove the specified equipment.
     */
    public function destroy(WorkEquipment $equipment)
    {
        $equipment->delete();

        return redirect()->route('equipments.index')->with('success', 'Equipment deleted successfully.');
    }

public function assignPage(Request $request, $id)
{
    $equipment = WorkEquipment::findOrFail($id);
    $selectedSize = $request->input('size');

    $employees = Employee::with(['handover' => function ($q) use ($id, $selectedSize) {
            $q->where('equipment_id', $id);
            if ($selectedSize) {
                $q->where('size', $selectedSize);
            }
        }])
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
            'size' => $request->size, // cek berdasarkan size juga
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
            'status' => 'completed',
        ]);

        return back()->with('success', 'Handover updated.');
    }


}

