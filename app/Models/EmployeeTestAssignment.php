<?php
// app/Models/EmployeeTestAssignment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EmployeeTestAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'nik',
        'test_type',
        'test_name',
        'assigned_at',
        'completed_at',
        'status',
        'due_date',
        'score',
        'percentage',
        'test_data',
        'results',
        'attempts',
        'last_attempt_at',
        'notes',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'completed_at' => 'datetime',
        'due_date' => 'datetime',
        'last_attempt_at' => 'datetime',
        'test_data' => 'array',
        'results' => 'array',
    ];

    // Status constants
    const STATUS_ASSIGNED = 'assigned';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_EXPIRED = 'expired';

    // Test type constants
    const TYPE_KRAEPELIN = 'kraepelin';
    const TYPE_WARTEGG = 'wartegg';
    const TYPE_ANALOGI = 'analogi';
    const TYPE_KETELITIAN = 'ketelitian';
    const TYPE_HITUNGAN = 'hitungan';
    const TYPE_DERET = 'deret';
    const TYPE_SPASIAL = 'spasial';
    const TYPE_NUMERIK = 'numerik';
    const TYPE_DISC = 'disc';
    const TYPE_PERSONALITY = 'personality';

    /**
     * Get the employee associated with the test assignment
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'nik', 'nik');
    }

    /**
     * Check if test is assigned to employee
     */
    public function isAssigned(): bool
    {
        return $this->status === self::STATUS_ASSIGNED;
    }

    /**
     * Check if test is in progress
     */
    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /**
     * Check if test is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isAccessible()
{
    // If no due date, always accessible
    if (!$this->due_date) {
        return true;
    }

    $dueDate = Carbon::parse($this->due_date);
    $today = Carbon::today();
    
    // Test is accessible if due_date is today or in the future
    // AND if status is assigned or in_progress
    if (in_array($this->status, [self::STATUS_ASSIGNED, self::STATUS_IN_PROGRESS])) {
        // Compare only dates (ignore time)
        $dueDateOnly = $dueDate->copy()->startOfDay();
        return $dueDateOnly->greaterThanOrEqualTo($today); // Accessible today and future
    }
    
    return false;
}

    /**
     * Check if assignment is expired
     */
    public function isExpired()
{
    // If no due date, never expired
    if (!$this->due_date) {
        return false;
    }

    $dueDate = Carbon::parse($this->due_date);
    $today = Carbon::today();
    
    // If due date is tomorrow or earlier, it's expired
    // AND if status is still assigned or in_progress
    if (in_array($this->status, [self::STATUS_ASSIGNED, self::STATUS_IN_PROGRESS])) {
        // Compare only dates (ignore time)
        $dueDateOnly = $dueDate->copy()->startOfDay();
        return $dueDateOnly->lessThan($today); // Expired if due date is yesterday or earlier
    }
    
    return false;
}

        public function canAttempt()
    {
        // If already completed, cannot attempt again
        if ($this->status === self::STATUS_COMPLETED) {
            return false;
        }
        
        // If expired, cannot attempt
        if ($this->isExpired()) {
            return false;
        }
        
        // Check attempts count
        return $this->attempts < 1; // Only 1 attempt allowed
    }

    /**
     * Check if test is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && !$this->isCompleted();
    }

    /**
     * Start the test
     */
    public function startTest(): self
    {
        $this->update([
            'status' => self::STATUS_IN_PROGRESS,
            'last_attempt_at' => now(),
            'attempts' => $this->attempts + 1,
        ]);

        return $this;
    }

    const STATUS_DONE = 'done';
    /**
     * Complete the test with results
     */
    public function completeTest(int $score, int $total, array $results = []): self
{
    $percentage = $total > 0 ? round(($score / $total) * 100, 2) : 0;

    $this->update([
        'status' => self::STATUS_COMPLETED, // Change to STATUS_DONE if you want 'done'
        'completed_at' => now(),
        'score' => $score,
        'percentage' => $percentage,
        'results' => array_merge($results, [
            'total_questions' => $total,
            'completed_at' => now()->toISOString(),
        ]),
    ]);

    return $this;
}

    /**
     * Check if employee can access this test
     */
    public static function canAccessTest(string $nik, string $testType): bool
    {
        // If no nik (admin), allow access
        if (!$nik) {
            return true;
        }

        return self::where('nik', $nik)
            ->where('test_type', $testType)
            ->whereIn('status', [self::STATUS_ASSIGNED, self::STATUS_IN_PROGRESS])
            ->exists();
    }

    /**
     * Get all assigned tests for an employee
     */
    public static function getAssignedTests(string $nik): array
    {
        return self::where('nik', $nik)
            ->whereIn('status', [self::STATUS_ASSIGNED, self::STATUS_IN_PROGRESS])
            ->pluck('test_type')
            ->unique()
            ->toArray();
    }

    /**
     * Get test URL based on type
     */
    public function getTestUrl(): string
    {
        return match ($this->test_type) {
            self::TYPE_KRAEPELIN => route('kraepelin.index'),
            self::TYPE_WARTEGG => route('wartegg.index'),
            self::TYPE_ANALOGI => route('analogi.index'),
            self::TYPE_KETELITIAN => route('ketelitian.index'),
            self::TYPE_HITUNGAN => route('hitungan.test'),
            self::TYPE_DERET => route('deret.index'),
            self::TYPE_SPASIAL => route('spasial.index'),
            self::TYPE_NUMERIK => route('numerik.index'),
            self::TYPE_DISC => route('disc.index'),
            self::TYPE_PERSONALITY => route('personality.index'),
            default => '#',
        };
    }

    /**
     * Get test display name
     */
    public function getTestDisplayName(): string
    {
        return match ($this->test_type) {
            self::TYPE_KRAEPELIN => 'Kraepelin Test',
            self::TYPE_WARTEGG => 'Wartegg Test',
            self::TYPE_ANALOGI => 'Analogi Test',
            self::TYPE_KETELITIAN => 'Ketelitian Test',
            self::TYPE_HITUNGAN => 'Hitungan Test',
            self::TYPE_DERET => 'Deret Test',
            self::TYPE_SPASIAL => 'Spasial Test',
            self::TYPE_NUMERIK => 'Numerik Test',
            self::TYPE_DISC => 'DISC Test',
            self::TYPE_PERSONALITY => 'Personality Test',
            default => $this->test_name,
        };
    }

    /**
     * Get all test types with display names
     */
    public static function getTestTypes(): array
    {
        return [
            self::TYPE_KRAEPELIN => 'Kraepelin Test',
            self::TYPE_WARTEGG => 'Wartegg Test',
            self::TYPE_ANALOGI => 'Analogi Test',
            self::TYPE_KETELITIAN => 'Ketelitian Test',
            self::TYPE_HITUNGAN => 'Hitungan Test',
            self::TYPE_DERET => 'Deret Test',
            self::TYPE_SPASIAL => 'Spasial Test',
            self::TYPE_NUMERIK => 'Numerik Test',
            self::TYPE_DISC => 'DISC Test',
            self::TYPE_PERSONALITY => 'Personality Test',
        ];
    }

    /**
     * Get all statuses with display names
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_ASSIGNED => 'Assigned',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_EXPIRED => 'Expired',
        ];
    }

    /**
     * Get test type from route name
     */
    public static function getTestTypeFromRoute(string $routeName): ?string
    {
        $routeTestMap = [
            'kraepelin.index' => self::TYPE_KRAEPELIN,
            'kraepelin.start' => self::TYPE_KRAEPELIN,
            'kraepelin.submit' => self::TYPE_KRAEPELIN,
            'kraepelin.results' => self::TYPE_KRAEPELIN,
            'kraepelin.show' => self::TYPE_KRAEPELIN,
            'kraepelin.destroy' => self::TYPE_KRAEPELIN,
            'kraepelin.employees' => self::TYPE_KRAEPELIN,

            'wartegg.index' => self::TYPE_WARTEGG,
            'wartegg.store' => self::TYPE_WARTEGG,
            'wartegg.history' => self::TYPE_WARTEGG,
            'wartegg.show' => self::TYPE_WARTEGG,

            'analogi.index' => self::TYPE_ANALOGI,
            'analogi.submit' => self::TYPE_ANALOGI,

            'ketelitian.index' => self::TYPE_KETELITIAN,
            'ketelitian.submit' => self::TYPE_KETELITIAN,

            'hitungan.test' => self::TYPE_HITUNGAN,
            'hitungan.submit' => self::TYPE_HITUNGAN,

            'deret.index' => self::TYPE_DERET,
            'deret.submit' => self::TYPE_DERET,

            'spasial.index' => self::TYPE_SPASIAL,
            'spasial.submit' => self::TYPE_SPASIAL,

            'numerik.index' => self::TYPE_NUMERIK,
            'numerik.submit' => self::TYPE_NUMERIK,

            'disc.index' => self::TYPE_DISC,
            'disc.submit' => self::TYPE_DISC,

            'personality.index' => self::TYPE_PERSONALITY,
            'personality.submit' => self::TYPE_PERSONALITY,
        ];

        return $routeTestMap[$routeName] ?? null;
    }

    
}