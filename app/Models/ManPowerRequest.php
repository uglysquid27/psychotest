<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManPowerRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'sub_section_id',
        'shift_id',
        'date',
        'start_time',
        'end_time',
        'requested_amount',
        'male_count',
        'female_count',
        'status',
        'fulfilled_by',
        'reason', // Added
        'is_additional', // Added
    ];

    protected $casts = [
        'date' => 'date:Y-m-d', // Explicit format
        'is_additional' => 'boolean',
        'requested_amount' => 'integer',
        'male_count' => 'integer',
        'female_count' => 'integer',
    ];

    public function fulfilledBy()
    {
        return $this->belongsTo(User::class, 'fulfilled_by');
    }

    public function subSection()
    {
        return $this->belongsTo(SubSection::class);
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

        public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    // Helper method to check if this is an additional request
    public function isAdditional(): bool
    {
        return $this->is_additional;
    }

    // Scope for additional requests
    public function scopeAdditional($query)
    {
        return $query->where('is_additional', true);
    }

    // Scope for original requests
    public function scopeOriginal($query)
    {
        return $query->where('is_additional', false);
    }

    public static function hasExistingRequest($subSectionId, $shiftId, $date)
    {
        return static::where('sub_section_id', $subSectionId)
            ->where('shift_id', $shiftId)
            ->whereDate('date', $date)
            ->where('status', '!=', 'rejected')
            ->exists();
    }
}