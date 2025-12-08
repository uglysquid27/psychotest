<?php
// app/Http\Controllers\ManPowerRequestFulfillmentController.php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ManPowerRequest;
use App\Models\Schedule;
use App\Models\Workload;
use App\Models\BlindTest;
use App\Models\Rating;
use App\Services\SimpleMLService;
use App\Models\EmployeePickingPriority;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManPowerRequestFulfillmentController extends Controller
{
    public function create($id)
    {
        $request = ManPowerRequest::with([
            'subSection.section',
            'shift',
            'fulfilledBy',
            'schedules.employee.subSections.section'
        ])->findOrFail($id);

        if ($request->status === 'fulfilled' && !$request->schedules->count()) {
            return Inertia::render('Fullfill/Index', [
                'request' => $request,
                'sameSubSectionEmployees' => [],
                'otherSubSectionEmployees' => [],
                'message' => 'Permintaan ini sudah terpenuhi.',
                'auth' => ['user' => auth()->user()]
            ]);
        }

        $sameDayRequests = ManPowerRequest::with(['subSection', 'shift'])
            ->where('date', $request->date)
            ->where('id', '!=', $request->id)
            ->get();

        $startDate = Carbon::now()->subDays(6)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $request->date)
            ->where('man_power_request_id', '!=', $request->id)
            ->pluck('employee_id')
            ->toArray();

        $currentScheduledIds = $request->schedules->pluck('employee_id')->toArray();

        $eligibleEmployees = Employee::where(function ($query) use ($currentScheduledIds) {
            $query->where('status', 'available')
                ->orWhereIn('id', $currentScheduledIds);
        })
            ->where('cuti', 'no')
            ->whereNotIn('id', array_diff($scheduledEmployeeIdsOnRequestDate, $currentScheduledIds))
            ->with([
                'subSections' => function ($query) {
                    $query->with('section');
                },
                'workloads',
                'blindTests',
                'ratings',
                'pickingPriorities' // ADD THIS LINE
            ])
            ->withCount([
                'schedules' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                }
            ])
            ->with(['schedules.manPowerRequest.shift'])
            ->get()
            ->map(function ($employee) use ($request) {
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                $workDays14Days = $this->getWorkDaysCount($employee, 14);
                $workDays30Days = $this->getWorkDaysCount($employee, 30);
                $last5Shifts = $this->getLastShifts($employee, 5);

                $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                $averageRating = $employee->ratings->avg('rating') ?? 0;

                // ADD PRIORITY SCORE CALCULATION
                $priorityScore = $this->calculatePriorityScore($employee, $request);

                $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);
                $mlScore = $this->calculateMLPriorityScore($employee, $request);
                // UPDATE FINAL SCORE TO INCLUDE PRIORITY: 60% ML, 30% totalScore, 10% priority
                $finalScore = ($mlScore * 0.6) + ($totalScore * 0.3) + ($priorityScore * 0.1);

                // ADD PRIORITY INFO FOR FRONTEND
                $priorityInfo = $employee->pickingPriorities->map(function ($priority) {
                    return [
                        'category' => $priority->category,
                        'category_name' => $priority->category_name,
                        'weight_multiplier' => $priority->weight_multiplier,
                        'metadata' => $priority->metadata,
                    ];
                })->toArray();

                $subSectionsData = $employee->subSections->map(function ($subSection) {
                    return [
                        'id' => $subSection->id,
                        'name' => $subSection->name,
                        'section_id' => $subSection->section_id,
                        'section' => $subSection->section ? [
                            'id' => $subSection->section->id,
                            'name' => $subSection->section->name,
                        ] : null,
                    ];
                })->toArray();

                return [
                    'id' => $employee->id,
                    'nik' => $employee->nik,
                    'name' => $employee->name,
                    'type' => $employee->type,
                    'status' => $employee->status,
                    'cuti' => $employee->cuti,
                    'photo' => $employee->photo,
                    'gender' => $employee->gender,
                    'created_at' => $employee->created_at,
                    'updated_at' => $employee->updated_at,
                    'schedules_count' => $employee->schedules_count,
                    'total_assigned_hours' => $totalWorkingHours,
                    'sub_sections_data' => $subSectionsData,
                    'workload_points' => $workloadPoints,
                    'blind_test_points' => $blindTestPoints,
                    'average_rating' => $averageRating,
                    'total_score' => $totalScore,
                    'ml_score' => $mlScore,
                    'priority_score' => $priorityScore, // ADD THIS
                    'final_score' => $finalScore, // UPDATED
                    'work_days_14_days' => $workDays14Days,
                    'work_days_30_days' => $workDays30Days,
                    'last_5_shifts' => $last5Shifts,
                    'priority_info' => $priorityInfo, // ADD THIS
                    'has_priority' => !empty($priorityInfo), // ADD THIS
                ];
            });

        $splitEmployeesBySubSection = function ($employees, $request) {
            $requestSubSectionId = $request->sub_section_id;
            $requestSectionId = $request->subSection->section_id ?? null;

            $same = collect();
            $other = collect();

            foreach ($employees as $employee) {
                $subSections = collect($employee['sub_sections_data']);

                $hasExactSubSection = $subSections->contains('id', $requestSubSectionId);

                $hasSameSection = false;
                if ($requestSectionId) {
                    $hasSameSection = $subSections->contains(function ($ss) use ($requestSectionId) {
                        return isset($ss['section']['id']) && $ss['section']['id'] == $requestSectionId;
                    });
                }

                if ($hasExactSubSection || $hasSameSection) {
                    $same->push($employee);
                } else {
                    $other->push($employee);
                }
            }

            return [$same, $other];
        };

        // $sortEmployees = function ($employees) {
        //     return $employees->sortByDesc('final_score')
        //         ->sortByDesc(fn($employee) => $employee['type'] === 'bulanan' ? 1 : 0)
        //         ->values();
        // };

        [$sameSubSectionEligible, $otherSubSectionEligible] = $splitEmployeesBySubSection($eligibleEmployees, $request);

        // USE NEW PRIORITY SORT METHOD
        $sortedSameSubSectionEmployees = $this->sortEmployeesWithPriority($sameSubSectionEligible, $request)->values();
        $sortedOtherSubSectionEmployees = $this->sortEmployeesWithPriority($otherSubSectionEligible, $request)->values();

        $mlService = app(SimpleMLService::class);
        $mlStatus = $mlService->isModelTrained() ? 'trained' : 'not_trained';
        $mlAccuracy = null;

        if ($mlService->isModelTrained()) {
            $modelInfo = $mlService->getModelInfo();
            $mlAccuracy = isset($modelInfo['accuracy']) ? round($modelInfo['accuracy'] * 100, 1) : null;
        }

        return Inertia::render('Fullfill/Fulfill', [
            'request' => $request,
            'sameSubSectionEmployees' => $sortedSameSubSectionEmployees,
            'otherSubSectionEmployees' => $sortedOtherSubSectionEmployees,
            'currentScheduledIds' => $currentScheduledIds,
            'sameDayRequests' => $sameDayRequests,
            'ml_status' => $mlStatus,
            'ml_accuracy' => $mlAccuracy,
            'ml_features' => [
                'work_days_14_days' => 'Work Days (14 days)',
                'work_days_30_days' => 'Work Days (30 days)',
                'shift_priority' => 'Shift Rotation Priority',
                'current_workload_14_days' => 'Workload (14 days)'
            ],
            'auth' => ['user' => auth()->user()]
        ]);
    }

    private function getWorkDaysCount($employee, $days = 30)
    {
        $startDate = now()->subDays($days)->startOfDay();
        $endDate = now()->endOfDay();

        return $employee->schedules()
            ->whereBetween('date', [$startDate, $endDate])
            ->whereHas('manPowerRequest', function ($query) {
                $query->where('status', 'fulfilled');
            })
            ->distinct('date')
            ->count('date');
    }

    private function getLastShifts($employee, $limit = 5)
    {
        return $employee->schedules()
            ->with(['manPowerRequest.shift'])
            ->whereHas('manPowerRequest', function ($query) {
                $query->where('status', 'fulfilled');
            })
            ->where('date', '<=', now()->toDateString())
            ->orderBy('date', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($schedule) {
                return [
                    'date' => $schedule->date->format('Y-m-d'),
                    'shift_name' => $schedule->manPowerRequest->shift->name ?? 'N/A',
                    'start_time' => $schedule->manPowerRequest->shift->start_time ?? null,
                    'end_time' => $schedule->manPowerRequest->shift->end_time ?? null,
                ];
            })
            ->toArray();
    }

    private function getCurrentWorkload14Days($employee)
    {
        $startDate = now()->subDays(14)->startOfDay();
        $workHours = $employee->schedules()
            ->where('date', '>=', $startDate)
            ->with('manPowerRequest.shift')
            ->get()
            ->sum(function ($schedule) {
                return $schedule->manPowerRequest->shift->hours ?? 0;
            });

        return min($workHours / 80, 1.0);
    }

    private function calculatePriorityScore($employee, $manpowerRequest)
    {
        $priorityScore = 0.0;

        // Check if employee has priority for this subsection
        $priorities = EmployeePickingPriority::where('employee_id', $employee->id)
            ->where(function ($query) use ($manpowerRequest) {
                $query->whereJsonContains('metadata->sub_section_ids', (string) $manpowerRequest->sub_section_id)
                    ->orWhereNull('metadata->sub_section_ids')
                    ->orWhere('metadata->sub_section_ids', '[]');
            })
            ->get();

        if ($priorities->isEmpty()) {
            return 0.0;
        }

        // Sum up all applicable priority multipliers
        foreach ($priorities as $priority) {
            $priorityScore += $priority->weight_multiplier;
        }

        // Normalize score (cap at 3.0 for scaling)
        return min(3.0, $priorityScore) * 0.05; // Scale to 0-0.15 range
    }

    private function getGenderMatchScoreStatic($employee, $request)
    {
        $maleNeeded = $request->male_count > 0;
        $femaleNeeded = $request->female_count > 0;

        if ($maleNeeded && $employee['gender'] === 'male')
            return 0;
        if ($femaleNeeded && $employee['gender'] === 'female')
            return 0;

        return 1;
    }

    private function sortEmployeesWithPriority($employees, $request)
    {
        return $employees->sort(function ($a, $b) use ($request) {
            // 1. Priority employees first
            if ($a['has_priority'] !== $b['has_priority']) {
                return $a['has_priority'] ? -1 : 1;
            }

            // 2. Exact subsection match
            $aExactMatch = collect($a['sub_sections_data'])->contains('id', $request->sub_section_id);
            $bExactMatch = collect($b['sub_sections_data'])->contains('id', $request->sub_section_id);

            if ($aExactMatch !== $bExactMatch) {
                return $aExactMatch ? -1 : 1;
            }

            // 3. Priority score (if both have priority)
            if ($a['has_priority'] && $b['has_priority'] && $a['priority_score'] !== $b['priority_score']) {
                return $b['priority_score'] <=> $a['priority_score'];
            }

            // 4. Final score
            if ($a['final_score'] !== $b['final_score']) {
                return $b['final_score'] <=> $a['final_score'];
            }

            // 5. Gender matching
            $aGenderMatch = $this->getGenderMatchScoreStatic($a, $request);
            $bGenderMatch = $this->getGenderMatchScoreStatic($b, $request);

            if ($aGenderMatch !== $bGenderMatch) {
                return $aGenderMatch - $bGenderMatch;
            }

            // 6. Employee type
            if ($a['type'] === 'bulanan' && $b['type'] === 'harian')
                return -1;
            if ($a['type'] === 'harian' && $b['type'] === 'bulanan')
                return 1;

            return $a['id'] - $b['id'];
        });
    }

    private function calculateShiftPriority($employee, $manpowerRequest)
    {
        try {
            $lastSchedule = $employee->schedules()
                ->where('date', '<', now()->toDateString())
                ->with('manPowerRequest.shift')
                ->orderBy('date', 'desc')
                ->first();

            if (!$lastSchedule || !$lastSchedule->manPowerRequest->shift) {
                return 1.0;
            }

            $lastShiftOrder = $this->getShiftOrder($lastSchedule->manPowerRequest->shift);
            $currentShiftOrder = $this->getShiftOrder($manpowerRequest->shift);

            if ($lastShiftOrder === null || $currentShiftOrder === null) {
                return 1.0;
            }

            $shiftDifference = $currentShiftOrder - $lastShiftOrder;

            if ($shiftDifference === 0) {
                return 0.3;
            } elseif ($shiftDifference === 1) {
                return 0.7;
            } elseif ($shiftDifference === 2) {
                return 1.0;
            } elseif ($shiftDifference === -1) {
                return 0.4;
            } else {
                return 0.5;
            }
        } catch (\Exception $e) {
            return 0.5;
        }
    }

    private function getShiftOrder($shift)
    {
        try {
            $shiftOrder = [
                'pagi' => 1,
                'siang' => 2,
                'malam' => 3,
                '1' => 1,
                '2' => 2,
                '3' => 3
            ];

            $shiftName = strtolower($shift->name ?? '');
            return $shiftOrder[$shiftName] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }

    private function calculateFallbackMLScore($employee, $manpowerRequest)
    {
        $score = 0.0;

        $workDays = $this->getWorkDaysCount($employee, 30);
        $score += max(0, 1 - ($workDays / 22)) * 0.25;

        $rating = $this->getAverageRating($employee);
        $score += ($rating / 5) * 0.2;

        $testScore = $this->getTestScore($employee);
        $score += $testScore * 0.15;

        $sameSubsection = $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0;
        $sameSection = $this->isSameSection($employee, $manpowerRequest) ? 1 : 0;
        $sectionScore = 0.0;
        if ($sameSubsection > 0)
            $sectionScore = 0.15;
        elseif ($sameSection > 0)
            $sectionScore = 0.1;
        $score += $sectionScore;

        $shiftPriority = $this->calculateShiftPriority($employee, $manpowerRequest);
        $score += $shiftPriority * 0.25;

        return min(1.0, max(0.0, $score));
    }

    private function calculateMLPriorityScore($employee, $manpowerRequest)
    {
        try {
            $mlService = app(SimpleMLService::class);

            if (!$mlService->isModelTrained()) {
                return $this->calculateFallbackMLScore($employee, $manpowerRequest);
            }

            $features = [
                'work_days_count' => $this->getWorkDaysCount($employee, 30),
                'rating_value' => $this->getAverageRating($employee),
                'test_score' => $this->getTestScore($employee),
                'gender' => $employee->gender === 'male' ? 1 : 0,
                'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
                'same_subsection' => $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0,
                'same_section' => $this->isSameSection($employee, $manpowerRequest) ? 1 : 0,
                'current_workload' => $this->getCurrentWorkload14Days($employee),
                'shift_priority' => $this->calculateShiftPriority($employee, $manpowerRequest),
            ];

            $predictions = $mlService->predict([$features]);
            return $predictions[0] ?? 0.5;

        } catch (\Exception $e) {
            return $this->calculateFallbackMLScore($employee, $manpowerRequest);
        }
    }

    private function getAverageRating($employee)
    {
        $avgRating = $employee->ratings()->avg('rating');
        return $avgRating ?? 3.0;
    }

    private function getTestScore($employee)
    {
        $latestTest = $employee->blindTests()->latest('test_date')->first();
        return $latestTest && $latestTest->result === 'Pass' ? 1.0 : 0.0;
    }

    private function isSameSubsection($employee, $manpowerRequest)
    {
        return $employee->subSections->contains('id', $manpowerRequest->sub_section_id);
    }

    private function isSameSection($employee, $manpowerRequest)
    {
        $requestSectionId = $manpowerRequest->subSection->section_id ?? null;
        if (!$requestSectionId)
            return false;
        return $employee->subSections->contains('section_id', $requestSectionId);
    }

    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'fulfilled_by' => 'required|exists:users,id',
            'visibility' => 'in:public,private',
            'enable_line_assignment' => 'boolean',
            'line_assignments' => 'array',
            'line_assignments.*' => 'string',
        ]);

        $req = ManPowerRequest::with(['schedules.employee', 'subSection'])->findOrFail($id);

        try {
            DB::transaction(function () use ($validated, $req) {
                $currentSchedules = $req->schedules;
                $newEmployeeIds = $validated['employee_ids'];

                $enableLineAssignment = $validated['enable_line_assignment'] ?? false;
                $lineAssignments = $enableLineAssignment ? ($validated['line_assignments'] ?? []) : [];

                if ($currentSchedules->count() > 0) {
                    foreach ($currentSchedules as $schedule) {
                        $employee = $schedule->employee;
                        $otherAssignments = Schedule::where('employee_id', $employee->id)
                            ->where('man_power_request_id', '!=', $req->id)
                            ->where('date', $req->date)
                            ->count();

                        if ($otherAssignments === 0) {
                            $employee->status = 'available';
                            $employee->save();
                        }
                        $schedule->delete();
                    }
                }

                foreach ($newEmployeeIds as $employeeId) {
                    $employee = Employee::where('id', $employeeId)
                        ->where(function ($query) {
                            $query->where('status', 'available')
                                ->orWhere('status', 'assigned');
                        })
                        ->where('cuti', 'no')
                        ->whereDoesntHave('schedules', function ($query) use ($req) {
                            $query->where('date', $req->date)
                                ->where('man_power_request_id', '!=', $req->id);
                        })
                        ->first();

                    if (!$employee) {
                        throw new \Exception("Karyawan ID {$employeeId} tidak tersedia, sedang cuti, atau sudah dijadwalkan pada tanggal ini.");
                    }

                    $data = [
                        'employee_id' => $employeeId,
                        'sub_section_id' => $req->sub_section_id,
                        'man_power_request_id' => $req->id,
                        'date' => $req->date,
                        'visibility' => $validated['visibility'] ?? 'private',
                    ];

                    if ($enableLineAssignment && isset($lineAssignments[$employeeId])) {
                        $data['line'] = $lineAssignments[$employeeId];
                    } elseif ($enableLineAssignment && strtolower($req->subSection->name) === 'putway') {
                        $data['line'] = '1';
                    }

                    $schedule = Schedule::create($data);

                    $employee->status = 'assigned';
                    $employee->save();
                }

                $req->status = 'fulfilled';
                $req->fulfilled_by = $validated['fulfilled_by'];
                $req->save();
            });
        } catch (\Exception $e) {
            return back()->withErrors(['fulfillment_error' => $e->getMessage()]);
        }

        return redirect()
            ->route('manpower-requests.index')
            ->with('success', 'Permintaan berhasil dipenuhi');
    }

    public function bulkStore(Request $request)
    {
        $request->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'exists:man_power_requests,id',
            'employee_selections' => 'required|array',
            'strategy' => 'required|in:optimal,same_section,balanced',
            'visibility' => 'in:public,private',
            'status' => 'in:pending,accepted,rejected',
            'enable_line_assignment' => 'boolean',
            'line_assignments' => 'array',
        ]);

        DB::beginTransaction();
        try {
            $results = [];
            $successCount = 0;
            $failureCount = 0;
            $employeeSelections = $request->employee_selections;
            $lineAssignments = $request->line_assignments ?? [];
            $status = $request->status ?? 'pending';
            $enableLineAssignment = $request->enable_line_assignment ?? false;

            foreach ($request->request_ids as $id) {
                $manpowerRequest = ManPowerRequest::with(['subSection', 'schedules'])->findOrFail($id);

                if ($manpowerRequest->status === 'fulfilled') {
                    $results[$id] = 'already fulfilled';
                    $failureCount++;
                    continue;
                }

                $selectedEmployeeIds = $employeeSelections[$id] ?? [];
                $requestLineAssignments = $lineAssignments[$id] ?? [];

                if (count($selectedEmployeeIds) !== $manpowerRequest->requested_amount) {
                    $results[$id] = 'invalid employee selection count';
                    $failureCount++;
                    continue;
                }

                $maleCount = 0;
                $femaleCount = 0;

                foreach ($selectedEmployeeIds as $employeeId) {
                    $employee = Employee::find($employeeId);
                    if (!$employee) {
                        throw new \Exception("Employee {$employeeId} not found");
                    }

                    if ($employee->gender === 'male') {
                        $maleCount++;
                    } elseif ($employee->gender === 'female') {
                        $femaleCount++;
                    }
                }

                if ($manpowerRequest->male_count > 0 && $maleCount < $manpowerRequest->male_count) {
                    $results[$id] = 'insufficient male employees';
                    $failureCount++;
                    continue;
                }

                if ($manpowerRequest->female_count > 0 && $femaleCount < $manpowerRequest->female_count) {
                    $results[$id] = 'insufficient female employees';
                    $failureCount++;
                    continue;
                }

                $createdSchedules = [];
                foreach ($selectedEmployeeIds as $index => $employeeId) {
                    $data = [
                        'employee_id' => $employeeId,
                        'sub_section_id' => $manpowerRequest->sub_section_id,
                        'man_power_request_id' => $manpowerRequest->id,
                        'date' => $manpowerRequest->date,
                        'status' => $status,
                        'visibility' => $request->visibility ?? 'private',
                    ];

                    if ($enableLineAssignment && isset($requestLineAssignments[$employeeId])) {
                        $data['line'] = $requestLineAssignments[$employeeId];
                    } elseif ($manpowerRequest->subSection && strtolower($manpowerRequest->subSection->name) === 'putway') {
                        $data['line'] = strval((($index % 2) + 1));
                    }

                    $schedule = Schedule::create($data);
                    $createdSchedules[] = $schedule->id;
                }

                $manpowerRequest->update([
                    'status' => 'fulfilled',
                    'fulfilled_by' => auth()->id()
                ]);

                $results[$id] = 'fulfilled - ' . count($selectedEmployeeIds) . ' employees assigned';
                $successCount++;
            }

            DB::commit();

            return redirect()->route('manpower-requests.index')->with([
                'success' => 'Bulk fulfill completed: ' . $successCount . ' successful, ' . $failureCount . ' failed',
                'bulk_results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors([
                'fulfillment_error' => 'Bulk fulfill failed: ' . $e->getMessage()
            ]);
        }
    }

    public function revise($id)
    {
        $request = ManPowerRequest::with([
            'subSection.section',
            'shift',
            'fulfilledBy',
            'schedules.employee.subSections.section'
        ])->findOrFail($id);

        if ($request->status !== 'fulfilled') {
            abort(403, 'Hanya permintaan yang sudah terpenuhi yang dapat direvisi.');
        }

        $startDate = Carbon::now()->subDays(6)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $request->date)
            ->where('man_power_request_id', '!=', $request->id)
            ->pluck('employee_id')
            ->toArray();

        $currentScheduledIds = $request->schedules->pluck('employee_id')->toArray();

        $currentScheduledIds = array_map('strval', $currentScheduledIds);
        $scheduledEmployeeIdsOnRequestDate = array_map('strval', $scheduledEmployeeIdsOnRequestDate);

        $eligibleEmployees = Employee::where(function ($query) use ($currentScheduledIds) {
            $query->where('status', 'available')
                ->orWhereIn('id', $currentScheduledIds);
        })
            ->where('cuti', 'no')
            ->whereNotIn('id', array_diff($scheduledEmployeeIdsOnRequestDate, $currentScheduledIds))
            ->with([
                'subSections' => function ($query) {
                    $query->with('section');
                },
                'workloads',
                'blindTests',
                'ratings'
            ])
            ->withCount([
                'schedules' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                }
            ])
            ->with(['schedules.manPowerRequest.shift'])
            ->get()
            ->map(function ($employee) use ($request) {
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                $baseScore = $this->calculateBaseScore($employee, $weeklyScheduleCount);
                $mlScore = $this->calculateMLPriorityScore($employee, $request);
                $totalScore = ($mlScore * 0.7) + ($baseScore * 0.3);

                $subSectionsData = $employee->subSections->map(function ($subSection) {
                    return [
                        'id' => (string) $subSection->id,
                        'name' => $subSection->name,
                        'section_id' => (string) $subSection->section_id,
                        'section' => $subSection->section ? [
                            'id' => (string) $subSection->section->id,
                            'name' => $subSection->section->name,
                        ] : null,
                    ];
                })->toArray();

                return [
                    'id' => (string) $employee->id,
                    'nik' => $employee->nik,
                    'name' => $employee->name,
                    'type' => $employee->type,
                    'status' => $employee->status,
                    'cuti' => $employee->cuti,
                    'photo' => $employee->photo,
                    'gender' => $employee->gender,
                    'schedules_count' => $employee->schedules_count,
                    'total_assigned_hours' => $totalWorkingHours,
                    'sub_sections_data' => $subSectionsData,
                    'ml_score' => $mlScore,
                    'total_score' => $totalScore,
                ];
            });

        $splitEmployeesBySubSection = function ($employees, $request) {
            $requestSubSectionId = (string) $request->sub_section_id;
            $requestSectionId = $request->subSection ? (string) $request->subSection->section_id : null;

            $same = collect();
            $other = collect();

            foreach ($employees as $employee) {
                $subSections = collect($employee['sub_sections_data']);

                $hasExactSubSection = $subSections->contains('id', $requestSubSectionId);

                $hasSameSection = false;
                if ($requestSectionId) {
                    $hasSameSection = $subSections->contains(function ($ss) use ($requestSectionId) {
                        return isset($ss['section']['id']) && (string) $ss['section']['id'] === $requestSectionId;
                    });
                }

                if ($hasExactSubSection || $hasSameSection) {
                    $same->push($employee);
                } else {
                    $other->push($employee);
                }
            }

            return [$same, $other];
        };

        $sortEmployees = function ($employees) {
            return $employees->sortByDesc('total_score')
                ->sortByDesc(fn($employee) => $employee['type'] === 'bulanan' ? 1 : 0)
                ->values();
        };

        [$sameSubSectionEligible, $otherSubSectionEligible] = $splitEmployeesBySubSection($eligibleEmployees, $request);

        $sortedSameSubSectionEmployees = $sortEmployees($sameSubSectionEligible);
        $sortedOtherSubSectionEmployees = $sortEmployees($otherSubSectionEligible);

        $currentScheduledIds = array_map('strval', $currentScheduledIds);

        return Inertia::render('Fullfill/Revise', [
            'request' => $request,
            'sameSubSectionEmployees' => $sortedSameSubSectionEmployees,
            'otherSubSectionEmployees' => $sortedOtherSubSectionEmployees,
            'currentScheduledIds' => $currentScheduledIds,
            'auth' => ['user' => auth()->user()]
        ]);
    }

    public function updateRevision(Request $request, $id)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'fulfilled_by' => 'required|exists:users,id',
            'visibility' => 'in:public,private',
            'enable_line_assignment' => 'boolean',
            'line_assignments' => 'array',
            'line_assignments.*' => 'string',
        ]);

        $req = ManPowerRequest::with(['schedules.employee', 'subSection'])->findOrFail($id);

        if ($req->status !== 'fulfilled') {
            return back()->withErrors(['revision_error' => 'Hanya permintaan yang sudah terpenuhi yang dapat direvisi.']);
        }

        try {
            DB::transaction(function () use ($validated, $req) {
                $currentSchedules = $req->schedules;
                $newEmployeeIds = $validated['employee_ids'];

                $enableLineAssignment = $validated['enable_line_assignment'] ?? false;
                $lineAssignments = $enableLineAssignment ? ($validated['line_assignments'] ?? []) : [];

                if ($currentSchedules->count() > 0) {
                    foreach ($currentSchedules as $schedule) {
                        $employee = $schedule->employee;
                        $otherAssignments = Schedule::where('employee_id', $employee->id)
                            ->where('man_power_request_id', '!=', $req->id)
                            ->where('date', $req->date)
                            ->count();

                        if ($otherAssignments === 0) {
                            $employee->status = 'available';
                            $employee->save();
                        }
                        $schedule->delete();
                    }
                }

                foreach ($newEmployeeIds as $employeeId) {
                    $employee = Employee::where('id', $employeeId)
                        ->where(function ($query) {
                            $query->where('status', 'available')
                                ->orWhere('status', 'assigned');
                        })
                        ->where('cuti', 'no')
                        ->whereDoesntHave('schedules', function ($query) use ($req) {
                            $query->where('date', $req->date)
                                ->where('man_power_request_id', '!=', $req->id);
                        })
                        ->first();

                    if (!$employee) {
                        throw new \Exception("Karyawan ID {$employeeId} tidak tersedia, sedang cuti, atau sudah dijadwalkan pada tanggal ini.");
                    }

                    $data = [
                        'employee_id' => $employeeId,
                        'sub_section_id' => $req->sub_section_id,
                        'man_power_request_id' => $req->id,
                        'date' => $req->date,
                        'visibility' => $validated['visibility'] ?? 'private',
                    ];

                    if ($enableLineAssignment && isset($lineAssignments[$employeeId])) {
                        $data['line'] = $lineAssignments[$employeeId];
                    } elseif ($enableLineAssignment && strtolower($req->subSection->name) === 'putway') {
                        $data['line'] = '1';
                    }

                    $schedule = Schedule::create($data);

                    $employee->status = 'assigned';
                    $employee->save();
                }

                $req->fulfilled_by = $validated['fulfilled_by'];
                $req->save();
            });
        } catch (\Exception $e) {
            return back()->withErrors(['revision_error' => $e->getMessage()]);
        }

        return redirect()
            ->route('manpower-requests.index')
            ->with('success', 'Revisi permintaan berhasil disimpan');
    }

    private function calculateBaseScore($employee, $weeklyScheduleCount)
    {
        $workloadPenalty = $this->calculateWorkloadPenalty($weeklyScheduleCount);

        $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
        $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;

        $averageRating = $employee->ratings->avg('rating') ?? 0;

        $baseScore = ($workloadPenalty * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

        return $baseScore;
    }

    private function calculateWorkloadPenalty($weeklyScheduleCount)
    {
        $penalty = match ($weeklyScheduleCount) {
            0 => 100,
            1 => 80,
            2 => 60,
            3 => 40,
            4 => 20,
            default => 0,
        };

        return $penalty;
    }

    public function bulkFulfillmentPage($id)
    {
        $request = ManPowerRequest::with(['subSection.section', 'shift'])->findOrFail($id);

        // Get same day requests from same SECTION
        $sameDayRequests = ManPowerRequest::with(['subSection.section', 'shift'])
            ->where('date', $request->date)
            ->where('id', '!=', $request->id)
            ->whereHas('subSection', function ($query) use ($request) {
                $query->where('section_id', $request->subSection->section_id);
            })
            ->get();

        // Get eligible employees
        $startDate = Carbon::now()->subDays(6)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $request->date)
            ->where('man_power_request_id', '!=', $request->id)
            ->pluck('employee_id')
            ->toArray();

        $currentScheduledIds = $request->schedules->pluck('employee_id')->toArray();

        $eligibleEmployees = Employee::where(function ($query) use ($currentScheduledIds) {
            $query->where('status', 'available')
                ->orWhereIn('id', $currentScheduledIds);
        })
            ->where('cuti', 'no')
            ->whereNotIn('id', array_diff($scheduledEmployeeIdsOnRequestDate, $currentScheduledIds))
            ->with([
                'subSections.section',
                'workloads',
                'blindTests',
                'ratings'
            ])
            ->withCount([
                'schedules' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                }
            ])
            ->with(['schedules.manPowerRequest.shift'])
            ->get()
            ->map(function ($employee) use ($request) {
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                // Calculate ML score and final score
                $baseScore = $this->calculateBaseScore($employee, $weeklyScheduleCount);
                $mlScore = $this->calculateMLPriorityScore($employee, $request);
                $finalScore = ($mlScore * 0.7) + ($baseScore * 0.3);

                // Format subSections data from the pivot relationship
                $subSectionsData = $employee->subSections->map(function ($subSection) {
                    return [
                        'id' => (string) $subSection->id,
                        'name' => $subSection->name,
                        'section_id' => (string) $subSection->section_id,
                        'section' => $subSection->section ? [
                            'id' => (string) $subSection->section->id,
                            'name' => $subSection->section->name,
                        ] : null,
                    ];
                })->toArray();

                return [
                    'id' => (string) $employee->id,
                    'nik' => $employee->nik,
                    'name' => $employee->name,
                    'type' => $employee->type,
                    'status' => $employee->status,
                    'gender' => $employee->gender,
                    'final_score' => $finalScore,
                    'ml_score' => $mlScore,
                    'subSections' => $subSectionsData,
                    'workload_points' => $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0,
                    'average_rating' => $employee->ratings->avg('rating') ?? 0,
                    // Add work days data for EmployeeModal
                    'work_days_14_days' => $this->getWorkDaysCount($employee, 14),
                    'work_days_30_days' => $this->getWorkDaysCount($employee, 30),
                    'last_5_shifts' => $this->getLastShifts($employee, 5),
                ];
            });

        // Sort employees by final_score (ML-enhanced)
        $allSortedEligibleEmployees = $eligibleEmployees->sortByDesc('final_score')->values()->all();

        return Inertia::render('Fullfill/BulkFulfillment', [
            'auth' => ['user' => auth()->user()],
            'sameDayRequests' => $sameDayRequests,
            'currentRequest' => $request,
            'allSortedEligibleEmployees' => $allSortedEligibleEmployees,
        ]);
    }

    /**
     * Auto-assign employees ke satu request
     */
    private function autoSelectEmployees(ManPowerRequest $manpowerRequest, string $strategy, array $excludeIds = [])
    {
        $excludeIds = $excludeIds ?? [];

        // Get employees from same sub-section
        $sameSubSectionEmployees = Employee::whereHas('subSections', function ($query) use ($manpowerRequest) {
            $query->where('sub_section_id', $manpowerRequest->sub_section_id);
        })->whereNotIn('id', $excludeIds)->get();

        // Get employees from other sub-sections in the same section
        $otherSubSectionEmployees = Employee::whereHas('subSections.section', function ($query) use ($manpowerRequest) {
            $query->where('section_id', $manpowerRequest->subSection->section_id);
        })->whereNotIn('id', $excludeIds)
            ->whereDoesntHave('subSections', function ($query) use ($manpowerRequest) {
                $query->where('sub_section_id', $manpowerRequest->sub_section_id);
            })->get();

        // Combine and normalize employees WITH ML SCORES
        $combinedEmployees = collect([
            ...$sameSubSectionEmployees->map(function ($emp) use ($manpowerRequest) {
                return $this->normalizeEmployeeWithML($emp, $manpowerRequest, true);
            }),
            ...$otherSubSectionEmployees->map(function ($emp) use ($manpowerRequest) {
                return $this->normalizeEmployeeWithML($emp, $manpowerRequest, false);
            })
        ]);

        // Sort employees based on strategy (now using ML-enhanced scores)
        $sortedEmployees = $this->sortEmployeesByStrategyWithML($combinedEmployees, $manpowerRequest, $strategy);

        // Select employees based on requirements
        $selected = $this->selectOptimalEmployees($sortedEmployees, $manpowerRequest);

        return $selected;
    }

    private function normalizeEmployeeWithML($employee, $manpowerRequest, $isSameSubSection)
    {
        $gender = strtolower(trim($employee->gender ?? 'male'));
        if (!in_array($gender, ['male', 'female'])) {
            $gender = 'male';
        }

        // Calculate work days for 14 days and 30 days
        $workDays14Days = $this->getWorkDaysCount($employee, 14);
        $workDays30Days = $this->getWorkDaysCount($employee, 30);

        // Get last 5 shifts
        $last5Shifts = $this->getLastShifts($employee, 5);

        // Calculate base scores
        $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
        $blindTestPoints = 0;
        $latestTest = $employee->blindTests->sortByDesc('test_date')->first();
        if ($latestTest && $latestTest->result === 'Pass') {
            $blindTestPoints = 3;
        }
        $averageRating = $employee->ratings->avg('rating') ?? 0;
        $baseScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

        // Calculate ML score with updated features
        $mlScore = $this->calculateMLPriorityScore($employee, $manpowerRequest);

        // ADD PRIORITY SCORE CALCULATION
        $priorityScore = $this->calculatePriorityScore($employee, $manpowerRequest);

        // Get priority info
        $priorityInfo = $employee->pickingPriorities->map(function ($priority) {
            return [
                'category' => $priority->category,
                'category_name' => $priority->category_name,
                'weight_multiplier' => $priority->weight_multiplier,
            ];
        })->toArray();

        // UPDATE FINAL SCORE CALCULATION TO INCLUDE PRIORITY
        $finalScore = ($mlScore * 0.6) + ($baseScore * 0.3) + ($priorityScore * 0.1);

        return (object) [
            'id' => $employee->id,
            'name' => $employee->name,
            'gender' => $gender,
            'type' => $employee->type,
            'workload_points' => $workloadPoints,
            'blind_test_points' => $blindTestPoints,
            'average_rating' => $averageRating,
            'base_score' => $baseScore,
            'ml_score' => $mlScore,
            'priority_score' => $priorityScore, // ADD THIS
            'final_score' => $finalScore, // UPDATED
            'has_priority' => !empty($priorityInfo), // ADD THIS
            'priority_info' => $priorityInfo, // ADD THIS
            'is_same_subsection' => $isSameSubSection,
            'subSections' => $employee->subSections ?? collect(),
            'work_days_14_days' => $workDays14Days,
            'work_days_30_days' => $workDays30Days,
            'last_5_shifts' => $last5Shifts,
            'shift_priority' => $this->calculateShiftPriority($employee, $manpowerRequest),
        ];
    }

    /**
     * Sort employees with ML-enhanced strategy
     */
    private function sortEmployeesByStrategyWithML($employees, ManpowerRequest $request, string $strategy)
    {
        return $employees->sort(function ($a, $b) use ($request, $strategy) {
            // 1. Priority employees first
            if ($a->has_priority !== $b->has_priority) {
                return $a->has_priority ? -1 : 1;
            }

            // 2. If both have priority, compare priority scores
            if ($a->has_priority && $b->has_priority && $a->priority_score !== $b->priority_score) {
                return $b->priority_score - $a->priority_score;
            }

            switch ($strategy) {
                case 'same_section':
                    // Prioritize same subsection first
                    if ($a->is_same_subsection !== $b->is_same_subsection) {
                        return $a->is_same_subsection ? -1 : 1;
                    }
                    break;

                case 'balanced':
                    // Balance workload distribution but consider priorities
                    if ($a->workload_penalty !== $b->workload_penalty) {
                        return $b->workload_penalty - $a->workload_penalty;
                    }
                    break;

                case 'optimal':
                default:
                    // Use ML-enhanced final score first
                    if ($a->final_score !== $b->final_score) {
                        return $b->final_score - $a->final_score;
                    }
                    break;
            }

            // Secondary sort: gender matching
            $aGenderMatch = $this->getGenderMatchScore($a, $request);
            $bGenderMatch = $this->getGenderMatchScore($b, $request);
            if ($aGenderMatch !== $bGenderMatch) {
                return $aGenderMatch - $bGenderMatch;
            }

            // Tertiary sort: employee type preference (bulanan first)
            if ($a->type === 'bulanan' && $b->type === 'harian')
                return -1;
            if ($a->type === 'harian' && $b->type === 'bulanan')
                return 1;

            return $a->id - $b->id;
        });
    }

    /**
     * Get gender matching score (lower is better)
     */
    private function getGenderMatchScore($employee, ManpowerRequest $request)
    {
        $maleNeeded = $request->male_count > 0;
        $femaleNeeded = $request->female_count > 0;

        if ($maleNeeded && $employee->gender === 'male')
            return 0;
        if ($femaleNeeded && $employee->gender === 'female')
            return 0;

        return 1; // No match
    }

    /**
     * Select optimal employees based on request requirements
     */
    private function selectOptimalEmployees($sortedEmployees, ManpowerRequest $request)
    {
        $selected = collect();
        $requiredMale = $request->male_count ?? 0;
        $requiredFemale = $request->female_count ?? 0;
        $totalRequired = $request->requested_amount;

        // First, select required gender counts
        if ($requiredMale > 0) {
            $males = $sortedEmployees->filter(fn($emp) => $emp->gender === 'male')
                ->take($requiredMale);
            $selected = $selected->merge($males);
        }

        if ($requiredFemale > 0) {
            $females = $sortedEmployees->filter(fn($emp) => $emp->gender === 'female')
                ->take($requiredFemale);
            $selected = $selected->merge($females);
        }

        // Fill remaining slots with any available employees
        $remaining = $totalRequired - $selected->count();
        if ($remaining > 0) {
            $alreadySelectedIds = $selected->pluck('id')->toArray();
            $additionalEmployees = $sortedEmployees
                ->filter(fn($emp) => !in_array($emp->id, $alreadySelectedIds))
                ->take($remaining);

            $selected = $selected->merge($additionalEmployees);
        }

        return $selected->take($totalRequired);
    }
}