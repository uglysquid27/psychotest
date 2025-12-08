<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeePickingPriority extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'category',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getWeightMultiplierAttribute(): float
    {
        return match ($this->category) {
            'skill_certified' => 2.0,
            'senior' => 1.5,
            'special_project' => 2.5,
            'training' => 1.3,
            'performance' => 1.8,
            'operational' => 1.4,
            'quality_control' => 1.6,
            'machine_operator' => 1.7,
            'general_priority' => 1.5,   // Default weight for general priority
            default => 1.2,
        };
    }

    public function getCategoryNameAttribute(): string
    {
        return match ($this->category) {
            'skill_certified' => 'Skill Certified',
            'senior' => 'Senior Employee',
            'special_project' => 'Special Project',
            'training' => 'Training Required',
            'performance' => 'High Performance',
            'operational' => 'Operational Need',
            'quality_control' => 'Quality Control',
            'machine_operator' => 'Machine Operator',
            'general_priority' => 'General Priority',
            default => ucfirst(str_replace('_', ' ', $this->category)),
        };
    }

     public function getCategoryStats(): array
    {
        return EmployeePickingPriority::selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();
    }
}