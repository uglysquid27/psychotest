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
        'man_power_request_id',
        'date',
        'status',
        'rejection_reason',
        'visibility'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    // Relationship to Employee model
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Relationship to SubSection model
    public function subSection()
    {
        return $this->belongsTo(SubSection::class);
    }

    // --- CRITICAL: Define the relationship to ManPowerRequest model ---
    public function manPowerRequest()
    {
        return $this->belongsTo(ManPowerRequest::class);
    }
    public function lunchCoupon()
{
    return $this->hasOne(LunchCoupon::class);
}
}
