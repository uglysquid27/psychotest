<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KraepelinTestResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kraepelin_test_id',
        'score',
        'total_questions',
        'correct_answers',
        'wrong_answers',
        'unanswered',
        'time_elapsed',
        'percentage',
        'test_data',
        'answers',
        'row_performance',
        'column_performance',
        'rows',
        'columns',
        'difficulty',
    ];

    protected $casts = [
        'answers' => 'array',
        'test_data' => 'array',
        'row_performance' => 'array',
        'column_performance' => 'array',
        'percentage' => 'decimal:2',
        'rows' => 'integer',
        'columns' => 'integer'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function test()
    {
        return $this->belongsTo(KraepelinTest::class, 'kraepelin_test_id');
    }

    /**
     * Get the formatted time elapsed
     */
    public function getTimeElapsedFormattedAttribute()
    {
        $minutes = floor($this->time_elapsed / 60);
        $seconds = $this->time_elapsed % 60;
        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Get speed (questions per minute)
     */
    public function getSpeedAttribute()
    {
        if ($this->time_elapsed > 0) {
            return round(($this->correct_answers + $this->wrong_answers) / ($this->time_elapsed / 60), 1);
        }
        return 0;
    }

    /**
     * Get total time allocated
     */
    public function getTotalTimeAllocatedAttribute()
    {
        return $this->columns * 15; // Default 15 seconds per column
    }

    /**
     * Get time usage percentage
     */
    public function getTimeUsagePercentageAttribute()
    {
        if ($this->total_time_allocated > 0) {
            return min(100, ($this->time_elapsed / $this->total_time_allocated) * 100);
        }
        return 0;
    }

    /**
     * Get consistency score
     */
    public function getConsistencyScoreAttribute()
    {
        if (!$this->row_performance || count($this->row_performance) === 0) {
            return 0;
        }

        $max = max($this->row_performance);
        $min = min($this->row_performance);
        $range = $max - $min;
        
        // Higher score = more consistent (smaller range)
        $consistency = 100 - ($range / $max * 100);
        return max(0, min(100, round($consistency)));
    }

    /**
     * Get fatigue index
     */
    public function getFatigueIndexAttribute()
    {
        if (!$this->row_performance || count($this->row_performance) < 2) {
            return 0;
        }

        // Compare first half vs second half of rows (fatigue typically shows in later rows)
        $midpoint = floor(count($this->row_performance) / 2);
        $firstHalf = array_slice($this->row_performance, 0, $midpoint);
        $secondHalf = array_slice($this->row_performance, $midpoint);
        
        $avgFirst = array_sum($firstHalf) / count($firstHalf);
        $avgSecond = array_sum($secondHalf) / count($secondHalf);
        
        // Calculate percentage decrease
        $decrease = $avgFirst > 0 ? (($avgFirst - $avgSecond) / $avgFirst) * 100 : 0;
        return max(0, min(100, round($decrease)));
    }

    /**
     * Get overall performance score
     */
    public function getOverallPerformanceAttribute()
    {
        $accuracy = $this->percentage;
        $completion = $this->total_questions > 0 ? 
            (($this->correct_answers + $this->wrong_answers) / $this->total_questions) * 100 : 0;
        $consistency = $this->consistency_score;
        
        // Weighted score: 50% accuracy, 30% completion, 20% consistency
        $overall = ($accuracy * 0.5) + ($completion * 0.3) + ($consistency * 0.2);
        return round($overall);
    }

    /**
     * Get performance level (Excellent, Good, Average, Poor)
     */
    public function getPerformanceLevelAttribute()
    {
        $score = $this->overall_performance;
        
        if ($score >= 85) return 'Excellent';
        if ($score >= 70) return 'Good';
        if ($score >= 50) return 'Average';
        return 'Poor';
    }

    /**
     * Get performance level color
     */
    public function getPerformanceLevelColorAttribute()
    {
        $level = $this->performance_level;
        
        switch ($level) {
            case 'Excellent': return 'success';
            case 'Good': return 'info';
            case 'Average': return 'warning';
            case 'Poor': return 'danger';
            default: return 'secondary';
        }
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