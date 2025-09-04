<?php

namespace App\Http\Controllers;

use App\Models\ManPowerRequest;
use App\Models\Section;
use App\Models\SubSection;
use App\Models\Shift;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use App\Rules\ShiftTimeOrder;
use App\Models\Employee;

class ManPowerRequestController extends Controller
{
  public function index(Request $request): Response
    {
        $query = Section::with([
            'subSections',
            'subSections.manPowerRequests' => function ($query) {
                $query->orderBy('date', 'desc')
                      ->orderBy('created_at', 'desc');
            },
            'subSections.manPowerRequests.shift'
        ]);

        if ($request->has('section_id') && $request->section_id) {
            $query->where('id', $request->section_id);
        }

        $sections = $query->get();

        $perPage = 10;
        $currentPage = $request->get('page', 1);
        $offset = ($currentPage - 1) * $perPage;
        $paginatedSections = $sections->slice($offset, $perPage);

        $sectionsPaginator = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedSections,
            $sections->count(),
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $allSections = Section::all();

        return Inertia::render('ManpowerRequests/Index', [
            'sections' => $sectionsPaginator,
            'filterSections' => $allSections,
            'filters' => [
                'section_id' => $request->section_id,
            ],
        ]);
    }

    public function getSectionRequests($sectionId)
    {
        $section = Section::with([
            'subSections',
            'subSections.manPowerRequests' => function ($query) {
                $query->orderBy('date', 'desc')
                      ->orderBy('created_at', 'desc');
            },
            'subSections.manPowerRequests.shift'
        ])->findOrFail($sectionId);

        $requests = [];

        foreach ($section->subSections as $subSection) {
            foreach ($subSection->manPowerRequests as $request) {
                $requests[] = [
                    'id' => $request->id,
                    'date' => $request->date,
                    'status' => $request->status,
                    'requested_amount' => $request->requested_amount,
                    'male_count' => $request->male_count,
                    'female_count' => $request->female_count,
                    'created_at' => $request->created_at,
                    'sub_section' => [
                        'id' => $subSection->id,
                        'name' => $subSection->name,
                    ],
                    'shift' => $request->shift ? $request->shift->only(['id', 'name']) : null,
                    'shift_id' => $request->shift_id,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'slot_index' => $request->slot_index,
                ];
            }
        }

        return response()->json([
            'section' => [
                'id' => $section->id,
                'name' => $section->name,
            ],
            'requests' => $requests,
        ]);
    }

    public function create(): Response
    {
        $sections = Section::with('subSections')->get();
        $shifts = Shift::all();

        return Inertia::render('ManpowerRequests/Create', [
            'sections' => $sections,
            'shifts' => $shifts,
        ]);
    }

    public function checkDuplicates(Request $request)
    {
        $validated = $request->validate([
            'sub_section_id' => 'required|exists:sub_sections,id',
            'date' => 'required|date|after_or_equal:today',
            'shift_ids' => 'required|array',
            'shift_ids.*' => 'exists:shifts,id',
        ]);
    
        $duplicates = ManPowerRequest::where('sub_section_id', $validated['sub_section_id'])
            ->whereDate('date', $validated['date'])
            ->whereIn('shift_id', $validated['shift_ids'])
            ->where('status', '!=', 'rejected')
            ->with('shift')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'shift_id' => $request->shift_id,
                    'shift_name' => $request->shift->name,
                    'requested_amount' => $request->requested_amount,
                    'status' => $request->status,
                    'is_additional' => $request->is_additional,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                ];
            });
    
        return response()->json([
            'duplicates' => $duplicates,
            'has_duplicates' => $duplicates->isNotEmpty(),
        ]);
    }

    public function store(Request $request)
    {
        Log::info('ManPowerRequest submission initiated', [
            'user_id' => auth()->id(),
            'request_data' => $request->all(),
            'ip_address' => $request->ip(),
        ]);

        try {
            $validated = $request->validate([
                'requests' => ['required', 'array', 'min:1'],
                'requests.*.sub_section_id' => ['required', 'exists:sub_sections,id'],
                'requests.*.date' => ['required', 'date', 'after_or_equal:today'],
                'requests.*.time_slots' => ['required', 'array', 'min:1'],
                'requests.*.time_slots.*.requested_amount' => ['required', 'integer', 'min:1'],
                'requests.*.time_slots.*.male_count' => ['required', 'integer', 'min:0'],
                'requests.*.time_slots.*.female_count' => ['required', 'integer', 'min:0'],
                'requests.*.time_slots.*.start_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
                'requests.*.time_slots.*.end_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
                'requests.*.time_slots.*.reason' => ['nullable', 'string', 'min:10'],
                'requests.*.time_slots.*.is_additional' => ['nullable', 'boolean'],
            ]);

            // Additional validation for time order and format conversion
            foreach ($validated['requests'] as $requestIndex => $requestData) {
                foreach ($requestData['time_slots'] as $slotKey => $slot) {
                    // Convert times to H:i:s format
                    if (!empty($slot['start_time'])) {
                        $validated['requests'][$requestIndex]['time_slots'][$slotKey]['start_time'] = 
                            $this->convertToHisFormat($slot['start_time']);
                    }
                    if (!empty($slot['end_time'])) {
                        $validated['requests'][$requestIndex]['time_slots'][$slotKey]['end_time'] = 
                            $this->convertToHisFormat($slot['end_time']);
                    }

                    // Validate time order if both times are provided
                    if (!empty($validated['requests'][$requestIndex]['time_slots'][$slotKey]['start_time']) && 
                        !empty($validated['requests'][$requestIndex]['time_slots'][$slotKey]['end_time'])) {
                        
                        $startTime = $validated['requests'][$requestIndex]['time_slots'][$slotKey]['start_time'];
                        $endTime = $validated['requests'][$requestIndex]['time_slots'][$slotKey]['end_time'];
                        
                        // Skip validation if start and end times are the same (like 00:00:00 to 00:00:00)
                        if ($startTime === $endTime) {
                            continue;
                        }
                        
                        $startCarbon = Carbon::createFromFormat('H:i:s', $startTime);
                        $endCarbon = Carbon::createFromFormat('H:i:s', $endTime);
                        
                        // Handle night shifts - if end time is earlier than start time, assume it's next day
                        if ($endCarbon->lt($startCarbon)) {
                            $endCarbon->addDay();
                        }
                        
                        // Only validate if end time is not significantly later (more than 24 hours)
                        if ($endCarbon->lte($startCarbon) && $endCarbon->diffInHours($startCarbon) < 24) {
                            throw ValidationException::withMessages([
                                "requests.{$requestIndex}.time_slots.{$slotKey}.end_time" => 'End time must be after start time.'
                            ]);
                        }
                    }
                }
            }

            Log::info('Validation passed', [
                'validated_data' => $validated,
                'user_id' => auth()->id(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', [
                'errors' => $e->errors(),
                'input' => $request->all(),
                'user_id' => auth()->id(),
            ]);
            throw $e;
        }

        DB::transaction(function () use ($validated) {
            foreach ($validated['requests'] as $requestData) {
                foreach ($requestData['time_slots'] as $slotKey => $slot) {
                    // Extract shift ID and slot index from the key
                    $parts = explode('_', $slotKey);
                    $shiftId = $parts[0];
                    $slotIndex = count($parts) > 1 ? (int)$parts[1] : 0;
                    
                    ManPowerRequest::create([
                        'sub_section_id' => $requestData['sub_section_id'],
                        'date' => $requestData['date'],
                        'shift_id' => $shiftId,
                        'requested_amount' => $slot['requested_amount'],
                        'male_count' => $slot['male_count'],
                        'female_count' => $slot['female_count'],
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'reason' => $slot['reason'],
                        'is_additional' => $slot['is_additional'] ?? ($slotIndex > 0),
                        'status' => 'pending',
                        'slot_index' => $slotIndex, // Store the slot index for reference
                    ]);
                }
            }
        });

        return redirect()->route('manpower-requests.index')
            ->with('success', 'Request submitted successfully!');
    }

    private function convertToHisFormat($timeString)
    {
        if (empty($timeString)) {
            return null;
        }

        if (preg_match('/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/', $timeString)) {
            return $timeString;
        }

        if (preg_match('/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/', $timeString)) {
            return $timeString . ':00';
        }

        try {
            $carbon = Carbon::createFromFormat('H:i', $timeString);
            return $carbon->format('H:i:s');
        } catch (\Exception $e) {
            try {
                $carbon = Carbon::createFromFormat('H:i:s', $timeString);
                return $carbon->format('H:i:s');
            } catch (\Exception $e2) {
                return null;
            }
        }
    }

    public function update(Request $request, ManPowerRequest $manpowerRequest)
    {
        try {
            if (!in_array($manpowerRequest->status, ['pending', 'revision_requested'])) {
                abort(403, 'Permintaan ini tidak dapat diperbarui karena statusnya ' . $manpowerRequest->status);
            }

            $validated = $request->validate([
                'sub_section_id' => ['required', 'exists:sub_sections,id'],
                'date' => ['required', 'date', 'after_or_equal:today'],
                'time_slots' => ['nullable', 'array'],
                'time_slots.*.requested_amount' => ['nullable', 'integer', 'min:0'],
                'time_slots.*.male_count' => ['nullable', 'integer', 'min:0'],
                'time_slots.*.female_count' => ['nullable', 'integer', 'min:0'],
                'time_slots.*.start_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', 'required_if:time_slots.*.requested_amount,>0'],
                'time_slots.*.end_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', 'required_if:time_slots.*.requested_amount,>0'],
            ]);

            foreach ($validated['time_slots'] as $shiftId => $slot) {
                if (!empty($slot['start_time'])) {
                    $validated['time_slots'][$shiftId]['start_time'] = $this->convertToHisFormat($slot['start_time']);
                }
                if (!empty($slot['end_time'])) {
                    $validated['time_slots'][$shiftId]['end_time'] = $this->convertToHisFormat($slot['end_time']);
                }

                if (!empty($validated['time_slots'][$shiftId]['start_time']) && 
                    !empty($validated['time_slots'][$shiftId]['end_time'])) {
                    
                    $startTime = $validated['time_slots'][$shiftId]['start_time'];
                    $endTime = $validated['time_slots'][$shiftId]['end_time'];
                    
                    // Skip validation if start and end times are the same
                    if ($startTime === $endTime) {
                        continue;
                    }
                    
                    $startCarbon = Carbon::createFromFormat('H:i:s', $startTime);
                    $endCarbon = Carbon::createFromFormat('H:i:s', $endTime);
                    
                    // Handle night shifts
                    if ($endCarbon->lt($startCarbon)) {
                        $endCarbon->addDay();
                    }
                    
                    if ($endCarbon->lte($startCarbon) && $endCarbon->diffInHours($startCarbon) < 24) {
                        throw ValidationException::withMessages([
                            "time_slots.{$shiftId}.end_time" => 'End time must be after start time.'
                        ]);
                    }
                }
            }

            DB::transaction(function () use ($validated, $manpowerRequest) {
                $existingRequests = ManPowerRequest::where('date', $manpowerRequest->date)
                    ->where('sub_section_id', $manpowerRequest->sub_section_id)
                    ->get()
                    ->keyBy(function($item) {
                        return $item->shift_id . '_' . $item->slot_index;
                    });

                $hasValidSlots = false;
                $processedSlots = [];

                foreach ($validated['time_slots'] as $slotKey => $slot) {
                    $requestedAmount = (int) $slot['requested_amount'];
                    $maleCount = is_numeric($slot['male_count']) ? (int)$slot['male_count'] : 0;
                    $femaleCount = is_numeric($slot['female_count']) ? (int)$slot['female_count'] : 0;

                    if ($requestedAmount > 0) {
                        $hasValidSlots = true;
                        
                        // Extract shift ID and slot index from the key
                        $parts = explode('_', $slotKey);
                        $shiftId = $parts[0];
                        $slotIndex = count($parts) > 1 ? (int)$parts[1] : 0;
                        
                        $existing = $existingRequests->get($slotKey);

                        if ($existing) {
                            $existing->update([
                                'sub_section_id' => $validated['sub_section_id'],
                                'date' => $validated['date'],
                                'requested_amount' => $requestedAmount,
                                'male_count' => $maleCount,
                                'female_count' => $femaleCount,
                                'start_time' => $slot['start_time'],
                                'end_time' => $slot['end_time'],
                                'status' => 'pending',
                            ]);
                        } else {
                            ManPowerRequest::create([
                                'sub_section_id' => $validated['sub_section_id'],
                                'date' => $validated['date'],
                                'shift_id' => $shiftId,
                                'requested_amount' => $requestedAmount,
                                'male_count' => $maleCount,
                                'female_count' => $femaleCount,
                                'start_time' => $slot['start_time'],
                                'end_time' => $slot['end_time'],
                                'status' => 'pending',
                                'slot_index' => $slotIndex,
                            ]);
                        }
                        $processedSlots[] = $slotKey;
                    }
                }

                // Delete any existing requests that weren't processed
                foreach ($existingRequests as $slotKey => $request) {
                    if (!in_array($slotKey, $processedSlots)) {
                        $request->delete();
                    }
                }

                if (!$hasValidSlots) {
                    throw ValidationException::withMessages([
                        'time_slots' => 'Setidaknya satu shift harus memiliki jumlah yang diminta lebih dari 0.',
                    ]);
                }
            });

            return redirect()->route('manpower-requests.index')->with('success', 'Permintaan tenaga kerja berhasil diperbarui!');

        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Error updating manpower request: ' . $e->getMessage());
            return back()->with('error', 'Terjadi kesalahan. Silakan coba lagi.')->withInput();
        }
    }

    public function edit(string $id): Response
    {
        $manPowerRequest = ManPowerRequest::findOrFail($id);
        
        if (!in_array($manPowerRequest->status, ['pending', 'revision_requested'])) {
            abort(403, 'Permintaan ini tidak dapat diedit karena statusnya ' . $manPowerRequest->status);
        }

        $relatedRequests = ManPowerRequest::where('date', $manPowerRequest->date)
            ->where('sub_section_id', $manPowerRequest->sub_section_id)
            ->with('shift')
            ->get();

        $timeSlots = [];
        foreach ($relatedRequests as $req) {
            $slotKey = $req->slot_index === 0 ? $req->shift_id : $req->shift_id . '_' . $req->slot_index;
            $timeSlots[$slotKey] = [
                'id' => $req->id,
                'requested_amount' => $req->requested_amount,
                'male_count' => $req->male_count,
                'female_count' => $req->female_count,
                'start_time' => $req->start_time,
                'end_time' => $req->end_time,
            ];
        }

        try {
            $date = Carbon::parse((string) $manPowerRequest->date)->format('Y-m-d');
        } catch (\Exception $e) {
            $date = now()->format('Y-m-d');
        }

        return Inertia::render('ManpowerRequests/Edit', [
            'manpowerRequestData' => [
                'id' => $manPowerRequest->id,
                'sub_section_id' => $manPowerRequest->sub_section_id,
                'date' => $date,
                'time_slots' => $timeSlots,
                'status' => $manPowerRequest->status,
            ],
            'subSections' => SubSection::with('section')->get(),
            'shifts' => Shift::all(),
        ]);
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $manPowerRequest = ManPowerRequest::with('schedules.employee')->findOrFail($id);

            Log::info('Attempting to delete manpower request', [
                'request_id' => $manPowerRequest->id,
                'user_id' => auth()->id(),
                'status' => $manPowerRequest->status
            ]);

            if ($manPowerRequest->schedules->isNotEmpty()) {
                Log::info('Updating employee statuses to available for schedules related to deleted request', [
                    'request_id' => $manPowerRequest->id,
                    'schedule_count' => $manPowerRequest->schedules->count()
                ]);
                foreach ($manPowerRequest->schedules as $schedule) {
                    if ($schedule->employee) {
                        $employee = $schedule->employee;
                        if ($employee->status === 'assigned') {
                            $employee->status = 'available';
                            $employee->save();
                            Log::debug("Employee ID {$employee->id} status changed to 'available'.");
                        }
                    }
                }
            }

            if ($manPowerRequest->status === 'fulfilled') {
                if ($manPowerRequest->created_at->diffInDays(now()) > 7) {
                    Log::warning('Attempt to delete fulfilled request older than 7 days', [
                        'request_id' => $manPowerRequest->id,
                        'status' => $manPowerRequest->status,
                        'user_id' => auth()->id()
                    ]);
                    DB::rollBack();
                    return back()->with('error', 'Cannot delete fulfilled requests older than 7 days');
                }
            }
            elseif (!in_array($manPowerRequest->status, ['pending', 'revision_requested'])) {
                Log::warning('Invalid delete attempt', [
                    'request_id' => $manPowerRequest->id,
                    'status' => $manPowerRequest->status,
                    'user_id' => auth()->id()
                ]);
                DB::rollBack();
                return back()->with('error', 'Cannot delete request in current status');
            }

            $manPowerRequest->delete();

            DB::commit();

            Log::info('Successfully deleted request', [
                'request_id' => $id,
                'user_id' => auth()->id()
            ]);

            return redirect()->route('manpower-requests.index')
                ->with('success', 'Request deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Delete failed', [
                'error' => $e->getMessage(),
                'request_id' => $id ?? 'unknown',
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return back()->with('error', 'Failed to delete request');
        }
    }

    public function fulfill(ManPowerRequest $manPowerRequest)
    {
        try {
            $manPowerRequest->update(['status' => 'fulfilled']);
            return back()->with('success', 'Permintaan telah dipenuhi!');
        } catch (\Exception $e) {
            Log::error('Error fulfilling manpower request: ' . $e->getMessage());
            return back()->with('error', 'Gagal memenuhi permintaan. Silakan coba lagi.');
        }
    }

    public function requestRevision(ManPowerRequest $manPowerRequest)
    {
        try {
            DB::transaction(function () use ($manPowerRequest) {
                $relatedRequests = ManPowerRequest::where('date', $manPowerRequest->date)
                    ->where('sub_section_id', $manPowerRequest->sub_section_id)
                    ->get();

                if ($relatedRequests->isEmpty()) {
                    throw new \Exception("No related requests found for revision.");
                }

                foreach ($relatedRequests as $req) {
                    if ($req->status === 'fulfilled') {
                        if ($req->schedules->isNotEmpty()) {
                            foreach ($req->schedules as $schedule) {
                                if ($schedule->employee) {
                                    $employee = $schedule->employee;
                                    if ($employee->status === 'assigned') { 
                                        $employee->status = 'available';
                                        $employee->save();
                                        Log::debug("Employee ID {$employee->id} status changed to 'available' during revision.");
                                    }
                                }
                            }
                        }
                        $req->schedules()->delete();
                        Log::info("Schedules for ManPowerRequest ID: {$req->id} deleted due to revision request.");

                        $req->update(['status' => 'revision_requested']);
                        Log::info("ManPowerRequest ID: {$req->id} status updated to 'revision_requested'.");
                    }
                }
            });

            return response()->json(['message' => 'Revision initiated successfully. Status changed to revision_requested.']);

        } catch (\Exception $e) {
            Log::error('Error in requestRevision: ' . $e->getMessage(), ['manpower_request_id' => $manPowerRequest->id]);
            return response()->json(['message' => 'Failed to initiate revision.', 'error' => $e->getMessage()], 500);
        }
    }

public function quickFulfill(Request $request, ManpowerRequest $manpowerRequest)
{
    $request->validate([
        'strategy' => 'required|in:optimal,same_section,balanced'
    ]);

    try {
        DB::beginTransaction();

        // Check if already fulfilled
        if ($manpowerRequest->status === 'fulfilled') {
            return response()->json([
                'success' => false,
                'message' => 'Request is already fulfilled'
            ], 400);
        }

        // Auto-select employees based on strategy
        $selectedEmployees = $this->autoSelectEmployees($manpowerRequest, $request->strategy);

        if (empty($selectedEmployees)) {
            return response()->json([
                'success' => false,
                'message' => 'No eligible employees found for this request'
            ], 400);
        }

        // Validate gender requirements
        $validationResult = $this->validateGenderRequirements($manpowerRequest, $selectedEmployees);
        if (!$validationResult['valid']) {
            return response()->json([
                'success' => false,
                'message' => $validationResult['message']
            ], 400);
        }

        // Create employee assignments or schedules
        $this->createEmployeeAssignments($manpowerRequest, $selectedEmployees);

        // Update request status
        $manpowerRequest->update([
            'status' => 'fulfilled',
            'fulfilled_by' => auth()->id(),
            'fulfilled_at' => now()
        ]);

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Request fulfilled successfully',
            'assigned_employees' => $selectedEmployees->count()
        ]);

    } catch (\Exception $e) {
        DB::rollback();
        Log::error('Quick fulfill error: ' . $e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'An error occurred while fulfilling the request'
        ], 500);
    }
}

/**
 * Bulk fulfill multiple manpower requests
 */
public function bulkFulfill(Request $request)
{
    $request->validate([
        'request_ids'   => 'required|array',
        'request_ids.*' => 'exists:man_power_requests,id',
        'strategy'      => 'required|in:optimal,same_section,balanced'
    ]);

    try {
        DB::beginTransaction();

        $requestIds = $request->request_ids;
        $strategy   = $request->strategy;
        
        $manpowerRequests = ManpowerRequest::whereIn('id', $requestIds)
            ->where('status', '!=', 'fulfilled')
            ->get();

        if ($manpowerRequests->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No eligible requests found for bulk fulfillment'
            ], 400);
        }

        $results = [
            'fulfilled' => 0,
            'failed'    => 0,
            'errors'    => []
        ];

        // Tandai semua request dulu supaya tidak bentrok
        $manpowerRequests->each(function ($req) {
            $req->update(['status' => 'fulfilling']);
        });

        foreach ($manpowerRequests as $manpowerRequest) {
            try {
                // Cari employee yg sudah assigned di request lain supaya tidak double
                $currentlyAssigned = $this->getCurrentlyAssignedEmployees($manpowerRequests, $manpowerRequest);

                // Pilih karyawan otomatis
                $selectedEmployees = $this->autoSelectEmployees(
                    $manpowerRequest, 
                    $strategy,
                    $currentlyAssigned
                );

                if ($selectedEmployees->isEmpty()) {
                    $results['failed']++;
                    $results['errors'][] = "No eligible employees found for request ID {$manpowerRequest->id}";
                    $manpowerRequest->update(['status' => 'pending']);
                    continue;
                }

                // Validasi gender
                $validationResult = $this->validateGenderRequirements($manpowerRequest, $selectedEmployees);
                if (!$validationResult['valid']) {
                    $results['failed']++;
                    $results['errors'][] = "Gender requirements not met for request ID {$manpowerRequest->id}: {$validationResult['message']}";
                    $manpowerRequest->update(['status' => 'pending']);
                    continue;
                }

                // Buat schedule assignment
                $this->createEmployeeAssignments($manpowerRequest, $selectedEmployees);

                // Update status
                $manpowerRequest->update([
                    'status'       => 'fulfilled',
                    'fulfilled_by' => auth()->id(),
                    'fulfilled_at' => now()
                ]);

                $results['fulfilled']++;

            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Error fulfilling request ID {$manpowerRequest->id}: " . $e->getMessage();
                $manpowerRequest->update(['status' => 'pending']);
                Log::error("Bulk fulfill error for request {$manpowerRequest->id}: " . $e->getMessage());
            }
        }

        DB::commit();

        $message = "Bulk fulfillment completed: {$results['fulfilled']} successful, {$results['failed']} failed";
        if (!empty($results['errors'])) {
            $message .= ". Errors: " . implode('; ', $results['errors']);
        }

        return response()->json([
            'success' => $results['fulfilled'] > 0,
            'message' => $message,
            'results' => $results
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Bulk fulfill error: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'An error occurred during bulk fulfillment'
        ], 500);
    }
}

/**
 * Buat schedule assignment untuk employees terpilih
 */
private function createEmployeeAssignments(ManpowerRequest $request, $employees)
{
    foreach ($employees as $employee) {
        $request->schedules()->create([
            'employee_id'        => $employee->id,
            'sub_section_id'     => $request->sub_section_id,
            'man_power_request_id' => $request->id,
            'date'               => $request->date,
            'status'             => 'assigned',
        ]);
    }
}


private function getEligibleEmployeesForRequest($request)
{
    $startDate = Carbon::now()->subDays(6)->startOfDay();
    $endDate = Carbon::now()->endOfDay();

    $scheduledIds = Schedule::where('date', $request->date)
        ->where('man_power_request_id', '!=', $request->id)
        ->pluck('employee_id')->toArray();

    $currentScheduledIds = $request->schedules->pluck('employee_id')->toArray();

    return Employee::where(function ($q) use ($currentScheduledIds) {
            $q->where('status', 'available')
              ->orWhereIn('id', $currentScheduledIds);
        })
        ->where('cuti', 'no')
        ->whereNotIn('id', array_diff($scheduledIds, $currentScheduledIds))
        ->with(['subSections.section', 'workloads', 'blindTests', 'ratings'])
        ->withCount(['schedules' => function ($q) use ($startDate, $endDate) {
            $q->whereBetween('date', [$startDate, $endDate]);
        }])
        ->get()
        ->map(fn($e) => $this->normalizeEmployeeFromCreate($e));
}


    /**
     * Auto-select employees based on the specified strategy
     */
    private function autoSelectEmployees(ManpowerRequest $manpowerRequest, string $strategy, array $excludeIds = [])
    {
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

        // Combine and normalize employees (reuse logic from your Fulfill.jsx)
        $combinedEmployees = collect([
            ...$sameSubSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployee($emp, true);
            }),
            ...$otherSubSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployee($emp, false);
            })
        ]);

        // Sort employees based on strategy
        $sortedEmployees = $this->sortEmployeesByStrategy($combinedEmployees, $manpowerRequest, $strategy);

        // Select employees based on requirements
        return $this->selectOptimalEmployees($sortedEmployees, $manpowerRequest);
    }

    /**
     * Normalize employee data for selection algorithm
     */
    private function normalizeEmployee($employee, $isSameSubSection)
    {
        $gender = strtolower(trim($employee->gender ?? 'male'));
        if (!in_array($gender, ['male', 'female'])) {
            $gender = 'male';
        }

        return (object) [
            'id' => $employee->id,
            'name' => $employee->name,
            'gender' => $gender,
            'type' => $employee->type,
            'workload_points' => $employee->workload_points ?? 0,
            'blind_test_points' => $employee->blind_test_points ?? 0,
            'average_rating' => $employee->average_rating ?? 0,
            'working_day_weight' => $employee->working_day_weight ?? 0,
            'total_score' => ($employee->workload_points ?? 0) + ($employee->blind_test_points ?? 0) + ($employee->average_rating ?? 0),
            'is_same_subsection' => $isSameSubSection,
            'subSections' => $employee->subSections ?? collect()
        ];
    }

    /**
     * Sort employees based on the selected strategy
     */
    private function sortEmployeesByStrategy($employees, ManpowerRequest $request, string $strategy)
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
                    // Balance workload distribution
                    if ($a->workload_points !== $b->workload_points) {
                        return $a->workload_points - $b->workload_points; // Lower workload first
                    }
                    break;
                    
                case 'optimal':
                default:
                    // Optimal scoring first
                    if ($a->total_score !== $b->total_score) {
                        return $b->total_score - $a->total_score; // Higher score first
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

            // Final sort: working day weight for harian employees
            if ($a->type === 'harian' && $b->type === 'harian') {
                return $b->working_day_weight - $a->working_day_weight;
            }

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
        
        if ($maleNeeded && $employee->gender === 'male') return 0;
        if ($femaleNeeded && $employee->gender === 'female') return 0;
        
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

    /**
     * Validate if selected employees meet gender requirements
     */
    private function validateGenderRequirements(ManpowerRequest $request, $employees)
    {
        $maleCount = $employees->filter(fn($emp) => $emp->gender === 'male')->count();
        $femaleCount = $employees->filter(fn($emp) => $emp->gender === 'female')->count();
        
        $requiredMale = $request->male_count ?? 0;
        $requiredFemale = $request->female_count ?? 0;

        if ($requiredMale > 0 && $maleCount < $requiredMale) {
            return [
                'valid' => false,
                'message' => "Required {$requiredMale} male employees, but only {$maleCount} available"
            ];
        }

        if ($requiredFemale > 0 && $femaleCount < $requiredFemale) {
            return [
                'valid' => false,
                'message' => "Required {$requiredFemale} female employees, but only {$femaleCount} available"
            ];
        }

        return ['valid' => true];
    }


    /**
     * Get currently assigned employees to avoid conflicts in bulk operations
     */
    private function getCurrentlyAssignedEmployees($allRequests, $currentRequest)
    {
        $assignedIds = [];
        
        foreach ($allRequests as $request) {
            if ($request->id !== $currentRequest->id && $request->status === 'fulfilled') {
                // Get employee IDs from existing assignments
                $existingAssignments = $request->schedules()->pluck('employee_id')->toArray();
                $assignedIds = array_merge($assignedIds, $existingAssignments);
            }
        }
        
        return array_unique($assignedIds);
    }
}