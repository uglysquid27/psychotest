<?php

namespace App\Http\Controllers;

use App\Models\WarteggTest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarteggTestController extends Controller
{
    /**
     * Display the Wartegg test page.
     */
    public function index()
    {
        return Inertia::render('Psychotest/WarteggTest/Index');
    }

    /**
     * Store a newly created Wartegg test result.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'drawings' => 'required|array',
            'drawings.*.box' => 'required|integer|between:1,8',
            'drawings.*.drawing' => 'required|string',
            'drawings.*.story' => 'nullable|string',
            'completed_at' => 'required|date',
        ]);

        $test = WarteggTest::create([
            'user_id' => auth()->id(),
            'results' => $validated['drawings'],
            'completed_at' => $validated['completed_at'],
        ]);

        return response()->json([
            'message' => 'Tes Wartegg berhasil disimpan',
            'data' => $test
        ], 201);
    }

    /**
     * Display the specified Wartegg test result.
     */
    public function show(WarteggTest $warteggTest)
    {
        $this->authorize('view', $warteggTest);
        
        return response()->json([
            'data' => $warteggTest
        ]);
    }

    /**
     * Get user's previous Wartegg test results.
     */
    public function history()
    {
        $tests = WarteggTest::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $tests
        ]);
    }
}