<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleChangeRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'employee_id',
        'requested_status',
        'current_status',
        'reason',
        'approval_status',
        'approved_by',
        'approved_at',
        'approval_notes'
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(Admin::class, 'approved_by');
    }

    public function getApprovalStatusTextAttribute()
{
    $statuses = [
        'pending' => 'Menunggu',
        'approved' => 'Disetujui',
        'rejected' => 'Ditolak'
    ];
    
    return $statuses[$this->approval_status] ?? $this->approval_status;
}

// Add this accessor to get requested status text
public function getRequestedStatusTextAttribute()
{
    $statuses = [
        'accepted' => 'Diterima',
        'rejected' => 'Ditolak'
    ];
    
    return $statuses[$this->requested_status] ?? $this->requested_status;
}
}