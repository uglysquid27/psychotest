<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'sub_section_id',
        'line',
        'man_power_request_id',
        'date',
        'status',
        'rejection_reason',
        'visibility'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function subSection()
    {
        return $this->belongsTo(SubSection::class);
    }

    public function manPowerRequest()
    {
        return $this->belongsTo(ManPowerRequest::class);
    }
    
    public function lunchCoupon()
    {
        return $this->hasOne(LunchCoupon::class);
    }
    
    // New method to handle line assignment
    public static function assignLineNumbers($schedules, $lineConfig)
    {
        $lineGroups = [];
        
        foreach ($lineConfig as $config) {
            $lineGroups[$config['line_number']] = $config['employee_count'];
        }
        
        $assignedSchedules = [];
        $lineCounters = array_fill_keys(array_keys($lineGroups), 0);
        
        foreach ($schedules as $schedule) {
            foreach ($lineGroups as $lineNumber => $maxCount) {
                if ($lineCounters[$lineNumber] < $maxCount) {
                    $schedule->line = $lineNumber;
                    $lineCounters[$lineNumber]++;
                    $assignedSchedules[] = $schedule;
                    break;
                }
            }
        }
        
        return $assignedSchedules;
    }
    
    // Method to check if line is full
    public static function isLineFull($manPowerRequestId, $date, $lineNumber, $lineConfig)
    {
        $maxForLine = $lineConfig[$lineNumber] ?? 0;
        $currentCount = self::where('man_power_request_id', $manPowerRequestId)
                           ->where('date', $date)
                           ->where('line', $lineNumber)
                           ->count();
                           
        return $currentCount >= $maxForLine;
    }
}