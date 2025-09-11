<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CronJobSetting extends Model
{
    use HasFactory;

    protected $table = 'cron_job_settings';

    protected $fillable = [
        'job_name',
        'is_enabled',
        'description',
        'command'
    ];

    protected $casts = [
        'is_enabled' => 'boolean'
    ];

    /**
     * Check if a specific cron job is enabled
     */
    public static function isJobEnabled(string $jobName): bool
    {
        $setting = static::where('job_name', $jobName)->first();
        return $setting ? $setting->is_enabled : true;
    }

    /**
     * Get all enabled cron jobs
     */
    public static function getEnabledJobs(): array
    {
        return static::where('is_enabled', true)
            ->pluck('command')
            ->filter()
            ->toArray();
    }

    /**
     * Scope a query to only include enabled jobs.
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    /**
     * Scope a query to only include disabled jobs.
     */
    public function scopeDisabled($query)
    {
        return $query->where('is_enabled', false);
    }
}