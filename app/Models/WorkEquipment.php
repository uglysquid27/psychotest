<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkEquipment extends Model
{
    use HasFactory;

     protected $table = 'work_equipments';

    protected $fillable = [
        'amount',
        'type',
        'size'
    ];

    // Relasi ke Handover
    public function handovers()
    {
        return $this->hasMany(Handover::class, 'equipment_id');
    }
}
