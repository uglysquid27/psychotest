<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HitunganTestResult extends Model
{
    protected $fillable = [
        'user_id',
        'score',
        'total_questions',
        'correct_answers',
        'wrong_answers',
        'unanswered',
        'time_elapsed',
        'percentage',
        'answers'
    ];

    protected $casts = [
        'answers' => 'array'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}