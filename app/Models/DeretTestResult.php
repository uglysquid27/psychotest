<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeretTestResult extends Model
{
    use HasFactory;

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
        'questions_used'
    ];

    protected $casts = [
        'answers' => 'array',
        'questions_used' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}