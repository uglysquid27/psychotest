<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ManPowerRequest;
use App\Models\Employee;
use App\Models\Schedule;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Pastikan Log diimport
use Illuminate\Validation\ValidationException; // Import untuk validasi kustom

class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Schedule::with([
            'employee',
            'subSection.section',
            'manPowerRequest.shift',
            'manPowerRequest.subSection.section'
        ]);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($startDate && $endDate) {
            $query->whereBetween('date', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay()
            ]);
        }

        $schedules = $query->orderBy('date')->get();

        return Inertia::render('Schedules/Index', [
            'schedules' => $schedules,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]
        ]);
    }

    public function edit($id): Response
    {
        $request = ManPowerRequest::with('subSection')->findOrFail($id);

        // Fetch all active employees that are available and not on cuti.
        $startDate = Carbon::now()->subDays(6)->startOfDay(); // Define for schedule count
        $endDate = Carbon::now()->endOfDay(); // Define for schedule count

        $scheduledEmployeeIdsOnRequestDate = Schedule::where(DB::raw('DATE(date)'), $request->date)
            ->pluck('employee_id')
            ->toArray();

        $employees = Employee::where('status', 'available')
            ->where('cuti', 'no')
            ->whereNotIn('id', $scheduledEmployeeIdsOnRequestDate)
            ->whereHas(
                'subSections',
                fn($q) =>
                $q->where('id', $request->sub_section_id)
            ) // Filter by sub-section directly for the edit page
            ->with(['subSections'])
            ->withCount([
                'schedules' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                }
            ])
            ->with(['schedules.manPowerRequest.shift'])
            ->get()
            ->map(function ($employee) {
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                $rating = 0;
                if ($weeklyScheduleCount === 5) {
                    $rating = 5;
                } elseif ($weeklyScheduleCount === 4) {
                    $rating = 4;
                } elseif ($weeklyScheduleCount === 3) {
                    $rating = 3;
                } elseif ($weeklyScheduleCount === 2) {
                    $rating = 2;
                } elseif ($weeklyScheduleCount === 1) {
                    $rating = 1;
                } elseif ($weeklyScheduleCount === 0) {
                    $rating = 0;
                } else {
                    $rating = 0;
                }

                $workingDayWeight = 0;
                if ($rating === 5) {
                    $workingDayWeight = 15;
                } elseif ($rating === 4) {
                    $workingDayWeight = 45;
                } elseif ($rating === 3) {
                    $workingDayWeight = 75;
                } elseif ($rating === 2) {
                    $workingDayWeight = 105;
                } elseif ($rating === 1) {
                    $workingDayWeight = 135;
                } elseif ($rating === 0) {
                    $workingDayWeight = 165;
                } else {
                    $workingDayWeight = 0;
                }

                $employee->setAttribute('calculated_rating', $rating);
                $employee->setAttribute('working_day_weight', $workingDayWeight);
                $employee->setAttribute('total_assigned_hours', $totalWorkingHours);

                return $employee;
            })
            ->sortBy(function ($employee) {
                return $employee->type === 'bulanan' ? 0 : 1;
            })->sortBy('working_day_weight')
            ->values();

        return Inertia::render('Schedules/Assign', [
            'request' => $request,
            'employees' => $employees, // Kirim hanya karyawan yang cocok dengan sub-section
        ]);
    }


    /**
     * Store a newly created resource in storage (Automatic Assignment).
     */
    public function store(Request $request)
    {
        // Validasi input: hanya butuh request_id
        $request->validate([
            'request_id' => 'required|exists:man_power_requests,id',
        ]);

        $manPowerRequest = ManPowerRequest::findOrFail($request->request_id);

        // Mencegah pemenuhan ganda
        if ($manPowerRequest->status === 'fulfilled') {
            return back()->withErrors(['request_status' => 'Permintaan ini sudah dipenuhi.']);
        }

        try {
            DB::transaction(function () use ($manPowerRequest) {
                $requestedAmount = $manPowerRequest->requested_amount;
                $assignedEmployeeCount = 0;
                $assignedEmployeeIds = [];

                // 1. Get employees already scheduled on the request date
                $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $manPowerRequest->date)
                    ->pluck('employee_id')
                    ->toArray();

                // 2. Get start and end dates for the current week
                $startDate = Carbon::now()->subDays(6)->startOfDay();
                $endDate = Carbon::now()->endOfDay();

                // 3. Get eligible employees (available, not on leave, not already scheduled)
                $eligibleEmployees = Employee::where('status', 'available')
                    ->where('cuti', 'no')
                    ->whereNotIn('id', $scheduledEmployeeIdsOnRequestDate)
                    ->with(['subSections'])
                    ->withCount([
                        'schedules' => function ($query) use ($startDate, $endDate) {
                            $query->whereBetween('date', [$startDate, $endDate]);
                        }
                    ])
                    ->with(['schedules.manPowerRequest.shift'])
                    ->get()
                    ->map(function ($employee) {
                        // Calculate working hours and rating
                        $totalWorkingHours = $employee->schedules->sum(function ($schedule) {
                            return $schedule->manPowerRequest->shift->hours ?? 0;
                        });

                        $weeklyScheduleCount = $employee->schedules_count;

                        // Simple rating based on number of scheduled days
                        $rating = min($weeklyScheduleCount, 5);
                        $workingDayWeight = match ($rating) {
                            5 => 15,
                            4 => 45,
                            3 => 75,
                            2 => 105,
                            1 => 135,
                            default => 165,
                        };

                        $employee->setAttribute('calculated_rating', $rating);
                        $employee->setAttribute('working_day_weight', $workingDayWeight);
                        $employee->setAttribute('total_assigned_hours', $totalWorkingHours);

                        return $employee;
                    });

                // Sort employees: monthly first, then by working day weight
                $sortEmployees = function ($employees) {
                    return $employees->sortBy([
                        ['type', 'asc'], // 'bulanan' comes before others
                        ['working_day_weight', 'asc']
                    ])->values();
                };

                // 4. Separate employees by matching sub-section
                $sameSubSectionEligible = $eligibleEmployees->filter(
                    fn($employee) =>
                    $employee->subSections->contains('id', $manPowerRequest->sub_section_id)
                );
                $otherSubSectionEligible = $eligibleEmployees->filter(
                    fn($employee) =>
                    !$employee->subSections->contains('id', $manPowerRequest->sub_section_id)
                );

                $sortedSameSubSectionEmployees = $sortEmployees($sameSubSectionEligible);
                $sortedOtherSubSectionEmployees = $sortEmployees($otherSubSectionEligible);

                // 5. Assign employees from same sub-section first
                foreach ($sortedSameSubSectionEmployees as $employee) {
                    if ($assignedEmployeeCount < $requestedAmount) {
                        Schedule::create([
                            'employee_id' => $employee->id,
                            'sub_section_id' => $manPowerRequest->sub_section_id,
                            'man_power_request_id' => $manPowerRequest->id,
                            'date' => $manPowerRequest->date,
                            'status' => 'pending'
                        ]);
                        $assignedEmployeeCount++;
                    } else {
                        break;
                    }
                }

                // 6. If still need more, assign from other sub-sections
                if ($assignedEmployeeCount < $requestedAmount) {
                    foreach ($sortedOtherSubSectionEmployees as $employee) {
                        if ($assignedEmployeeCount < $requestedAmount) {
                            Schedule::create([
                                'employee_id' => $employee->id,
                                'sub_section_id' => $manPowerRequest->sub_section_id,
                                'man_power_request_id' => $manPowerRequest->id,
                                'date' => $manPowerRequest->date,
                                'status' => 'pending'
                            ]);
                            $assignedEmployeeCount++;
                        } else {
                            break;
                        }
                    }
                }

                // 7. Update request status if at least one employee was assigned
                if ($assignedEmployeeCount > 0) {
                    $manPowerRequest->update([
                        'status' => 'fulfilled',
                        'fulfilled_at' => now(),
                        'fulfilled_by' => auth()->id()
                    ]);
                } else {
                    throw ValidationException::withMessages([
                        'assignment_error' => 'Tidak ada karyawan yang tersedia yang cocok dengan kriteria untuk permintaan ini.'
                    ]);
                }
            });

            return redirect()->route('schedules.index')->with('success', 'Karyawan berhasil dijadwalkan secara otomatis!');
        } catch (\Exception $e) {
            Log::error('Schedule Auto-Assignment Error: ' . $e->getMessage(), [
                'exception' => $e,
                'request_id' => $manPowerRequest->id
            ]);
            return back()->withErrors(['assignment_error' => $e->getMessage()])->withInput();
        }
    }

    public function toggleVisibility($manPowerRequestId)
{
    // Ambil semua schedule dengan request yang sama
    $schedules = \App\Models\Schedule::where('man_power_request_id', $manPowerRequestId)->get();

    if ($schedules->isEmpty()) {
        return redirect()->back()->with('error', 'Tidak ada schedule ditemukan');
    }

    // Ambil visibility sekarang (default ambil dari schedule pertama)
    $currentVisibility = $schedules->first()->visibility;

    // Tentukan nilai baru
    $newVisibility = $currentVisibility === 'public' ? 'private' : 'public';

    // Update semua schedule pada request ini
    \App\Models\Schedule::where('man_power_request_id', $manPowerRequestId)
        ->update(['visibility' => $newVisibility]);

    return redirect()->back()->with('success', 'Visibility berhasil diubah menjadi ' . $newVisibility);
}

public function toggleVisibilityGroup(Request $request)
{
    $validated = $request->validate([
        'date' => 'required|date',
        'sub_section_id' => 'required|integer',
        'visibility' => 'required|in:public,private',
    ]);

    // Get all schedules for this date and sub-section
    $schedules = \App\Models\Schedule::whereDate('date', $validated['date'])
        ->whereHas('manPowerRequest', function($query) use ($validated) {
            $query->where('sub_section_id', $validated['sub_section_id']);
        })
        ->get();

    if ($schedules->isEmpty()) {
        return back()->with('error', 'No schedules found for this group');
    }

    // Update visibility for all schedules in this group
    \App\Models\Schedule::whereDate('date', $validated['date'])
        ->whereHas('manPowerRequest', function($query) use ($validated) {
            $query->where('sub_section_id', $validated['sub_section_id']);
        })
        ->update(['visibility' => $validated['visibility']]);

    return back()->with('success', 'Visibility updated for group');
}




}
