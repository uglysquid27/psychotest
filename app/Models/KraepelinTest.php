<?php

// app/Models/KraepelinTest.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KraepelinTest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'user_id',
        'test_data',
        'duration_minutes',
        'started_at',
        'finished_at',
        'time_taken_seconds',
        'status',
        'notes'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'test_data' => 'array',
        'duration_minutes' => 'integer',
        'time_taken_seconds' => 'integer'
    ];

    protected $dates = [
        'started_at',
        'finished_at',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    /**
     * Get the employee that took this test
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who administered this test
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the test result
     */
    public function result()
    {
        return $this->hasOne(KraepelinTestResult::class);
    }

    /**
     * Scope for active tests
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for completed tests
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Get duration in human readable format
     */
    public function getDurationFormattedAttribute()
    {
        if (!$this->time_taken_seconds) {
            return null;
        }

        $minutes = floor($this->time_taken_seconds / 60);
        $seconds = $this->time_taken_seconds % 60;
        
        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Check if test is expired
     */
    public function getIsExpiredAttribute()
    {
        if ($this->status !== 'active') {
            return false;
        }

        $expiredAt = $this->started_at->addMinutes($this->duration_minutes);
        return now()->gt($expiredAt);
    }

    /**
     * Get completion percentage
     */
    public function getCompletionPercentageAttribute()
    {
        if (!$this->result) {
            return 0;
        }

        $totalQuestions = 20 * 40; // 800 questions
        return round(($this->result->total_answered / $totalQuestions) * 100, 2);
    }
}