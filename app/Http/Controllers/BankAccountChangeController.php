<?php

namespace App\Http\Controllers;

use App\Models\BankAccountChangeLog;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class BankAccountChangeController extends Controller
{
    // Employee side - show form
    public function create()
    {
        /** @var Employee $employee */
        $employee = auth()->user();

        // Check if profile is complete
        $incompleteProfile = empty($employee->kelurahan) || empty($employee->kecamatan);

        // Check for pending request
        $pendingChange = BankAccountChangeLog::where('nik', $employee->nik)
            ->where('status', 'pending')
            ->first();

        // Build full address from components
        $addressParts = [];
        if ($employee->street)
            $addressParts[] = $employee->street;
        if ($employee->rt && $employee->rw)
            $addressParts[] = "RT {$employee->rt}/RW {$employee->rw}";
        if ($employee->kelurahan)
            $addressParts[] = $employee->kelurahan;
        if ($employee->kecamatan)
            $addressParts[] = $employee->kecamatan;
        if ($employee->kabupaten_kota)
            $addressParts[] = $employee->kabupaten_kota;
        if ($employee->provinsi)
            $addressParts[] = $employee->provinsi;
        if ($employee->kode_pos)
            $addressParts[] = $employee->kode_pos;

        $fullAddress = implode(', ', array_filter($addressParts));

        // Get employee's section and sub-section
        $section = 'N/A';
        $subSection = 'N/A';
        
        // Load the subSections relationship with section
        $employee->load('subSections.section');
        
        // Get the first dedicated sub-section or any sub-section
        $dedicatedSubSection = $employee->subSections->firstWhere('pivot.dedicated', true);
        $anySubSection = $employee->subSections->first();
        
        $selectedSubSection = $dedicatedSubSection ?? $anySubSection;
        
        if ($selectedSubSection) {
            $subSection = $selectedSubSection->name;
            $section = $selectedSubSection->section->name ?? 'N/A';
        }

        return inertia('BankAccountChange/Create', [
            'employee' => [
                'nik' => $employee->nik,
                'name' => $employee->name,
                'section' => $section,
                'sub_section' => $subSection, // Added sub-section
                'address' => $fullAddress ?: ($employee->address ?? ''),
                'placement' => 'PT. Amerta Indah Otsuka',
                'email' => $employee->email,
                'bank_account' => $employee->bank_account,
                'bank_name' => $employee->bank_name,
                'has_bank_account' => !empty($employee->bank_account) && !empty($employee->bank_name),
            ],
            'pendingChange' => $pendingChange,
            'incompleteProfile' => $incompleteProfile,
        ]);
    }

    public function store(Request $request)
    {
        /** @var Employee $employee */
        $employee = auth()->user();

        // Check if profile is complete
        if (empty($employee->kelurahan) || empty($employee->kecamatan)) {
            return back()->with('error', 'Harap lengkapi data profil (kelurahan dan kecamatan) terlebih dahulu sebelum mengajukan perubahan rekening.');
        }

        $request->validate([
            'new_account_number' => 'required|string|max:50',
            'new_bank' => 'required|string|max:100',
            'signature' => 'required|string', // Signature is now required
        ]);

        // Check for existing pending request
        $existingChange = BankAccountChangeLog::where('nik', $employee->nik)
            ->where('status', 'pending')
            ->first();

        if ($existingChange) {
            return back()->with('error', 'Anda sudah memiliki permintaan perubahan rekening yang sedang diproses.');
        }

        // Create change log with signature
        BankAccountChangeLog::create([
            'nik' => $employee->nik,
            'old_account_number' => $employee->bank_account,
            'old_bank' => $employee->bank_name,
            'new_account_number' => $request->new_account_number,
            'new_bank' => $request->new_bank,
            'status' => 'pending',
            'requested_by' => $employee->id,
            'signature_data' => $request->signature,
            'signed_at' => now(),
        ]);

        return redirect()->route('employee.dashboard')
            ->with('success', 'Permintaan perubahan rekening telah diajukan beserta tanda tangan digital.');
    }

    // Admin side - list all requests
    public function index(Request $request)
    {
        $query = BankAccountChangeLog::with(['employee', 'requester', 'approver'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nik', 'like', "%{$search}%")
                    ->orWhere('new_account_number', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $changes = $query->paginate(20);

        return inertia('BankAccountChange/Index', [
            'changes' => $changes,
            'filters' => $request->only(['search', 'status']),
            'statusOptions' => [
                'pending' => 'Menunggu',
                'approved' => 'Disetujui',
                'rejected' => 'Ditolak',
            ],
        ]);
    }

    // Admin side - show details
    public function show(BankAccountChangeLog $bankAccountChangeLog)
    {
        // Load employee with their sub-sections and section
        $bankAccountChangeLog->load([
            'employee.subSections.section',
            'requester',
            'approver'
        ]);

        // Get section and sub-section info for the employee
        $section = 'N/A';
        $subSection = 'N/A';
        
        $dedicatedSubSection = $bankAccountChangeLog->employee->subSections->firstWhere('pivot.dedicated', true);
        $anySubSection = $bankAccountChangeLog->employee->subSections->first();
        
        $selectedSubSection = $dedicatedSubSection ?? $anySubSection;
        
        if ($selectedSubSection) {
            $subSection = $selectedSubSection->name;
            $section = $selectedSubSection->section->name ?? 'N/A';
        }

        // Add section and sub-section to the employee object
        $bankAccountChangeLog->employee->section = $section;
        $bankAccountChangeLog->employee->sub_section = $subSection;

        return inertia('BankAccountChange/Show', [
            'changeLog' => $bankAccountChangeLog,
        ]);
    }

    // Admin side - update status
    public function updateStatus(Request $request, BankAccountChangeLog $bankAccountChangeLog)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string|max:500',
        ]);

        // If approved, update employee's bank info
        if ($request->status === 'approved') {
            $employee = Employee::where('nik', $bankAccountChangeLog->nik)->first();
            if ($employee) {
                $employee->update([
                    'bank_account' => $bankAccountChangeLog->new_account_number,
                    'bank_name' => $bankAccountChangeLog->new_bank,
                ]);
            }

            $bankAccountChangeLog->update([
                'status' => 'approved',
                'remarks' => $request->remarks,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
        } else {
            $bankAccountChangeLog->update([
                'status' => 'rejected',
                'remarks' => $request->remarks,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
        }

        return back()->with('success', 'Status permintaan berhasil diperbarui.');
    }

    // Generate PDF based on Excel template
    public function generatePdf(BankAccountChangeLog $bankAccountChangeLog)
    {
        // Only generate PDF for approved changes
        if ($bankAccountChangeLog->status !== 'approved') {
            abort(403, 'Hanya perubahan yang sudah disetujui yang dapat dicetak.');
        }

        // Load employee with section info for PDF
        $bankAccountChangeLog->load([
            'employee.subSections.section'
        ]);

        // Get section info for PDF
        $section = 'N/A';
        $subSection = 'N/A';
        
        $dedicatedSubSection = $bankAccountChangeLog->employee->subSections->firstWhere('pivot.dedicated', true);
        $anySubSection = $bankAccountChangeLog->employee->subSections->first();
        
        $selectedSubSection = $dedicatedSubSection ?? $anySubSection;
        
        if ($selectedSubSection) {
            $subSection = $selectedSubSection->name;
            $section = $selectedSubSection->section->name ?? 'N/A';
        }

        $data = [
            'changeLog' => $bankAccountChangeLog,
            'section' => $section,
            'sub_section' => $subSection,
            'date' => Carbon::now()->locale('id-ID')->translatedFormat('d F Y'),
        ];

        $pdf = PDF::loadView('pdf.bank-account-statement', $data);
        $pdf->setPaper('A4', 'portrait');

        $filename = "Pernyataan_Ganti_Rekening_{$bankAccountChangeLog->nik}_{$bankAccountChangeLog->employee->name}.pdf";

        return $pdf->download($filename);
    }

    // Get employee's change history
    public function employeeHistory()
    {
        /** @var Employee $employee */
        $employee = auth()->user();

        $changes = BankAccountChangeLog::where('nik', $employee->nik)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return inertia('BankAccountChange/History', [
            'changes' => $changes,
        ]);
    }
}