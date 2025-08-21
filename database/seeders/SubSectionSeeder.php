<?php

namespace Database\Seeders;

use App\Models\Section;
use App\Models\SubSection;
use Illuminate\Database\Seeder;

class SubSectionSeeder extends Seeder
{
    public function run(): void
    {
        $sections = Section::all();

        $subSectionsData = [
            'Finished goods' => [
                'Leader Finished goods',
                'Admin Finished goods',
                'Penandaan',
                'Putway',
                'Checker SAP',
                'Dispatcer',
            ],
            'Delivery' => [
                'Leader Delivery',
                'Dispatcer',
                'Picker',
                'Admin Delivery',
                'Checker SAP',
            ],
            'Loader' => [
                'Loader',
                'Bongkar Material/Cap/Juice'
            ],
            'RM/PM' => [
                'Admin RM/PM',
                'Checker',
                'Buffer Room',
                'Penimbangan',
                'Bongkar Material/Cap/Juice'
            ],
            'Operator Forklift' => [
                // 'Operator Forklift',
                // 👉 new forklift sub-sections based on your new data
                'CB DELIVERY',
                'RT DELIVERY',
                'CB FINISH GOOD',
                'RT FINISH GOOD',
                'CB FINISH GOOD & INSPEKSI',
                'CB RMPM'
            ],
            'Inspeksi' => [
                'Leader Inspeksi',
                'Admin Inspeksi',
                'Camera Offline',
                'Meja',
                'Shrink',
                'Cluster',
                'Stickering',
                'Rework',
                'Repallet',
                'Pembuatan Partisi',
                'Cleaning Pallet',
                'Leader Meja',
            ],
            'Produksi' => [
                'Reject',
                'OC1',
                'OC2'
            ]
        ];

        foreach ($sections as $section) {
            if (isset($subSectionsData[$section->name])) {
                foreach ($subSectionsData[$section->name] as $subSectionName) {
                    SubSection::firstOrCreate([
                        'section_id' => $section->id,
                        'name'       => $subSectionName
                    ]);
                }
            }
        }
    }
}
