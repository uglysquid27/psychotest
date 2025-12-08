<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'nik',
        'ktp',
        'name',
        'email',
        'password',
        'marital',
        'type',
        'status',
        'cuti',
        'gender',
        'group',
        'birth_date',
        'religion',
        'phone',
        'street',
        'rt',
        'rw',
        'kelurahan',
        'kecamatan',
        'kabupaten_kota',
        'provinsi',
        'kode_pos',
        'address',
        'deactivation_reason',
        'deactivation_notes',
        'deactivated_at',
        'deactivated_by',
    ];


    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
        'deactivated_at' => 'datetime',
        'birth_date' => 'date',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('deactivated_at');
    }

    public function blindTests()
    {
        return $this->hasMany(BlindTest::class);
    }

    public function scopeInactive($query)
    {
        return $query->whereNotNull('deactivated_at');
    }

    public function subSections(): BelongsToMany
    {
        return $this->belongsToMany(SubSection::class, 'employee_sub_section', 'employee_id', 'sub_section_id');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class, 'employee_id');
    }

    public function permits()
    {
        return $this->hasMany(Permit::class);
    }

    public function isAssignedToday(): bool
    {
        return $this->schedules()
            ->whereDate('date', Carbon::today())
            ->exists();
    }

    public function operatorLicense()
    {
        return $this->hasOne(OperatorLicense::class);
    }

    public function hasValidLicense()
    {
        return $this->operatorLicense && $this->operatorLicense->isValid();
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class);
    }

    public function workloads()
    {
        return $this->hasMany(Workload::class);
    }
    public function workload()
    {
        return $this->hasMany(Workload::class);
    }

    // In your Employee model
    public function deactivatedByUser()
    {
        return $this->belongsTo(User::class, 'deactivated_by');
    }

    // In Employee.php - add this method
    public function handovers()
    {
        return $this->hasMany(Handover::class, 'employee_id');
    }

    // Keep the existing handover method for single handover
    public function handover()
    {
        return $this->hasOne(Handover::class, 'employee_id');
    }

    public function pickingPriorities()
    {
        return $this->hasMany(EmployeePickingPriority::class);
    }
    
    /**
     * Check if employee has any picking priority
     */
    public function hasPriority(): bool
    {
        return $this->pickingPriorities()->exists();
    }

    /**
     * Get priority status for display
     */
    public function getPriorityStatusAttribute(): string
    {
        return $this->hasPriority() ? 'Yes' : 'No';
    }

    /**
     * Get priority boost score (1.5x if has priority, 1.0 if not)
     */
    public function getPriorityBoostScore(): float
    {
        return $this->hasPriority() ? 1.5 : 1.0;
    }

    /**
     * Get priority categories (returns ['priority'] if has priority)
     */
    public function getPriorityCategories(): array
    {
        return $this->hasPriority() ? ['priority'] : [];
    }

    // Check if employee has specific category priority
    public function hasPriorityCategory(string $category): bool
    {
        return $this->pickingPriorities()
            ->where('category', $category)
            ->exists();
    }

    // Get metadata for specific category
    public function getPriorityMetadata(string $category): ?array
    {
        $priority = $this->pickingPriorities()
            ->where('category', $category)
            ->first();

        return $priority?->metadata;
    }

    /**
     * Get employee type in numerical format for ML
     */
    public function getTypeNumericAttribute(): int
    {
        return $this->type === 'bulanan' ? 1 : 0;
    }

    /**
     * Get gender in numerical format for ML
     */
    public function getGenderNumericAttribute(): int
    {
        return $this->gender === 'male' ? 1 : 0;
    }

    /**
     * Get average rating score
     */
    public function getAverageRatingAttribute(): float
    {
        return $this->ratings()->avg('rating') ?? 3.0;
    }

    /**
     * Get work days count in last 30 days
     */
    public function getWorkDaysCountAttribute(): int
    {
        $startDate = Carbon::now()->subDays(30);
        return $this->schedules()
            ->where('date', '>=', $startDate)
            ->count();
    }

    /**
     * Get test score (1 if passed any test, 0 if not)
     */
    public function getTestScoreAttribute(): int
    {
        return $this->blindTests()->where('result', 'Pass')->exists() ? 1 : 0;
    }

    /**
     * Get current workload normalized to 0-1
     */
    public function getCurrentWorkloadAttribute(): float
    {
        $startDate = Carbon::now()->subDays(14);
        $workHours = $this->schedules()
            ->where('date', '>=', $startDate)
            ->where('date', '<', Carbon::now())
            ->with('manPowerRequest.shift')
            ->get()
            ->sum(function ($schedule) {
                return $schedule->manPowerRequest->shift->hours ?? 0;
            });

        return min($workHours / 80, 1.0); // Normalize to 0-1 (80 hours max for 2 weeks)
    }

    /**
     * Get priority flag for ML (1 if has priority, 0 if not)
     */
    public function getHasPriorityAttribute(): int
    {
        return $this->hasPriority() ? 1 : 0;
    }

    /**
     * Scope: Employees with priority
     */
    public function scopeWithPriority($query)
    {
        return $query->whereHas('pickingPriorities');
    }

    /**
     * Scope: Employees without priority
     */
    public function scopeWithoutPriority($query)
    {
        return $query->whereDoesntHave('pickingPriorities');
    }

    /**
     * Get priority records count
     */
    public function getPriorityCountAttribute(): int
    {
        return $this->pickingPriorities()->count();
    }

    /**
     * Check if employee is available for assignment
     */
    public function isAvailableForAssignment($date = null): bool
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        
        return $this->status === 'available' && 
               $this->cuti === 'no' &&
               !$this->isAssignedOnDate($date);
    }

    /**
     * Check if employee is assigned on specific date
     */
    public function isAssignedOnDate($date): bool
    {
        return $this->schedules()
            ->whereDate('date', Carbon::parse($date))
            ->exists();
    }

    /**
     * Get shift priority score (for ML)
     */
    public function getShiftPriorityAttribute($manpowerRequest = null, $referenceDate = null): float
    {
        if (!$manpowerRequest || !$referenceDate) {
            return 0.5; // Default neutral priority
        }

        try {
            // Get the last assigned shift for this employee
            $lastSchedule = $this->schedules()
                ->where('date', '<', $referenceDate)
                ->with('manPowerRequest.shift')
                ->orderBy('date', 'desc')
                ->first();

            if (!$lastSchedule || !$lastSchedule->manPowerRequest->shift) {
                return 1.0; // No previous shift, neutral priority
            }

            $lastShiftOrder = $this->getShiftOrder($lastSchedule->manPowerRequest->shift);
            $currentShiftOrder = $this->getShiftOrder($manpowerRequest->shift);

            if ($lastShiftOrder === null || $currentShiftOrder === null) {
                return 1.0; // Unknown shift, neutral priority
            }

            // Calculate shift priority based on sequential ordering
            $shiftDifference = $currentShiftOrder - $lastShiftOrder;
            
            if ($shiftDifference === 0) {
                // Same shift as last time - lower priority
                return 0.3;
            } elseif ($shiftDifference === 1) {
                // Next sequential shift - medium priority
                return 0.7;
            } elseif ($shiftDifference === 2) {
                // Two shifts ahead - highest priority
                return 1.0;
            } elseif ($shiftDifference === -1) {
                // Previous shift - low priority
                return 0.4;
            } else {
                // Other cases - neutral
                return 0.5;
            }
        } catch (\Exception $e) {
            return 0.5;
        }
    }

    /**
     * Helper method to get shift order
     */
    private function getShiftOrder($shift)
    {
        try {
            // Map shift names to sequential order
            $shiftOrder = [
                'pagi' => 1,
                'siang' => 2,
                'malam' => 3,
                '1' => 1,
                '2' => 2,
                '3' => 3
            ];

            $shiftName = strtolower($shift->name ?? '');
            return $shiftOrder[$shiftName] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get ML features array for this employee
     */
    public function getMlFeatures($manpowerRequest = null, $referenceDate = null): array
    {
        $referenceDate = $referenceDate ? Carbon::parse($referenceDate) : Carbon::now();
        
        return [
            'work_days_count' => $this->work_days_count,
            'rating_value' => $this->average_rating,
            'test_score' => $this->test_score,
            'gender' => $this->gender_numeric,
            'employee_type' => $this->type_numeric,
            'same_subsection' => $manpowerRequest ? $this->isInSubsection($manpowerRequest->sub_section_id) ? 1 : 0 : 0,
            'same_section' => $manpowerRequest ? $this->isInSection($manpowerRequest->subSection->section_id ?? null) ? 1 : 0 : 0,
            'current_workload' => $this->current_workload,
            'shift_priority' => $manpowerRequest ? $this->shift_priority : 0.5,
            'has_priority' => $this->has_priority,
            'priority_count' => $this->priority_count,
        ];
    }

    /**
     * Check if employee is in specific subsection
     */
    public function isInSubsection($subSectionId): bool
    {
        return $this->subSections()->where('id', $subSectionId)->exists();
    }

    /**
     * Check if employee is in specific section
     */
    public function isInSection($sectionId): bool
    {
        if (!$sectionId) return false;
        
        return $this->subSections()
            ->whereHas('section', function ($query) use ($sectionId) {
                $query->where('id', $sectionId);
            })
            ->exists();
    }

    /**
     * Get all assigned equipment
     */
    public function getAssignedEquipmentAttribute()
    {
        return $this->handovers()->with('equipment')->get();
    }

    /**
     * Get total assigned hours in current period
     */
    public function getTotalAssignedHoursAttribute(): float
    {
        $startDate = Carbon::now()->subDays(14);
        return $this->schedules()
            ->where('date', '>=', $startDate)
            ->with('manPowerRequest.shift')
            ->get()
            ->sum(function ($schedule) {
                return $schedule->manPowerRequest->shift->hours ?? 0;
            });
    }
}