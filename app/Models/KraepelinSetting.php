<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KraepelinSetting extends Model
{
    use SoftDeletes;

    protected $table = 'kraepelin_settings';
    
    protected $fillable = [
        'name',
        'rows',
        'columns',
        'time_per_column',
        'difficulty',
        'is_active',
        'description'
    ];

    protected $casts = [
        'rows' => 'integer',
        'columns' => 'integer',
        'time_per_column' => 'integer',
        'is_active' => 'boolean'
    ];

    // Constants for difficulty
    const DIFFICULTY_EASY = 'mudah';
    const DIFFICULTY_MEDIUM = 'sedang';
    const DIFFICULTY_HARD = 'sulit';

    public static function getDifficultyOptions()
    {
        return [
            self::DIFFICULTY_EASY => 'Mudah',
            self::DIFFICULTY_MEDIUM => 'Sedang',
            self::DIFFICULTY_HARD => 'Sulit',
        ];
    }

    /**
     * Get tests that used this setting
     */
    public function tests()
    {
        return $this->hasMany(KraepelinTest::class);
    }

    public function getDifficultyLabelAttribute()
    {
        return self::getDifficultyOptions()[$this->difficulty] ?? $this->difficulty;
    }

    public function getTotalQuestionsAttribute()
    {
        return ($this->rows - 1) * $this->columns;
    }

    public function getTotalTimeAttribute()
    {
        return $this->columns * $this->time_per_column;
    }

    public function getTotalTimeFormattedAttribute()
    {
        $minutes = floor($this->total_time / 60);
        $seconds = $this->total_time % 60;
        
        if ($minutes > 0) {
            return "{$minutes} menit {$seconds} detik";
        }
        return "{$seconds} detik";
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithDifficulty($query, $difficulty)
    {
        if ($difficulty) {
            return $query->where('difficulty', $difficulty);
        }
        return $query;
    }
}