<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class HitunganQuestion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'question',
        'answer',
        'is_active',
        'difficulty_level'
    ];

    protected $casts = [
        'answer' => 'float',
        'is_active' => 'boolean',
        'difficulty_level' => 'integer'
    ];
}