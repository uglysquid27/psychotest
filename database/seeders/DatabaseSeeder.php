<?php

namespace Database\Seeders;

use App\Models\Section;
use App\Models\SubSection;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // Core Data (no external dependencies)
            UserSeeder::class,
            ShiftSeeder::class,
            SectionSeeder::class,

            // Dependent Data (order matters)
            SubSectionSeeder::class, // Depends on Sections
            EmployeeSeeder::class,   // Depends on nothing initially, but used by others
            WorkloadSeeder::class,

            // Junction table seeder
            EmployeeSubSectionSeeder::class, // Depends on Employees and SubSections
            ForkliftEmployeeSubSectionSeeder::class,

            // Main application data
            // ManPowerRequestSeeder::class, // Depends on SubSections and Shifts
            // ScheduleSeeder::class,        // Depends on Employees, SubSections, and ManPowerRequests
        ]);
    }
}
