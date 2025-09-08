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
use Illuminate\Support\Facades\Storage;

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
            $startTime = $s->manPowerRequest->start_time ?: 'N/A';
            $endTime = $s->manPowerRequest->end_time ?: 'N/A';
            
            // Create a unique key for each time combination within a shift
            $timeKey = $startTime . '_' . $endTime;
            
            if (!isset($shiftGroups[$shiftId])) {
                $shiftGroups[$shiftId] = [
                    'shift_id' => $shiftId,
                    'shift_name' => $s->manPowerRequest->shift->name ?? 'N/A',
                    'timeGroups' => []
                ];
            }

            if (!isset($shiftGroups[$shiftId]['timeGroups'][$timeKey])) {
                $shiftGroups[$shiftId]['timeGroups'][$timeKey] = [
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'employees' => []
                ];
            }

            $shiftGroups[$shiftId]['timeGroups'][$timeKey]['employees'][] = [
                'id' => $s->id,
                'employee' => $s->employee,
                'sub_section' => $s->subSection->name,
                'line' => $s->line,
                'status' => $s->status,
                'rejection_reason' => $s->rejection_reason,
                'is_current_user' => $s->employee_id === $employee->id
            ];
        }

        // Sort time groups within each shift by start time
        foreach ($shiftGroups as &$shiftGroup) {
            uasort($shiftGroup['timeGroups'], function($a, $b) {
                if ($a['start_time'] === 'N/A') return 1;
                if ($b['start_time'] === 'N/A') return -1;
                return strcmp($a['start_time'], $b['start_time']);
            });
        }

        return response()->json([
            'current_schedule' => [
                'id' => $schedule->id,
                'status' => $schedule->status,
                'section_name' => $currentSection->name
            ],
            'shiftGroups' => $shiftGroups, // Back to shiftGroups but with timeGroups inside
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

    // Helper function to parse CSV data
    private function parseFamdayCsv()
    {
        $csvPath = database_path('seeders/data/famday.csv');
        
        if (!file_exists($csvPath)) {
            return [];
        }
        
        $csvData = array_map('str_getcsv', file($csvPath));
        $headers = array_shift($csvData);
        
        $accounts = [];
        foreach ($csvData as $row) {
            if (count($row) === count($headers)) {
                $accounts[] = array_combine($headers, $row);
            }
        }
        
        return $accounts;
    }

    public function checkFamdayAccount(Request $request)
    {
        $employeeNik = auth()->user()->nik;
        $accounts = $this->parseFamdayCsv();
        
        $hasAccount = false;
        foreach ($accounts as $account) {
            if (isset($account['nik']) && $account['nik'] == $employeeNik) {
                $hasAccount = true;
                break;
            }
        }
        
        return response()->json(['hasAccount' => $hasAccount]);
    }

    public function getFamdayData(Request $request)
    {
        $employeeNik = auth()->user()->nik;
        $accounts = $this->parseFamdayCsv();
        
        $famdayAccount = null;
        foreach ($accounts as $account) {
            if (isset($account['nik']) && $account['nik'] == $employeeNik) {
                $famdayAccount = $account;
                break;
            }
        }
        
        if (!$famdayAccount) {
            return response()->json(['error' => 'Account not found'], 404);
        }
        
        return response()->json([
            'nik' => $famdayAccount['nik'],
            'employee_name' => $famdayAccount['employee_name'],
            'username' => $famdayAccount['username'],
            'password' => $famdayAccount['password'],
        ]);
    }
}