<?php

namespace App\Http\Controllers;

use App\Models\KraepelinTest;
use App\Models\KraepelinTestResult;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class KraepelinController extends Controller
{
    /**
     * Display the Kraepelin test page
     */
    public function index()
    {
        return Inertia::render('Psychotest/KraepelinTest/Index');
    }

    /**
     * Start a new Kraepelin test session
     */
    public function start(Request $request)
    {
        $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'duration_minutes' => 'nullable|integer|min:5|max:60'
        ]);

        try {
            DB::beginTransaction();

            // Generate test data (20 columns × 40 rows)
            $testData = $this->generateTestData();

            $kraepelinTest = KraepelinTest::create([
                'employee_id' => $request->employee_id,
                'user_id' => Auth::id(),
                'test_data' => json_encode($testData),
                'duration_minutes' => $request->duration_minutes ?? 10,
                'started_at' => now(),
                'status' => 'active'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test berhasil dimulai',
                'data' => [
                    'test_id' => $kraepelinTest->id,
                    'test_data' => $testData,
                    'duration_minutes' => $kraepelinTest->duration_minutes,
                    'started_at' => $kraepelinTest->started_at->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memulai test: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit test answers and calculate results
     */
    public function submit(Request $request)
    {
        $request->validate([
            'test_id' => 'required|exists:kraepelin_tests,id',
            'answers' => 'required|array',
            'time_taken_seconds' => 'required|integer|min:0'
        ]);

        try {
            DB::beginTransaction();

            $kraepelinTest = KraepelinTest::findOrFail($request->test_id);

            // Check if test belongs to current user
            if ($kraepelinTest->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this test'
                ], 403);
            }

            // Check if test is still active
            if ($kraepelinTest->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Test sudah tidak aktif'
                ], 400);
            }

            // Decode test data to get correct answers
            $testData = json_decode($kraepelinTest->test_data, true);
            $answers = $request->answers;

            // Calculate results
            $results = $this->calculateResults($testData, $answers);

            // Update test status
            $kraepelinTest->update([
                'status' => 'completed',
                'finished_at' => now(),
                'time_taken_seconds' => $request->time_taken_seconds
            ]);

            // Save detailed results
            KraepelinTestResult::create([
                'kraepelin_test_id' => $kraepelinTest->id,
                'answers' => json_encode($answers),
                'total_questions' => $results['total_questions'],
                'total_answered' => $results['total_answered'],
                'correct_answers' => $results['correct_answers'],
                'wrong_answers' => $results['wrong_answers'],
                'accuracy_percentage' => $results['accuracy_percentage'],
                'speed_per_minute' => $results['speed_per_minute'],
                'detailed_results' => json_encode($results['detailed_results']),
                'performance_score' => $results['performance_score']
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test berhasil diselesaikan',
                'data' => [
                    'results' => $results,
                    'test_info' => [
                        'started_at' => $kraepelinTest->started_at,
                        'finished_at' => $kraepelinTest->finished_at,
                        'duration_minutes' => $kraepelinTest->duration_minutes,
                        'time_taken_seconds' => $kraepelinTest->time_taken_seconds
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan hasil test: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get test results
     */
    public function results(Request $request)
    {
        $query = KraepelinTest::with(['result', 'employee', 'user'])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $tests = $query->paginate($request->per_page ?? 10);

        return Inertia::render('KraepelinTest/Results', [
            'tests' => $tests,
            'filters' => $request->only(['employee_id', 'status'])
        ]);
    }

    /**
     * Show detailed test result
     */
    public function show($id)
    {
        $test = KraepelinTest::with(['result', 'employee', 'user'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        $detailedResults = null;
        if ($test->result && $test->result->detailed_results) {
            $detailedResults = json_decode($test->result->detailed_results, true);
        }

        return Inertia::render('KraepelinTest/Detail', [
            'test' => $test,
            'detailed_results' => $detailedResults
        ]);
    }

    /**
     * Delete a test result
     */
    public function destroy($id)
    {
        try {
            $test = KraepelinTest::where('user_id', Auth::id())->findOrFail($id);
            
            DB::beginTransaction();
            
            // Delete related result first
            if ($test->result) {
                $test->result->delete();
            }
            
            $test->delete();
            
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus test: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees for test assignment
     */
    public function employees(Request $request)
    {
        $employees = Employee::select('id', 'name', 'nik', 'photo')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nik', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    /**
     * Generate test data (20 columns × 40 rows)
     */
    private function generateTestData()
    {
        $data = [];
        
        for ($col = 0; $col < 20; $col++) {
            $column = [];
            for ($row = 0; $row < 40; $row++) {
                $num1 = rand(1, 9);
                $num2 = rand(1, 9);
                
                $column[] = [
                    'num1' => $num1,
                    'num2' => $num2,
                    'answer' => $num1 + $num2
                ];
            }
            $data[] = $column;
        }
        
        return $data;
    }

    /**
     * Calculate test results
     */
    private function calculateResults($testData, $answers)
    {
        $totalQuestions = 20 * 40; // 800 total questions
        $totalAnswered = count($answers);
        $correctAnswers = 0;
        $wrongAnswers = 0;
        $detailedResults = [];

        // Check each answer
        foreach ($answers as $key => $userAnswer) {
            [$col, $row] = explode('-', $key);
            $col = (int)$col;
            $row = (int)$row;

            if (isset($testData[$col][$row])) {
                $correctAnswer = $testData[$col][$row]['answer'];
                $isCorrect = (int)$userAnswer === $correctAnswer;

                if ($isCorrect) {
                    $correctAnswers++;
                } else {
                    $wrongAnswers++;
                }

                $detailedResults[] = [
                    'column' => $col + 1,
                    'row' => $row + 1,
                    'num1' => $testData[$col][$row]['num1'],
                    'num2' => $testData[$col][$row]['num2'],
                    'correct_answer' => $correctAnswer,
                    'user_answer' => (int)$userAnswer,
                    'is_correct' => $isCorrect
                ];
            }
        }

        $accuracyPercentage = $totalAnswered > 0 ? round(($correctAnswers / $totalAnswered) * 100, 2) : 0;
        $speedPerMinute = $totalAnswered; // Assuming 1 minute test, adjust based on actual time
        
        // Calculate performance score (0-100)
        $performanceScore = $this->calculatePerformanceScore($correctAnswers, $wrongAnswers, $totalAnswered);

        return [
            'total_questions' => $totalQuestions,
            'total_answered' => $totalAnswered,
            'correct_answers' => $correctAnswers,
            'wrong_answers' => $wrongAnswers,
            'accuracy_percentage' => $accuracyPercentage,
            'speed_per_minute' => $speedPerMinute,
            'performance_score' => $performanceScore,
            'detailed_results' => $detailedResults
        ];
    }

    /**
     * Calculate performance score based on accuracy and speed
     */
    private function calculatePerformanceScore($correct, $wrong, $total)
    {
        if ($total === 0) return 0;

        $accuracy = ($correct / $total) * 100;
        $speed = min($total / 8, 100); // Normalize speed (800 questions = 100%)
        
        // Weight: 70% accuracy, 30% speed
        return round(($accuracy * 0.7) + ($speed * 0.3), 2);
    }

    /**
     * Export test results to PDF/Excel (optional)
     */
    // public function export(Request $request, $id)
    // {
    //     $test = KraepelinTest::with(['result', 'employee', 'user'])
    //         ->where('user_id', Auth::id())
    //         ->findOrFail($id);

    //     $format = $request->format ?? 'pdf';

    //     // Implementation for PDF/Excel export would go here
    //     // This is a placeholder for the export functionality
        
    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Export functionality to be implemented',
    //         'format' => $format
    //     ]);
    // }
}