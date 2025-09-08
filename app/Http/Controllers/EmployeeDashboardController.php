<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Schedule;
use App\Models\Employee;
use App\Models\ManPowerRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeDashboardController extends Controller
{
    public function index()
    {
        /** @var Employee $employee */
        $employee = auth()->user();

        $incompleteProfile = false;
        if (is_null($employee->kelurahan) || is_null($employee->kecamatan)) {
            $incompleteProfile = true;
        }

        // Get all schedules (past, present, and future)
        $mySchedules = $employee->schedules()
            ->with(['manPowerRequest.shift', 'subSection.section'])
            ->orderBy('date', 'desc') // Changed to desc to show latest first
            ->get();

        \Log::info('Schedule: ' . $mySchedules);

        return inertia('EmployeeDashboard', [
            'auth' => [
                'user' => $employee,
            ],
            'mySchedules' => $mySchedules,
            'incompleteProfile' => $incompleteProfile,
        ]);
    }

// In EmployeeDashboardController.php - sameDayEmployees method
public function sameDayEmployees(Schedule $schedule)
{
    $employee = Auth::guard('employee')->user();

    $currentSection = $schedule->subSection->section;

    $schedules = Schedule::with(['employee', 'subSection', 'manPowerRequest.shift'])
        ->whereHas('subSection', function ($q) use ($currentSection) {
            $q->where('section_id', $currentSection->id);
        })
        ->whereDate('date', $schedule->date)
        ->get();

    $shiftGroups = [];
    foreach ($schedules as $s) {
        $shiftId = $s->manPowerRequest->shift_id;
        if (!isset($shiftGroups[$shiftId])) {
            $shiftGroups[$shiftId] = [
                'shift_name' => $s->manPowerRequest->shift->name,
                'start_time' => $s->manPowerRequest->start_time,
                'end_time' => $s->manPowerRequest->end_time,
                'employees' => []
            ];
        }

        $shiftGroups[$shiftId]['employees'][] = [
            'id' => $s->id,
            'employee' => $s->employee,
            'sub_section' => $s->subSection->name,
            'line' => $s->line, // ← ADD THIS LINE to include the line field
            'status' => $s->status,
            'rejection_reason' => $s->rejection_reason,
            'is_current_user' => $s->employee_id === $employee->id
        ];
    }

    uasort($shiftGroups, fn($a, $b) => strcmp($a['start_time'], $b['start_time']));

    return response()->json([
        'current_schedule' => [
            'id' => $schedule->id,
            'status' => $schedule->status,
            'section_name' => $currentSection->name
        ],
        'shiftGroups' => $shiftGroups,
        'current_user_id' => $employee->id
    ]);
}

    public function respond(Request $req, Schedule $schedule)
    {
        // Only allow responding to today's or future schedules
        if (Carbon::parse($schedule->date)->isPast() && !Carbon::parse($schedule->date)->isToday()) {
            return back()->with('error', 'Tidak dapat merespon jadwal yang sudah lewat.');
        }

        $req->validate([
            'status' => 'required|in:accepted,rejected',
            'rejection_reason' => 'nullable|required_if:status,rejected|string|max:1000',
        ]);

        $employee = Auth::guard('employee')->user();

        DB::transaction(function () use ($req, $schedule) {
            $data = ['status' => $req->status];

            if ($req->status === 'rejected') {
                $data['rejection_reason'] = $req->rejection_reason;

                // Reset employee status
                $employeeToUpdate = Employee::find($schedule->employee_id);
                if ($employeeToUpdate) {
                    $employeeToUpdate->status = 'available';
                    $employeeToUpdate->cuti = 'yes';
                    $employeeToUpdate->save();
                }

                // Reset manpower request
                $manPowerRequest = ManPowerRequest::find($schedule->man_power_request_id);
                if ($manPowerRequest) {
                    $manPowerRequest->status = 'pending';
                    $manPowerRequest->save();
                }
            } else {
                $data['rejection_reason'] = null;
            }

            $schedule->update($data);
        });

        return back()->with('success', 'Status berhasil diperbarui.');
    }
}