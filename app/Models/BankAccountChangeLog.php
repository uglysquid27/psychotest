<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankAccountChangeLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nik',
        'old_account_number',
        'old_bank',
        'new_account_number',
        'new_bank',
        'status',
        'remarks',
        'signature_data',      // Tambahkan untuk menyimpan tanda tangan
        'signed_at',           // Tambahkan untuk waktu penandatanganan
        'requested_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'signed_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    // Relationship with Employee
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'nik', 'nik');
    }

    // Relationship with Requester (Employee)
    public function requester()
    {
        return $this->belongsTo(Employee::class, 'requested_by');
    }

    // Relationship with Approver (User - Admin)
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeByEmployee($query, $nik)
    {
        return $query->where('nik', $nik);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeSigned($query)
    {
        return $query->whereNotNull('signature_data');
    }

    public function scopeNotSigned($query)
    {
        return $query->whereNull('signature_data');
    }

    // Helper methods
    public function isPending()
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved()
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected()
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isSigned()
    {
        return !empty($this->signature_data);
    }

    public function getStatusLabel()
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Menunggu',
            self::STATUS_APPROVED => 'Disetujui',
            self::STATUS_REJECTED => 'Ditolak',
            default => $this->status,
        };
    }

    public function getStatusColor()
    {
        return match($this->status) {
            self::STATUS_PENDING => 'warning',
            self::STATUS_APPROVED => 'success',
            self::STATUS_REJECTED => 'danger',
            default => 'secondary',
        };
    }

    // Method untuk menyimpan tanda tangan
    public function saveSignature($signatureData)
    {
        // Validasi format data URL
        if (!preg_match('/^data:image\/png;base64,/', $signatureData)) {
            throw new \InvalidArgumentException('Format tanda tangan tidak valid. Harus berupa data URL PNG base64.');
        }

        return $this->update([
            'signature_data' => $signatureData,
            'signed_at' => now(),
        ]);
    }

    // Method untuk mendapatkan tanda tangan sebagai gambar HTML
    public function getSignatureHtml($attributes = [])
    {
        if (!$this->signature_data) {
            return null;
        }

        $defaultAttributes = [
            'src' => $this->signature_data,
            'alt' => 'Tanda tangan digital',
            'class' => 'signature-image',
            'style' => 'max-width: 300px; max-height: 150px;',
        ];

        $attributes = array_merge($defaultAttributes, $attributes);

        $html = '<img ';
        foreach ($attributes as $key => $value) {
            $html .= $key . '="' . htmlspecialchars($value) . '" ';
        }
        $html .= '/>';

        return $html;
    }

    // Method untuk mendapatkan URL tanda tangan
    public function getSignatureUrl()
    {
        return $this->signature_data;
    }

    // Method untuk mendapatkan tanda tangan sebagai file
    public function getSignatureAsFile($filename = null)
    {
        if (!$this->signature_data) {
            return null;
        }

        // Ekstrak base64 dari data URL
        $base64String = str_replace('data:image/png;base64,', '', $this->signature_data);
        $imageData = base64_decode($base64String);

        if (!$filename) {
            $filename = 'signature_' . $this->nik . '_' . $this->id . '.png';
        }

        return [
            'content' => $imageData,
            'filename' => $filename,
            'mime' => 'image/png',
        ];
    }

    // Method untuk menghapus tanda tangan
    public function removeSignature()
    {
        return $this->update([
            'signature_data' => null,
            'signed_at' => null,
        ]);
    }

    public function approve($approverId, $remarks = null)
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'remarks' => $remarks,
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);

        // Update employee's bank account
        if ($this->employee) {
            $this->employee->update([
                'bank_account' => $this->new_account_number,
                'bank_name' => $this->new_bank,
            ]);
        }

        return $this;
    }

    public function reject($approverId, $remarks = null)
    {
        return $this->update([
            'status' => self::STATUS_REJECTED,
            'remarks' => $remarks,
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);
    }

    public function getChangeDescription()
    {
        $old = $this->old_account_number ? "{$this->old_bank}: {$this->old_account_number}" : "Belum ada";
        $new = "{$this->new_bank}: {$this->new_account_number}";
        
        return "Dari {$old} menjadi {$new}";
    }

    // Method untuk mendapatkan informasi status lengkap
    public function getFullStatusInfo()
    {
        $info = [
            'status' => $this->status,
            'label' => $this->getStatusLabel(),
            'color' => $this->getStatusColor(),
            'signed' => $this->isSigned(),
            'signed_at' => $this->signed_at ? $this->signed_at->format('d/m/Y H:i') : null,
            'approved_at' => $this->approved_at ? $this->approved_at->format('d/m/Y H:i') : null,
        ];

        return $info;
    }

    // Accessor untuk format tanggal penandatanganan
    public function getSignedAtFormattedAttribute()
    {
        return $this->signed_at ? $this->signed_at->locale('id-ID')->translatedFormat('d F Y H:i') : '-';
    }

    // Accessor untuk format tanggal persetujuan
    public function getApprovedAtFormattedAttribute()
    {
        return $this->approved_at ? $this->approved_at->locale('id-ID')->translatedFormat('d F Y H:i') : '-';
    }

    // Accessor untuk mendapatkan informasi signature
    public function getSignatureInfoAttribute()
    {
        if (!$this->signature_data) {
            return null;
        }

        // Hitung ukuran data signature
        $size = strlen($this->signature_data);
        
        return [
            'has_signature' => true,
            'size_bytes' => $size,
            'size_formatted' => $this->formatBytes($size),
            'url' => $this->signature_data,
            'signed_at' => $this->signed_at_formatted,
        ];
    }

    // Helper method untuk format bytes
    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    // Boot method untuk event handling
    protected static function boot()
    {
        parent::boot();

        // Event sebelum menghapus untuk membersihkan signature jika diperlukan
        static::deleting(function ($changeLog) {
            // Jika ingin menghapus signature dari storage ketika model dihapus
            // $changeLog->removeSignature();
        });

        // Event setelah membuat untuk validasi signature
        static::created(function ($changeLog) {
            // Lakukan validasi atau processing tambahan
        });
    }
}