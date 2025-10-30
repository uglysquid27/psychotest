<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ManPowerRequest;
use App\Models\Employee;
use App\Models\Schedule;
use App\Models\Section;
use App\Models\SubSection;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Pastikan Log diimport
use Illuminate\Validation\ValidationException; // Import untuk validasi kustom
use Illuminate\Support\Facades\Http;

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
        $sectionId = $request->input('section');
        $subSectionId = $request->input('sub_section');

        // In ScheduleController.php - update the index method date filtering
if ($startDate && $endDate) {
    $query->whereBetween('date', [
        Carbon::parse($startDate)->startOfDay(),
        Carbon::parse($endDate)->endOfDay()
    ]);
}

        if ($sectionId) {
            $query->whereHas('manPowerRequest.subSection', function ($q) use ($sectionId) {
                $q->where('section_id', $sectionId);
            });
        }

        if ($subSectionId) {
            $query->whereHas('manPowerRequest', function ($q) use ($subSectionId) {
                $q->where('sub_section_id', $subSectionId);
            });
        }

        $schedules = $query->orderBy('date')->get();

        $sections = Section::all();
        $subSections = SubSection::with('section')->get();

        return Inertia::render('Schedules/Index', [
            'schedules' => $schedules,
            'sections' => $sections,
            'subSections' => $subSections,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'section' => $sectionId,
                'sub_section' => $subSectionId,
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
                            0 => 165,
                            default => 0,
                        };

                        $employee->setAttribute('calculated_rating', $rating);
                        $employee->setAttribute('working_day_weight', $workingDayWeight);
                        $employee->setAttribute('total_assigned_hours', $totalWorkingHours);

                        return $employee;
                    })
                    ->sortBy(function ($employee) {
                        return $employee->type === 'bulanan' ? 0 : 1;
                    })
                    ->sortBy('working_day_weight')
                    ->values();

                // 4. Filter employees by sub-section
                $employeesForSubSection = $eligibleEmployees->filter(function ($employee) use ($manPowerRequest) {
                    return $employee->subSections->contains('id', $manPowerRequest->sub_section_id);
                });

                // 5. If not enough employees in the sub-section, get from other sub-sections
                if ($employeesForSubSection->count() < $requestedAmount) {
                    $remainingNeeded = $requestedAmount - $employeesForSubSection->count();
                    $otherEmployees = $eligibleEmployees->whereNotIn('id', $employeesForSubSection->pluck('id'))
                        ->take($remainingNeeded);
                    $employeesToAssign = $employeesForSubSection->concat($otherEmployees);
                } else {
                    $employeesToAssign = $employeesForSubSection->take($requestedAmount);
                }

                // 6. Assign employees to the schedule
                foreach ($employeesToAssign as $employee) {
                    Schedule::create([
                        'employee_id' => $employee->id,
                        'man_power_request_id' => $manPowerRequest->id,
                        'date' => $manPowerRequest->date,
                        'status' => 'accepted',
                        'visibility' => 'private',
                    ]);

                    $assignedEmployeeIds[] = $employee->id;
                    $assignedEmployeeCount++;
                }

                // 7. Update the request status
                $manPowerRequest->update([
                    'status' => 'fulfilled',
                ]);

                // 8. Log the assignment
                Log::info('Automatic assignment completed', [
                    'request_id' => $manPowerRequest->id,
                    'assigned_employees' => $assignedEmployeeIds,
                    'assigned_count' => $assignedEmployeeCount,
                ]);
            });

            return redirect()->route('man-power-requests.index')
                ->with('success', 'Penjadwalan berhasil dilakukan secara otomatis!');
        } catch (\Exception $e) {
            Log::error('Automatic assignment failed: ' . $e->getMessage());
            return back()->withErrors(['assignment_error' => 'Terjadi kesalahan saat melakukan penjadwalan otomatis.']);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Schedule $schedule)
    {
        $validated = $request->validate([
            'status' => 'required|in:accepted,rejected,pending',
        ]);

        $schedule->update($validated);

        return back()->with('success', 'Status jadwal berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Schedule $schedule)
    {
        $schedule->delete();

        return back()->with('success', 'Jadwal berhasil dihapus!');
    }

    public function toggleVisibilityGroup(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'section_id' => 'required|exists:sections,id',
            'visibility' => 'required|in:public,private',
            'send_wa_notification' => 'boolean'
        ]);

        try {
            // Get section with exact name for notification
            $section = Section::find($request->section_id);
            $sectionName = $section ? $section->name : 'Unknown Section';

            DB::transaction(function () use ($request) {
                // Update visibility for all schedules in the given date and section
                Schedule::where('date', $request->date)
                    ->whereHas('manPowerRequest.subSection', function ($query) use ($request) {
                        $query->where('section_id', $request->section_id);
                    })
                    ->update(['visibility' => $request->visibility]);
            });

            // Send WhatsApp notification if making public and requested
            if ($request->visibility === 'public' && $request->send_wa_notification) {
                try {
                    // Map sections to their respective WhatsApp channels with flexible matching
                    $channelMap = [
                        // 'finished good' => 'https://whatsapp.com/channel/0029VbBWBvVAjPXQ4iY7L90d',
                        // 'loader' => 'https://whatsapp.com/channel/0029VbBNaesDTkK3vu0W7Q36',
                        // 'delivery' => 'https://whatsapp.com/channel/0029Vb6dIgk2ZjCkr10i0k2Y',
                        // 'rm/pm' => 'https://whatsapp.com/channel/0029VbBJ3mTJkK7F3ZE05I3R',
                        // 'operator forklift' => 'https://whatsapp.com/channel/0029Vb6KMP6LtOj88kKdIa2e',
                        // 'forklift' => 'https://whatsapp.com/channel/0029Vb6KMP6LtOj88kKdIa2e',
                        // 'inspeksi' => 'https://whatsapp.com/channel/0029Vb6gjUx42DcbfzDpxe3w',
                        // 'produksi' => 'https://whatsapp.com/channel/0029VbB8fDNHrDZkPRpYKW1e',
                        // 'food & snackbar' => 'https://whatsapp.com/channel/0029Vb6SGxXBPzjaAh71oC1t',
                        // 'food and snackbar' => 'https://whatsapp.com/channel/0029Vb6SGxXBPzjaAh71oC1t',
                        // 'food' => 'https://whatsapp.com/channel/0029Vb6SGxXBPzjaAh71oC1t',
                        // 'snackbar' => 'https://whatsapp.com/channel/0029Vb6SGxXBPzjaAh71oC1t'
                    ];

                    // Normalize section name for matching (lowercase, remove special chars)
                    $normalizedSectionName = strtolower(trim($sectionName));
                    $normalizedSectionName = preg_replace('/[^a-z0-9\s]/', '', $normalizedSectionName);

                    $channelUrl = 'https://whatsapp.com/channel/0029Vb6yHUYId7nVlpjQ3r2R'; // Default

                    // Find matching channel
                    foreach ($channelMap as $key => $url) {
                        if (str_contains($normalizedSectionName, $key) || str_contains($key, $normalizedSectionName)) {
                            $channelUrl = $url;
                            break;
                        }
                    }

                    // Format tanggal dalam bahasa Indonesia
                    $indonesianMonths = [
                        'January' => 'Januari',
                        'February' => 'Februari',
                        'March' => 'Maret',
                        'April' => 'April',
                        'May' => 'Mei',
                        'June' => 'Juni',
                        'July' => 'Juli',
                        'August' => 'Agustus',
                        'September' => 'September',
                        'October' => 'Oktober',
                        'November' => 'November',
                        'December' => 'Desember'
                    ];

                    $indonesianDays = [
                        'Sunday' => 'Minggu',
                        'Monday' => 'Senin',
                        'Tuesday' => 'Selasa',
                        'Wednesday' => 'Rabu',
                        'Thursday' => 'Kamis',
                        'Friday' => 'Jumat',
                        'Saturday' => 'Sabtu'
                    ];

                    $date = Carbon::parse($request->date);
                    $englishDay = $date->format('l');
                    $englishMonth = $date->format('F');

                    $indonesianDay = $indonesianDays[$englishDay] ?? $englishDay;
                    $indonesianMonth = $indonesianMonths[$englishMonth] ?? $englishMonth;

                    $formattedDate = $indonesianDay . ', ' . $date->format('d') . ' ' . $indonesianMonth . ' ' . $date->format('Y');

                    $response = Http::timeout(15)
                        ->withHeaders([
                            'Content-Type' => 'application/json',
                        ])
                        ->post('https://sendwa.xyz/send-text-channel', [
                            'api_key' => 'v3wrR6SeHcgCoGIchMQqMC0gEFZ3QZ',
                            'sender' => '6281133318167',
                            'url' => $channelUrl,
                            'message' => "Jadwal untuk " . $formattedDate .
                                " di bagian {$sectionName} sudah dipublikasikan. Silakan cek aplikasi untuk detail lengkap.",
                            'footer' => 'otsuka.asystem.co.id'
                        ]);

                    Log::info('WhatsApp channel notification sent via toggle', [
                        'date' => $request->date,
                        'section_id' => $request->section_id,
                        'section_name' => $sectionName,
                        'channel_url' => $channelUrl,
                        'indonesian_date' => $formattedDate,
                        'response' => $response->json()
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send WhatsApp channel notification: ' . $e->getMessage());
                    // Don't throw error, just log it
                }
            }

            // Log the visibility change with section name for debugging
            Log::info('Visibility toggled for group', [
                'date' => $request->date,
                'section_id' => $request->section_id,
                'section_name' => $sectionName,
                'visibility' => $request->visibility,
                'send_wa_notification' => $request->send_wa_notification ?? false
            ]);

            return back()->with('success', 'Visibility berhasil diubah!');
        } catch (\Exception $e) {
            Log::error('Error toggling visibility: ' . $e->getMessage());
            return back()->withErrors(['visibility_error' => 'Gagal mengubah visibility.']);
        }
    }

     public function getUpdatedSchedules(Request $request)
{
    $query = Schedule::with([
        'employee',
        'subSection.section',
        'manPowerRequest.shift',
        'manPowerRequest.subSection.section'
    ]);

    $startDate = $request->input('start_date');
    $endDate = $request->input('end_date');
    $sectionId = $request->input('section');
    $subSectionId = $request->input('sub_section');
    $lastUpdate = $request->input('last_update');

    // Apply date filters - IMPORTANT: Always apply the same filters as main index
    if ($startDate && $endDate) {
        $query->whereBetween('date', [
            Carbon::parse($startDate)->startOfDay(),
            Carbon::parse($endDate)->endOfDay()
        ]);
    }

    // Apply section filter
    if ($sectionId) {
        $query->whereHas('manPowerRequest.subSection', function ($q) use ($sectionId) {
            $q->where('section_id', $sectionId);
        });
    }

    // Apply sub-section filter
    if ($subSectionId) {
        $query->whereHas('manPowerRequest', function ($q) use ($subSectionId) {
            $q->where('sub_section_id', $subSectionId);
        });
    }

    // Get ALL schedules with current filters
    $schedules = $query->orderBy('date')->get();

    // Check if data has changed since last update
    $latestUpdate = $schedules->max('updated_at') ?? now();
    
    if ($lastUpdate && $latestUpdate <= Carbon::parse($lastUpdate)) {
        return response()->json([
            'schedules' => [],
            'last_updated' => $lastUpdate,
            'unchanged' => true
        ]);
    }

    return response()->json([
        'schedules' => $schedules,
        'last_updated' => $latestUpdate->toISOString(),
        'unchanged' => false
    ]);
}


}