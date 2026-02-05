<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeretQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'sequence',
        'answer',
        'pattern_type',
        'difficulty_level',
        'is_active',
        'explanation'
    ];

    protected $casts = [
        'sequence' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get questions for the test (random, active only)
     */
    public static function getTestQuestions($limit = 5)
    {
        return self::where('is_active', true)
            ->inRandomOrder()
            ->limit($limit)
            ->get()
            ->map(function ($question) {
                return [
                    'id' => $question->id,
                    'sequence' => $question->sequence,
                    'answer' => $question->answer,
                    'pattern_type' => $question->pattern_type,
                    'explanation' => $question->explanation
                ];
            })
            ->toArray();
    }
}