<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Workload;
use App\Models\BlindTest;
use App\Models\Rating;
use App\Models\Ranking;
use Illuminate\Support\Facades\DB;

class RankingService
{
    public function calculateAllRankings()
    {
        // Ambil semua employee beserta relasi subSections dan section
        $employees = Employee::with(['subSections.section'])->get();

        // Prepare ranking data
        $rankings = $employees->map(function ($employee) {
            // Get latest workload
            $workload = Workload::where('employee_id', $employee->id)
                ->latest('week')
                ->first();

            // Get average rating
            $rating = Rating::where('employee_id', $employee->id)
                ->avg('rating') ?? 0;

            // Get latest blind test
            $blindTest = BlindTest::where('employee_id', $employee->id)
                ->latest('test_date')
                ->first();

            $totalScore = Ranking::calculateTotalScore(
                $workload->workload_point ?? 0,
                $rating,
                $blindTest->result ?? 0
            );

            return [
                'employee_id'      => $employee->id,
                'nik'              => $employee->nik,
                'name'             => $employee->name,
                'type'             => $employee->type,
                'gender'           => $employee->gender,
                'photo'            => $employee->photo,
                'sub_sections'     => $employee->subSections, // <-- tambahin relasi
                'workload'         => $workload->workload_point ?? 0,
                'rating_score'     => $rating,
                'blind_test_score' => $blindTest->result ?? 0,
                'total_score'      => $totalScore,
            ];
        })
        ->sortByDesc('total_score')
        ->values()
        ->map(function ($item, $index) {
            $item['ranking'] = $index + 1;
            return $item;
        });

        // Update / insert ke tabel rankings
        DB::transaction(function () use ($rankings) {
            foreach ($rankings as $rankingData) {
                Ranking::updateOrCreate(
                    ['employee_id' => $rankingData['employee_id']],
                    [
                        'workload'         => $rankingData['workload'],
                        'rating_score'     => $rankingData['rating_score'],
                        'blind_test_score' => $rankingData['blind_test_score'],
                        'total_score'      => $rankingData['total_score'],
                        'ranking'          => $rankingData['ranking'],
                    ]
                );
            }
        });

        return $rankings;
    }
}
