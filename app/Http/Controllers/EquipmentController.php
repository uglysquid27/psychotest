<?php

namespace App\Http\Controllers;

use App\Models\WorkEquipment;
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
        'type'   => 'required|string|max:255',
        'amount' => 'nullable|integer|min:0',
        'size'   => 'nullable|string',
        'photo'  => 'nullable|string',
    ]);

    if ($validated['size']) $validated['amount'] = null;

    $equipment = WorkEquipment::create($validated);

    Log::info('New equipment created', ['id' => $equipment->id, 'data' => $validated]);

    return redirect()->route('equipments.index')->with('success', 'Equipment created successfully.');
}

public function update(Request $request, WorkEquipment $equipment)
{
    $validated = $request->validate([
        'type'   => 'required|string|max:255',
        'amount' => 'nullable|integer|min:0',
        'size'   => 'nullable|string',
        'photo'  => 'nullable|string',
    ]);

    if ($validated['size']) $validated['amount'] = null;

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
}
