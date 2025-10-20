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
                    'manPowerRequest.subSection'
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
                $features['was_assigned'] = 1; // Positive example
                
                $trainingData[] = $features;
            }

            // Get negative examples (available but not assigned employees for each request)
            $negativeExamples = $this->getNegativeExamples($startDate);
            $trainingData = array_merge($trainingData, $negativeExamples);

            $this->info("📊 Total training data: " . count($trainingData) . " records");
            $this->info("✅ Positive examples: " . $schedules->count());
            $this->info("❌ Negative examples: " . count($negativeExamples));

            return $trainingData;

        } catch (\Exception $e) {
            Log::error("Training data collection failed: " . $e->getMessage());
            $this->error("❌ Data collection failed: " . $e->getMessage());
            return [];
        }
    }

    private function extractFeatures($employee, $manpowerRequest, $scheduleDate)
    {
        return [
            'work_days_count' => $this->getWorkDaysCount($employee, $scheduleDate),
            'rating_value' => $this->getAverageRating($employee),
            'test_score' => $this->getTestScore($employee),
            'gender' => $employee->gender === 'male' ? 1 : 0,
            'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
            'same_subsection' => $this->isSameSubsection($employee, $manpowerRequest) ? 1 : 0,
            'same_section' => $this->isSameSection($employee, $manpowerRequest) ? 1 : 0,
            'current_workload' => $this->getCurrentWorkload($employee, $scheduleDate),
        ];
    }

    private function getWorkDaysCount($employee, $referenceDate)
    {
        $startDate = Carbon::parse($referenceDate)->subDays(30);
        
        return $employee->schedules()
            ->where('date', '>=', $startDate)
            ->where('date', '<', $referenceDate)
            ->count();
    }

    private function getAverageRating($employee)
    {
        $avg = $employee->ratings()->avg('rating');
        return $avg ?? 3.0; // Default to average rating
    }

    private function getTestScore($employee)
    {
        $latestTest = $employee->blindTests()
            ->latest('test_date')
            ->first();

        return $latestTest && $latestTest->result === 'Pass' ? 1.0 : 0.0;
    }

    private function isSameSubsection($employee, $manpowerRequest)
    {
        return $employee->subSections->contains('id', $manpowerRequest->sub_section_id);
    }

    private function isSameSection($employee, $manpowerRequest)
    {
        $requestSectionId = $manpowerRequest->subSection->section_id ?? null;
        if (!$requestSectionId) return false;

        return $employee->subSections->contains('section_id', $requestSectionId);
    }

    private function getCurrentWorkload($employee, $referenceDate)
    {
        $startDate = Carbon::parse($referenceDate)->subDays(7);
        
        $workHours = $employee->schedules()
            ->where('date', '>=', $startDate)
            ->where('date', '<', $referenceDate)
            ->with('manPowerRequest.shift')
            ->get()
            ->sum(function ($schedule) {
                return $schedule->manPowerRequest->shift->hours ?? 0;
            });

        return min($workHours / 40, 1.0); // Normalize to 0-1 (40 hours max)
    }

    private function getNegativeExamples($startDate)
    {
        $negativeExamples = [];
        
        try {
            // Get employees who were available but not assigned
            $availableEmployees = Employee::where('status', 'available')
                ->where('cuti', 'no')
                ->with(['subSections', 'ratings', 'blindTests', 'schedules'])
                ->limit(100) // Limit to avoid memory issues
                ->get();

            foreach ($availableEmployees as $employee) {
                // Create synthetic negative examples
                $negativeExamples[] = [
                    'work_days_count' => $this->getWorkDaysCount($employee, now()),
                    'rating_value' => $this->getAverageRating($employee),
                    'test_score' => $this->getTestScore($employee),
                    'gender' => $employee->gender === 'male' ? 1 : 0,
                    'employee_type' => $employee->type === 'bulanan' ? 1 : 0,
                    'same_subsection' => 0, // Not same subsection for negative examples
                    'same_section' => 0,    // Not same section for negative examples
                    'current_workload' => $this->getCurrentWorkload($employee, now()),
                    'was_assigned' => 0
                ];
            }

        } catch (\Exception $e) {
            Log::error("Negative examples collection failed: " . $e->getMessage());
        }

        return $negativeExamples;
    }

    // Helper methods for console output
    private function info($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
    }

    private function error($message)
    {
        if (app()->runningInConsole()) {
            echo $message . PHP_EOL;
        }
    }
}