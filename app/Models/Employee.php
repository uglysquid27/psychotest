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
        // Bank account fields
        'bank_account',
        'bank_name',
        // Address fields
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

    // ==================== RELATIONSHIPS ====================

    public function blindTests()
    {
        return $this->hasMany(BlindTest::class);
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

    public function operatorLicense()
    {
        return $this->hasOne(OperatorLicense::class);
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

    public function deactivatedByUser()
    {
        return $this->belongsTo(User::class, 'deactivated_by');
    }

    public function handovers()
    {
        return $this->hasMany(Handover::class, 'employee_id');
    }

    public function handover()
    {
        return $this->hasOne(Handover::class, 'employee_id');
    }

    public function pickingPriorities()
    {
        return $this->hasMany(EmployeePickingPriority::class);
    }   

    // ==================== BANK ACCOUNT CHANGES ====================

public function bankAccountChangeLogs()
{
    return $this->hasMany(BankAccountChangeLog::class, 'nik', 'nik');
}

public function pendingBankAccountChange()
{
    return $this->hasOne(BankAccountChangeLog::class, 'nik', 'nik')
        ->where('status', BankAccountChangeLog::STATUS_PENDING);
}

    public function hasPendingBankAccountChange()
    {
        return $this->pendingBankAccountChange()->exists();
    }

    public function getLatestBankAccountChange()
    {
        return $this->bankAccountChanges()->latest()->first();
    }

    // ==================== SCOPE METHODS ====================

    public function scopeActive($query)
    {
        return $query->whereNull('deactivated_at');
    }

    public function scopeInactive($query)
    {
        return $query->whereNotNull('deactivated_at');
    }

    public function scopeWithPriority($query)
    {
        return $query->whereHas('pickingPriorities');
    }

    public function scopeWithoutPriority($query)
    {
        return $query->whereDoesntHave('pickingPriorities');
    }

    public function scopeHasBankAccount($query)
    {
        return $query->whereNotNull('bank_account')->whereNotNull('bank_name');
    }

    public function scopeNoBankAccount($query)
    {
        return $query->whereNull('bank_account')->orWhereNull('bank_name');
    }

    // ==================== HELPER METHODS ====================

    public function isAssignedToday(): bool
    {
        return $this->schedules()
            ->whereDate('date', Carbon::today())
            ->exists();
    }

    public function hasValidLicense()
    {
        return $this->operatorLicense && $this->operatorLicense->isValid();
    }

    public function isAvailableForAssignment($date = null): bool
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        
        return $this->status === 'available' && 
               $this->cuti === 'no' &&
               !$this->isAssignedOnDate($date);
    }

    public function isAssignedOnDate($date): bool
    {
        return $this->schedules()
            ->whereDate('date', Carbon::parse($date))
            ->exists();
    }

    public function isInSubsection($subSectionId): bool
    {
        return $this->subSections()->where('id', $subSectionId)->exists();
    }

    public function isInSection($sectionId): bool
    {
        if (!$sectionId) return false;
        
        return $this->subSections()
            ->whereHas('section', function ($query) use ($sectionId) {
                $query->where('id', $sectionId);
            })
            ->exists();
    }

    // ==================== ADDRESS METHODS ====================

    public function getFullAddress()
    {
        $parts = [];
        
        if ($this->street) $parts[] = $this->street;
        
        if ($this->rt && $this->rw) {
            $parts[] = "RT {$this->rt}/RW {$this->rw}";
        }
        
        if ($this->kelurahan) $parts[] = $this->kelurahan;
        if ($this->kecamatan) $parts[] = $this->kecamatan;
        if ($this->kabupaten_kota) $parts[] = $this->kabupaten_kota;
        if ($this->provinsi) $parts[] = $this->provinsi;
        if ($this->kode_pos) $parts[] = $this->kode_pos;
        
        $address = implode(', ', array_filter($parts));
        
        return $address ?: $this->address;
    }

    public function isProfileComplete()
    {
        return !empty($this->kelurahan) && !empty($this->kecamatan);
    }

    // ==================== PRIORITY METHODS ====================

    public function hasPriority(): bool
    {
        return $this->pickingPriorities()->exists();
    }

    public function getPriorityStatusAttribute(): string
    {
        return $this->hasPriority() ? 'Yes' : 'No';
    }

    public function getPriorityBoostScore(): float
    {
        return $this->hasPriority() ? 1.5 : 1.0;
    }

    public function getPriorityCategories(): array
    {
        return $this->hasPriority() ? ['priority'] : [];
    }

    public function hasPriorityCategory(string $category): bool
    {
        return $this->pickingPriorities()
            ->where('category', $category)
            ->exists();
    }

    public function getPriorityMetadata(string $category): ?array
    {
        $priority = $this->pickingPriorities()
            ->where('category', $category)
            ->first();

        return $priority?->metadata;
    }

    // ==================== ML FEATURE METHODS ====================

    public function getTypeNumericAttribute(): int
    {
        return $this->type === 'bulanan' ? 1 : 0;
    }

    public function getGenderNumericAttribute(): int
    {
        return $this->gender === 'male' ? 1 : 0;
    }

    public function getAverageRatingAttribute(): float
    {
        return $this->ratings()->avg('rating') ?? 3.0;
    }

    public function getWorkDaysCountAttribute(): int
    {
        $startDate = Carbon::now()->subDays(30);
        return $this->schedules()
            ->where('date', '>=', $startDate)
            ->count();
    }

    public function getTestScoreAttribute(): int
    {
        return $this->blindTests()->where('result', 'Pass')->exists() ? 1 : 0;
    }

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

        return min($workHours / 80, 1.0);
    }

    public function getHasPriorityAttribute(): int
    {
        return $this->hasPriority() ? 1 : 0;
    }

    public function getPriorityCountAttribute(): int
    {
        return $this->pickingPriorities()->count();
    }

    public function getShiftPriorityAttribute($manpowerRequest = null, $referenceDate = null): float
    {
        if (!$manpowerRequest || !$referenceDate) {
            return 0.5;
        }

        try {
            $lastSchedule = $this->schedules()
                ->where('date', '<', $referenceDate)
                ->with('manPowerRequest.shift')
                ->orderBy('date', 'desc')
                ->first();

            if (!$lastSchedule || !$lastSchedule->manPowerRequest->shift) {
                return 1.0;
            }

            $lastShiftOrder = $this->getShiftOrder($lastSchedule->manPowerRequest->shift);
            $currentShiftOrder = $this->getShiftOrder($manpowerRequest->shift);

            if ($lastShiftOrder === null || $currentShiftOrder === null) {
                return 1.0;
            }

            $shiftDifference = $currentShiftOrder - $lastShiftOrder;
            
            if ($shiftDifference === 0) {
                return 0.3;
            } elseif ($shiftDifference === 1) {
                return 0.7;
            } elseif ($shiftDifference === 2) {
                return 1.0;
            } elseif ($shiftDifference === -1) {
                return 0.4;
            } else {
                return 0.5;
            }
        } catch (\Exception $e) {
            return 0.5;
        }
    }

    private function getShiftOrder($shift)
    {
        try {
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

    // ==================== EQUIPMENT METHODS ====================

    public function getAssignedEquipmentAttribute()
    {
        return $this->handovers()->with('equipment')->get();
    }

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

    // ==================== BANK ACCOUNT METHODS ====================

    public function hasBankAccount(): bool
    {
        return !empty($this->bank_account) && !empty($this->bank_name);
    }

    public function getBankInfoAttribute(): ?array
    {
        if (!$this->hasBankAccount()) {
            return null;
        }

        return [
            'account_number' => $this->bank_account,
            'bank_name' => $this->bank_name,
        ];
    }

    public function getFormattedBankAccountAttribute(): string
    {
        if (!$this->hasBankAccount()) {
            return 'Belum ada rekening';
        }

        return $this->bank_name . ' - ' . $this->bank_account;
    }

    public function updateBankAccount($accountNumber, $bankName)
    {
        $this->update([
            'bank_account' => $accountNumber,
            'bank_name' => $bankName,
        ]);

        return $this;
    }

    public function clearBankAccount()
    {
        $this->update([
            'bank_account' => null,
            'bank_name' => null,
        ]);

        return $this;
    }

    // Add these methods to your Employee.php model:

/**
 * Get test assignments for this employee
 */
public function testAssignments()
{
    return $this->hasMany(EmployeeTestAssignment::class, 'nik', 'nik');
}

/**
 * Check if employee has access to a specific test
 */
public function canAccessTest(string $testType): bool
{
    // Admin has access to everything
    if ($this->role === 'admin') {
        return true;
    }
    
    // Check if employee is assigned to this test
    return EmployeeTestAssignment::canAccessTest($this->nik, $testType);
}

/**
 * Get all assigned tests
 */
public function getAssignedTests(): array
{
    return EmployeeTestAssignment::getAssignedTests($this->nik);
}

/**
 * Check if employee has any pending tests
 */
public function hasPendingTests(): bool
{
    return !empty($this->getAssignedTests());
}

/**
 * Check if employee can access a specific route
 */
public function canAccessRoute(string $routeName): bool
{
    // Admin can access everything
    if ($this->role === 'admin') {
        return true;
    }
    
    // Get test type from route
    $testType = EmployeeTestAssignment::getTestTypeFromRoute($routeName);
    
    // If route is not a test route, allow access
    if (!$testType) {
        return true;
    }
    
    // Check if employee is assigned to this test
    return $this->canAccessTest($testType);
}
}