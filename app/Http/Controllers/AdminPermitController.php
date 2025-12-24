<?php

namespace App\Http\Controllers;

use App\Models\Permit;
use App\Models\Employee;
use Illuminate\Http\Request;
use App\Models\ScheduleChangeRequest;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminPermitController extends Controller
{
    /**
     * Menampilkan daftar semua permintaan izin untuk admin.
     * Dapat memfilter berdasarkan status (pending, accepted, rejected).
     */
    public function index(Request $request): Response
    {
        // Mendapatkan filter status dari request, default ke 'pending' jika tidak ada
        $filterStatus = $request->input('status', 'pending');

        // Query untuk permits
        $permitQuery = Permit::with('employee')
                       ->orderBy('created_at', 'desc');

        if ($filterStatus && $filterStatus !== 'all') {
            $permitQuery->where('status', $filterStatus);
        }

        $permits = $permitQuery->paginate(10);

        // Query untuk schedule change requests
        $scheduleChangeQuery = ScheduleChangeRequest::with(['employee', 'schedule.subSection.section', 'schedule.employee'])
                                           ->orderBy('created_at', 'desc');

        if ($filterStatus && $filterStatus !== 'all') {
            $scheduleChangeQuery->where('approval_status', $filterStatus);
        }

        $scheduleChangeRequests = $scheduleChangeQuery->paginate(10);

        // Count total pending requests
        $totalPendingCount = [
            'permits' => Permit::where('status', 'pending')->count(),
            'schedule_changes' => ScheduleChangeRequest::where('approval_status', 'pending')->count()
        ];

        Log::info("Admin mengakses daftar izin dan perubahan jadwal dengan filter status: " . $filterStatus);

        return Inertia::render('Permits/AdminIndex', [
            'permits' => $permits,
            'scheduleChangeRequests' => $scheduleChangeRequests,
            'filters' => ['status' => $filterStatus],
            'totalPendingCount' => $totalPendingCount,
        ]);
    }

    /**
     * Memperbarui status permintaan izin (terima atau tolak).
     */
     public function respond(Request $request, Permit $permit)
    {
        try {
            $validated = $request->validate([
                'status' => ['required', 'in:pending,approved,rejected,cancelled'],
                'admin_notes' => ['nullable', 'string', 'max:500'],
            ], [
                'status.required' => 'Status persetujuan wajib diisi.',
                'status.in' => 'Status yang dipilih tidak valid. Harap pilih dari pending, approved, rejected, atau cancelled.',
                'admin_notes.string' => 'Catatan admin harus berupa teks.',
                'admin_notes.max' => 'Catatan admin tidak boleh lebih dari 500 karakter.',
            ]);

            DB::transaction(function () use ($permit, $validated) {
                $permit->status = $validated['status'];
                $permit->admin_notes = $validated['admin_notes'] ?? null;
                $permit->save();

                // Logika tambahan jika izin ditolak atau diterima
                $employee = $permit->employee;
                if ($employee) {
                    if ($permit->status === 'rejected') {
                        $employee->cuti = 'no';
                        $employee->status = 'available';
                        Log::info("Izin ID " . $permit->id . " ditolak. Status karyawan " . $employee->nik . " diatur ke available.");
                    } else if ($permit->status === 'approved') {
                        $employee->cuti = 'yes';
                        $employee->status = 'on leave';
                        Log::info("Izin ID " . $permit->id . " diterima. Status karyawan " . $employee->nik . " diatur ke on leave.");
                    }
                    $employee->save();
                } else {
                    Log::warning("Tidak dapat menemukan karyawan untuk izin ID: " . $permit->id . ". Status karyawan tidak diperbarui.");
                }
            });

            Log::info("Status izin ID " . $permit->id . " berhasil diperbarui menjadi: " . $validated['status']);
            return back()->with('success', 'Status izin berhasil diperbarui.');

        } catch (ValidationException $e) {
            Log::error('Validation Error responding to permit: ' . json_encode($e->errors()), ['exception' => $e]);
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Error responding to permit: ' . $e->getMessage(), ['exception' => $e, 'permit_id' => $permit->id]);
            return back()->with('error', 'Terjadi kesalahan tak terduga. Mohon coba lagi.');
        }
    }

    public function respondScheduleChange(Request $request, ScheduleChangeRequest $scheduleChange)
{
    try {
        $validated = $request->validate([
            'approval_status' => ['required', 'in:pending,approved,rejected'],
            'approval_notes' => ['nullable', 'string', 'max:500'],
        ], [
            'approval_status.required' => 'Status persetujuan wajib diisi.',
            'approval_status.in' => 'Status yang dipilih tidak valid. Harap pilih dari pending, approved, atau rejected.',
            'approval_notes.string' => 'Catatan persetujuan harus berupa teks.',
            'approval_notes.max' => 'Catatan persetujuan tidak boleh lebih dari 500 karakter.',
        ]);

        DB::transaction(function () use ($scheduleChange, $validated) {
            $oldStatus = $scheduleChange->approval_status;
            $scheduleChange->approval_status = $validated['approval_status'];
            $scheduleChange->approval_notes = $validated['approval_notes'] ?? null;
            $scheduleChange->approved_by = auth()->id();
            $scheduleChange->approved_at = now();
            $scheduleChange->save();

            // Update schedule status if request is approved
            if ($validated['approval_status'] === 'approved') {
                $schedule = $scheduleChange->schedule;
                if ($schedule) {
                    $schedule->status = $scheduleChange->requested_status;
                    $schedule->save();
                    Log::info("Permintaan perubahan jadwal ID " . $scheduleChange->id . " disetujui. Jadwal ID " . $schedule->id . " diupdate ke status: " . $scheduleChange->requested_status);
                    
                    // Also update employee status based on the new schedule status
                    $employee = $schedule->employee;
                    if ($employee) {
                        if ($scheduleChange->requested_status === 'accepted') {
                            $employee->status = 'available';
                            Log::info("Status karyawan " . $employee->nik . " diatur ke available karena jadwal diterima.");
                        } elseif ($scheduleChange->requested_status === 'rejected') {
                            $employee->status = 'on leave';
                            Log::info("Status karyawan " . $employee->nik . " diatur ke on leave karena jadwal ditolak.");
                        }
                        $employee->save();
                    }
                }
            } else if ($validated['approval_status'] === 'rejected') {
                // If schedule change request is rejected, nothing changes in the schedule
                Log::info("Permintaan perubahan jadwal ID " . $scheduleChange->id . " ditolak. Jadwal tetap pada status sebelumnya.");
            }
        });

        Log::info("Status permintaan perubahan jadwal ID " . $scheduleChange->id . " berhasil diperbarui menjadi: " . $validated['approval_status']);
        return back()->with('success', 'Status permintaan perubahan jadwal berhasil diperbarui.');

    } catch (ValidationException $e) {
        Log::error('Validation Error responding to schedule change: ' . json_encode($e->errors()), ['exception' => $e]);
        return back()->withErrors($e->errors())->withInput();
    } catch (\Exception $e) {
        Log::error('Error responding to schedule change: ' . $e->getMessage(), ['exception' => $e, 'schedule_change_id' => $scheduleChange->id]);
        return back()->with('error', 'Terjadi kesalahan tak terduga. Mohon coba lagi.');
    }
}
}
