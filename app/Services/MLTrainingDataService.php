<?php
// app/Services/MLTrainingDataService.php

namespace App\Services;

use App\Models\Schedule;
use App\Models\Employee;
use App\Models\ManPowerRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MLTrainingDataService
{
    public function collectTrainingData($days = 90)
    {
        $startDate = Carbon::now()->subDays($days);
        
        $trainingData = [];
        
        $this->info("📅 Collecting data from {$startDate->format('Y-m-d')} to now");

        try {
            // Get historical assignments (positive examples)
            $schedules = Schedule::with([
                    'employee.subSections', 
                    'employee.ratings',
                    'employee.blindTests',
                    'employee.schedules' => function ($query) use ($startDate) {
                        $query->where('date', '>=', $startDate);
                    },
                    'manPowerRequest.subSection',
                    'manPowerRequest.shift'
                ])
                ->where('date', '>=', $startDate)
                ->whereHas('employee')
                ->whereHas('manPowerRequest')
                ->get();

            $this->info("📋 Found {$schedules->count()} schedule records");

            foreach ($schedules as $schedule) {
                $employee = $schedule->employee;
                $manpowerRequest = $schedule->manPowerRequest;
                
                if (!$employee || !$manpowerRequest) {
                    continue;
                }

                $features = $this->extractFeatures($employee, $manpowerRequest, $schedule->date);
                
                // Only add if we have valid features
                if ($this->isValidFeatureSet($features)) {
                    $features['was_assigned'] = 1; // Positive example
                    $trainingData[] = $features;
                }
            }

            // Get negative examples (available but not assigned employees for each request)
            $negativeExamples = $this->getNegativeExamples($startDate);
            
            // Merge only valid negative examples
            foreach ($negativeExamples as $example) {
                if ($this->isValidFeatureSet($example)) {
                    $trainingData[] = $example;
                }
            }

            $this->info("📊 Total training data: " . count($trainingData) . " records");
            $this->info("✅ Positive examples: " . count(array_filter($trainingData, function($item) {
                return ($item['was_assigned'] ?? 0) === 1;
            })));
            $this->info("❌ Negative examples: " . count(array_filter($trainingData, function($item) {
                return ($item['was_assigned'] ?? 0) === 0;
            })));

            // If no valid data, return empty array
            if (empty($trainingData)) {
                $this->error("❌ No valid training data collected");
                return [];
            }

            return $trainingData;

        } catch (\Exception $e) {
            Log::error("Training data collection failed: " . $e->getMessage());
            $this->error("❌ Data collection failed: " . $e->getMessage());
            return [];
        }
    }

    private function extractFeatures($employee, $manpowerRequest, $scheduleDate)
    {
        // Ensure we have all required data with fallbacks
        return [
            'work_days_count' => $this->getWorkDaysCount($employee, $scheduleDate),
            'rating_value' => $this->getAverageRating($employee),
            'test_score' => $this->getTestScore($employee),
            'gender' => $employee->gender === 'male' ? 1 : 0,
            'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
            'same_subsection' => $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0,
            'same_section' => $this->isSameSection($employee, $manpowerRequest) ? 1 : 0,
            'current_workload' => $this->getCurrentWorkload($employee, $scheduleDate),
            'shift_priority' => $this->calculateShiftPriority($employee, $manpowerRequest, $scheduleDate),
        ];
    }

    private function getWorkDaysCount($employee, $referenceDate)
    {
        try {
            $startDate = Carbon::parse($referenceDate)->subDays(30);
            
            $count = $employee->schedules()
                ->where('date', '>=', $startDate)
                ->where('date', '<', $referenceDate)
                ->count();

            return max(0, $count); // Ensure non-negative
        } catch (\Exception $e) {
            Log::warning("Error getting work days count: " . $e->getMessage());
            return 0;
        }
    }

    private function getAverageRating($employee)
    {
        try {
            $avg = $employee->ratings()->avg('rating');
            return $avg ? floatval($avg) : 3.0; // Default to average rating
        } catch (\Exception $e) {
            Log::warning("Error getting average rating: " . $e->getMessage());
            return 3.0;
        }
    }

    private function getTestScore($employee)
    {
        try {
            $latestTest = $employee->blindTests()
                ->latest('test_date')
                ->first();

            return $latestTest && $latestTest->result === 'Pass' ? 1.0 : 0.0;
        } catch (\Exception $e) {
            Log::warning("Error getting test score: " . $e->getMessage());
            return 0.0;
        }
    }

    private function isSameSubsection($employee, $manpowerRequest)
    {
        try {
            return $employee->subSections->contains('id', $manpowerRequest->sub_section_id);
        } catch (\Exception $e) {
            Log::warning("Error checking same subsection: " . $e->getMessage());
            return false;
        }
    }

    private function isSameSection($employee, $manpowerRequest)
    {
        try {
            $requestSectionId = $manpowerRequest->subSection->section_id ?? null;
            if (!$requestSectionId) return false;

            return $employee->subSections->contains('section_id', $requestSectionId);
        } catch (\Exception $e) {
            Log::warning("Error checking same section: " . $e->getMessage());
            return false;
        }
    }

    private function getCurrentWorkload($employee, $referenceDate)
    {
        try {
            // Updated to 2 weeks (14 days)
            $startDate = Carbon::parse($referenceDate)->subDays(14);
            
            $workHours = $employee->schedules()
                ->where('date', '>=', $startDate)
                ->where('date', '<', $referenceDate)
                ->with('manPowerRequest.shift')
                ->get()
                ->sum(function ($schedule) {
                    return $schedule->manPowerRequest->shift->hours ?? 0;
                });

            return min($workHours / 80, 1.0); // Normalize to 0-1 (80 hours max for 2 weeks)
        } catch (\Exception $e) {
            Log::warning("Error getting current workload: " . $e->getMessage());
            return 0.0;
        }
    }

    private function calculateShiftPriority($employee, $manpowerRequest, $referenceDate)
    {
        try {
            // Get the last assigned shift for this employee
            $lastSchedule = $employee->schedules()
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
            // Shift 1 (pagi) -> lower priority for next Shift 1, higher for Shift 2, highest for Shift 3
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
            Log::warning("Error calculating shift priority: " . $e->getMessage());
            return 0.5;
        }
    }

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
            Log::warning("Error getting shift order: " . $e->getMessage());
            return null;
        }
    }

    private function getNegativeExamples($startDate)
    {
        $negativeExamples = [];
        
        try {
            // Get employees who were available but not assigned
            $availableEmployees = Employee::where('status', 'available')
                ->where('cuti', 'no')
                ->with(['subSections', 'ratings', 'blindTests', 'schedules'])
                ->limit(50) // Reduced limit to avoid memory issues
                ->get();

            $this->info("👥 Found {$availableEmployees->count()} available employees for negative examples");

            foreach ($availableEmployees as $employee) {
                // Create synthetic negative examples with safe defaults
                $negativeExample = [
                    'work_days_count' => $this->getWorkDaysCount($employee, now()),
                    'rating_value' => $this->getAverageRating($employee),
                    'test_score' => $this->getTestScore($employee),
                    'gender' => $employee->gender === 'male' ? 1 : 0,
                    'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
                    'same_subsection' => 0, // Not same subsection for negative examples
                    'same_section' => 0,    // Not same section for negative examples
                    'current_workload' => $this->getCurrentWorkload($employee, now()),
                    'shift_priority' => 0.3, // Lower shift priority for negative examples
                    'was_assigned' => 0
                ];

                // Only add if valid
                if ($this->isValidFeatureSet($negativeExample)) {
                    $negativeExamples[] = $negativeExample;
                }
            }

        } catch (\Exception $e) {
            Log::error("Negative examples collection failed: " . $e->getMessage());
            $this->error("❌ Negative examples failed: " . $e->getMessage());
        }

        return $negativeExamples;
    }

    private function isValidFeatureSet($features)
    {
        if (!is_array($features) || empty($features)) {
            return false;
        }

        $requiredFeatures = [
            'work_days_count', 'rating_value', 'test_score', 'gender',
            'employee_type', 'same_subsection', 'same_section', 
            'current_workload', 'shift_priority', 'was_assigned'
        ];

        foreach ($requiredFeatures as $feature) {
            if (!array_key_exists($feature, $features)) {
                Log::warning("Missing feature in dataset: {$feature}");
                return false;
            }

            // Check if value is numeric and valid
            $value = $features[$feature];
            if (!is_numeric($value) || is_nan($value) || is_infinite($value)) {
                Log::warning("Invalid value for feature {$feature}: " . $value);
                return false;
            }
        }

        return true;
    }

    // Helper methods for console output
    private function info($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
        Log::info($message);
    }

    private function error($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
        Log::error($message);
    }

    private function warn($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
        Log::warning($message);
    }
}