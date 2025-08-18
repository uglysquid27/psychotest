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
        $employee = Auth::guard('employee')->user();

        $mySchedules = Schedule::with([
                'manPowerRequest.shift',
                'subSection.section',
                'employee'
            ])
            ->where('employee_id', $employee->id)
            ->whereDate('date', '>=', Carbon::today())
            ->orderBy('date', 'asc')
            ->get();

        return Inertia::render('EmployeeDashboard', [
            'auth' => [
                'user' => $employee,
            ],
            'mySchedules' => $mySchedules,
        ]);
    }

    public function sameDayEmployees(Schedule $schedule)
    {
        $employee = Auth::guard('employee')->user();

        $currentSection = $schedule->subSection->section;

        $schedules = Schedule::with(['employee', 'subSection', 'manPowerRequest.shift'])
            ->whereHas('subSection', function($q) use ($currentSection) {
                $q->where('section_id', $currentSection->id);
            })
            ->whereDate('date', $schedule->date)
            ->where('employee_id', '!=', $employee->id)
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
                'status' => $s->status,
                'rejection_reason' => $s->rejection_reason
            ];
        }

        uasort($shiftGroups, fn($a, $b) => strcmp($a['start_time'], $b['start_time']));

        return response()->json([
            'current_schedule' => [
                'id' => $schedule->id,
                'status' => $schedule->status,
                'section_name' => $currentSection->name
            ],
            'shiftGroups' => $shiftGroups
        ]);
    }

    public function respond(Request $req, Schedule $schedule)
    {
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
