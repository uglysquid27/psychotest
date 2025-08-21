<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\SubSection;
use Illuminate\Database\Seeder;

class ForkliftEmployeeSubSectionSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            '10797' => 'CB DELIVERY',
            '10485' => 'CB DELIVERY',
            '10640' => 'CB DELIVERY',
            '11299' => 'CB DELIVERY',
            '10933' => 'CB DELIVERY',
            '11321' => 'RT DELIVERY',
            '10843' => 'RT DELIVERY',
            '10866' => 'CB DELIVERY',
            '11302' => 'CB DELIVERY',
            '10494' => 'CB DELIVERY',
            '10803' => 'CB DELIVERY',
            '11108' => 'CB DELIVERY',
            '10858' => 'RT DELIVERY',
            '10786' => 'RT DELIVERY',
            '11301' => 'CB FINISH GOOD',
            '10625' => 'CB FINISH GOOD',
            '10833' => 'RT FINISH GOOD',
            '10850' => 'RT FINISH GOOD',
            '10838' => 'CB FINISH GOOD',
            '10954' => 'CB FINISH GOOD',
            '10845' => 'RT FINISH GOOD',
            '10864' => 'RT FINISH GOOD',
            '10859' => 'CB FINISH GOOD',
            '10630' => 'CB FINISH GOOD',
            '10873' => 'RT FINISH GOOD',
            '10855' => 'RT FINISH GOOD',
            '10818' => 'CB FINISH GOOD',
            '10726' => 'CB FINISH GOOD',
            '10871' => 'RT FINISH GOOD',
            '11319' => 'RT FINISH GOOD',
            '10828' => 'CB FINISH GOOD & INSPEKSI',
            '10781' => 'CB FINISH GOOD & INSPEKSI',
            '10616' => 'CB FINISH GOOD & INSPEKSI',
            '10824' => 'CB FINISH GOOD & INSPEKSI',
            '10484' => 'CB RMPM',
            '11324' => 'CB RMPM',
            '10612' => 'CB RMPM',
            '10798' => 'CB RMPM',
            '10576' => 'CB FINISH GOOD',
            '10804' => 'CB FINISH GOOD',
            '10821' => 'CB FINISH GOOD',
        ];

        foreach ($employees as $nik => $subSectionName) {
            $employee   = Employee::where('nik', $nik)->first();
            $subSection = SubSection::where('name', $subSectionName)->first();

            // We only continue if both exist
            if ($employee && $subSection) {
                // Avoid duplicates
                $exists = $employee->subSections()
                    ->where('sub_section_id', $subSection->id)
                    ->exists();

                if (! $exists) {
                    // attach with optional pivot value (e.g. dedicated = false)
                    $employee->subSections()->attach($subSection->id, [
                        'dedicated' => false,
                    ]);
                }
            }
        }
    }
}
