<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;

class ResetEmployeeStatus extends Command
{
    protected $signature = 'employees:reset-status';
    protected $description = 'Reset all employee statuses to available';

    public function handle()
    {
        $updatedCount = Employee::where('status', '!=', 'available')
            ->update(['status' => 'available']);
            
        $this->info("Successfully reset {$updatedCount} employee statuses to 'available'");
        \Log::info("Employee statuses reset to available: {$updatedCount} employees affected");
        
        return 0;
    }
}