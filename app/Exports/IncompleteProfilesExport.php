<?php
// app/Exports/IncompleteProfilesExport.php

namespace App\Exports;

use App\Models\Employee;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class IncompleteProfilesExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = Employee::with(['subSections.section'])
            ->where(function($q) {
                $q->whereNull('kecamatan')
                  ->orWhereNull('kelurahan')
                  ->orWhere('kecamatan', '')
                  ->orWhere('kelurahan', '');
            })
            ->where('status', '!=', 'deactivated')
            ->whereNull('deactivated_at');

        // Apply filters
        if (!empty($this->filters['section']) && $this->filters['section'] !== 'All') {
            $sectionName = $this->filters['section'];
            $query->whereHas('subSections.section', function ($q) use ($sectionName) {
                $q->where('name', $sectionName);
            });
        }

        if (!empty($this->filters['sub_section']) && $this->filters['sub_section'] !== 'All') {
            $subSectionName = $this->filters['sub_section'];
            $query->whereHas('subSections', function ($q) use ($subSectionName) {
                $q->where('name', $subSectionName);
            });
        }

        if (!empty($this->filters['search'])) {
            $searchTerm = $this->filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('nik', 'like', '%' . $searchTerm . '%');
            });
        }

        return $query->orderBy('name')->get();
    }

    public function headings(): array
    {
        return [
            'NIK',
            'Nama Karyawan',
            'Section',
            'Subsection',
            'Kecamatan',
            'Kelurahan',
            'Status Kelengkapan Data'
        ];
    }

    public function map($employee): array
    {
        // Get section names
        $sectionNames = 'Tidak ada section';
        if ($employee->subSections && $employee->subSections->count() > 0) {
            $sections = new \Illuminate\Support\Collection();
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

        return [
            $employee->nik,
            $employee->name,
            $sectionNames,
            $subSectionNames,
            $employee->kecamatan ?? 'Tidak diisi',
            $employee->kelurahan ?? 'Tidak diisi',
            $completionStatus
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as bold text
            1 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'color' => ['argb' => 'FFE0E0E0']
                ]
            ],
        ];
    }
}