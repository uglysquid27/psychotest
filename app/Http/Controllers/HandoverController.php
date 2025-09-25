<?php

namespace App\Http\Controllers;

use App\Models\Handover;
use Illuminate\Http\Request;

class HandoverController extends Controller
{
    public function update(Request $request, Handover $handover)
    {
        $handover->update([
            'date' => $request->input('date') ?? now(),
            'photo' => $request->input('photo', $handover->photo),
        ]);

        return back()->with('success', 'Handover updated successfully.');
    }
}
