<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Section;
use App\Models\SubSection;
use App\Models\OperatorLicense;
use App\Models\Workload;
use App\Models\Schedule;
use App\Models\BlindTest; // Import the BlindTest model
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rules;
use App\Http\Requests\DeactivateEmployeeRequest;
use App\Exports\IncompleteProfilesExport;
use App\Services\ExcelExportService;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EmployeeSum extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $query = Employee::with([
            'workload' => function ($query) {
                $query->latest()->limit(1);
            },
            'schedules' => function ($query) {
                $query->whereDate('date', Carbon::today())
                    ->with('manPowerRequest.shift');
            },
            'subSections.section',
            'blindTests' => function ($query) {
                $query->orderBy('test_date', 'desc')->limit(1);
            },
            'ratings' => function ($query) {
                $query->latest()->limit(1);
            }
        ])->where('status', '!=', 'deactivated') // Add this line to exclude deactivated employees
            ->whereNull('deactivated_at'); // Also exclude employees with deactivated_at timestamp

        // Apply Filters
        if ($request->has('status') && $request->input('status') !== 'All') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('section') && $request->input('section') !== 'All') {
            $sectionName = $request->input('section');
            $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                $q->where('name', $sectionName);
            });
        }

        if ($request->has('sub_section') && $request->input('sub_section') !== 'All') {
            $subSectionName = $request->input('sub_section');
            $query->whereHas('subSections', function ($q) use ($subSectionName) {
                $q->where('name', $subSectionName);
            });
        }

        // Search by Name or NIK
        if ($request->has('search') && $request->input('search') !== null) {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('nik', 'like', '%' . $searchTerm . '%');
            });
        }

        $employees = $query->orderBy('name')
            ->paginate(10)
            ->through(function ($employee) {
                // Override status based on today's schedule
                $employee->status = $employee->isAssignedToday() ? 'assigned' : 'available';

                // Get workload data
                $latestWorkload = $employee->workload->first();
                $totalWorkCount = $latestWorkload ? $latestWorkload->total_work_count : 0;
                $weeklyWorkCount = $latestWorkload ? $latestWorkload->week : 0;

                // Use the same calculation method as in update
                $workloadPoint = $this->calculateWorkloadPoint($weeklyWorkCount);

                // Rating Logic
                $latestIndividualRating = $employee->ratings->first();
                $actualRating = $latestIndividualRating ? $latestIndividualRating->rating : 0;
                $employee->setAttribute('calculated_rating', $actualRating);

                // Blind Test KPI Contribution
                $blindTestKpiContribution = 0;
                $latestBlindTest = $employee->blindTests->first();
                if ($latestBlindTest) {
                    $blindTestKpiContribution = $latestBlindTest->result;
                }

                $workingDayWeight = 165 + $blindTestKpiContribution;

                $employee->setAttribute('total_work_count', $totalWorkCount);
                $employee->setAttribute('weekly_work_count', $weeklyWorkCount);
                $employee->setAttribute('workload_point', $workloadPoint);

                // Remove unnecessary relations
                unset($employee->schedules);
                unset($employee->blindTests);
                unset($employee->ratings);
                unset($employee->workload);

                return $employee;
            });

        // Fetch filter dropdown options
        $allStatuses = ['All', 'available', 'assigned'];
        $allSections = Section::select('name')->distinct()->pluck('name')->toArray();
        $allSubSections = SubSection::select('name')->distinct()->pluck('name')->toArray();

        return Inertia::render('EmployeeAttendance/Index', [
            'employees' => $employees,
            'filters' => $request->only(['status', 'section', 'sub_section', 'search']),
            'uniqueStatuses' => $allStatuses,
            'uniqueSections' => array_merge(['All'], $allSections),
            'uniqueSubSections' => array_merge(['All'], $allSubSections),
        ]);
    }

    public function updateWorkloads(Request $request)
    {
        try {
            DB::beginTransaction();

            // Log::info('Starting workload update process');
            $currentWeekStart = Carbon::now()->startOfWeek();
            $currentWeekEnd = Carbon::now()->endOfWeek();

            // Log::info('Getting all employees with their schedules');
            $employees = Employee::with([
                'schedules' => function ($query) use ($currentWeekStart, $currentWeekEnd) {
                    $query->whereBetween('date', [$currentWeekStart, $currentWeekEnd]);
                }
            ])->get();

            // Log::info('Processing '.$employees->count().' employees');

            foreach ($employees as $employee) {
                // Log::debug('Processing employee: '.$employee->id);

                // Calculate total work count (all time)
                $totalWorkCount = Schedule::where('employee_id', $employee->id)->count();
                Log::debug('Total work count: ' . $totalWorkCount);

                // Calculate weekly work count (from preloaded schedules)
                $weeklyWorkCount = $employee->schedules->count();
                // Log::debug('Weekly work count: '.$weeklyWorkCount);

                // Calculate workload point based on weekly work count
                $workloadPoint = $this->calculateWorkloadPoint($weeklyWorkCount);
                // Log::debug('Calculated workload point: '.$workloadPoint);

                // Update existing record or create if doesn't exist
                Workload::updateOrCreate(
                    ['employee_id' => $employee->id],
                    [
                        'week' => $weeklyWorkCount,
                        'total_work_count' => $totalWorkCount,
                        'workload_point' => $workloadPoint
                    ]
                );

                Log::debug('Workload record updated for employee: ' . $employee->id);
            }

            DB::commit();
            // Log::info('Workload update completed successfully');

            return redirect()->back()->with('success', 'Workload data updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating workloads: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return redirect()->back()->with('error', 'Failed to update workload data. Please try again.');
        }
    }

    protected function calculateWorkloadPoint(int $weeklyWorkCount): int
    {
        return match ($weeklyWorkCount) {
            0 => 165,
            1 => 135,
            2 => 105,
            3 => 75,
            4 => 45,
            5 => 15,
            default => max(0, 165 - ($weeklyWorkCount * 30)) // Fallback for counts > 5
        };
    }

  public function resetAllStatuses(Request $request)
{
    try {
        DB::transaction(function () {
            Employee::where('status', '!=', 'deactivated')
                   ->update([
                       'status' => 'available',
                   ]);
        });

        return redirect()->back()->with('success', 'All employee statuses reset successfully.');
    } catch (\Exception $e) {
        Log::error('Error resetting employee statuses: ' . $e->getMessage());
        return redirect()->back()->with('error', 'Terjadi kesalahan saat mereset status karyawan. Silakan coba lagi.');
    }
}

public function resetCuti(Employee $employee)
{
    try {
        $employee->update([
            'cuti' => 'no'
        ]);

        return redirect()->back()->with('success', 'Cuti status reset successfully for ' . $employee->name);
    } catch (\Exception $e) {
        Log::error('Error resetting cuti status: ' . $e->getMessage());
        return redirect()->back()->with('error', 'Failed to reset cuti status. Please try again.');
    }
}

    public function create(): Response
    {
        $sections = Section::with('subSections')->get();

        return Inertia::render('EmployeeAttendance/Create', [
            'sections' => $sections,
        ]);
    }



    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nik' => 'required|string|max:255|unique:employees,nik',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'type' => 'required|in:harian,bulanan',
            'status' => 'required|in:available,assigned,on leave',
            'cuti' => 'required|in:yes,no',
            'gender' => 'required|in:male,female',
            'sub_sections' => 'array',
            'sub_sections.*' => 'string|exists:sub_sections,name',
        ]);

        $employee = Employee::create([
            'name' => $validated['name'],
            'nik' => $validated['nik'],
            'password' => Hash::make($validated['password']),
            'type' => $validated['type'],
            'status' => $validated['status'],
            'cuti' => $validated['cuti'],
            'gender' => $validated['gender'],
        ]);

        if (!empty($validated['sub_sections'])) {
            $subSectionIds = SubSection::whereIn('name', $validated['sub_sections'])
                ->pluck('id')
                ->toArray();

            $employee->subSections()->attach($subSectionIds);
        }

        return Redirect::route('employee-attendance.index')->with('success', 'Pegawai berhasil ditambahkan.');
    }

    public function show(Employee $employee)
    {
        return Inertia::render('Employees/Show', [
            'employee' => $employee->load('subSections.section'),
        ]);
    }

    public function edit(Employee $employee)
    {
        $sections = Section::with('subSections')->get();

        return Inertia::render('EmployeeAttendance/Edit', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'nik' => $employee->nik,
                'type' => $employee->type,
                'status' => $employee->status,
                'cuti' => $employee->cuti,
                'gender' => $employee->gender,
                'email' => $employee->email,
                'ktp' => $employee->ktp,
                'marital' => $employee->marital,
                'birth_date' => $employee->birth_date,
                'religion' => $employee->religion,
                'phone' => $employee->phone,
                'street' => $employee->street,
                'rt' => $employee->rt,
                'rw' => $employee->rw,
                'kelurahan' => $employee->kelurahan,
                'kecamatan' => $employee->kecamatan,
                'kabupaten_kota' => $employee->kabupaten_kota,
                'provinsi' => $employee->provinsi,
                'kode_pos' => $employee->kode_pos,
                'group' => $employee->group,
                'photo' => $employee->photo,
                'sub_sections' => $employee->subSections->pluck('name')->toArray(),
            ],
            'sections' => $sections,
        ]);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nik' => 'required|string|max:255|unique:employees,nik,' . $employee->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'type' => 'required|in:harian,bulanan',
            'status' => 'required|in:available,assigned,on leave',
            'cuti' => 'required|in:yes,no',
            'gender' => 'required|in:male,female',
            'sub_sections' => 'required|array|min:1',
            'sub_sections.*' => 'string|exists:sub_sections,name',
        ]);

        // Get sub-section IDs from names
        $subSectionIds = SubSection::whereIn('name', $validated['sub_sections'])
            ->pluck('id')
            ->toArray();

        DB::transaction(function () use ($employee, $validated, $subSectionIds) {
            $updateData = [
                'name' => $validated['name'],
                'nik' => $validated['nik'],
                'type' => $validated['type'],
                'status' => $validated['status'],
                'cuti' => $validated['cuti'],
                'gender' => $validated['gender'],
            ];

            if (!empty($validated['password'])) {
                $updateData['password'] = Hash::make($validated['password']);
            }

            $employee->update($updateData);
            $employee->subSections()->sync($subSectionIds);
        });

        return redirect()->route('employee-attendance.index')
            ->with('success', 'Employee updated successfully.');
    }

   public function inactive(Request $request)
{
    try {
        Log::info('Accessing inactive employees list', [
            'user_id' => auth()->id(),
            'time' => now(),
            'request_params' => $request->all()
        ]);

        $query = Employee::where('status', 'deactivated')
            ->orWhereNotNull('deactivated_at')
            ->with([
                'subSections.section',
                'deactivatedByUser:id,name' // Add this relationship
            ]);

        if ($request->has('search') && $request->input('search') !== null) {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('nik', 'like', '%' . $searchTerm . '%');
            });
        }

        $employees = $query->paginate(10);

        return Inertia::render('EmployeeAttendance/Inactive', [
            'employees' => $employees,
            'filters' => $request->only('search')
        ]);

    } catch (\Exception $e) {
        Log::error('Failed to retrieve inactive employees', [
            'error' => $e->getMessage(),
            'stack_trace' => $e->getTraceAsString(),
            'user_id' => auth()->id()
        ]);

        return back()->with('error', 'Failed to load inactive employees. Please try again.');
    }
}

    public function exportXls(Request $request)
    {
        $employees = \DB::table('employees')
            ->leftJoin('employee_sub_section', 'employees.id', '=', 'employee_sub_section.employee_id')
            ->leftJoin('sub_sections', 'employee_sub_section.sub_section_id', '=', 'sub_sections.id')
            ->leftJoin('sections', 'sub_sections.section_id', '=', 'sections.id')
            ->when($request->section, fn($q) => $q->where('sections.name', $request->section))
            ->when($request->subsection, fn($q) => $q->where('sub_sections.name', $request->subsection))
            ->select(
                'employees.id',
                'employees.nik',
                'employees.name',
                'employees.type',
                'employees.status',
                'employees.cuti',
                'employees.gender',
                'employees.email',
                'employees.ktp',
                'employees.marital',
                'employees.birth_date',
                'employees.religion',
                'employees.phone',
                'employees.street',
                'employees.rt',
                'employees.rw',
                'employees.kelurahan',
                'employees.kecamatan',
                'employees.kabupaten_kota',
                'employees.provinsi',
                'employees.kode_pos',
                'employees.group',
                'employees.photo',
                'sections.name as section',
                \DB::raw("GROUP_CONCAT(DISTINCT sub_sections.name ORDER BY sub_sections.name SEPARATOR ', ') as subsections")
            )
            ->groupBy(
                'employees.id',
                'employees.nik',
                'employees.name',
                'employees.type',
                'employees.status',
                'employees.cuti',
                'employees.gender',
                'employees.email',
                'employees.ktp',
                'employees.marital',
                'employees.birth_date',
                'employees.religion',
                'employees.phone',
                'employees.street',
                'employees.rt',
                'employees.rw',
                'employees.kelurahan',
                'employees.kecamatan',
                'employees.kabupaten_kota',
                'employees.provinsi',
                'employees.kode_pos',
                'employees.group',
                'employees.photo',
                'sections.name'
            )
            ->get();

        $filename = 'employees_' . date('Ymd_His') . '.xls';

        $html = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
        $html .= '<table border="1" cellspacing="0" cellpadding="4">';
        $html .= '<tr style="background:#e2e2e2;font-weight:bold;">
                <th>ID</th>
                <th>NIK</th>
                <th>Nama</th>
                <th>Type</th>
                <th>Status</th>
                <th>Cuti</th>
                <th>Gender</th>
                <th>Email</th>
                <th>KTP</th>
                <th>Marital</th>
                <th>Birth Date</th>
                <th>Religion</th>
                <th>Phone</th>
                <th>Street</th>
                <th>RT</th>
                <th>RW</th>
                <th>Kelurahan</th>
                <th>Kecamatan</th>
                <th>Kabupaten/Kota</th>
                <th>Provinsi</th>
                <th>Kode Pos</th>
                <th>Section</th>
                <th>Subsections</th>
              </tr>';

        foreach ($employees as $e) {
            $html .= '<tr>';
            $html .= '<td>' . htmlentities($e->id) . '</td>';
            $html .= '<td>' . htmlentities($e->nik) . '</td>';
            $html .= '<td>' . htmlentities($e->name) . '</td>';
            $html .= '<td>' . htmlentities($e->type) . '</td>';
            $html .= '<td>' . htmlentities($e->status) . '</td>';
            $html .= '<td>' . htmlentities($e->cuti) . '</td>';
            $html .= '<td>' . htmlentities($e->gender) . '</td>';
            $html .= '<td>' . htmlentities($e->email) . '</td>';
            $html .= '<td>' . htmlentities($e->ktp) . '</td>';
            $html .= '<td>' . htmlentities($e->marital) . '</td>';
            $html .= '<td>' . htmlentities($e->birth_date) . '</td>';
            $html .= '<td>' . htmlentities($e->religion) . '</td>';
            $html .= '<td>' . htmlentities($e->phone) . '</td>';
            $html .= '<td>' . htmlentities($e->street) . '</td>';
            $html .= '<td>' . htmlentities($e->rt) . '</td>';
            $html .= '<td>' . htmlentities($e->rw) . '</td>';
            $html .= '<td>' . htmlentities($e->kelurahan) . '</td>';
            $html .= '<td>' . htmlentities($e->kecamatan) . '</td>';
            $html .= '<td>' . htmlentities($e->kabupaten_kota) . '</td>';
            $html .= '<td>' . htmlentities($e->provinsi) . '</td>';
            $html .= '<td>' . htmlentities($e->kode_pos) . '</td>';
            $html .= '<td>' . htmlentities($e->section ?? '-') . '</td>';
            $html .= '<td>' . htmlentities($e->subsections ?? '-') . '</td>';
            $html .= '</tr>';
        }

        $html .= '</table>';

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }



    public function exportIncompleteXls(Request $request)
    {
        $employees = \DB::table('employees')
            ->leftJoin('employee_sub_section', 'employees.id', '=', 'employee_sub_section.employee_id')
            ->leftJoin('sub_sections', 'employee_sub_section.sub_section_id', '=', 'sub_sections.id')
            ->leftJoin('sections', 'sub_sections.section_id', '=', 'sections.id')
            ->when($request->section, fn($q) => $q->where('sections.name', $request->section))
            ->when($request->subsection, fn($q) => $q->where('sub_sections.name', $request->subsection))
            ->where(function ($q) {
                $q->whereNull('employees.kecamatan')
                    ->orWhereNull('employees.kelurahan');
            })
            ->select([
                'employees.nik',
                'employees.name',
                'sections.name as section',
                \DB::raw("GROUP_CONCAT(DISTINCT sub_sections.name ORDER BY sub_sections.name SEPARATOR ', ') as subsections"),
                'employees.kecamatan',
                'employees.kelurahan',
            ])
            ->groupBy(
                'employees.nik',
                'employees.name',
                'sections.name',
                'employees.kecamatan',
                'employees.kelurahan'
            )
            ->get();

        $filename = 'employees_incomplete_' . date('Ymd_His') . '.xls';

        $html = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
        $html .= '<table border="1" cellspacing="0" cellpadding="4">';
        $html .= '<tr style="background:#e2e2e2;font-weight:bold;">
                <th>NIK</th>
                <th>Nama</th>
                <th>Bagian</th>
                <th>Sub bagian</th>
                
              </tr>';

        foreach ($employees as $e) {
            $html .= '<tr>';
            $html .= '<td>' . htmlentities($e->nik) . '</td>';
            $html .= '<td>' . htmlentities($e->name) . '</td>';
            $html .= '<td>' . htmlentities($e->section ?? '-') . '</td>';
            $html .= '<td>' . htmlentities($e->subsections ?? '-') . '</td>';
            // $html .= '<td>' . htmlentities($e->kecamatan ?? '-') . '</td>';
            // $html .= '<td>' . htmlentities($e->kelurahan ?? '-') . '</td>';
            $html .= '</tr>';
        }

        $html .= '</table>';

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }




    public function deactivate(Employee $employee)
    {
        return Inertia::render('EmployeeAttendance/Deactivate', [
            'employee' => $employee->only('id', 'name', 'nik'),
            'reasons' => [
                'resignation' => 'Resignation',
                'termination' => 'Termination',
                'retirement' => 'Retirement',
                'other' => 'Other'
            ]
        ]);
    }

    public function activate(Employee $employee)
    {
        try {
            DB::transaction(function () use ($employee) {
                $employee->update([
                    'status' => 'available',
                    'deactivated_at' => null,
                    'deactivated_by' => null,
                    'deactivation_reason' => null,
                    'deactivation_notes' => null
                ]);
            });

            return redirect()->back()->with('success', 'Employee activated successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to activate employee: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to activate employee.');
        }
    }

   public function processDeactivation(Request $request, Employee $employee)
{
    $validated = $request->validate([
        'deactivation_reason' => 'required|string|max:255',
        'deactivation_notes' => 'nullable|string',
        'deactivated_at' => 'required|date|before_or_equal:today' // Add validation
    ]);

    $employee->update([
        'status' => 'deactivated',
        'deactivation_reason' => $validated['deactivation_reason'],
        'deactivation_notes' => $validated['deactivation_notes'],
        'deactivated_at' => $validated['deactivated_at'], // Use the selected date
        'deactivated_by' => auth()->id()
    ]);

    return redirect()->route('employee-attendance.inactive')
        ->with('success', 'Employee deactivated successfully');
}

    public function destroy(Employee $employee)
    {
        if ($employee->status !== 'deactivated') {
            return back()->with('error', 'Hanya pegawai yang dinonaktifkan yang dapat dihapus');
        }

        $employee->delete();

        return redirect()->route('employee-attendance.inactive')
            ->with('success', 'Pegawai berhasil dihapus permanen');
    }

    public function showLicense(Employee $employee)
    {
        $license = OperatorLicense::where('employee_id', $employee->id)->first();

        return Inertia::render('EmployeeLicense/SimpleView', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
            ],
            'license' => $license ? [
                'expiry_date' => $license->expiry_date,
                'image_path' => $license->image_path,
                'isExpired' => $license->expiry_date && now()->gt($license->expiry_date),
                'isExpiringSoon' => $license->expiry_date &&
                    now()->lt($license->expiry_date) &&
                    now()->addDays(30)->gt($license->expiry_date),
            ] : null
        ]);
    }

    public function sectionView(Request $request): Response
    {
        $query = Employee::with(['subSections.section'])
            ->where('status', '!=', 'deactivated')
            ->whereNull('deactivated_at');

        // Apply section filter
        if ($request->has('section') && $request->input('section') !== 'All') {
            $sectionName = $request->input('section');
            $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                $q->where('name', $sectionName);
            });
        }

        // Apply subsection filter
        if ($request->has('sub_section') && $request->input('sub_section') !== 'All') {
            $subSectionName = $request->input('sub_section');
            $query->whereHas('subSections', function ($q) use ($subSectionName) {
                $q->where('name', $subSectionName);
            });
        }

        $employees = $query->orderBy('name')
            ->paginate(12);

        // Get unique sections and subsections for filters
        $allSections = Section::select('name')->distinct()->pluck('name')->toArray();
        $allSubSections = SubSection::select('name')->distinct()->pluck('name')->toArray();

        return Inertia::render('EmployeeAttendance/SectionView', [
            'employees' => $employees,
            'filters' => $request->only(['section', 'sub_section']),
            'uniqueSections' => array_merge(['All'], $allSections),
            'uniqueSubSections' => array_merge(['All'], $allSubSections),
        ]);
    }

    public function exportIncompleteProfiles(Request $request)
    {
        try {
            $filters = $request->only(['section', 'sub_section', 'search']);

            // Query data yang sama dengan incompleteProfiles
            $query = Employee::with(['subSections.section'])
                ->where(function ($q) {
                    $q->whereNull('kecamatan')
                        ->orWhereNull('kelurahan')
                        ->orWhere('kecamatan', '')
                        ->orWhere('kelurahan', '');
                })
                ->where('status', '!=', 'deactivated')
                ->whereNull('deactivated_at');

            // Apply filters
            if (!empty($filters['section']) && $filters['section'] !== 'All') {
                $sectionName = $filters['section'];
                $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                    $q->where('name', $sectionName);
                });
            }

            if (!empty($filters['sub_section']) && $filters['sub_section'] !== 'All') {
                $subSectionName = $filters['sub_section'];
                $query->whereHas('subSections', function ($q) use ($subSectionName) {
                    $q->where('name', $subSectionName);
                });
            }

            if (!empty($filters['search'])) {
                $searchTerm = $filters['search'];
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('name', 'like', '%' . $searchTerm . '%')
                        ->orWhere('nik', 'like', '%' . $searchTerm . '%');
                });
            }

            $employees = $query->orderBy('name')->get();

            // Prepare data for export
            $exportData = [];
            foreach ($employees as $employee) {
                // Get section names
                $sectionNames = 'Tidak ada section';
                if ($employee->subSections && $employee->subSections->count() > 0) {
                    $sections = collect();
                    $employee->subSections->each(function ($subSection) use ($sections) {
                        if ($subSection->section && $subSection->section->name) {
                            $sections->push($subSection->section->name);
                        }
                    });
                    $sectionNames = $sections->unique()->implode(', ');
                }

                // Get subsection names
                $subSectionNames = 'Tidak ada subsection';
                if ($employee->subSections && $employee->subSections->count() > 0) {
                    $subSectionNames = $employee->subSections->pluck('name')->implode(', ');
                }

                // Check missing fields
                $missingFields = [];
                if (!$employee->kecamatan || $employee->kecamatan === '') {
                    $missingFields[] = 'Kecamatan';
                }
                if (!$employee->kelurahan || $employee->kelurahan === '') {
                    $missingFields[] = 'Kelurahan';
                }

                $completionStatus = empty($missingFields)
                    ? 'Lengkap'
                    : 'Tidak Lengkap: ' . implode(', ', $missingFields);

                $exportData[] = [
                    $employee->nik,
                    $employee->name,
                    $sectionNames,
                    $subSectionNames,
                    $employee->kecamatan ?? 'Tidak diisi',
                    $employee->kelurahan ?? 'Tidak diisi',
                    $completionStatus
                ];
            }

            $fileName = 'karyawan-profil-tidak-lengkap-' . date('Y-m-d') . '.xlsx';

            $excelService = new ExcelExportService();
            return $excelService->exportIncompleteProfiles($exportData, $fileName);

        } catch (\Exception $e) {
            \Log::error('Export failed: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return redirect()->back()->with('error', 'Gagal mengekspor data: ' . $e->getMessage());
        }
    }

    public function incompleteProfiles(Request $request): Response
    {
        $query = Employee::with(['subSections.section'])
            ->where(function ($q) {
                $q->whereNull('kecamatan')
                    ->orWhereNull('kelurahan')
                    ->orWhere('kecamatan', '')
                    ->orWhere('kelurahan', '');
            })
            ->where('status', '!=', 'deactivated')
            ->whereNull('deactivated_at');

        // Apply section filter
        if ($request->has('section') && $request->input('section') !== 'All' && $request->input('section') !== null) {
            $sectionName = $request->input('section');
            $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                $q->where('name', $sectionName);
            });
        }

        // Apply subsection filter
        if ($request->has('sub_section') && $request->input('sub_section') !== 'All' && $request->input('sub_section') !== null) {
            $subSectionName = $request->input('sub_section');
            $query->whereHas('subSections', function ($q) use ($subSectionName) {
                $q->where('name', $subSectionName);
            });
        }

        // Search by Name or NIK
        if ($request->has('search') && $request->input('search') !== null && $request->input('search') !== '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('nik', 'like', '%' . $searchTerm . '%');
            });
        }

        $employees = $query->orderBy('name')
            ->paginate(10)
            ->withQueryString(); // This preserves query parameters in pagination links

        // Get unique sections and subsections for filters
        $allSections = Section::select('name')->distinct()->pluck('name')->toArray();
        $allSubSections = SubSection::select('name')->distinct()->pluck('name')->toArray();

        return Inertia::render('EmployeeAttendance/IncompleteProfiles', [
            'employees' => $employees,
            'filters' => $request->only(['search', 'section', 'sub_section']),
            'uniqueSections' => array_merge(['All'], $allSections),
            'uniqueSubSections' => array_merge(['All'], $allSubSections),
        ]);
    }

    // Add this method to the EmployeeSum controller
    public function exportFilteredXls(Request $request)
    {
        $query = Employee::with(['subSections.section'])
            ->where('status', '!=', 'deactivated')
            ->whereNull('deactivated_at');

        // Apply Filters (same as index method)
        if ($request->has('status') && $request->input('status') !== 'All') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('section') && $request->input('section') !== 'All') {
            $sectionName = $request->input('section');
            $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                $q->where('name', $sectionName);
            });
        }

        if ($request->has('sub_section') && $request->input('sub_section') !== 'All') {
            $subSectionName = $request->input('sub_section');
            $query->whereHas('subSections', function ($q) use ($subSectionName) {
                $q->where('name', $subSectionName);
            });
        }

        // Search by Name or NIK
        if ($request->has('search') && $request->input('search') !== null) {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('nik', 'like', '%' . $searchTerm . '%');
            });
        }

        $employees = $query->orderBy('name')->get();

        $filename = 'employees_filtered_' . date('Ymd_His') . '.xls';

        $html = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
        $html .= '<table border="1" cellspacing="0" cellpadding="4">';
        $html .= '<tr style="background:#e2e2e2;font-weight:bold;">
            <th>ID</th>
            <th>NIK</th>
            <th>Nama</th>
            <th>Type</th>
            <th>Gender</th>
            <th>Email</th>
            <th>KTP</th>
            <th>Marital</th>
            <th>Birth Date</th>
            <th>Religion</th>
            <th>Phone</th>
            <th>Street</th>
            <th>RT</th>
            <th>RW</th>
            <th>Kelurahan</th>
            <th>Kecamatan</th>
            <th>Kabupaten/Kota</th>
            <th>Provinsi</th>
            <th>Kode Pos</th>
            <th>Section</th>
            <th>Subsections</th>
            <th>Total Work Count</th>
            <th>Weekly Work Count</th>
          </tr>';

        foreach ($employees as $employee) {
            // Section names
            $sectionNames = 'Tidak ada section';
            if ($employee->subSections && $employee->subSections->count() > 0) {
                $sections = collect();
                $employee->subSections->each(function ($subSection) use ($sections) {
                    if ($subSection->section && $subSection->section->name) {
                        $sections->push($subSection->section->name);
                    }
                });
                $sectionNames = $sections->unique()->implode(', ');
            }
 
            // Subsection names
            $subSectionNames = 'Tidak ada subsection';
            if ($employee->subSections && $employee->subSections->count() > 0) {
                $subSectionNames = $employee->subSections->pluck('name')->implode(', ');
            }

            // Workload
            $latestWorkload = $employee->workload->first();
            $totalWorkCount = $latestWorkload ? $latestWorkload->total_work_count : 0;
            $weeklyWorkCount = $latestWorkload ? $latestWorkload->week : 0;

            $html .= '<tr>';
            $html .= '<td>' . htmlentities($employee->id) . '</td>';
            $html .= '<td>' . htmlentities($employee->nik) . '</td>';
            $html .= '<td>' . htmlentities($employee->name) . '</td>';
            $html .= '<td>' . htmlentities($employee->type) . '</td>';
            // $html .= '<td>' . htmlentities($employee->status) . '</td>';
            // $html .= '<td>' . htmlentities($employee->cuti) . '</td>';
            $html .= '<td>' . htmlentities($employee->gender) . '</td>';
            $html .= '<td>' . htmlentities($employee->email) . '</td>';
            $html .= '<td>' . htmlentities($employee->ktp) . '</td>';
            $html .= '<td>' . htmlentities($employee->marital) . '</td>';
            $html .= '<td>' . htmlentities($employee->birth_date) . '</td>';
            $html .= '<td>' . htmlentities($employee->religion) . '</td>';
            $html .= '<td>' . htmlentities($employee->phone) . '</td>';
            $html .= '<td>' . htmlentities($employee->street) . '</td>';
            $html .= '<td>' . htmlentities($employee->rt) . '</td>';
            $html .= '<td>' . htmlentities($employee->rw) . '</td>';
            $html .= '<td>' . htmlentities($employee->kelurahan) . '</td>';
            $html .= '<td>' . htmlentities($employee->kecamatan) . '</td>';
            $html .= '<td>' . htmlentities($employee->kabupaten_kota) . '</td>';
            $html .= '<td>' . htmlentities($employee->provinsi) . '</td>';
            $html .= '<td>' . htmlentities($employee->kode_pos) . '</td>';
            $html .= '<td>' . htmlentities($sectionNames) . '</td>';
            $html .= '<td>' . htmlentities($subSectionNames) . '</td>';
            $html .= '<td>' . htmlentities($totalWorkCount) . '</td>';
            $html .= '<td>' . htmlentities($weeklyWorkCount) . '</td>';
            $html .= '</tr>';
        }

        $html .= '</table>';

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }

   public function bulkDeactivate(Request $request)
{
    $validated = $request->validate([
        'employee_ids' => 'required|array',
        'employee_ids.*' => 'exists:employees,id',
        'deactivation_reason' => 'required|string|max:255',
        'deactivation_notes' => 'nullable|string',
       'deactivated_at' => 'required|date'

    ]);

    try {
        DB::beginTransaction();

        $employeeIds = $validated['employee_ids'];
        $reason = $validated['deactivation_reason'];
        $notes = $validated['deactivation_notes'] ?? null;
        $deactivatedAt = $validated['deactivated_at']; // Get the selected date
        $userId = auth()->id();

        Employee::whereIn('id', $employeeIds)
            ->update([
                'status' => 'deactivated',
                'deactivation_reason' => $reason,
                'deactivation_notes' => $notes,
                'deactivated_at' => $deactivatedAt, // Use the selected date
                'deactivated_by' => $userId
            ]);

        DB::commit();

        return redirect()->route('employee-attendance.index')
            ->with('success', count($employeeIds) . ' employees deactivated successfully');
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Bulk deactivation failed: ' . $e->getMessage());
        
        return redirect()->back()
            ->with('error', 'Failed to deactivate employees. Please try again.');
    }
}
}