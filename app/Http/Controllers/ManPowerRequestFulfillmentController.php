<?php
// app/Http/Controllers/ManPowerRequestFulfillmentController.php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ManPowerRequest;
use App\Models\Schedule;
use App\Models\Workload;
use App\Models\BlindTest;
use App\Models\Rating;
use App\Services\SimpleMLService;
use App\Services\PHPMachineLearning;
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

        // Get same day requests for ALL subsections (not just same subsection)
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

        // FIX: Properly eager load subSections with section relationship
        $eligibleEmployees = Employee::where(function ($query) use ($currentScheduledIds) {
            $query->where('status', 'available')
                ->orWhereIn('id', $currentScheduledIds);
        })
            ->where('cuti', 'no')
            ->whereNotIn('id', array_diff($scheduledEmployeeIdsOnRequestDate, $currentScheduledIds))
            ->with([
                'subSections' => function ($query) {
                    $query->with('section'); // Ensure section is loaded with each subsection
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

                // Calculate work days for 14 days and 30 days
                $workDays14Days = $this->getWorkDaysCount($employee, 14);
                $workDays30Days = $this->getWorkDaysCount($employee, 30);
                
                // Get last 5 shifts
                $last5Shifts = $this->getLastShifts($employee, 5);

                $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;

                $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;

                $averageRating = $employee->ratings->avg('rating') ?? 0;

                $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

                // ADD ML SCORE CALCULATION
                $mlScore = $this->calculateMLPriorityScore($employee, $request);

                // COMBINE WITH ML SCORE (70% ML + 30% existing logic)
                $finalScore = ($mlScore * 0.7) + ($totalScore * 0.3);

                // FIX: Properly include section data in subSectionsData
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
                    'ml_score' => $mlScore, // NEW: ML priority score
                    'final_score' => $finalScore, // NEW: Combined score
                    // NEW: Work days and shift history
                    'work_days_14_days' => $workDays14Days,
                    'work_days_30_days' => $workDays30Days,
                    'last_5_shifts' => $last5Shifts,
                ];
            });

        // FIX: Updated helper function to properly check section matching
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

        // UPDATE: Sort by final_score (ML-enhanced) instead of total_score
        $sortEmployees = function ($employees) {
            return $employees->sortByDesc('final_score') // Use ML-enhanced score
                ->sortByDesc(fn($employee) => $employee['type'] === 'bulanan' ? 1 : 0)
                ->sortBy('working_day_weight')
                ->values();
        };

        [$sameSubSectionEligible, $otherSubSectionEligible] = $splitEmployeesBySubSection($eligibleEmployees, $request);

        $sortedSameSubSectionEmployees = $sortEmployees($sameSubSectionEligible);
        $sortedOtherSubSectionEmployees = $sortEmployees($otherSubSectionEligible);

        // Get ML status for frontend
        $mlService = app(SimpleMLService::class);
        $mlStatus = $mlService->isModelTrained() ? 'trained' : 'not_trained';
        $mlAccuracy = null;

        if ($mlService->isModelTrained()) {
            $modelInfo = $mlService->getModelInfo();
            $mlAccuracy = isset($modelInfo['accuracy']) ? round($modelInfo['accuracy'] * 100, 1) : null;
        }

        // Debug logging to help identify issues
        Log::info('Fulfillment Request Details', [
            'request_id' => $request->id,
            'request_sub_section_id' => $request->sub_section_id,
            'request_section_id' => $request->subSection->section_id ?? null,
            'total_employees' => $eligibleEmployees->count(),
            'same_subsection_count' => $sameSubSectionEligible->count(),
            'other_subsection_count' => $otherSubSectionEligible->count(),
            'same_day_requests_count' => $sameDayRequests->count(),
            'ml_status' => $mlStatus,
            'ml_accuracy' => $mlAccuracy,
        ]);

        return Inertia::render('Fullfill/Fulfill', [
            'request' => $request,
            'sameSubSectionEmployees' => $sortedSameSubSectionEmployees,
            'otherSubSectionEmployees' => $sortedOtherSubSectionEmployees,
            'currentScheduledIds' => $currentScheduledIds,
            'sameDayRequests' => $sameDayRequests, // Add same day requests to the response
            'ml_status' => $mlStatus, // NEW
            'ml_accuracy' => $mlAccuracy, // NEW
            'auth' => ['user' => auth()->user()]
        ]);
    }

    /**
     * Calculate work days count for an employee within a given period
     */
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

    /**
     * Get last N shifts for an employee
     */
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

    /**
     * Calculate ML priority score for an employee
     */
    private function calculateMLPriorityScore($employee, $manpowerRequest)
    {
        try {
            $mlService = app(SimpleMLService::class);

            if (!$mlService->isModelTrained()) {
                Log::warning('ML model not trained, using fallback score');
                return 0.5; // Default score if model not trained
            }

            $features = [
                'work_days_count' => $this->getWorkDaysCount($employee),
                'rating_value' => $this->getAverageRating($employee),
                'test_score' => $this->getTestScore($employee),
                'gender' => $employee->gender === 'male' ? 1 : 0,
                'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
                'same_subsection' => $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0,
                'same_section' => $this->isSameSection($employee, $manpowerRequest) ? 1 : 0,
                'current_workload' => $this->getCurrentWorkload($employee),
            ];

            Log::debug('ML Features for employee', [
                'employee_id' => $employee->id,
                'features' => $features
            ]);

            $predictions = $mlService->predict([$features]);
            $mlScore = $predictions[0] ?? 0.5;

            Log::debug('ML Prediction result', [
                'employee_id' => $employee->id,
                'ml_score' => $mlScore
            ]);

            return $mlScore;

        } catch (\Exception $e) {
            Log::error("ML Score calculation failed for employee {$employee->id}: " . $e->getMessage());
            return 0.5; // Fallback score
        }
    }

    // Helper methods for ML feature calculation (keep existing ones)
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

    private function getCurrentWorkload($employee)
    {
        $startDate = now()->subDays(7)->startOfDay();
        $workHours = $employee->schedules()
            ->where('date', '>=', $startDate)
            ->with('manPowerRequest.shift')
            ->get()
            ->sum(function ($schedule) {
                return $schedule->manPowerRequest->shift->hours ?? 0;
            });
        return min($workHours / 40, 1.0);
    }

    // ... KEEP ALL YOUR EXISTING METHODS BELOW (they will automatically use the new data)
    // The autoSelectEmployees, bulkStore, bulkFulfill, etc. methods remain the same

    /**
     * Enhanced auto-assign with ML integration
     */
    private function autoSelectEmployees(ManPowerRequest $manpowerRequest, string $strategy, array $excludeIds = [])
    {
        Log::debug('Starting autoSelectEmployees with ML', [
            'request_id' => $manpowerRequest->id,
            'strategy' => $strategy,
            'exclude_ids_count' => count($excludeIds),
            'required_male' => $manpowerRequest->male_count,
            'required_female' => $manpowerRequest->female_count,
            'total_required' => $manpowerRequest->requested_amount
        ]);

        // Ensure excludeIds is always an array
        $excludeIds = $excludeIds ?? [];

        // Get employees from same sub-section
        $sameSubSectionEmployees = Employee::whereHas('subSections', function ($query) use ($manpowerRequest) {
            $query->where('sub_section_id', $manpowerRequest->sub_section_id);
        })->whereNotIn('id', $excludeIds)->get();

        Log::debug('Same subsection employees', [
            'request_id' => $manpowerRequest->id,
            'same_subsection_count' => $sameSubSectionEmployees->count(),
            'sub_section_id' => $manpowerRequest->sub_section_id
        ]);

        // Get employees from other sub-sections in the same section
        $otherSubSectionEmployees = Employee::whereHas('subSections.section', function ($query) use ($manpowerRequest) {
            $query->where('section_id', $manpowerRequest->subSection->section_id);
        })->whereNotIn('id', $excludeIds)
            ->whereDoesntHave('subSections', function ($query) use ($manpowerRequest) {
                $query->where('sub_section_id', $manpowerRequest->sub_section_id);
            })->get();

        Log::debug('Other subsection employees', [
            'request_id' => $manpowerRequest->id,
            'other_subsection_count' => $otherSubSectionEmployees->count(),
            'section_id' => $manpowerRequest->subSection->section_id ?? 'N/A'
        ]);

        // Combine and normalize employees WITH ML SCORES
        $combinedEmployees = collect([
            ...$sameSubSectionEmployees->map(function ($emp) use ($manpowerRequest) {
                return $this->normalizeEmployeeWithML($emp, $manpowerRequest, true);
            }),
            ...$otherSubSectionEmployees->map(function ($emp) use ($manpowerRequest) {
                return $this->normalizeEmployeeWithML($emp, $manpowerRequest, false);
            })
        ]);

        Log::debug('Combined employees before sorting', [
            'request_id' => $manpowerRequest->id,
            'total_combined_count' => $combinedEmployees->count()
        ]);

        // Sort employees based on strategy (now using ML-enhanced scores)
        $sortedEmployees = $this->sortEmployeesByStrategyWithML($combinedEmployees, $manpowerRequest, $strategy);

        // Select employees based on requirements
        $selected = $this->selectOptimalEmployees($sortedEmployees, $manpowerRequest);

        Log::debug('Final employee selection', [
            'request_id' => $manpowerRequest->id,
            'final_selected_count' => $selected->count(),
            'selected_genders' => $selected->groupBy('gender')->map->count(),
            'used_ml_scores' => $selected->pluck('final_score')->toArray()
        ]);

        return $selected;
    }

    /**
     * Normalize employee data with ML scores
     */
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

        // Calculate ML score
        $mlScore = $this->calculateMLPriorityScore($employee, $manpowerRequest);

        // Combine scores (70% ML + 30% base)
        $finalScore = ($mlScore * 0.7) + ($baseScore * 0.3);

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
            'final_score' => $finalScore, // ML-enhanced score
            'is_same_subsection' => $isSameSubSection,
            'subSections' => $employee->subSections ?? collect(),
            // NEW: Work days and shift history
            'work_days_14_days' => $workDays14Days,
            'work_days_30_days' => $workDays30Days,
            'last_5_shifts' => $last5Shifts,
        ];
    }

    /**
     * Sort employees with ML-enhanced strategy
     */
   private function sortEmployeesByStrategyWithML($employees, ManpowerRequest $request, string $strategy)
{
    return $employees->sort(function ($a, $b) use ($request, $strategy) {
        switch ($strategy) {
            case 'same_section':
                // Prioritize same subsection first
                if ($a->is_same_subsection !== $b->is_same_subsection) {
                    return $a->is_same_subsection ? -1 : 1;
                }
                break;
                
            case 'balanced':
                // Balance workload distribution but consider ML scores
                if ($a->workload_penalty !== $b->workload_penalty) {
                    return $b->workload_penalty - $a->workload_penalty; // Higher penalty = lower priority
                }
                break;
                
            case 'optimal':
            default:
                // Use ML-enhanced final score first
                if ($a->final_score !== $b->final_score) {
                    return $b->final_score - $a->final_score; // Higher ML score first
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
        if ($a->type === 'bulanan' && $b->type === 'harian') return -1;
        if ($a->type === 'harian' && $b->type === 'bulanan') return 1;

        // REMOVED: working_day_weight sorting for harian employees
        
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

    public function bulkStore(Request $request)
    {
        $request->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'exists:man_power_requests,id',
            'employee_selections' => 'required|array',
            'strategy' => 'required|in:optimal,same_section,balanced',
            'visibility' => 'in:public,private',
            'status' => 'in:pending,accepted,rejected'
        ]);

        Log::info('=== BULK FULFILLMENT STARTED ===', [
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'request_ids' => $request->request_ids,
            'request_count' => count($request->request_ids),
            'strategy' => $request->strategy,
            'visibility' => $request->visibility,
            'timestamp' => now()->toDateTimeString(),
            'raw_input' => $request->all(),
        ]);

        DB::beginTransaction();
        try {
            $results = [];
            $successCount = 0;
            $failureCount = 0;
            $employeeSelections = $request->employee_selections;
            $status = $request->status ?? 'pending';

            foreach ($request->request_ids as $id) {
                Log::info('⚡ Processing request', ['request_id' => $id]);

                $manpowerRequest = ManPowerRequest::with(['subSection', 'schedules'])->findOrFail($id);

                // Skip if already fulfilled
                if ($manpowerRequest->status === 'fulfilled') {
                    $results[$id] = 'already fulfilled';
                    $failureCount++;
                    Log::warning('REQUEST ALREADY FULFILLED - SKIPPING', ['request_id' => $id]);
                    continue;
                }

                // Get selected employee IDs for this request
                $selectedEmployeeIds = $employeeSelections[$id] ?? [];

                // Validate employee selection count
                if (count($selectedEmployeeIds) !== $manpowerRequest->requested_amount) {
                    $results[$id] = 'invalid employee selection count';
                    $failureCount++;
                    Log::error('INVALID EMPLOYEE SELECTION COUNT - SKIPPING', [
                        'request_id' => $id,
                        'selected' => count($selectedEmployeeIds),
                        'expected' => $manpowerRequest->requested_amount
                    ]);
                    continue;
                }

                // Validate gender requirements
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
                    Log::error('INSUFFICIENT MALE EMPLOYEES - SKIPPING', [
                        'request_id' => $id,
                        'actual' => $maleCount,
                        'required' => $manpowerRequest->male_count
                    ]);
                    continue;
                }

                if ($manpowerRequest->female_count > 0 && $femaleCount < $manpowerRequest->female_count) {
                    $results[$id] = 'insufficient female employees';
                    $failureCount++;
                    Log::error('INSUFFICIENT FEMALE EMPLOYEES - SKIPPING', [
                        'request_id' => $id,
                        'actual' => $femaleCount,
                        'required' => $manpowerRequest->female_count
                    ]);
                    continue;
                }

                // Create schedules with line assignment for putway subsection
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

                    // Add line for putway subsection - SAME LOGIC AS SINGLE MODE
                    if ($manpowerRequest->subSection && strtolower($manpowerRequest->subSection->name) === 'putway') {
                        $data['line'] = strval((($index % 2) + 1)); // 1,2,1,2...
                    }

                    $schedule = Schedule::create($data);
                    $createdSchedules[] = $schedule->id;

                    Log::info('✅ Employee assigned', [
                        'request_id' => $id,
                        'employee_id' => $employeeId,
                        'schedule_id' => $schedule->id,
                        'line' => $data['line'] ?? 'N/A',
                    ]);
                }

                // Update request status
                $manpowerRequest->update([
                    'status' => 'fulfilled',
                    'fulfilled_by' => auth()->id()
                ]);

                $results[$id] = 'fulfilled - ' . count($selectedEmployeeIds) . ' employees assigned';
                $successCount++;
            }

            DB::commit();

            Log::info('=== BULK FULFILLMENT COMPLETED ===', [
                'total_requests' => count($request->request_ids),
                'successful' => $successCount,
                'failed' => $failureCount,
                'success_rate' => round(($successCount / count($request->request_ids)) * 100, 2) . '%',
                'results' => $results,
                'timestamp' => now()->toDateTimeString()
            ]);

            return redirect()->route('manpower-requests.index')->with([
                'success' => 'Bulk fulfill completed: ' . $successCount . ' successful, ' . $failureCount . ' failed',
                'bulk_results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('=== BULK FULFILLMENT FAILED ===', [
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['employee_selections']),
                'timestamp' => now()->toDateTimeString()
            ]);

            return redirect()->back()->withErrors([
                'fulfillment_error' => 'Bulk fulfill failed: ' . $e->getMessage()
            ]);
        }
    }

    public function bulkFulfill(Request $request)
    {
        $request->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'exists:man_power_requests,id',
            'employee_selections' => 'required|array',
            'strategy' => 'required|in:optimal,same_section,balanced',
            'visibility' => 'required|in:private,public',
        ]);

        try {
            DB::beginTransaction();

            $requestIds = $request->request_ids;
            $employeeSelections = $request->employee_selections;

            \Log::info('🚀 BulkFulfill triggered', [
                'request_ids' => $requestIds,
                'employee_selections' => $employeeSelections,
            ]);

            foreach ($requestIds as $reqId) {
                $manpowerRequest = ManPowerRequest::findOrFail($reqId);

                $employeeIds = $employeeSelections[$reqId] ?? [];

                \Log::info('⚡ Processing bulk fulfill', [
                    'request_id' => $reqId,
                    'employee_ids' => $employeeIds,
                ]);

                // hapus schedule lama (kalau overwrite)
                $manpowerRequest->schedules()->delete();

                foreach ($employeeIds as $empId) {
                    $manpowerRequest->schedules()->create([
                        'employee_id' => $empId,
                        'status' => $request->status ?? 'pending',
                        'visibility' => $request->visibility,
                    ]);

                    \Log::info('✅ Employee assigned', [
                        'request_id' => $reqId,
                        'employee_id' => $empId,
                    ]);
                }

                $manpowerRequest->update([
                    'status' => 'fulfilled',
                    'fulfilled_by' => $request->user()->id,
                ]);
            }

            DB::commit();

            \Log::info('🎉 BulkFulfill finished successfully');

            return back()->with('success', 'Bulk fulfillment berhasil diproses.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('❌ BulkFulfill error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors([
                'fulfillment_error' => 'Terjadi kesalahan saat memproses bulk fulfillment: ' . $e->getMessage(),
            ]);
        }
    }


    private function sortEmployeesForBulk($employees, $requests, $strategy)
    {
        return $employees->sortByDesc(function ($employee) use ($strategy, $requests) {
            $score = 0;

            switch ($strategy) {
                case 'optimal':
                    // Prioritize employees with higher scores
                    $score += $employee->workload_points * 0.4;
                    $score += $employee->blind_test_points * 0.3;
                    $score += $employee->average_rating * 0.3;
                    if (!$employee->is_scheduled)
                        $score += 1000; // Big bonus for unscheduled
                    break;

                case 'same_section':
                    // Prioritize employees from the same section as the first request
                    $mainSectionId = $requests->first()->subSection->section_id;
                    if ($employee->subSections->contains('section_id', $mainSectionId)) {
                        $score += 2000;
                    }
                    $score += $employee->workload_points;
                    break;

                case 'balanced':
                    // Balance workload across employees
                    $score = 1000 - $employee->workload_points; // Lower workload = higher priority
                    if (!$employee->is_scheduled)
                        $score += 500;
                    break;
            }

            return $score;
        })->values()->all();
    }


    public function bulkPreview(Request $request)
    {
        $request->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'exists:man_power_requests,id',
            'strategy' => 'required|in:optimal,same_section,balanced',
        ]);

        $results = [];

        foreach ($request->request_ids as $id) {
            $manpowerRequest = ManPowerRequest::with('subSection.section')->findOrFail($id);

            if ($manpowerRequest->status === 'fulfilled') {
                $results[$id] = [
                    'status' => 'already_fulfilled',
                    'message' => 'Request already fulfilled',
                    'employees' => []
                ];
                continue;
            }

            // Get eligible employees (same logic as create method)
            $startDate = Carbon::now()->subDays(6)->startOfDay();
            $endDate = Carbon::now()->endOfDay();

            $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $manpowerRequest->date)
                ->where('man_power_request_id', '!=', $manpowerRequest->id)
                ->pluck('employee_id')
                ->toArray();

            $currentScheduledIds = $manpowerRequest->schedules->pluck('employee_id')->toArray();

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
                ->map(function ($employee) {
                    // Same calculation logic as in create method
                    $totalWorkingHours = 0;
                    foreach ($employee->schedules as $schedule) {
                        if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                            $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                        }
                    }

                    $weeklyScheduleCount = $employee->schedules_count;

                    $rating = match ($weeklyScheduleCount) {
                        5 => 5,
                        4 => 4,
                        3 => 3,
                        2 => 2,
                        1 => 1,
                        default => 0,
                    };

                    $workingDayWeight = match ($rating) {
                        5 => 15,
                        4 => 45,
                        3 => 75,
                        2 => 105,
                        1 => 135,
                        0 => 165,
                        default => 0,
                    };

                    // $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                    // $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                    // $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                    // $averageRating = $employee->ratings->avg('rating') ?? 0;
    
                    // $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);
    
                    // Use weeklyScheduleCount for workload penalty
                    $baseScore = $this->calculateBaseScore($employee, $weeklyScheduleCount);
                    // For bulk preview, you might want to use final score or keep base score
                    $totalScore = $baseScore; // Or use final score if you want ML here too
    
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
                        'gender' => $employee->gender,
                        'working_day_weight' => $workingDayWeight,
                        'total_score' => $totalScore,
                        'sub_sections_data' => $subSectionsData,
                    ];
                });

            // Split employees into three groups: exact subsection, same section, other
            $splitEmployeesBySubSection = function ($employees, $request) {
                $requestSubSectionId = $request->sub_section_id;
                $requestSectionId = $request->subSection->section_id ?? null;

                $exactSubSection = collect();
                $sameSection = collect();
                $other = collect();

                foreach ($employees as $employee) {
                    $subSections = collect($employee['sub_sections_data']);

                    $hasExactSubSection = $subSections->contains('id', $requestSubSectionId);

                    $hasSameSection = false;
                    if ($requestSectionId) {
                        $hasSameSection = $subSections->contains(function ($ss) use ($requestSectionId, $requestSubSectionId) {
                            return isset($ss['section']['id']) &&
                                $ss['section']['id'] == $requestSectionId &&
                                $ss['id'] != $requestSubSectionId;
                        });
                    }

                    if ($hasExactSubSection) {
                        $exactSubSection->push($employee);
                    } elseif ($hasSameSection) {
                        $sameSection->push($employee);
                    } else {
                        $other->push($employee);
                    }
                }

                return [$exactSubSection, $sameSection, $other];
            };

            $strategy = $request->strategy;
            $sortEmployees = function ($employees) use ($strategy, $manpowerRequest) {
                $requestSubSectionId = $manpowerRequest->sub_section_id;
                $requestSectionId = $manpowerRequest->subSection->section_id ?? null;

                return $employees->sort(function ($a, $b) use ($strategy, $requestSubSectionId, $requestSectionId) {
                    if ($strategy === 'same_section') {
                        $aHasExact = collect($a['sub_sections_data'])->contains('id', $requestSubSectionId);
                        $bHasExact = collect($b['sub_sections_data'])->contains('id', $requestSubSectionId);

                        if ($aHasExact && !$bHasExact)
                            return -1;
                        if (!$aHasExact && $bHasExact)
                            return 1;

                        return $b['total_score'] <=> $a['total_score'];
                    }

                    if ($strategy === 'balanced') {
                        return $a['working_day_weight'] <=> $b['working_day_weight'];
                    }

                    // optimal strategy
                    $aInSameSection = collect($a['sub_sections_data'])->contains(function ($ss) use ($requestSectionId) {
                        return isset($ss['section']['id']) && $ss['section']['id'] == $requestSectionId;
                    });
                    $bInSameSection = collect($b['sub_sections_data'])->contains(function ($ss) use ($requestSectionId) {
                        return isset($ss['section']['id']) && $ss['section']['id'] == $requestSectionId;
                    });

                    if ($aInSameSection && !$bInSameSection)
                        return -1;
                    if (!$aInSameSection && $bInSameSection)
                        return 1;

                    return $b['total_score'] <=> $a['total_score'];
                });
            };

            // Split and sort employees
            [$exactSubSectionEmployees, $sameSectionEmployees, $otherEmployees] =
                $splitEmployeesBySubSection($eligibleEmployees, $manpowerRequest);

            $sortedExactSubSection = $sortEmployees($exactSubSectionEmployees);
            $sortedSameSection = $sortEmployees($sameSectionEmployees);
            $sortedOther = $sortEmployees($otherEmployees);

            // Combine in priority order
            $sortedEmployees = $sortedExactSubSection
                ->merge($sortedSameSection)
                ->merge($sortedOther);

            // Take needed employees
            $needed = $manpowerRequest->requested_amount;
            $selected = $sortedEmployees->take($needed);

            $results[$id] = [
                'status' => 'preview',
                'request' => $manpowerRequest->only(['id', 'date', 'requested_amount', 'sub_section_id']),
                'employees' => $selected->values()->all(),
                'available_count' => $eligibleEmployees->count(),
                'selected_count' => $selected->count()
            ];
        }

        return response()->json([
            'success' => true,
            'results' => $results,
            'strategy' => $request->strategy
        ]);
    }

    /**
     * Auto-assign employees ke satu request
     */
    private function autoAssignEmployees(ManPowerRequest $request, string $strategy = 'optimal')
    {
        // Ambil employee eligible persis sama kayak di create()
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
            ->map(function ($employee) {
                // hitung score, workingDayWeight, dsb sama kayak di create()
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                $rating = match ($weeklyScheduleCount) {
                    5 => 5,
                    4 => 4,
                    3 => 3,
                    2 => 2,
                    1 => 1,
                    default => 0,
                };

                $workingDayWeight = match ($rating) {
                    5 => 15,
                    4 => 45,
                    3 => 75,
                    2 => 105,
                    1 => 135,
                    0 => 165,
                    default => 0,
                };

                // $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                // $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                // $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                // $averageRating = $employee->ratings->avg('rating') ?? 0;
    
                // $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);
                // For auto-assign, use the ML-enhanced final score
                $baseScore = $this->calculateBaseScore($employee, $weeklyScheduleCount);
                $mlScore = $this->calculateMLPriorityScore($employee, $request);
                $totalScore = ($mlScore * 0.7) + ($baseScore * 0.3); // Final ML-enhanced score
    
                // Get proper subsection data with section information
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
                    'gender' => $employee->gender,
                    'type' => $employee->type,
                    'working_day_weight' => $workingDayWeight,
                    'total_score' => $totalScore,
                    'sub_sections_data' => $subSectionsData,
                ];
            });

        // === Filter employees by subsection/section matching ===
        $requestSubSectionId = $request->sub_section_id;
        $requestSectionId = $request->subSection->section_id ?? null;

        // Split employees into same and other sections
        $splitEmployees = function ($employees, $requestSubSectionId, $requestSectionId) {
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

        // Split employees
        [$sameSubSectionEmployees, $otherSubSectionEmployees] = $splitEmployees(
            $eligibleEmployees,
            $requestSubSectionId,
            $requestSectionId
        );

        // === Apply strategy-based sorting ===
        $sortEmployees = function ($employees) use ($strategy, $requestSubSectionId, $requestSectionId) {
            return $employees->sort(function ($a, $b) use ($strategy, $requestSubSectionId, $requestSectionId) {
                if ($strategy === 'same_section') {
                    // Prioritize employees with exact subsection match
                    $aHasExact = collect($a['sub_sections_data'])->contains('id', $requestSubSectionId);
                    $bHasExact = collect($b['sub_sections_data'])->contains('id', $requestSubSectionId);

                    if ($aHasExact && !$bHasExact)
                        return -1;
                    if (!$aHasExact && $bHasExact)
                        return 1;

                    // Then by total score
                    return $b['total_score'] <=> $a['total_score'];
                }
                if ($strategy === 'balanced') {
                    return $a['working_day_weight'] <=> $b['working_day_weight'];
                }
                // default: optimal - prioritize same section first, then by score
                $aInSameSection = collect($a['sub_sections_data'])->contains(function ($ss) use ($requestSectionId) {
                    return isset($ss['section']['id']) && $ss['section']['id'] == $requestSectionId;
                });
                $bInSameSection = collect($b['sub_sections_data'])->contains(function ($ss) use ($requestSectionId) {
                    return isset($ss['section']['id']) && $ss['section']['id'] == $requestSectionId;
                });

                if ($aInSameSection && !$bInSameSection)
                    return -1;
                if (!$aInSameSection && $bInSameSection)
                    return 1;

                return $b['total_score'] <=> $a['total_score'];
            });
        };

        // Sort employees based on strategy
        $sortedSameSubSection = $sortEmployees($sameSubSectionEmployees);
        $sortedOtherSubSection = $sortEmployees($otherSubSectionEmployees);

        // Combine same subsection first, then others
        $sortedEmployees = $sortedSameSubSection->merge($sortedOtherSubSection);

        // Ambil sesuai jumlah request
        $needed = $request->requested_amount;
        $selected = $sortedEmployees->take($needed);

        // Insert ke schedules
        foreach ($selected as $emp) {
            Schedule::create([
                'employee_id' => $emp['id'],
                'sub_section_id' => $request->sub_section_id,
                'man_power_request_id' => $request->id,
                'date' => $request->date,
                'status' => 'pending',
                'visibility' => 'private'
            ]);
        }

        return $selected;
    }

    private function splitEmployeesBySubSection($employees, $request)
    {
        $requestSubSectionId = $request->sub_section_id;
        $requestSectionId = $request->subSection->section_id ?? null;

        $same = collect();
        $other = collect();

        foreach ($employees as $employee) {
            $subSections = collect($employee['sub_sections_data']);

            // Check for exact subsection match
            $hasExactSubSection = $subSections->contains('id', $requestSubSectionId);

            // Check for same section (fallback) - ensure section data exists
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
    }


    public function store(Request $request, $id)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'fulfilled_by' => 'required|exists:users,id',
            'visibility' => 'in:public,private'
        ]);

        $req = ManPowerRequest::with(['schedules.employee', 'subSection'])->findOrFail($id);

        try {
            DB::transaction(function () use ($validated, $req) {
                $currentSchedules = $req->schedules;
                $currentEmployeeIds = $currentSchedules->pluck('employee_id')->toArray();
                $newEmployeeIds = $validated['employee_ids'];

                // Hapus yang lama
                $employeesToRemove = array_diff($currentEmployeeIds, $newEmployeeIds);
                foreach ($employeesToRemove as $employeeId) {
                    $schedule = $currentSchedules->where('employee_id', $employeeId)->first();
                    if ($schedule) {
                        $employee = $schedule->employee;
                        $employee->status = 'available';
                        $employee->save();

                        $scheduleId = $schedule->id;
                        $schedule->delete();

                        Log::info("Employee {$employeeId} removed from schedule {$scheduleId}");
                    } else {
                        Log::warning("Employee {$employeeId} not found in current schedules for removal (request_id={$req->id})");
                    }
                }

                // Tambahkan yang baru
                $employeesToAdd = array_diff($newEmployeeIds, $currentEmployeeIds);
                foreach (array_values($employeesToAdd) as $index => $employeeId) {
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

                    // Tambahkan line kalau subsection putway
                    if (strtolower($req->subSection->name) === 'putway') {
                        $data['line'] = (($index % 2) + 1); // 1,2,1,2...
                    }

                    $schedule = Schedule::create($data);

                    $employee->status = 'assigned';
                    $employee->save();

                    Log::info("Employee {$employeeId} assigned to new schedule {$schedule->id}");
                }

                // Update request status
                $req->status = 'fulfilled';
                $req->fulfilled_by = $validated['fulfilled_by'];
                $req->save();

                Log::info('Manpower request fulfilled', [
                    'request_id' => $req->id,
                    'fulfilled_by' => $validated['fulfilled_by'],
                    'employees_added' => $employeesToAdd,
                    'employees_removed' => $employeesToRemove,
                    'date' => $req->date
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Fulfillment Error: ' . $e->getMessage(), [
                'exception' => $e,
                'request_id' => $id,
                'user_id' => auth()->id()
            ]);

            return back()->withErrors(['fulfillment_error' => $e->getMessage()]);
        }

        return redirect()
            ->route('manpower-requests.index')
            ->with('success', 'Permintaan berhasil dipenuhi');
    }

    /**
     * Show the form for revising a fulfilled request
     */
    public function revise($id)
    {
        $request = ManPowerRequest::with([
            'subSection.section',
            'shift',
            'fulfilledBy',
            'schedules.employee.subSections.section'
        ])->findOrFail($id);

        // Only allow revision for fulfilled requests
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

        // Convert IDs to strings for consistent comparison
        $currentScheduledIds = array_map('strval', $currentScheduledIds);
        $scheduledEmployeeIdsOnRequestDate = array_map('strval', $scheduledEmployeeIdsOnRequestDate);

        // Get eligible employees
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
            ->map(function ($employee) {
                $totalWorkingHours = 0;
                foreach ($employee->schedules as $schedule) {
                    if ($schedule->manPowerRequest && $schedule->manPowerRequest->shift) {
                        $totalWorkingHours += $schedule->manPowerRequest->shift->hours;
                    }
                }

                $weeklyScheduleCount = $employee->schedules_count;

                $rating = match ($weeklyScheduleCount) {
                    5 => 5,
                    4 => 4,
                    3 => 3,
                    2 => 2,
                    1 => 1,
                    default => 0,
                };

                $workingDayWeight = match ($rating) {
                    5 => 15,
                    4 => 45,
                    3 => 75,
                    2 => 105,
                    1 => 135,
                    0 => 165,
                    default => 0,
                };

                // $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
    
                // $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                // $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
    
                // $averageRating = $employee->ratings->avg('rating') ?? 0;
    
                // $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);
    
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
                    'created_at' => $employee->created_at,
                    'updated_at' => $employee->updated_at,
                    'schedules_count' => $employee->schedules_count,
                    'calculated_rating' => $rating,
                    'working_day_weight' => $workingDayWeight,
                    'total_assigned_hours' => $totalWorkingHours,
                    'sub_sections_data' => $subSectionsData,
                    // 'workload_points' => $workloadPoints,
                    // 'blind_test_points' => $blindTestPoints,
                    // 'average_rating' => $averageRating,
                    'ml_score' => $mlScore, // Where applicable
                    'total_score' => $totalScore,
                ];
            });

        // Split employees by subsection
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
                ->sortBy('working_day_weight')
                ->values();
        };

        [$sameSubSectionEligible, $otherSubSectionEligible] = $splitEmployeesBySubSection($eligibleEmployees, $request);

        $sortedSameSubSectionEmployees = $sortEmployees($sameSubSectionEligible);
        $sortedOtherSubSectionEmployees = $sortEmployees($otherSubSectionEligible);

        // Convert current scheduled IDs to strings for frontend consistency
        $currentScheduledIds = array_map('strval', $currentScheduledIds);

        return Inertia::render('Fullfill/Revise', [
            'request' => $request,
            'sameSubSectionEmployees' => $sortedSameSubSectionEmployees,
            'otherSubSectionEmployees' => $sortedOtherSubSectionEmployees,
            'currentScheduledIds' => $currentScheduledIds,
            'auth' => ['user' => auth()->user()]
        ]);
    }

    /**
     * Update the revised fulfillment
     */
    public function updateRevision(Request $request, $id)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'fulfilled_by' => 'required|exists:users,id',
            'visibility' => 'in:public,private'
        ]);

        $req = ManPowerRequest::with(['schedules.employee', 'subSection'])->findOrFail($id);

        // Only allow revision for fulfilled requests
        if ($req->status !== 'fulfilled') {
            return back()->withErrors(['revision_error' => 'Hanya permintaan yang sudah terpenuhi yang dapat direvisi.']);
        }

        try {
            DB::transaction(function () use ($validated, $req) {
                $currentSchedules = $req->schedules;
                $currentEmployeeIds = $currentSchedules->pluck('employee_id')->toArray();
                $newEmployeeIds = $validated['employee_ids'];

                // Convert all IDs to strings for consistent comparison
                $currentEmployeeIds = array_map('strval', $currentEmployeeIds);
                $newEmployeeIds = array_map('strval', $newEmployeeIds);

                // Hapus yang lama
                $employeesToRemove = array_diff($currentEmployeeIds, $newEmployeeIds);
                foreach ($employeesToRemove as $employeeId) {
                    $schedule = $currentSchedules->where('employee_id', $employeeId)->first();
                    if ($schedule) {
                        $employee = $schedule->employee;

                        // Only update status if not assigned elsewhere
                        $otherAssignments = Schedule::where('employee_id', $employeeId)
                            ->where('man_power_request_id', '!=', $req->id)
                            ->where('date', $req->date)
                            ->count();

                        if ($otherAssignments === 0) {
                            $employee->status = 'available';
                            $employee->save();
                        }

                        $scheduleId = $schedule->id;
                        $schedule->delete();

                        Log::info("Employee {$employeeId} removed from schedule {$scheduleId} during revision");
                    } else {
                        Log::warning("Employee {$employeeId} not found in current schedules for removal (request_id={$req->id})");
                    }
                }

                // Tambahkan yang baru
                $employeesToAdd = array_diff($newEmployeeIds, $currentEmployeeIds);
                foreach (array_values($employeesToAdd) as $index => $employeeId) {
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

                    // Tambahkan line kalau subsection putway
                    if (strtolower($req->subSection->name) === 'putway') {
                        $data['line'] = (($index % 2) + 1); // 1,2,1,2...
                    }

                    $schedule = Schedule::create($data);

                    $employee->status = 'assigned';
                    $employee->save();

                    Log::info("Employee {$employeeId} assigned to new schedule {$schedule->id} during revision");
                }

                // Update request status (still fulfilled but with revision)
                $req->fulfilled_by = $validated['fulfilled_by'];
                $req->save();

                Log::info('Manpower request revised', [
                    'request_id' => $req->id,
                    'fulfilled_by' => $validated['fulfilled_by'],
                    'employees_added' => $employeesToAdd,
                    'employees_removed' => $employeesToRemove,
                    'date' => $req->date
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Revision Error: ' . $e->getMessage(), [
                'exception' => $e,
                'request_id' => $id,
                'user_id' => auth()->id()
            ]);

            return back()->withErrors(['revision_error' => $e->getMessage()]);
        }

        return redirect()
            ->route('manpower-requests.index')
            ->with('success', 'Revisi permintaan berhasil disimpan');
    }

    /**
     * Calculate base score with proper workload penalty based on recent schedules
     */
    private function calculateBaseScore($employee, $weeklyScheduleCount)
    {
        // Calculate workload penalty based on recent schedules (last 7 days)
        $workloadPenalty = $this->calculateWorkloadPenalty($weeklyScheduleCount);

        $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
        $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;

        $averageRating = $employee->ratings->avg('rating') ?? 0;

        // Base score: Higher workload = lower priority
        $baseScore = ($workloadPenalty * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

        return $baseScore;
    }

    /**
     * Calculate workload penalty based on weekly schedule count
     * More schedules = higher penalty = lower priority
     */
    private function calculateWorkloadPenalty($weeklyScheduleCount)
    {
        // Inverse relationship: more schedules = lower score (penalty)
        // Scale: 0 schedules = 100, 5+ schedules = 0
        $penalty = match ($weeklyScheduleCount) {
            0 => 100,
            1 => 80,
            2 => 60,
            3 => 40,
            4 => 20,
            default => 0, // 5 or more schedules
        };

        return $penalty;
    }


}