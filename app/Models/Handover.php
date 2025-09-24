<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Handover extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'equipment_id',
        'date',
        'photo',
    ];

    // Relasi ke Employee
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Relasi ke WorkEquipment
    public function equipment()
    {
        return $this->belongsTo(WorkEquipment::class, 'equipment_id');
    }
}
