<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ManPowerRequest;
use App\Models\Schedule;
use App\Models\Workload;
use App\Models\BlindTest;
use App\Models\Rating;
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

            $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;

            $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
            $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;

            $averageRating = $employee->ratings->avg('rating') ?? 0;

            $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

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
                'calculated_rating' => $rating,
                'working_day_weight' => $workingDayWeight,
                'total_assigned_hours' => $totalWorkingHours,
                'sub_sections_data' => $subSectionsData,
                'workload_points' => $workloadPoints,
                'blind_test_points' => $blindTestPoints,
                'average_rating' => $averageRating,
                'total_score' => $totalScore,
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



    $sortEmployees = function ($employees) {
        return $employees->sortByDesc('total_score')
            ->sortByDesc(fn($employee) => $employee['type'] === 'bulanan' ? 1 : 0)
            ->sortBy('working_day_weight')
            ->values();
    };

    [$sameSubSectionEligible, $otherSubSectionEligible] = $splitEmployeesBySubSection($eligibleEmployees, $request);

    $sortedSameSubSectionEmployees = $sortEmployees($sameSubSectionEligible);
    $sortedOtherSubSectionEmployees = $sortEmployees($otherSubSectionEligible);

    // Debug logging to help identify issues
    Log::info('Fulfillment Request Details', [
        'request_id' => $request->id,
        'request_sub_section_id' => $request->sub_section_id,
        'request_section_id' => $request->subSection->section_id ?? null,
        'total_employees' => $eligibleEmployees->count(),
        'same_subsection_count' => $sameSubSectionEligible->count(),
        'other_subsection_count' => $otherSubSectionEligible->count(),
    ]);

    return Inertia::render('Fullfill/Fulfill', [
        'request' => $request,
        'sameSubSectionEmployees' => $sortedSameSubSectionEmployees,
        'otherSubSectionEmployees' => $sortedOtherSubSectionEmployees,
        'currentScheduledIds' => $currentScheduledIds,
        'auth' => ['user' => auth()->user()]
    ]);
}

public function bulkStore(Request $request)
{
    $request->validate([
        'request_ids'   => 'required|array',
        'request_ids.*' => 'exists:man_power_requests,id',
        'strategy'      => 'required|in:optimal,same_section,balanced',
    ]);

    DB::beginTransaction();
    try {
        $results = [];

        foreach ($request->request_ids as $id) {
            $manpowerRequest = ManPowerRequest::with('subSection.section')->findOrFail($id);

            if ($manpowerRequest->status === 'fulfilled') {
                $results[$id] = 'already fulfilled';
                continue;
            }

            // Process each request individually, exactly like in create method
            $startDate = Carbon::now()->subDays(6)->startOfDay();
            $endDate = Carbon::now()->endOfDay();

            $scheduledEmployeeIdsOnRequestDate = Schedule::where('date', $manpowerRequest->date)
                ->where('man_power_request_id', '!=', $manpowerRequest->id)
                ->pluck('employee_id')
                ->toArray();

            $currentScheduledIds = $manpowerRequest->schedules->pluck('employee_id')->toArray();

            // Get eligible employees exactly like in create method
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

                    $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                    $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                    $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                    $averageRating = $employee->ratings->avg('rating') ?? 0;

                    $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

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

            // Split employees into three groups: exact subsection, same section, other
            $splitEmployeesBySubSection = function ($employees, $request) {
                $requestSubSectionId = $request->sub_section_id;
                $requestSectionId = $request->subSection->section_id ?? null;

                $exactSubSection = collect();
                $sameSection = collect();
                $other = collect();

                foreach ($employees as $employee) {
                    $subSections = collect($employee['sub_sections_data']);

                    // Check for exact subsection match
                    $hasExactSubSection = $subSections->contains('id', $requestSubSectionId);
                    
                    // Check for same section (but not exact subsection)
                    $hasSameSection = false;
                    if ($requestSectionId) {
                        $hasSameSection = $subSections->contains(function ($ss) use ($requestSectionId, $requestSubSectionId) {
                            return isset($ss['section']['id']) && 
                                   $ss['section']['id'] == $requestSectionId &&
                                   $ss['id'] != $requestSubSectionId; // Exclude exact matches
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

            // Sort each group of employees
            $sortEmployees = function ($employees) {
                return $employees->sortByDesc('total_score')
                    ->sortByDesc(fn($employee) => $employee['type'] === 'bulanan' ? 1 : 0)
                    ->sortBy('working_day_weight')
                    ->values();
            };

            // Split employees into three groups
            [$exactSubSectionEmployees, $sameSectionEmployees, $otherEmployees] = 
                $splitEmployeesBySubSection($eligibleEmployees, $manpowerRequest);
            
            // Sort each group
            $sortedExactSubSection = $sortEmployees($exactSubSectionEmployees);
            $sortedSameSection = $sortEmployees($sameSectionEmployees);
            $sortedOther = $sortEmployees($otherEmployees);

            // Combine in priority order: exact subsection first, then same section, then others
            $sortedEmployees = $sortedExactSubSection
                ->merge($sortedSameSection)
                ->merge($sortedOther);

            // Take needed employees
            $needed = $manpowerRequest->requested_amount;
            $selected = $sortedEmployees->take($needed);

            // Assign employees to schedule
            foreach ($selected as $emp) {
                Schedule::create([
                    'employee_id' => $emp['id'],
                    'sub_section_id' => $manpowerRequest->sub_section_id,
                    'man_power_request_id' => $manpowerRequest->id,
                    'date' => $manpowerRequest->date,
                    'status' => 'pending',
                ]);
            }

            // Update request status
            $manpowerRequest->update([
                'status' => 'fulfilled',
                'fulfilled_by' => auth()->id()
            ]);

            $results[$id] = 'fulfilled - ' . count($selected) . ' employees assigned';
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Bulk fulfill completed',
            'results' => $results
        ]);
    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error("Bulk fulfill error: ".$e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'Bulk fulfill failed: '.$e->getMessage()
        ], 500);
    }
}

public function bulkPreview(Request $request)
{
    $request->validate([
        'request_ids'   => 'required|array',
        'request_ids.*' => 'exists:man_power_requests,id',
        'strategy'      => 'required|in:optimal,same_section,balanced',
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

                $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                $averageRating = $employee->ratings->avg('rating') ?? 0;

                $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

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
                    
                    if ($aHasExact && !$bHasExact) return -1;
                    if (!$aHasExact && $bHasExact) return 1;
                    
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
                
                if ($aInSameSection && !$bInSameSection) return -1;
                if (!$aInSameSection && $bInSameSection) return 1;
                
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
    $endDate   = Carbon::now()->endOfDay();

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

            $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
            $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
            $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
            $averageRating   = $employee->ratings->avg('rating') ?? 0;

            $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

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
                'id'                => $employee->id,
                'gender'            => $employee->gender,
                'type'              => $employee->type,
                'working_day_weight'=> $workingDayWeight,
                'total_score'       => $totalScore,
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
                
                if ($aHasExact && !$bHasExact) return -1;
                if (!$aHasExact && $bHasExact) return 1;
                
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
            
            if ($aInSameSection && !$bInSameSection) return -1;
            if (!$aInSameSection && $bInSameSection) return 1;
            
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
            'employee_id'          => $emp['id'],
            'sub_section_id'       => $request->sub_section_id,
            'man_power_request_id' => $request->id,
            'date'                 => $request->date,
            'status'               => 'pending',
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
            'fulfilled_by' => 'required|exists:users,id'
        ]);

        $req = ManPowerRequest::with(['schedules.employee'])->findOrFail($id);

        try {
            DB::transaction(function () use ($validated, $req) {
                $currentSchedules = $req->schedules;
                $currentEmployeeIds = $currentSchedules->pluck('employee_id')->toArray();
                $newEmployeeIds = $validated['employee_ids'];

                $employeesToRemove = array_diff($currentEmployeeIds, $newEmployeeIds);
                foreach ($employeesToRemove as $employeeId) {
                    $schedule = $currentSchedules->where('employee_id', $employeeId)->first();
                    if ($schedule) {
                        $employee = $schedule->employee;
                        $employee->status = 'available';
                        $employee->save();
                        $schedule->delete();
                    }
                }

                $employeesToAdd = array_diff($newEmployeeIds, $currentEmployeeIds);
                foreach ($employeesToAdd as $employeeId) {
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

                    Schedule::create([
                        'employee_id' => $employeeId,
                        'sub_section_id' => $req->sub_section_id,
                        'man_power_request_id' => $req->id,
                        'date' => $req->date,
                    ]);

                    $employee->status = 'assigned';
                    $employee->save();
                }

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

    
}