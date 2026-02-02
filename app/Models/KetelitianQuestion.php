<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class KetelitianQuestion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'left_text',
        'right_text',
        'answer',
        'is_active',
        'difficulty_level'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'difficulty_level' => 'integer'
    ];
}