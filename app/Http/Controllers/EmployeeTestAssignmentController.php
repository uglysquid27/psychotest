<?php
// app/Http\Controllers/EmployeeTestAssignmentController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\EmployeeTestAssignment;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EmployeeTestAssignmentController extends Controller
{
    /**
     * Display test assignments for admin
     */
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');
        $status = $request->get('status', '');
        $testType = $request->get('test_type', '');

        $assignments = EmployeeTestAssignment::with('employee')
            ->when($search, function ($query, $search) {
                return $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('nik', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when($status, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->when($testType, function ($query, $testType) {
                return $query->where('test_type', $testType);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return Inertia::render('Psychotest/TestAssignments/Index', [
            'assignments' => $assignments,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'test_type' => $testType,
                'per_page' => $perPage,
            ],
            'testTypes' => EmployeeTestAssignment::getTestTypes(),
            'statuses' => EmployeeTestAssignment::getStatuses(),
        ]);
    }

    /**
     * Show form to create new assignment
     */
    public function create()
    {
        return Inertia::render('Psychotest/TestAssignments/Create', [
            'testTypes' => EmployeeTestAssignment::getTestTypes(),
        ]);
    }

    /**
     * Store new test assignment
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nik' => 'required|string|exists:employees,nik',
            'test_type' => 'required|string|in:' . implode(',', array_keys(EmployeeTestAssignment::getTestTypes())),
            'test_name' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Get employee
        $employee = Employee::where('nik', $validated['nik'])->firstOrFail();

        // Check if already has active assignment for this test type
        $existingAssignment = EmployeeTestAssignment::where('nik', $validated['nik'])
            ->where('test_type', $validated['test_type'])
            ->whereNotIn('status', [
                EmployeeTestAssignment::STATUS_COMPLETED,
                EmployeeTestAssignment::STATUS_EXPIRED,
            ])
            ->first();

        if ($existingAssignment) {
            return back()->withErrors([
                'nik' => 'Employee already has an active assignment for this test type.',
            ]);
        }

        // Create assignment
        $assignment = EmployeeTestAssignment::create([
            'nik' => $validated['nik'],
            'test_type' => $validated['test_type'],
            'test_name' => $validated['test_name'] ?? $this->getDefaultTestName($validated['test_type']),
            'status' => EmployeeTestAssignment::STATUS_ASSIGNED,
            'due_date' => $validated['due_date'] ? Carbon::parse($validated['due_date']) : null,
            'notes' => $validated['notes'],
        ]);

        return redirect()->route('admin.test-assignments.index')
            ->with('success', 'Test assignment created successfully!');
    }

    /**
     * Get default test name based on type
     */
    private function getDefaultTestName(string $testType): string
    {
        return EmployeeTestAssignment::getTestTypes()[$testType] ?? 'Psychotest';
    }

    /**
     * Edit assignment
     */
    public function edit(EmployeeTestAssignment $assignment)
    {
        return Inertia::render('Psychotest/TestAssignments/Edit', [
            'assignment' => $assignment->load('employee'),
            'testTypes' => EmployeeTestAssignment::getTestTypes(),
            'statuses' => EmployeeTestAssignment::getStatuses(),
        ]);
    }

    /**
     * Update assignment
     */
    public function update(Request $request, EmployeeTestAssignment $assignment)
    {
        $validated = $request->validate([
            'test_type' => 'required|string|in:' . implode(',', array_keys(EmployeeTestAssignment::getTestTypes())),
            'test_name' => 'nullable|string|max:255',
            'status' => 'required|string|in:assigned,in_progress,completed,expired',
            'due_date' => 'nullable|date',
            'score' => 'nullable|integer|min:0',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        // If marking as completed, set completed_at
        if ($validated['status'] === EmployeeTestAssignment::STATUS_COMPLETED && !$assignment->completed_at) {
            $validated['completed_at'] = now();
        }

        $assignment->update($validated);

        return redirect()->route('admin.test-assignments.index')
            ->with('success', 'Test assignment updated successfully!');
    }

    /**
     * Delete assignment
     */
    public function destroy(EmployeeTestAssignment $assignment)
    {
        $assignment->delete();

        return redirect()->route('admin.test-assignments.index')
            ->with('success', 'Test assignment deleted successfully!');
    }

    /**
     * Bulk delete assignments
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
        ]);

        EmployeeTestAssignment::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Assignments deleted successfully']);
    }

    /**
     * Bulk assign tests
     */
    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'niks' => 'required|array|min:1',
            'niks.*' => 'exists:employees,nik',
            'test_type' => 'required|string|in:' . implode(',', array_keys(EmployeeTestAssignment::getTestTypes())),
            'test_name' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $successCount = 0;
        $errors = [];

        foreach ($validated['niks'] as $nik) {
            try {
                // Check if already has active assignment
                $existingAssignment = EmployeeTestAssignment::where('nik', $nik)
                    ->where('test_type', $validated['test_type'])
                    ->whereNotIn('status', [
                        EmployeeTestAssignment::STATUS_COMPLETED,
                        EmployeeTestAssignment::STATUS_EXPIRED,
                    ])
                    ->first();

                if (!$existingAssignment) {
                    EmployeeTestAssignment::create([
                        'nik' => $nik,
                        'test_type' => $validated['test_type'],
                        'test_name' => $validated['test_name'] ?? $this->getDefaultTestName($validated['test_type']),
                        'status' => EmployeeTestAssignment::STATUS_ASSIGNED,
                        'due_date' => $validated['due_date'] ? Carbon::parse($validated['due_date']) : null,
                        'notes' => $validated['notes'],
                    ]);
                    $successCount++;
                } else {
                    $errors[] = "NIK {$nik}: Already has an active assignment";
                }
            } catch (\Exception $e) {
                $errors[] = "NIK {$nik}: " . $e->getMessage();
            }
        }

        $message = "Bulk assignment completed. Success: {$successCount}";

        if ($successCount > 0) {
            return redirect()->route('admin.test-assignments.index')
                ->with('success', $message)
                ->with('bulk_errors', array_slice($errors, 0, 10));
        } else {
            return redirect()->route('admin.test-assignments.index')
                ->with('error', 'No assignments were created. ' . implode(', ', $errors));
        }
    }

    /**
     * Bulk toggle active status
     */
    public function bulkToggleActive(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'status' => 'required|string|in:assigned,in_progress,completed,expired',
        ]);

        EmployeeTestAssignment::whereIn('id', $request->ids)
            ->update(['status' => $request->status]);

        return response()->json(['message' => 'Assignments updated successfully']);
    }

    /**
     * Search employees for assignment
     */
    public function searchEmployees(Request $request)
    {
        $search = $request->get('search', '');

        $employees = Employee::select('nik', 'name')
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('nik', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $employees,
        ]);
    }

    /**
     * Get employee's assigned tests
     */
    public function myAssignments(Request $request)
    {
        $user = auth()->user();

        if (!$user->nik) {
            return redirect()->back()->with('error', 'NIK not found for this user.');
        }

        $assignments = EmployeeTestAssignment::where('nik', $user->nik)
            ->orderBy('status', 'asc')
            ->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Mark assignments as expired if due date has passed
        foreach ($assignments as $assignment) {
            if ($assignment->isAccessible()) {
                $assignment->status = 'expired';
                $assignment->save();
            }
        }

        return Inertia::render('Psychotest/TestAssignments/MyAssignments', [
            'assignments' => $assignments,
            'testTypes' => EmployeeTestAssignment::getTestTypes(),
        ]);
    }

    /**
     * Start a test (update status to in_progress)
     */
    public function startTest($id)
    {
        $user = auth()->user();
        $assignment = EmployeeTestAssignment::where('id', $id)
            ->where('nik', $user->nik)
            ->firstOrFail();

        // Check if test can be started
        if ($assignment->status === EmployeeTestAssignment::STATUS_COMPLETED) {
            return redirect()->route('employee.test-assignments.my')
                ->with('error', 'Tes ini sudah diselesaikan. Anda hanya dapat mengerjakan sekali.');
        }

        if ($assignment->attempts >= 1) {
            return redirect()->route('employee.test-assignments.my')
                ->with('error', 'Anda sudah menggunakan kesempatan mengerjakan tes ini. Hanya 1 kali percobaan diperbolehkan.');
        }

        if (!$assignment->isAccessible()) {
            return redirect()->route('employee.test-assignments.my')
                ->with('error', 'Tes ini sudah melewati batas waktu. Anda tidak dapat mengakses tes ini lagi.');
        }

        $assignment->update([
            'status' => EmployeeTestAssignment::STATUS_IN_PROGRESS,
            'last_attempt_at' => now(),
            'attempts' => $assignment->attempts + 1,
        ]);

        // Redirect to test page
        return redirect($assignment->getTestUrl())
            ->with('info', 'Test started. Your progress will be tracked.');
    }

    /**
     * Complete a test (called from test controllers)
     */
    public function completeTest(Request $request, $testType)
    {
        $user = auth()->user();

        if (!$user->nik) {
            return response()->json(['success' => false, 'message' => 'NIK not found'], 400);
        }

        $validated = $request->validate([
            'score' => 'required|integer',
            'total' => 'required|integer',
            'results' => 'nullable|array',
        ]);

        // Find active assignment for this test type
        $assignment = EmployeeTestAssignment::where('nik', $user->nik)
            ->where('test_type', $testType)
            ->whereIn('status', [
                EmployeeTestAssignment::STATUS_ASSIGNED,
                EmployeeTestAssignment::STATUS_IN_PROGRESS,
            ])
            ->first();

        if ($assignment) {
            $percentage = $validated['total'] > 0 ? round(($validated['score'] / $validated['total']) * 100, 2) : 0;

            $assignment->update([
                'status' => EmployeeTestAssignment::STATUS_COMPLETED,
                'completed_at' => now(),
                'score' => $validated['score'],
                'percentage' => $percentage,
                'results' => array_merge($validated['results'] ?? [], [
                    'total_questions' => $validated['total'],
                    'completed_at' => now()->toISOString(),
                ]),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Test completed and assignment updated.',
        ]);
    }
}