<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Resign extends Model
{
    use HasFactory;

    protected $table = 'resign';

    protected $fillable = [
        'employee_id',
        'tanggal',
        'reason',
    ];

    protected $casts = [
        'resign_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}