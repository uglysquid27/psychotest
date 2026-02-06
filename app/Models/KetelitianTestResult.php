<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KetelitianTestResult extends Model
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
        'answers'
    ];

    protected $casts = [
        'answers' => 'array',
        'percentage' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}