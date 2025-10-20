<?php
// app/Models/TrainedModel.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainedModel extends Model
{
    use HasFactory;

    protected $fillable = [
        'model_name',
        'model_type',
        'file_path',
        'accuracy',
        'train_data_count',
        'feature_importance',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'accuracy' => 'decimal:4',
        'train_data_count' => 'integer',
        'feature_importance' => 'array',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope for active models
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for specific model type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('model_type', $type);
    }

    /**
     * Activate this model (deactivate others)
     */
    public function activate()
    {
        // Deactivate all other models
        self::where('id', '!=', $this->id)->update(['is_active' => false]);
        
        // Activate this one
        $this->update(['is_active' => true]);
        
        return $this;
    }

    /**
     * Get the display accuracy as percentage
     */
    public function getAccuracyPercentageAttribute()
    {
        return $this->accuracy ? round($this->accuracy * 100, 2) . '%' : 'N/A';
    }

    /**
     * Get feature importance as formatted string
     */
    public function getFeatureImportanceDisplayAttribute()
    {
        if (!$this->feature_importance || !is_array($this->feature_importance)) {
            return 'N/A';
        }

        $features = [];
        foreach ($this->feature_importance as $feature => $importance) {
            $features[] = "{$feature}: " . round($importance, 4);
        }

        return implode(', ', $features);
    }

    /**
     * Check if model file exists
     */
    public function modelFileExists()
    {
        return file_exists($this->file_path) || 
               file_exists(storage_path('app/ml_models/' . $this->file_path));
    }

    /**
     * Get the full file path
     */
    public function getFullFilePathAttribute()
    {
        if (file_exists($this->file_path)) {
            return $this->file_path;
        }
        
        // Try storage path
        $storagePath = storage_path('app/ml_models/' . $this->file_path);
        if (file_exists($storagePath)) {
            return $storagePath;
        }
        
        return $this->file_path;
    }

    /**
     * Get the latest active model
     */
    public static function getActiveModel()
    {
        return self::active()->latest()->first();
    }

    /**
     * Get models ordered by accuracy (best first)
     */
    public static function getBestModels($limit = 5)
    {
        return self::orderBy('accuracy', 'desc')
                  ->orderBy('train_data_count', 'desc')
                  ->limit($limit)
                  ->get();
    }

    /**
     * Get model performance statistics
     */
    public static function getPerformanceStats()
    {
        return [
            'total_models' => self::count(),
            'active_models' => self::active()->count(),
            'average_accuracy' => self::avg('accuracy'),
            'best_accuracy' => self::max('accuracy'),
            'total_training_samples' => self::sum('train_data_count'),
        ];
    }
}