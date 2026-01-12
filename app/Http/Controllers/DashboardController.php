<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ManPowerRequest;
use App\Models\Schedule;
use App\Models\Permit;
use App\Models\SubSection;
use App\Models\Section;
use App\Models\LunchCoupon;
use App\Models\Shift; 
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Log; 

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

  public function getEmployeeQuota(Request $request)
{
    $request->validate([
        'date' => 'nullable|date'
    ]);
    
    $date = $request->input('date') ? Carbon::parse($request->date) : Carbon::today();
    
    try {
        Log::info('Fetching employee quota for date: ' . $date->format('Y-m-d'));
        
        // Get all active employees (not deactivated)
        $activeEmployees = Employee::where('status', '!=', 'deactivated')
            ->whereNull('deactivated_at')
            ->get()
            ->keyBy('id');
        
        Log::info('Active employees count: ' . $activeEmployees->count());
        
        // Get schedules for the specific date
        $assignedEmployeeIds = Schedule::whereDate('date', $date)
            ->pluck('employee_id')
            ->toArray();
        
        Log::info('Assigned employee IDs count: ' . count($assignedEmployeeIds));
        
        // Get employees on leave (cuti = 'yes')
        $onLeaveEmployeeIds = Employee::where('cuti', 'yes')
            ->pluck('id')
            ->toArray();
        
        // Also check permits table for active leaves/sick leaves on that date
        $permitEmployeeIds = Permit::whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->pluck('employee_id')
            ->toArray();
        
        $onLeaveEmployeeIds = array_unique(array_merge($onLeaveEmployeeIds, $permitEmployeeIds));
        
        Log::info('On leave employee IDs count: ' . count($onLeaveEmployeeIds));
        
        // Get all sections with their subsections
        $sections = Section::with('subSections')->get();
        
        Log::info('Sections found: ' . $sections->count());
        
        // Preload all employee-subsection relationships
        $employeeSubSections = DB::table('employee_sub_section')
            ->select('employee_id', 'sub_section_id')
            ->get()
            ->groupBy('sub_section_id');
        
        Log::info('Employee-subsection relationships: ' . $employeeSubSections->count());
        
        $sectionStats = [];
        $subsectionStats = [];
        
        // Initialize counters
        $totalActiveEmployees = $activeEmployees->count();
        $totalAssigned = count($assignedEmployeeIds);
        $totalOnLeave = count($onLeaveEmployeeIds);
        
        foreach ($sections as $section) {
            $sectionEmployees = collect();
            
            foreach ($section->subSections as $subSection) {
                $subSectionEmployeeIds = $employeeSubSections->get($subSection->id, collect())
                    ->pluck('employee_id')
                    ->filter(function ($employeeId) use ($activeEmployees) {
                        return isset($activeEmployees[$employeeId]);
                    })
                    ->unique()
                    ->values();
                
                $total = $subSectionEmployeeIds->count();
                
                // Calculate stats for this subsection
                $available = $subSectionEmployeeIds->filter(function ($employeeId) use ($assignedEmployeeIds, $onLeaveEmployeeIds, $activeEmployees) {
                    $employee = $activeEmployees[$employeeId] ?? null;
                    if (!$employee) return false;
                    
                    // Not assigned today
                    $notAssigned = !in_array($employeeId, $assignedEmployeeIds);
                    // Not on leave
                    $notOnLeave = !in_array($employeeId, $onLeaveEmployeeIds);
                    // Status is available
                    $isAvailable = $employee->status === 'available';
                    
                    return $notAssigned && $notOnLeave && $isAvailable;
                })->count();
                
                $assigned = $subSectionEmployeeIds->filter(function ($employeeId) use ($assignedEmployeeIds) {
                    return in_array($employeeId, $assignedEmployeeIds);
                })->count();
                
                $onLeave = $subSectionEmployeeIds->filter(function ($employeeId) use ($onLeaveEmployeeIds) {
                    return in_array($employeeId, $onLeaveEmployeeIds);
                })->count();
                
                // Store subsection stats
                $subsectionStats[] = [
                    'id' => $subSection->id,
                    'name' => $subSection->name,
                    'section_id' => $section->id,
                    'section_name' => $section->name,
                    'total' => $total,
                    'available' => $available,
                    'assigned' => $assigned,
                    'onLeave' => $onLeave
                ];
                
                // Add to section employees collection
                $sectionEmployees = $sectionEmployees->merge($subSectionEmployeeIds);
            }
            
            // Calculate section stats (unique employees across all subsections)
            $uniqueSectionEmployees = $sectionEmployees->unique();
            $sectionTotal = $uniqueSectionEmployees->count();
            
            $sectionAvailable = $uniqueSectionEmployees->filter(function ($employeeId) use ($assignedEmployeeIds, $onLeaveEmployeeIds, $activeEmployees) {
                $employee = $activeEmployees[$employeeId] ?? null;
                if (!$employee) return false;
                
                $notAssigned = !in_array($employeeId, $assignedEmployeeIds);
                $notOnLeave = !in_array($employeeId, $onLeaveEmployeeIds);
                $isAvailable = $employee->status === 'available';
                
                return $notAssigned && $notOnLeave && $isAvailable;
            })->count();
            
            $sectionAssigned = $uniqueSectionEmployees->filter(function ($employeeId) use ($assignedEmployeeIds) {
                return in_array($employeeId, $assignedEmployeeIds);
            })->count();
            
            $sectionOnLeave = $uniqueSectionEmployees->filter(function ($employeeId) use ($onLeaveEmployeeIds) {
                return in_array($employeeId, $onLeaveEmployeeIds);
            })->count();
            
            // Store section stats
            $sectionStats[] = [
                'id' => $section->id,
                'name' => $section->name,
                'total' => $sectionTotal,
                'available' => $sectionAvailable,
                'assigned' => $sectionAssigned,
                'onLeave' => $sectionOnLeave
            ];
        }
        
        // Calculate overall statistics
        $overallStats = [
            'total' => $totalActiveEmployees,
            'available' => $totalActiveEmployees - $totalAssigned - $totalOnLeave,
            'assigned' => $totalAssigned,
            'onLeave' => $totalOnLeave
        ];
        
        Log::info('Section stats count: ' . count($sectionStats));
        Log::info('Subsection stats count: ' . count($subsectionStats));
        
        return response()->json([
            'success' => true,
            'sections' => $sectionStats,
            'subsections' => $subsectionStats,
            'overall' => $overallStats,
            'date' => $date->format('Y-m-d'),
            'last_updated' => now()->toISOString()
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error getting employee quota: ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'sections' => [],
            'subsections' => [],
            'overall' => ['total' => 0, 'available' => 0, 'assigned' => 0, 'onLeave' => 0],
            'date' => $date->format('Y-m-d'),
            'last_updated' => now()->toISOString(),
            'error' => 'Failed to load quota data: ' . $e->getMessage()
        ], 500);
    }
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