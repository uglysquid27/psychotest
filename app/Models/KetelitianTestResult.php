<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KetelitianTestResult extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'ketelitian_test_results';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'score',
        'total_questions',
        'correct_answers',
        'wrong_answers',
        'unanswered',
        'time_elapsed',
        'percentage',
        'answers',
        'questions',
        'performance_by_question',
        'accuracy',
        'completion_rate',
        'average_time_per_question',
        'test_version',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'answers' => 'array',
        'questions' => 'array',
        'performance_by_question' => 'array',
        'percentage' => 'decimal:2',
        'accuracy' => 'decimal:2',
        'completion_rate' => 'decimal:2',
        'average_time_per_question' => 'decimal:2',
        'time_elapsed' => 'integer',
        'score' => 'integer',
        'total_questions' => 'integer',
        'correct_answers' => 'integer',
        'wrong_answers' => 'integer',
        'unanswered' => 'integer',
    ];

    /**
     * Get the user that owns the test result.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate accuracy based on correct answers
     */
    public function getAccuracyAttribute($value)
    {
        if ($value) {
            return $value;
        }
        
        if ($this->correct_answers + $this->wrong_answers > 0) {
            return ($this->correct_answers / ($this->correct_answers + $this->wrong_answers)) * 100;
        }
        
        return 0;
    }

    /**
     * Calculate completion rate
     */
    public function getCompletionRateAttribute($value)
    {
        if ($value) {
            return $value;
        }
        
        if ($this->total_questions > 0) {
            return (($this->correct_answers + $this->wrong_answers) / $this->total_questions) * 100;
        }
        
        return 0;
    }

    /**
     * Calculate average time per question
     */
    public function getAverageTimePerQuestionAttribute($value)
    {
        if ($value) {
            return $value;
        }
        
        $answered = $this->correct_answers + $this->wrong_answers;
        if ($answered > 0 && $this->time_elapsed > 0) {
            return $this->time_elapsed / $answered;
        }
        
        return null;
    }

    /**
     * Get performance level based on score
     */
    public function getPerformanceLevelAttribute(): string
    {
        $percentage = $this->percentage;
        
        if ($percentage >= 90) {
            return 'Excellent';
        } elseif ($percentage >= 80) {
            return 'Very Good';
        } elseif ($percentage >= 70) {
            return 'Good';
        } elseif ($percentage >= 60) {
            return 'Fair';
        } else {
            return 'Needs Improvement';
        }
    }

    /**
     * Get performance level in Indonesian
     */
    public function getPerformanceLevelIdAttribute(): string
    {
        $percentage = $this->percentage;
        
        if ($percentage >= 90) {
            return 'Luar Biasa';
        } elseif ($percentage >= 80) {
            return 'Sangat Baik';
        } elseif ($percentage >= 70) {
            return 'Baik';
        } elseif ($percentage >= 60) {
            return 'Cukup';
        } else {
            return 'Perlu Perbaikan';
        }
    }

    /**
     * Get formatted time elapsed
     */
    public function getFormattedTimeElapsedAttribute(): string
    {
        $minutes = floor($this->time_elapsed / 60);
        $seconds = $this->time_elapsed % 60;
        
        if ($minutes > 0) {
            return sprintf('%d menit %d detik', $minutes, $seconds);
        }
        
        return sprintf('%d detik', $seconds);
    }

    /**
     * Get test date in human readable format
     */
    public function getTestDateAttribute(): string
    {
        return $this->created_at->translatedFormat('d F Y');
    }

    /**
     * Get test time in human readable format
     */
    public function getTestTimeAttribute(): string
    {
        return $this->created_at->translatedFormat('H:i');
    }

    /**
     * Scope for filtering by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for filtering by date range
     */
    public function scopeDateRange($query, $startDate, $endDate = null)
    {
        $query->whereDate('created_at', '>=', $startDate);
        
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        
        return $query;
    }

    /**
     * Scope for filtering by performance level
     */
    public function scopePerformanceLevel($query, $level)
    {
        $ranges = [
            'excellent' => [90, 100],
            'very_good' => [80, 89.99],
            'good' => [70, 79.99],
            'fair' => [60, 69.99],
            'needs_improvement' => [0, 59.99],
        ];
        
        if (isset($ranges[$level])) {
            return $query->whereBetween('percentage', $ranges[$level]);
        }
        
        return $query;
    }

    /**
     * Get statistics for a user
     */
    public static function getUserStatistics($userId): array
    {
        $results = self::where('user_id', $userId)->get();
        
        if ($results->isEmpty()) {
            return [
                'total_tests' => 0,
                'average_score' => 0,
                'average_time' => 0,
                'best_score' => 0,
                'last_test_date' => null,
            ];
        }
        
        return [
            'total_tests' => $results->count(),
            'average_score' => round($results->avg('score'), 2),
            'average_percentage' => round($results->avg('percentage'), 2),
            'average_time' => round($results->avg('time_elapsed'), 2),
            'best_score' => $results->max('score'),
            'best_percentage' => $results->max('percentage'),
            'last_test_date' => $results->last()->created_at->format('Y-m-d'),
            'performance_trend' => $results->pluck('percentage')->toArray(),
        ];
    }

    /**
     * Prepare performance data for charts
     */
    public function getPerformanceDataAttribute(): array
    {
        $performanceByQuestion = $this->performance_by_question ?? [];
        
        if (empty($performanceByQuestion)) {
            // Generate from answers and questions if not stored
            $answers = $this->answers ?? [];
            $questions = $this->questions ?? [];
            
            if (!empty($answers) && !empty($questions)) {
                $performanceByQuestion = [];
                foreach ($questions as $index => $question) {
                    $userAnswer = $answers[$index] ?? null;
                    $isCorrect = ($userAnswer === $question['answer']);
                    
                    $performanceByQuestion[] = [
                        'question_number' => $index + 1,
                        'correct' => $isCorrect,
                        'user_answer' => $userAnswer,
                        'correct_answer' => $question['answer'],
                        'left_text' => $question['left'],
                        'right_text' => $question['right'],
                    ];
                }
            }
        }
        
        return $performanceByQuestion;
    }

    /**
     * Get the number of questions answered correctly by question number
     */
    public function getCorrectByQuestionAttribute(): array
    {
        $data = $this->performance_data;
        $correctByQuestion = [];
        
        foreach ($data as $item) {
            $correctByQuestion[] = $item['correct'] ? 1 : 0;
        }
        
        return $correctByQuestion;
    }

    /**
     * Generate a summary report
     */
    public function getSummaryReportAttribute(): array
    {
        return [
            'user_id' => $this->user_id,
            'score' => $this->score,
            'total_questions' => $this->total_questions,
            'percentage' => $this->percentage,
            'accuracy' => $this->accuracy,
            'completion_rate' => $this->completion_rate,
            'time_elapsed' => $this->formatted_time_elapsed,
            'performance_level' => $this->performance_level_id,
            'test_date' => $this->test_date,
            'test_time' => $this->test_time,
            'correct_answers' => $this->correct_answers,
            'wrong_answers' => $this->wrong_answers,
            'unanswered' => $this->unanswered,
        ];
    }
}