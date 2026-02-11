<?php

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
        'rows',
        'columns',
        'time_per_column',
        'difficulty',
        'duration_minutes',
        'started_at',
        'finished_at',
        'time_taken_seconds',
        'status',
        'notes',
        'kraepelin_setting_id'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'test_data' => 'array',
        'rows' => 'integer',
        'columns' => 'integer',
        'time_per_column' => 'integer',
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
     * Get the setting used for this test
     */
    public function setting()
    {
        return $this->belongsTo(KraepelinSetting::class, 'kraepelin_setting_id');
    }

    /**
     * Get total questions
     */
    public function getTotalQuestionsAttribute()
    {
        return ($this->rows - 1) * $this->columns;
    }

    /**
     * Get total time in seconds
     */
    public function getTotalTimeAttribute()
    {
        return $this->columns * $this->time_per_column;
    }

    /**
     * Get formatted total time
     */
    public function getTotalTimeFormattedAttribute()
    {
        $minutes = floor($this->total_time / 60);
        $seconds = $this->total_time % 60;
        
        if ($minutes > 0) {
            return "{$minutes} menit {$seconds} detik";
        }
        return "{$seconds} detik";
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

        $expiredAt = $this->started_at->addSeconds($this->total_time);
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

        $totalQuestions = $this->total_questions;
        $answered = $this->result->correct_answers + $this->result->wrong_answers;
        
        return $totalQuestions > 0 ? round(($answered / $totalQuestions) * 100, 2) : 0;
    }

    /**
     * Get difficulty label
     */
    public function getDifficultyLabelAttribute()
    {
        $labels = [
            'mudah' => 'Mudah',
            'sedang' => 'Sedang',
            'sulit' => 'Sulit',
            'custom' => 'Kustom'
        ];
        
        return $labels[$this->difficulty] ?? $this->difficulty;
    }
}