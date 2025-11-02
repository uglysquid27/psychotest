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
use App\Models\Schedule;

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
                    if (
                        !empty($validated['requests'][$requestIndex]['time_slots'][$slotKey]['start_time']) &&
                        !empty($validated['requests'][$requestIndex]['time_slots'][$slotKey]['end_time'])
                    ) {

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
                    $slotIndex = count($parts) > 1 ? (int) $parts[1] : 0;

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

                if (
                    !empty($validated['time_slots'][$shiftId]['start_time']) &&
                    !empty($validated['time_slots'][$shiftId]['end_time'])
                ) {

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
                    ->keyBy(function ($item) {
                        return $item->shift_id . '_' . $item->slot_index;
                    });

                $hasValidSlots = false;
                $processedSlots = [];

                foreach ($validated['time_slots'] as $slotKey => $slot) {
                    $requestedAmount = (int) $slot['requested_amount'];
                    $maleCount = is_numeric($slot['male_count']) ? (int) $slot['male_count'] : 0;
                    $femaleCount = is_numeric($slot['female_count']) ? (int) $slot['female_count'] : 0;

                    if ($requestedAmount > 0) {
                        $hasValidSlots = true;

                        // Extract shift ID and slot index from the key
                        $parts = explode('_', $slotKey);
                        $shiftId = $parts[0];
                        $slotIndex = count($parts) > 1 ? (int) $parts[1] : 0;

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

            // REMOVED: The 7-day limit check for fulfilled requests
            if (!in_array($manPowerRequest->status, ['pending', 'revision_requested', 'fulfilled'])) {
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

    /**
 * Bulk delete manpower requests
 */
/**
 * Bulk delete manpower requests
 */
public function bulkDelete(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'request_ids' => 'required|array|min:1',
            'request_ids.*' => 'required|exists:man_power_requests,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . $validator->errors()->first(),
            ], 422);
        }

        DB::beginTransaction();

        $requestIds = $request->request_ids;
        $deletedCount = 0;
        $errors = [];

        foreach ($requestIds as $requestId) {
            try {
                $manPowerRequest = ManPowerRequest::with('schedules.employee')->findOrFail($requestId);

                // Check if request can be deleted (same logic as single delete)
                if (!in_array($manPowerRequest->status, ['pending', 'revision_requested', 'fulfilled'])) {
                    $errors[] = "Request ID {$requestId} cannot be deleted in current status: {$manPowerRequest->status}";
                    continue;
                }

                // Handle employee status updates for fulfilled requests
                if ($manPowerRequest->schedules->isNotEmpty()) {
                    Log::info('Updating employee statuses for schedules related to deleted request', [
                        'request_id' => $manPowerRequest->id,
                        'schedule_count' => $manPowerRequest->schedules->count()
                    ]);
                    
                    foreach ($manPowerRequest->schedules as $schedule) {
                        if ($schedule->employee) {
                            $employee = $schedule->employee;
                            
                            // Reset status to 'available' if currently 'assigned'
                            if ($employee->status === 'assigned') {
                                $employee->status = 'available';
                                $employee->save();
                                Log::debug("Employee ID {$employee->id} status changed to 'available'.");
                            }
                            
                            // Reset cuti status to 'no' if needed
                            if ($employee->cuti === 'yes') {
                                $employee->cuti = 'no';
                                $employee->save();
                                Log::debug("Employee ID {$employee->id} cuti status reset to 'no'.");
                            }
                        }
                    }
                }

                $manPowerRequest->delete();
                $deletedCount++;

            } catch (\Exception $e) {
                $errors[] = "Failed to delete request ID {$requestId}: " . $e->getMessage();
                Log::error("Bulk delete failed for request {$requestId}: " . $e->getMessage());
            }
        }

        DB::commit();

        $message = "Bulk delete completed: {$deletedCount} requests deleted";
        if (!empty($errors)) {
            $message .= ". " . count($errors) . " errors occurred";
        }

        return response()->json([
            'success' => $deletedCount > 0,
            'message' => $message,
            'deleted_count' => $deletedCount,
            'errors' => $errors
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Bulk delete failed: ' . $e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'An error occurred during bulk deletion: ' . $e->getMessage()
        ], 500);
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

    public function bulkFulfillMultiSubsection(Request $request)
    {
        Log::info('=== BULK FULFILL MULTI SUBSECTION START ===', [
            'user_id' => auth()->id(),
            'request_ids' => $request->request_ids,
            'employee_selections_count' => count($request->employee_selections ?? []),
            'strategy' => $request->strategy
        ]);

        try {
            $validator = Validator::make($request->all(), [
                'request_ids' => 'required|array|min:1',
                'request_ids.*' => 'required|exists:man_power_requests,id',
                'employee_selections' => 'required|array',
                'employee_selections.*' => 'required|array',
                'strategy' => 'required|in:optimal,same_section,balanced'
            ]);

            if ($validator->fails()) {
                Log::error('Bulk fulfill validation failed', [
                    'errors' => $validator->errors()->toArray()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed: ' . $validator->errors()->first(),
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $requestIds = $request->request_ids;
            $employeeSelections = $request->employee_selections;
            $strategy = $request->strategy;

            // Load requests with their relationships
            $manpowerRequests = ManPowerRequest::whereIn('id', $requestIds)
                ->where('status', '!=', 'fulfilled')
                ->with(['subSection.section', 'schedules.employee'])
                ->get();

            Log::info('Manpower requests fetched for multi-subsection bulk fulfill', [
                'total_request_ids' => count($requestIds),
                'valid_requests_count' => $manpowerRequests->count(),
                'employee_selections_keys' => array_keys($employeeSelections)
            ]);

            if ($manpowerRequests->isEmpty()) {
                Log::warning('No valid requests found for bulk fulfill');
                return response()->json([
                    'success' => false,
                    'message' => 'No valid requests found to fulfill'
                ], 400);
            }

            $results = [
                'fulfilled' => 0,
                'failed' => 0,
                'errors' => []
            ];

            foreach ($manpowerRequests as $manpowerRequest) {
                $requestId = $manpowerRequest->id;

                Log::info("Processing request {$requestId}", [
                    'request_id' => $requestId,
                    'selected_employees_count' => count($employeeSelections[$requestId] ?? []),
                    'required_amount' => $manpowerRequest->requested_amount,
                    'subsection_name' => $manpowerRequest->subSection->name ?? 'N/A'
                ]);

                try {
                    // Skip if already fulfilled (double-check)
                    if ($manpowerRequest->status === 'fulfilled') {
                        $results[$requestId] = 'already fulfilled';
                        $results['failed']++;
                        Log::warning('REQUEST ALREADY FULFILLED - SKIPPING', ['request_id' => $requestId]);
                        continue;
                    }

                    // Get selected employee IDs for this request
                    $selectedEmployeeIds = $employeeSelections[$requestId] ?? [];

                    Log::info('Employee selection for request', [
                        'request_id' => $requestId,
                        'selected_count' => count($selectedEmployeeIds),
                        'selected_employee_ids' => $selectedEmployeeIds,
                        'required_amount' => $manpowerRequest->requested_amount
                    ]);

                    // Validate employee selection count
                    if (count($selectedEmployeeIds) !== $manpowerRequest->requested_amount) {
                        $errorMsg = "Invalid employee selection count for request ID {$requestId}. Expected: {$manpowerRequest->requested_amount}, Got: " . count($selectedEmployeeIds);
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    // Validate gender requirements
                    $maleCount = 0;
                    $femaleCount = 0;
                    $invalidEmployees = [];

                    foreach ($selectedEmployeeIds as $employeeId) {
                        $employee = Employee::find($employeeId);
                        if (!$employee) {
                            $invalidEmployees[] = $employeeId;
                            continue;
                        }

                        if ($employee->gender === 'male') {
                            $maleCount++;
                        } elseif ($employee->gender === 'female') {
                            $femaleCount++;
                        }
                    }

                    // Check for invalid employees
                    if (!empty($invalidEmployees)) {
                        $errorMsg = "Invalid employee IDs found for request ID {$requestId}: " . implode(', ', $invalidEmployees);
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    // Validate gender counts
                    if ($manpowerRequest->male_count > 0 && $maleCount < $manpowerRequest->male_count) {
                        $errorMsg = "Insufficient male employees for request ID {$requestId}. Required: {$manpowerRequest->male_count}, Found: {$maleCount}";
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    if ($manpowerRequest->female_count > 0 && $femaleCount < $manpowerRequest->female_count) {
                        $errorMsg = "Insufficient female employees for request ID {$requestId}. Required: {$manpowerRequest->female_count}, Found: {$femaleCount}";
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    // Delete existing schedules
                    if ($manpowerRequest->schedules->isNotEmpty()) {
                        Log::info('Deleting existing schedules', [
                            'request_id' => $requestId,
                            'schedule_count' => $manpowerRequest->schedules->count()
                        ]);
                        $manpowerRequest->schedules()->delete();
                    }

                    // Create new schedules
                    $createdSchedules = [];
                    foreach ($selectedEmployeeIds as $index => $employeeId) {
                        $data = [
                            'employee_id' => $employeeId,
                            'sub_section_id' => $manpowerRequest->sub_section_id,
                            'man_power_request_id' => $manpowerRequest->id,
                            'date' => $manpowerRequest->date,
                            'status' => 'pending',
                            'visibility' => 'private',
                        ];

                        // Add line for putway subsection
                        if ($manpowerRequest->subSection && strtolower($manpowerRequest->subSection->name) === 'putway') {
                            $data['line'] = strval((($index % 2) + 1));
                        }

                        $schedule = Schedule::create($data);
                        $createdSchedules[] = $schedule->id;

                        Log::info('Employee assigned', [
                            'request_id' => $requestId,
                            'employee_id' => $employeeId,
                            'schedule_id' => $schedule->id,
                            'line' => $data['line'] ?? 'N/A',
                        ]);
                    }

                    // Update request status
                    $manpowerRequest->update([
                        'status' => 'fulfilled',
                        'fulfilled_by' => auth()->id(),
                        'fulfilled_at' => now()
                    ]);

                    $results['fulfilled']++;
                    Log::info('Request fulfilled successfully', [
                        'request_id' => $requestId,
                        'assigned_employees_count' => count($selectedEmployeeIds)
                    ]);

                } catch (\Exception $e) {
                    $errorMsg = "Error fulfilling request ID {$requestId}: " . $e->getMessage();
                    Log::error($errorMsg, [
                        'exception' => $e->getTraceAsString()
                    ]);
                    $results['failed']++;
                    $results['errors'][] = $errorMsg;
                }
            }

            DB::commit();

            $message = "Bulk fulfillment completed: {$results['fulfilled']} successful, {$results['failed']} failed";
            if (!empty($results['errors'])) {
                $message .= ". First few errors: " . implode('; ', array_slice($results['errors'], 0, 3));
            }

            Log::info('=== BULK FULFILL MULTI SUBSECTION COMPLETED ===', [
                'total_processed' => $manpowerRequests->count(),
                'successful' => $results['fulfilled'],
                'failed' => $results['failed'],
                'message' => $message
            ]);

            return response()->json([
                'success' => $results['fulfilled'] > 0,
                'message' => $message,
                'results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('=== BULK FULFILL MULTI SUBSECTION FAILED ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['employee_selections']) // Don't log all employee IDs for privacy
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during bulk fulfillment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enhanced auto-select for bulk operations with multi-subsection support
     */
    private function autoSelectEmployeesForBulk(ManpowerRequest $manpowerRequest, string $strategy, array $excludeIds = [], array $processedRequests = [])
    {
        Log::debug('Starting autoSelectEmployeesForBulk', [
            'request_id' => $manpowerRequest->id,
            'subsection_id' => $manpowerRequest->sub_section_id,
            'section_id' => $manpowerRequest->subSection->section_id,
            'strategy' => $strategy,
            'exclude_ids_count' => count($excludeIds),
            'processed_requests_count' => count($processedRequests)
        ]);

        $excludeIds = $excludeIds ?? [];

        // Get section ID for same-section prioritization
        $requestSectionId = $manpowerRequest->subSection->section_id;
        $requestSubSectionId = $manpowerRequest->sub_section_id;

        // Get employees from same subsection (highest priority)
        $sameSubSectionEmployees = Employee::whereHas('subSections', function ($query) use ($requestSubSectionId) {
            $query->where('sub_section_id', $requestSubSectionId);
        })->whereNotIn('id', $excludeIds)->get();

        Log::debug('Same subsection employees', [
            'request_id' => $manpowerRequest->id,
            'same_subsection_count' => $sameSubSectionEmployees->count(),
            'subsection_id' => $requestSubSectionId
        ]);

        // Get employees from same section but different subsections
        $sameSectionEmployees = Employee::whereHas('subSections.section', function ($query) use ($requestSectionId) {
            $query->where('id', $requestSectionId);
        })->whereNotIn('id', $excludeIds)
            ->whereDoesntHave('subSections', function ($query) use ($requestSubSectionId) {
                $query->where('sub_section_id', $requestSubSectionId);
            })->get();

        Log::debug('Same section employees', [
            'request_id' => $manpowerRequest->id,
            'same_section_count' => $sameSectionEmployees->count(),
            'section_id' => $requestSectionId
        ]);

        // Get employees from other sections (lowest priority)
        $otherSectionEmployees = Employee::whereDoesntHave('subSections.section', function ($query) use ($requestSectionId) {
            $query->where('id', $requestSectionId);
        })->whereNotIn('id', $excludeIds)->get();

        Log::debug('Other section employees', [
            'request_id' => $manpowerRequest->id,
            'other_section_count' => $otherSectionEmployees->count()
        ]);

        // Combine and normalize employees with priority tiers
        $combinedEmployees = collect([
            ...$sameSubSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployeeForBulk($emp, 'same_subsection');
            }),
            ...$sameSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployeeForBulk($emp, 'same_section');
            }),
            ...$otherSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployeeForBulk($emp, 'other_section');
            })
        ]);

        Log::debug('Combined employees before sorting', [
            'request_id' => $manpowerRequest->id,
            'total_combined_count' => $combinedEmployees->count(),
            'priority_tiers' => $combinedEmployees->groupBy('priority_tier')->map->count()
        ]);

        // Sort employees based on strategy
        $sortedEmployees = $this->sortEmployeesForBulkStrategy($combinedEmployees, $manpowerRequest, $strategy);

        // Select employees based on requirements
        $selected = $this->selectOptimalEmployeesForBulk($sortedEmployees, $manpowerRequest);

        Log::debug('Final employee selection', [
            'request_id' => $manpowerRequest->id,
            'final_selected_count' => $selected->count(),
            'selected_genders' => $selected->groupBy('gender')->map->count(),
            'selected_priority_tiers' => $selected->groupBy('priority_tier')->map->count()
        ]);

        return $selected;
    }

    /**
     * Normalize employee with priority tier for bulk operations
     */
    private function normalizeEmployeeForBulk($employee, $priorityTier)
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
            'priority_tier' => $priorityTier, // same_subsection, same_section, other_section
            'subSections' => $employee->subSections ?? collect()
        ];
    }

    /**
     * Sort employees for bulk strategy
     */
    private function sortEmployeesForBulkStrategy($employees, ManpowerRequest $request, string $strategy)
    {
        return $employees->sort(function ($a, $b) use ($request, $strategy) {
            // First, sort by priority tier
            $tierOrder = ['same_subsection' => 0, 'same_section' => 1, 'other_section' => 2];
            if ($a->priority_tier !== $b->priority_tier) {
                return $tierOrder[$a->priority_tier] - $tierOrder[$b->priority_tier];
            }

            switch ($strategy) {
                case 'same_section':
                    // For same section strategy, prioritize employees who are in the same section
                    // This is already handled by priority tier, so just sort by score
                    return $b->total_score - $a->total_score;

                case 'balanced':
                    // Balance workload distribution - lower workload first
                    if ($a->workload_points !== $b->workload_points) {
                        return $a->workload_points - $b->workload_points;
                    }
                    break;

                case 'optimal':
                default:
                    // Optimal scoring first
                    if ($a->total_score !== $b->total_score) {
                        return $b->total_score - $a->total_score;
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

            // Final sort: working day weight for harian employees
            if ($a->type === 'harian' && $b->type === 'harian') {
                return $b->working_day_weight - $a->working_day_weight;
            }

            return $a->id - $b->id;
        });
    }

    /**
     * Select optimal employees for bulk with gender requirements
     */
    private function selectOptimalEmployeesForBulk($sortedEmployees, ManpowerRequest $request)
    {
        $selected = collect();
        $requiredMale = $request->male_count ?? 0;
        $requiredFemale = $request->female_count ?? 0;
        $totalRequired = $request->requested_amount;

        Log::debug('Selecting optimal employees for bulk', [
            'request_id' => $request->id,
            'required_male' => $requiredMale,
            'required_female' => $requiredFemale,
            'total_required' => $totalRequired,
            'available_employees' => $sortedEmployees->count()
        ]);

        // First, select required gender counts with priority on matching priority tiers
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

        // Fill remaining slots with any available employees, maintaining priority
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
     * Preview bulk fulfillment for multiple subsections
     */
    public function bulkPreviewMultiSubsection(Request $request)
    {
        $request->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'exists:man_power_requests,id',
            'strategy' => 'required|in:optimal,same_section,balanced',
        ]);

        $results = [];
        $allAssignedEmployeeIds = [];
        $processedRequests = [];

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

            // Use the same logic as bulk fulfillment but just for preview
            $selectedEmployees = $this->autoSelectEmployeesForBulk(
                $manpowerRequest,
                $request->strategy,
                $allAssignedEmployeeIds, // Track assigned employees to avoid conflicts in preview
                $processedRequests
            );

            // Update tracking for the preview
            $selectedEmployeeIds = $selectedEmployees->pluck('id')->toArray();
            $allAssignedEmployeeIds = array_merge($allAssignedEmployeeIds, $selectedEmployeeIds);

            $processedRequests[] = [
                'id' => $manpowerRequest->id,
                'subsection_id' => $manpowerRequest->sub_section_id,
                'section_id' => $manpowerRequest->subSection->section_id,
                'assigned_employees' => $selectedEmployeeIds
            ];

            $results[$id] = [
                'status' => 'preview',
                'request' => [
                    'id' => $manpowerRequest->id,
                    'date' => $manpowerRequest->date,
                    'requested_amount' => $manpowerRequest->requested_amount,
                    'male_count' => $manpowerRequest->male_count,
                    'female_count' => $manpowerRequest->female_count,
                    'sub_section_id' => $manpowerRequest->sub_section_id,
                    'sub_section_name' => $manpowerRequest->subSection->name,
                    'section_name' => $manpowerRequest->subSection->section->name,
                    'shift_name' => $manpowerRequest->shift->name ?? 'No Shift',
                ],
                'employees' => $selectedEmployees->map(function ($emp) {
                    return [
                        'id' => $emp->id,
                        'name' => $emp->name,
                        'gender' => $emp->gender,
                        'type' => $emp->type,
                        'total_score' => $emp->total_score,
                        'priority_tier' => $emp->priority_tier,
                        'workload_points' => $emp->workload_points,
                        'blind_test_points' => $emp->blind_test_points,
                        'average_rating' => $emp->average_rating,
                        'working_day_weight' => $emp->working_day_weight,
                    ];
                })->values()->all(),
                'selected_count' => $selectedEmployees->count(),
                'gender_breakdown' => [
                    'male' => $selectedEmployees->filter(fn($emp) => $emp->gender === 'male')->count(),
                    'female' => $selectedEmployees->filter(fn($emp) => $emp->gender === 'female')->count(),
                ]
            ];
        }

        // Calculate summary statistics
        $totalRequests = count($request->request_ids);
        $totalEmployees = collect($results)->sum('selected_count');
        $fulfilledRequests = collect($results)->filter(fn($r) => $r['status'] === 'preview')->count();

        return response()->json([
            'success' => true,
            'results' => $results,
            'strategy' => $request->strategy,
            'summary' => [
                'total_requests' => $totalRequests,
                'fulfilled_requests' => $fulfilledRequests,
                'total_employees' => $totalEmployees,
                'unique_subsections' => collect($results)->pluck('request.sub_section_name')->unique()->values(),
                'unique_sections' => collect($results)->pluck('request.section_name')->unique()->values(),
                'gender_breakdown' => [
                    'male' => collect($results)->sum('gender_breakdown.male'),
                    'female' => collect($results)->sum('gender_breakdown.female'),
                ]
            ]
        ]);
    }



    // In ManPowerRequestController.php
    public function getAvailableEmployeesForRequest($requestId) // Remove Request $request if not needed
    {
        $manpowerRequest = ManPowerRequest::with('subSection.section')->findOrFail($requestId);

        // Rest of your method remains the same...
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
            ->get()
            ->map(function ($employee) use ($manpowerRequest) {
                // Simplified version - just return basic employee info
                $workloadPoints = $employee->workloads->sortByDesc('week')->first()->workload_point ?? 0;
                $blindTestResult = $employee->blindTests->sortByDesc('test_date')->first()->result ?? 'Fail';
                $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                $averageRating = $employee->ratings->avg('rating') ?? 0;
                $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

                // Determine priority tier
                $requestSubSectionId = $manpowerRequest->sub_section_id;
                $requestSectionId = $manpowerRequest->subSection->section_id;

                $priorityTier = 'other_section';
                if ($employee->subSections->contains('id', $requestSubSectionId)) {
                    $priorityTier = 'same_subsection';
                } elseif ($employee->subSections->contains('section_id', $requestSectionId)) {
                    $priorityTier = 'same_section';
                }

                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'gender' => $employee->gender,
                    'type' => $employee->type,
                    'total_score' => $totalScore,
                    'priority_tier' => $priorityTier,
                    'workload_points' => $workloadPoints,
                    'blind_test_points' => $blindTestPoints,
                    'average_rating' => $averageRating,
                ];
            });

        return response()->json([
            'employees' => $eligibleEmployees->values()
        ]);
    }

    // Add this method to ManPowerRequestController.php
    public function bulkGetAvailableEmployees($requestId)
    {
        try {
            Log::info('Fetching available employees for bulk preview', ['request_id' => $requestId]);

            $manpowerRequest = ManPowerRequest::with('subSection.section')->findOrFail($requestId);

            $startDate = Carbon::now()->subDays(6)->startOfDay();
            $endDate = Carbon::now()->endOfDay();

            // Get employees already scheduled on the same date for other requests
            $scheduledEmployeeIdsOnRequestDate = \App\Models\Schedule::where('date', $manpowerRequest->date)
                ->where('man_power_request_id', '!=', $manpowerRequest->id)
                ->pluck('employee_id')
                ->toArray();

            // Get current employees scheduled for this request
            $currentScheduledIds = $manpowerRequest->schedules->pluck('employee_id')->toArray();

            Log::debug('Employee filtering criteria', [
                'request_date' => $manpowerRequest->date,
                'scheduled_employee_ids_count' => count($scheduledEmployeeIdsOnRequestDate),
                'current_scheduled_ids_count' => count($currentScheduledIds)
            ]);

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
                    'workloads' => function ($query) {
                        $query->orderBy('week', 'desc')->limit(1);
                    },
                    'blindTests' => function ($query) {
                        $query->orderBy('test_date', 'desc')->limit(1);
                    },
                    'ratings'
                ])
                ->withCount([
                    'schedules' => function ($query) use ($startDate, $endDate) {
                        $query->whereBetween('date', [$startDate, $endDate]);
                    }
                ])
                ->with(['schedules.manPowerRequest.shift'])
                ->get()
                ->map(function ($employee) use ($manpowerRequest, $currentScheduledIds) {
                    try {
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

                        // Get workload points safely
                        $workloadPoints = 0;
                        if ($employee->workloads && $employee->workloads->isNotEmpty()) {
                            $workloadPoints = $employee->workloads->first()->workload_point ?? 0;
                        }

                        // Get blind test points safely
                        $blindTestPoints = 0;
                        if ($employee->blindTests && $employee->blindTests->isNotEmpty()) {
                            $blindTestResult = $employee->blindTests->first()->result ?? 'Fail';
                            $blindTestPoints = $blindTestResult === 'Pass' ? 3 : 0;
                        }

                        // Get average rating safely
                        $averageRating = 0;
                        if ($employee->ratings && $employee->ratings->isNotEmpty()) {
                            $averageRating = $employee->ratings->avg('rating') ?? 0;
                        }

                        $totalScore = ($workloadPoints * 0.5) + ($blindTestPoints * 0.3) + ($averageRating * 0.2);

                        // Transform subSections data for frontend
                        $subSectionsData = [];
                        if ($employee->subSections) {
                            $subSectionsData = $employee->subSections->map(function ($subSection) {
                                return [
                                    'id' => $subSection->id,
                                    'name' => $subSection->name,
                                    'section' => $subSection->section ? [
                                        'id' => $subSection->section->id,
                                        'name' => $subSection->section->name,
                                    ] : null,
                                ];
                            })->toArray();
                        }

                        return [
                            'id' => $employee->id,
                            'nik' => $employee->nik,
                            'name' => $employee->name,
                            'gender' => $employee->gender,
                            'type' => $employee->type,
                            'status' => $employee->status,
                            'cuti' => $employee->cuti,
                            'photo' => $employee->photo,
                            'total_score' => $totalScore,
                            'workload_points' => $workloadPoints,
                            'blind_test_points' => $blindTestPoints,
                            'average_rating' => $averageRating,
                            'working_day_weight' => $workingDayWeight,
                            'subSections' => $subSectionsData,
                            'isCurrentlyScheduled' => in_array($employee->id, $currentScheduledIds),
                            // Add these fields for consistency
                            'priority_tier' => $this->determinePriorityTier($employee, $manpowerRequest),
                        ];
                    } catch (\Exception $e) {
                        Log::error('Error processing employee data', [
                            'employee_id' => $employee->id,
                            'error' => $e->getMessage()
                        ]);

                        // Return basic employee data if processing fails
                        return [
                            'id' => $employee->id,
                            'nik' => $employee->nik,
                            'name' => $employee->name,
                            'gender' => $employee->gender,
                            'type' => $employee->type,
                            'status' => $employee->status,
                            'cuti' => $employee->cuti,
                            'photo' => $employee->photo,
                            'total_score' => 0,
                            'workload_points' => 0,
                            'blind_test_points' => 0,
                            'average_rating' => 0,
                            'working_day_weight' => 0,
                            'subSections' => [],
                            'isCurrentlyScheduled' => false,
                        ];
                    }
                });

            Log::info('Successfully fetched available employees', [
                'request_id' => $requestId,
                'eligible_employees_count' => $eligibleEmployees->count()
            ]);

            return response()->json([
                'success' => true,
                'employees' => $eligibleEmployees->values()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in bulkGetAvailableEmployees', [
                'request_id' => $requestId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available employees: ' . $e->getMessage(),
                'employees' => []
            ], 500);
        }
    }

    private function determinePriorityTier($employee, $manpowerRequest)
    {
        $requestSubSectionId = $manpowerRequest->sub_section_id;
        $requestSectionId = $manpowerRequest->subSection->section_id;

        if ($employee->subSections->contains('id', $requestSubSectionId)) {
            return 'same_subsection';
        } elseif ($employee->subSections->contains('section_id', $requestSectionId)) {
            return 'same_section';
        } else {
            return 'other_section';
        }
    }

    /**
     * Bulk fulfill multiple manpower requests
     */
    public function bulkFulfill(Request $request)
    {
        Log::info('=== BULK FULFILL START ===', [
            'user_id' => auth()->id(),
            'request_data' => $request->all()
        ]);

        // Use simple validation without employee_selections requirement
        $validator = Validator::make($request->all(), [
            'request_ids' => 'required|array|min:1',
            'request_ids.*' => 'required|exists:man_power_requests,id',
            'strategy' => 'required|in:optimal,same_section,balanced'
        ]);

        if ($validator->fails()) {
            Log::error('Bulk fulfill validation failed', [
                'errors' => $validator->errors()->toArray()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $requestIds = $request->request_ids;
            $strategy = $request->strategy;

            $manpowerRequests = ManpowerRequest::whereIn('id', $requestIds)
                ->where('status', '!=', 'fulfilled')
                ->with('subSection.section')
                ->get();

            Log::info('Manpower requests fetched for bulk fulfill', [
                'total_request_ids' => count($requestIds),
                'valid_requests_count' => $manpowerRequests->count()
            ]);

            if ($manpowerRequests->isEmpty()) {
                Log::warning('No valid requests found for bulk fulfill');
                return response()->json([
                    'success' => false,
                    'message' => 'No valid requests found to fulfill'
                ], 400);
            }

            $results = [
                'fulfilled' => 0,
                'failed' => 0,
                'errors' => []
            ];

            // Track all assigned employees across all requests to avoid conflicts
            $allAssignedEmployeeIds = [];

            foreach ($manpowerRequests as $index => $manpowerRequest) {
                Log::info("Processing request {$index}/{$manpowerRequests->count()}", [
                    'request_id' => $manpowerRequest->id,
                    'sub_section' => $manpowerRequest->subSection->name ?? 'N/A',
                    'date' => $manpowerRequest->date,
                    'required_workers' => $manpowerRequest->requested_amount
                ]);

                try {
                    // Get currently assigned employees to avoid conflicts
                    $currentlyAssigned = $allAssignedEmployeeIds;

                    $selectedEmployees = $this->autoSelectEmployees(
                        $manpowerRequest,
                        $strategy,
                        $currentlyAssigned
                    );

                    Log::info('Employee selection result', [
                        'request_id' => $manpowerRequest->id,
                        'selected_employees_count' => $selectedEmployees->count()
                    ]);

                    if ($selectedEmployees->isEmpty()) {
                        $errorMsg = "No eligible employees found for request ID {$manpowerRequest->id}";
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    $validationResult = $this->validateGenderRequirements($manpowerRequest, $selectedEmployees);
                    if (!$validationResult['valid']) {
                        $errorMsg = "Gender requirements not met for request ID {$manpowerRequest->id}: {$validationResult['message']}";
                        Log::warning($errorMsg);
                        $results['failed']++;
                        $results['errors'][] = $errorMsg;
                        continue;
                    }

                    // Create employee assignments
                    $this->createEmployeeAssignments($manpowerRequest, $selectedEmployees);

                    // Update assigned employees tracking
                    $selectedEmployeeIds = $selectedEmployees->pluck('id')->toArray();
                    $allAssignedEmployeeIds = array_merge($allAssignedEmployeeIds, $selectedEmployeeIds);

                    // Update request status
                    $manpowerRequest->update([
                        'status' => 'fulfilled',
                        'fulfilled_by' => auth()->id(),
                        'fulfilled_at' => now()
                    ]);

                    Log::info('Request successfully fulfilled', [
                        'request_id' => $manpowerRequest->id,
                        'assigned_employees_count' => $selectedEmployees->count()
                    ]);

                    $results['fulfilled']++;

                } catch (\Exception $e) {
                    $errorMsg = "Error fulfilling request ID {$manpowerRequest->id}: " . $e->getMessage();
                    Log::error($errorMsg);
                    $results['failed']++;
                    $results['errors'][] = $errorMsg;
                }
            }

            DB::commit();

            $message = "Bulk fulfillment completed: {$results['fulfilled']} successful, {$results['failed']} failed";
            if (!empty($results['errors'])) {
                $message .= ". First few errors: " . implode('; ', array_slice($results['errors'], 0, 3));
            }

            Log::info('=== BULK FULFILL COMPLETED ===', [
                'total_processed' => $manpowerRequests->count(),
                'successful' => $results['fulfilled'],
                'failed' => $results['failed']
            ]);

            return response()->json([
                'success' => $results['fulfilled'] > 0,
                'message' => $message,
                'results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('=== BULK FULFILL FAILED ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during bulk fulfillment: ' . $e->getMessage()
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
                'employee_id' => $employee->id,
                'sub_section_id' => $request->sub_section_id,
                'man_power_request_id' => $request->id,
                'date' => $request->date,
                'status' => 'pending',
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
            ->withCount([
                'schedules' => function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('date', [$startDate, $endDate]);
                }
            ])
            ->get()
            ->map(fn($e) => $this->normalizeEmployeeFromCreate($e));
    }


    /**
     * Auto-select employees based on the specified strategy
     */
    private function autoSelectEmployees(ManpowerRequest $manpowerRequest, string $strategy, array $excludeIds = [])
    {
        Log::debug('Starting autoSelectEmployees', [
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

        // Combine and normalize employees
        $combinedEmployees = collect([
            ...$sameSubSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployee($emp, true);
            }),
            ...$otherSubSectionEmployees->map(function ($emp) {
                return $this->normalizeEmployee($emp, false);
            })
        ]);

        Log::debug('Combined employees before sorting', [
            'request_id' => $manpowerRequest->id,
            'total_combined_count' => $combinedEmployees->count()
        ]);

        // Sort employees based on strategy
        $sortedEmployees = $this->sortEmployeesByStrategy($combinedEmployees, $manpowerRequest, $strategy);

        // Select employees based on requirements
        $selected = $this->selectOptimalEmployees($sortedEmployees, $manpowerRequest);

        Log::debug('Final employee selection', [
            'request_id' => $manpowerRequest->id,
            'final_selected_count' => $selected->count(),
            'selected_genders' => $selected->groupBy('gender')->map->count()
        ]);

        return $selected;
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
            if ($a->type === 'bulanan' && $b->type === 'harian')
                return -1;
            if ($a->type === 'harian' && $b->type === 'bulanan')
                return 1;

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

    // Add this method to ManPowerRequestController.php
    public function canRevise($id)
    {
        $request = ManPowerRequest::with('schedules')->findOrFail($id);

        if ($request->status !== 'fulfilled') {
            return response()->json(['can_revise' => false]);
        }

        // Check if there are any pending schedules or rejected employees
        $hasPendingSchedules = $request->schedules->contains('status', 'pending');
        $hasRejectedEmployees = $request->schedules->contains(function ($schedule) {
            return $schedule->employee && $schedule->employee->status === 'rejected';
        });

        return response()->json([
            'can_revise' => $hasPendingSchedules || $hasRejectedEmployees
        ]);
    }
}