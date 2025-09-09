<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ManPowerRequest;
use App\Models\Schedule;
use App\Models\SubSection;
use App\Models\Section;
use App\Models\LunchCoupon;
use App\Models\Shift; // <-- NEW: Import Shift model if you use it for filter options
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Display the dashboard view with summary data.
     */
  public function index(): Response
    {
        // Get counts for employees
        $activeEmployeesCount = Employee::where('status', 'available')
                                        ->where('cuti', 'no')
                                        ->count();
                                        
        $totalEmployeesCount = Employee::count();

        $todayLunchCoupons = LunchCoupon::whereDate('date', today())->count();
        $thisWeekLunchCoupons = LunchCoupon::whereBetween('date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ])->count();

        // Get counts for manpower requests
        $pendingRequestsCount = ManPowerRequest::where('status', 'pending')->count();
        $fulfilledRequestsCount = ManPowerRequest::where('status', 'fulfilled')->count();
        $totalRequestsCount = ManPowerRequest::count();

        // Get counts for schedules
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek(Carbon::MONDAY);
        $endOfWeek = Carbon::now()->endOfWeek(Carbon::SUNDAY);

        $todaySchedulesCount = Schedule::whereDate('date', $today)->count();
        $thisWeekSchedulesCount = Schedule::whereBetween('date', [$startOfWeek, $endOfWeek])->count();
        $totalSchedulesCount = Schedule::count();

        // --- Chart Data 1: Manpower Request Status Trends (Last 5 Months) ---
        $months = [];
        $pendingRequestsMonthly = [];
        $fulfilledRequestsMonthly = [];

        // Start from 5 months ago
        $startMonth = Carbon::now()->startOfMonth()->subMonths(4); // 5 months total (current + 4 previous)
        
        for ($i = 0; $i < 5; $i++) {
            $month = $startMonth->copy()->addMonths($i);
            $monthLabel = $month->translatedFormat('M Y');
            $months[] = $monthLabel;

            $pendingCount = ManPowerRequest::where('status', 'pending')
                                            ->whereYear('date', $month->year)
                                            ->whereMonth('date', $month->month)
                                            ->count();
            $fulfilledCount = ManPowerRequest::where('status', 'fulfilled')
                                              ->whereYear('date', $month->year)
                                              ->whereMonth('date', $month->month)
                                              ->count();

            $pendingRequestsMonthly[] = $pendingCount;
            $fulfilledRequestsMonthly[] = $fulfilledCount;
        }

        $manpowerRequestChartData = [
            'labels' => $months,
            'datasets' => [
                [
                    'label' => 'Pending Requests',
                    'data' => $pendingRequestsMonthly,
                    'backgroundColor' => 'rgba(251, 191, 36, 0.6)',
                    'borderColor' => 'rgba(251, 191, 36, 1)',
                    'borderWidth' => 1,
                ],
                [
                    'label' => 'Fulfilled Requests',
                    'data' => $fulfilledRequestsMonthly,
                    'backgroundColor' => 'rgba(34, 197, 94, 0.6)',
                    'borderColor' => 'rgba(34, 197, 94, 1)',
                    'borderWidth' => 1,
                ],
            ],
        ];

        // --- Chart Data 2: Employee Assignment Distribution by Sub-Section ---
        $sections = Section::with('subSections')->get();
        $subSections = SubSection::all();
        
        // Prepare data for the chart (grouped by section)
        $sectionLabels = [];
        $subSectionData = [];
        $subSectionIds = [];
        
        // Calculate assignments for the last 5 months
        $startDate = Carbon::now()->startOfMonth()->subMonths(4);
        $endDate = Carbon::now()->endOfMonth();
        
        foreach ($sections as $section) {
            foreach ($section->subSections as $subSection) {
                $assignedCount = Schedule::where('sub_section_id', $subSection->id)
                                        ->whereBetween('date', [$startDate, $endDate])
                                        ->distinct('employee_id')
                                        ->count('employee_id');
                
                $sectionLabels[] = $section->name . ' - ' . $subSection->name;
                $subSectionData[] = $assignedCount;
                $subSectionIds[] = $subSection->id;
            }
        }

        $employeeAssignmentChartData = [
            'labels' => $sectionLabels,
            'subSectionIds' => $subSectionIds,
            'datasets' => [
                [
                    'label' => 'Assigned Employees',
                    'data' => $subSectionData,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.6)',
                    'borderColor' => 'rgba(59, 130, 246, 1)',
                    'borderWidth' => 1,
                ],
            ],
        ];

        // --- New Data for Dashboard Sections (Tables) ---
        $recentPendingRequests = ManPowerRequest::where('status', 'pending')
                                                ->with(['subSection', 'shift'])
                                                ->orderBy('date', 'desc')
                                                ->limit(5)
                                                ->get();

        $upcomingSchedules = Schedule::where('date', '>=', $today)
                                     ->with(['employee', 'subSection', 'manPowerRequest.shift'])
                                     ->orderBy('date', 'asc')
                                     ->limit(5)
                                     ->get();

        return Inertia::render('Dashboard', [
            'summary' => [
                'activeEmployeesCount' => $activeEmployeesCount,
                'totalEmployeesCount' => $totalEmployeesCount,
                'pendingRequestsCount' => $pendingRequestsCount,
                'fulfilledRequestsCount' => $fulfilledRequestsCount,
                'totalRequestsCount' => $totalRequestsCount,
                'todaySchedulesCount' => $todaySchedulesCount,
                'thisWeekSchedulesCount' => $thisWeekSchedulesCount,
                'totalSchedulesCount' => $totalSchedulesCount,
                'todayLunchCoupons' => $todayLunchCoupons,
                'thisWeekLunchCoupons' => $thisWeekLunchCoupons
            ],
            'manpowerRequestChartData' => $manpowerRequestChartData,
            'employeeAssignmentChartData' => $employeeAssignmentChartData,
            'recentPendingRequests' => $recentPendingRequests,
            'upcomingSchedules' => $upcomingSchedules,
            'sections' => $sections
        ]);
    }

    /**
     * Get paginated active employees for modal display.
     */
    public function getActiveEmployees(Request $request): \Illuminate\Http\JsonResponse
    {
        $employees = Employee::query()
                            ->where('status', 'available')
                            ->where('cuti', 'no')
                            ->when($request->input('filter_nik'), function ($query, $nik) {
                                $query->where('nik', 'like', '%' . $nik . '%');
                            })
                            ->when($request->input('filter_name'), function ($query, $name) {
                                $query->where('name', 'like', '%' . $name . '%');
                            })
                            ->when($request->input('filter_type'), function ($query, $type) {
                                $query->where('type', $type);
                            })
                            ->when($request->input('filter_status'), function ($query, $status) {
                                $query->where('status', $status);
                            })
                            ->when($request->input('filter_cuti'), function ($query, $cuti) {
                                $query->where('cuti', $cuti);
                            })
                            ->when($request->input('filter_created_at_from'), function ($query, $date) {
                                $query->whereDate('created_at', '>=', $date);
                            })
                            ->when($request->input('filter_created_at_to'), function ($query, $date) {
                                $query->whereDate('created_at', '<=', $date);
                            })
                            ->paginate(5)
                            ->withQueryString(); // Crucial to maintain filters in pagination links

        return response()->json($employees);
    }

    /**
     * Get paginated pending manpower requests for modal display.
     */
    public function getPendingRequests(Request $request): \Illuminate\Http\JsonResponse
    {
        $requests = ManPowerRequest::query()
                                    ->where('status', 'pending')
                                    ->with(['subSection', 'shift'])
                                    ->when($request->input('filter_date_from'), function ($query, $date) {
                                        $query->whereDate('date', '>=', $date);
                                    })
                                    ->when($request->input('filter_date_to'), function ($query, $date) {
                                        $query->whereDate('date', '<=', $date);
                                    })
                                    ->when($request->input('filter_sub_section_id'), function ($query, $subSectionId) {
                                        $query->where('sub_section_id', $subSectionId);
                                    })
                                    ->when($request->input('filter_shift_id'), function ($query, $shiftId) {
                                        $query->where('shift_id', $shiftId);
                                    })
                                    ->when($request->input('filter_requested_amount'), function ($query, $amount) {
                                        $query->where('requested_amount', $amount);
                                    })
                                    ->orderBy('date', 'desc')
                                    ->paginate(5)
                                    ->withQueryString(); // Crucial to maintain filters in pagination links

        return response()->json($requests);
    }

    /**
     * Get paginated fulfilled manpower requests for modal display.
     */
    public function getFulfilledRequests(Request $request): \Illuminate\Http\JsonResponse
    {
        $requests = ManPowerRequest::query()
                                    ->where('status', 'fulfilled')
                                    ->with(['subSection', 'shift'])
                                    ->when($request->input('filter_date_from'), function ($query, $date) {
                                        $query->whereDate('date', '>=', $date);
                                    })
                                    ->when($request->input('filter_date_to'), function ($query, $date) {
                                        $query->whereDate('date', '<=', $date);
                                    })
                                    ->when($request->input('filter_sub_section_id'), function ($query, $subSectionId) {
                                        $query->where('sub_section_id', $subSectionId);
                                    })
                                    ->when($request->input('filter_shift_id'), function ($query, $shiftId) {
                                        $query->where('shift_id', $shiftId);
                                    })
                                    ->when($request->input('filter_requested_amount'), function ($query, $amount) {
                                        $query->where('requested_amount', $amount);
                                    })
                                    ->orderBy('date', 'desc')
                                    ->paginate(5)
                                    ->withQueryString(); // Crucial to maintain filters in pagination links

        return response()->json($requests);
    }

    /**
     * Get paginated schedules for modal display.
     */
    public function getUpcomingSchedules(Request $request): \Illuminate\Http\JsonResponse
    {
        $today = Carbon::today();
        $schedules = Schedule::query()
                                ->where('date', '>=', $today)
                                ->with(['employee', 'subSection', 'manPowerRequest.shift'])
                                ->when($request->input('filter_date_from'), function ($query, $date) {
                                    $query->whereDate('date', '>=', $date);
                                })
                                ->when($request->input('filter_date_to'), function ($query, $date) {
                                    $query->whereDate('date', '<=', $date);
                                })
                                ->when($request->input('filter_employee_name'), function ($query, $employeeName) {
                                    $query->whereHas('employee', function ($q) use ($employeeName) {
                                        $q->where('name', 'like', '%' . $employeeName . '%');
                                    });
                                })
                                ->when($request->input('filter_sub_section_id'), function ($query, $subSectionId) {
                                    $query->where('sub_section_id', $subSectionId);
                                })
                                ->when($request->input('filter_shift_id'), function ($query, $shiftId) {
                                    $query->whereHas('manPowerRequest', function ($q) use ($shiftId) {
                                        $q->where('shift_id', $shiftId);
                                    });
                                })
                                ->orderBy('date', 'asc')
                                ->paginate(5)
                                ->withQueryString(); // Crucial to maintain filters in pagination links

        return response()->json($schedules);
    }

    // Add these methods to your DashboardController

/**
 * Get manpower requests by month and status
 */
public function getManpowerRequestsByMonth(Request $request, $month, $status)
{
    $startDate = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
    $endDate = Carbon::createFromFormat('Y-m', $month)->endOfMonth();

    $requests = ManPowerRequest::with(['subSection', 'shift'])
        ->where('status', $status)
        ->whereBetween('date', [$startDate, $endDate])
        ->orderBy('date')
        ->paginate(10);

    return response()->json($requests);
}

/**
 * Get filtered manpower request data for chart
 */
public function getFilteredManpowerRequests(Request $request)
{
    // Default to current month if no dates provided
    $fromDate = $request->input('from_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
    $toDate = $request->input('to_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
    
    // Validate dates
    try {
        $from = Carbon::parse($fromDate);
        $to = Carbon::parse($toDate);
    } catch (\Exception $e) {
        // If invalid dates, use default
        $from = Carbon::now()->startOfMonth();
        $to = Carbon::now()->endOfMonth();
    }

    // Group by month or day based on date range
    $dateFormat = $this->determineDateFormat($from->format('Y-m-d'), $to->format('Y-m-d'));
    
    $requests = ManPowerRequest::query()
        ->selectRaw("DATE_FORMAT(date, '{$dateFormat}') as period, status, COUNT(*) as count")
        ->whereBetween('date', [$from, $to])
        ->groupBy('period', 'status')
        ->orderBy('period')
        ->get();

    // Generate all periods in the range
    $periods = $this->generateDatePeriods($from->format('Y-m-d'), $to->format('Y-m-d'), $dateFormat);
    
    // Initialize data arrays
    $pendingData = array_fill_keys($periods, 0);
    $fulfilledData = array_fill_keys($periods, 0);

    // Fill with actual data
    foreach ($requests as $request) {
        if ($request->status === 'pending') {
            $pendingData[$request->period] = $request->count;
        } else {
            $fulfilledData[$request->period] = $request->count;
        }
    }

    return response()->json([
        'labels' => $periods,
        'datasets' => [
            [
                'label' => 'Pending Requests',
                'data' => array_values($pendingData),
                'backgroundColor' => 'rgba(251, 191, 36, 0.6)',
                'borderColor' => 'rgba(251, 191, 36, 1)',
                'borderWidth' => 1,
            ],
            [
                'label' => 'Fulfilled Requests',
                'data' => array_values($fulfilledData),
                'backgroundColor' => 'rgba(34, 197, 94, 0.6)',
                'borderColor' => 'rgba(34, 197, 94, 1)',
                'borderWidth' => 1,
            ],
        ],
    ]);
}

/**
 * Get manpower requests by period (day, week, or month) and status
 */
public function getManpowerRequestsByPeriod(Request $request, $periodType, $period, $status)
{
    $query = ManPowerRequest::with(['subSection', 'shift'])
        ->where('status', $status);
    
    switch ($periodType) {
        case 'day':
            $date = Carbon::parse($period);
            $query->whereDate('date', $date);
            break;
            
        case 'week':
            list($year, $week) = explode('-', $period);
            $query->whereRaw('YEAR(date) = ?', [$year])
                  ->whereRaw('WEEK(date, 1) = ?', [$week]);
            break;
            
        case 'month':
        default:
            $month = Carbon::createFromFormat('Y-m', $period);
            $query->whereYear('date', $month->year)
                  ->whereMonth('date', $month->month);
            break;
    }
    
    // Apply additional filters if any
    if ($request->has('filter_sub_section_id')) {
        $query->where('sub_section_id', $request->input('filter_sub_section_id'));
    }
    
    if ($request->has('filter_shift_id')) {
        $query->where('shift_id', $request->input('filter_shift_id'));
    }
    
    return response()->json($query->orderBy('date')->paginate(10));
}

/**
 * Determine whether to group by day, week or month based on date range
 */
private function determineDateFormat($fromDate, $toDate)
{
    $start = Carbon::parse($fromDate);
    $end = Carbon::parse($toDate);
    $diffInDays = $start->diffInDays($end);
    
    if ($diffInDays <= 31) { // Show daily data for up to 1 month
        return '%Y-%m-%d'; // Daily format
    } elseif ($diffInDays <= 93) { // Show weekly data for 1-3 months
        return '%Y-%u'; // Weekly format (year-week)
    } else { // Show monthly data for longer periods
        return '%Y-%m'; // Monthly format
    }
}

/**
 * Generate all periods in the date range
 */
private function generateDatePeriods($fromDate, $toDate, $dateFormat)
{
    $periods = [];
    $current = Carbon::parse($fromDate);
    $end = Carbon::parse($toDate);
    
    while ($current <= $end) {
        if ($dateFormat === '%Y-%m-%d') { // Daily
            $periods[] = $current->format('Y-m-d');
            $current->addDay();
        } elseif ($dateFormat === '%Y-%u') { // Weekly
            $periods[] = $current->format('Y') . '-' . $current->week();
            $current->addWeek();
        } else { // Monthly
            $periods[] = $current->format('Y-m');
            $current->addMonth();
        }
    }
    
    return $periods;
}

/**
 * Get filtered employee assignment data for chart
 */
public function getFilteredEmployeeAssignments(Request $request)
{
    $fromDate = $request->input('from_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
    $toDate = $request->input('to_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
    $sectionId = $request->input('section_id');

    $query = SubSection::with(['section'])
        ->when($sectionId, function ($query) use ($sectionId) {
            $query->where('section_id', $sectionId);
        });

    $subSections = $query->get();

    $labels = [];
    $subSectionIds = [];
    $assignedCounts = [];

    foreach ($subSections as $subSection) {
        $count = Schedule::where('sub_section_id', $subSection->id)
            ->whereBetween('date', [$fromDate, $toDate])
            ->where('status', 'accepted')
            ->distinct('employee_id')
            ->count('employee_id');

        $labels[] = $subSection->section->name . ' - ' . $subSection->name;
        $subSectionIds[] = $subSection->id;
        $assignedCounts[] = $count;
    }

    return response()->json([
        'labels' => $labels,
        'subSectionIds' => $subSectionIds,
        'datasets' => [
            [
                'label' => 'Assigned Employees',
                'data' => $assignedCounts,
                'backgroundColor' => 'rgba(59, 130, 246, 0.6)',
                'borderColor' => 'rgba(59, 130, 246, 1)',
                'borderWidth' => 1,
            ],
        ],
    ]);
}

/**
 * Get schedules by subsection with filters
 */
public function getSchedulesBySubSection(Request $request, $subSectionId)
{
    $schedules = Schedule::query()
        ->with(['employee', 'subSection.section', 'manPowerRequest.shift'])
        ->where('sub_section_id', $subSectionId)
        ->where('status', 'accepted') // Only show accepted schedules
        ->when($request->input('filter_date_from'), function ($query, $date) {
            $query->whereDate('date', '>=', $date);
        })
        ->when($request->input('filter_date_to'), function ($query, $date) {
            $query->whereDate('date', '<=', $date);
        })
        ->when($request->input('filter_employee_name'), function ($query, $name) {
            $query->whereHas('employee', function ($q) use ($name) {
                $q->where('name', 'like', '%' . $name . '%');
            });
        })
        ->when($request->input('filter_shift_id'), function ($query, $shiftId) {
            $query->whereHas('manPowerRequest', function ($q) use ($shiftId) {
                $q->where('shift_id', $shiftId);
            });
        })
        ->orderBy('date', 'asc')
        ->paginate(10);

    return response()->json($schedules);
}

public function getLunchCouponsByDate(Request $request, $date)
{
    $date = Carbon::parse($date);
    
    $total = Schedule::whereDate('date', $date)
        ->where('status', 'accepted')
        ->count();

    $pending = LunchCoupon::whereDate('date', $date)
        ->where('status', 'pending')
        ->count();

    $claimed = LunchCoupon::whereDate('date', $date)
        ->where('status', 'claimed')
        ->count();

    $details = Schedule::with([
            'employee',
            'subSection.section',
            'lunchCoupon'
        ])
        ->whereDate('date', $date)
        ->where('status', 'accepted')
        ->get()
        ->map(function ($schedule) {
            return [
                'date' => $schedule->date,
                'employee' => $schedule->employee,
                'section' => $schedule->subSection->section ?? null,
                'sub_section' => $schedule->subSection,
                'status' => $schedule->lunchCoupon->status ?? null,
            ];
        });

    return response()->json([
        'total' => $total,
        'pending' => $pending,
        'claimed' => $claimed,
        'details' => $details,
        'date' => $date->format('Y-m-d')
    ]);
}

}