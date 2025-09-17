<?php

namespace App\Http\Controllers;

use App\Models\Resign;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class ResignController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        
        // Load the authenticated employee with the user relationship
        $authenticatedEmployee = Employee::where('id', $user->id)->first();
        
        if (!$authenticatedEmployee) {
            // Handle case where employee doesn't exist for this user
            return redirect()->route('dashboard')->with('error', 'Data karyawan tidak ditemukan.');
        }

        // Employee view - only their own resignations
        $resignations = Resign::with('employee')
            ->where('employee_id', $authenticatedEmployee->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Resign/Index', [
            'resignations' => $resignations,
            'authenticatedEmployee' => $authenticatedEmployee,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = Auth::user();

        // Load the authenticated employee
        $authenticatedEmployee = Employee::where('id', $user->id)->first();

        if (!$authenticatedEmployee) {
            return redirect()->route('dashboard')->with('error', 'Data karyawan tidak ditemukan.');
        }

        return Inertia::render('Resign/Create', [
            'authenticatedEmployee' => $authenticatedEmployee,
            'auth' => [
                'user' => $user,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        
        // Load the authenticated employee to validate the employee_id
        $authenticatedEmployee = Employee::where('id', $user->id)->first();

        if (!$authenticatedEmployee) {
            return redirect()->route('dashboard')->with('error', 'Data karyawan tidak ditemukan.');
        }

        // Validate that the employee_id matches the authenticated employee
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id|in:' . $authenticatedEmployee->id,
            'tanggal' => 'required|date|after_or_equal:today',
            'reason' => 'required|string|min:10',
        ]);

        // Set default status to pending
        $validated['status'] = 'pending';

        Resign::create($validated);

        return redirect()->route('employee.resign.index')
            ->with('success', 'Resign berhasil diajukan.');
    }

     public function Adminindex(Request $request)
    {
        $query = Resign::with('employee');
        
        // Filter by status if provided
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        $resignations = $query->orderBy('created_at', 'desc')
                            ->paginate(10);
        
        // Get status filter value
        $statusFilter = $request->status ?? 'all';
        
        return Inertia::render('Resign/AdminIndex', [
            'resignations' => $resignations,
            'filters' => [
                'status' => $statusFilter
            ]
        ]);
    }

    /**
     * Update the resignation status.
     */
    public function update(Request $request, Resign $resign)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected,cancelled',
            'admin_notes' => 'nullable|string|max:1000',
        ]);
        
        $resign->update($validated);
        
        return redirect()->back()->with('success', 'Status resign berhasil diperbarui.');
    }
}