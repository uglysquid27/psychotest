<?php

namespace App\Http\Controllers;

use App\Models\KraepelinTest;
use App\Models\KraepelinTestResult;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

    public function submit(Request $request)
{
    if (!auth()->check()) {
        return response()->json([
            'success' => false,
            'message' => 'User not authenticated'
        ], 401);
    }

    $user = auth()->user();
    $userAnswers = $request->input('answers', []);
    $numberMatrix = $request->input('number_matrix', []); // Changed from test_data to number_matrix
    $timeElapsed = $request->input('time_elapsed', 0);
    $rows = $request->input('rows', 45);
    $cols = $request->input('cols', 60);
    
    Log::info('Kraepelin Submit - Received data:', [
        'answers_count' => count($userAnswers),
        'number_matrix_count' => count($numberMatrix),
        'rows' => $rows,
        'cols' => $cols,
        'time_elapsed' => $timeElapsed
    ]);
    
    $score = 0;
    $correctAnswers = 0;
    $wrongAnswers = 0;
    $unanswered = 0;
    $totalQuestions = ($rows - 1) * $cols; // For 5x5: 4 * 5 = 20
    
    // Calculate score from number_matrix (raw numbers, not pre-calculated pairs)
    for ($col = 0; $col < $cols; $col++) {
        for ($row = 0; $row < $rows - 1; $row++) {
            // Get numbers from the matrix
            $num1 = $numberMatrix[$row][$col] ?? null;
            $num2 = $numberMatrix[$row + 1][$col] ?? null;
            
            if ($num1 === null || $num2 === null) {
                continue;
            }
            
            $correctAnswer = ($num1 + $num2) % 10;
            
            // Get user's answer
            $userAnswer = $userAnswers[$row][$col] ?? null;
            
            Log::info("Checking - Col $col, Row $row", [
                'num1' => $num1,
                'num2' => $num2,
                'correct' => $correctAnswer,
                'user' => $userAnswer
            ]);
            
            if ($userAnswer === null || $userAnswer === '') {
                $unanswered++;
            } elseif ($userAnswer == $correctAnswer) {
                $score++;
                $correctAnswers++;
            } else {
                $wrongAnswers++;
            }
        }
    }
    
    // Calculate row performance
    $rowPerformance = [];
    for ($row = 0; $row < $rows - 1; $row++) {
        $answered = 0;
        for ($col = 0; $col < $cols; $col++) {
            if (isset($userAnswers[$row][$col]) && 
                $userAnswers[$row][$col] !== null && 
                $userAnswers[$row][$col] !== '') {
                $answered++;
            }
        }
        $rowPerformance[] = $answered;
    }
    
    // Calculate column performance
    $columnPerformance = [];
    for ($col = 0; $col < $cols; $col++) {
        $answered = 0;
        for ($row = 0; $row < $rows - 1; $row++) {
            if (isset($userAnswers[$row][$col]) && 
                $userAnswers[$row][$col] !== null && 
                $userAnswers[$row][$col] !== '') {
                $answered++;
            }
        }
        $columnPerformance[] = $answered;
    }
    
    $percentage = $totalQuestions > 0 ? ($score / $totalQuestions) * 100 : 0;
    
    Log::info('Kraepelin Submit - Results:', [
        'score' => $score,
        'total' => $totalQuestions,
        'correct' => $correctAnswers,
        'wrong' => $wrongAnswers,
        'unanswered' => $unanswered,
        'percentage' => $percentage
    ]);
    
    try {
        // Save to database
        $result = KraepelinTestResult::create([
            'user_id' => $user->id,
            'score' => $score,
            'total_questions' => $totalQuestions,
            'correct_answers' => $correctAnswers,
            'wrong_answers' => $wrongAnswers,
            'unanswered' => $unanswered,
            'time_elapsed' => $timeElapsed,
            'percentage' => $percentage,
            'test_data' => json_encode($numberMatrix), // Save the number matrix
            'answers' => json_encode($userAnswers),
            'row_performance' => json_encode($rowPerformance),
            'column_performance' => json_encode($columnPerformance),
        ]);
        
        Log::info('Kraepelin Submit - Saved to database with ID: ' . $result->id);
        
        return response()->json([
            'success' => true,
            'score' => $score,
            'total' => $totalQuestions,
            'correctAnswers' => $correctAnswers,
            'wrongAnswers' => $wrongAnswers,
            'unanswered' => $unanswered,
            'timeElapsed' => $timeElapsed,
            'percentage' => $percentage,
            'rowPerformance' => $rowPerformance,
            'columnPerformance' => $columnPerformance,
            'message' => 'Hasil tes telah disimpan.'
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error saving kraepelin test result: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'message' => 'Gagal menyimpan hasil tes: ' . $e->getMessage()
        ], 500);
    }
}

    private function calculateRowPerformance($userAnswers, $rows, $cols)
    {
        $rowPerformance = array_fill(0, $rows - 1, 0); // One less row than matrix

        // User answers structure: array[col][row] = answer
        for ($col = 0; $col < $cols; $col++) {
            for ($row = 0; $row < $rows - 1; $row++) {
                if (
                    isset($userAnswers[$col][$row]) &&
                    $userAnswers[$col][$row] !== null &&
                    $userAnswers[$col][$row] !== ''
                ) {
                    $rowPerformance[$row]++;
                }
            }
        }

        return $rowPerformance;
    }

    private function calculateColumnPerformance($userAnswers, $rows, $cols)
    {
        $columnPerformance = array_fill(0, $cols, 0);

        for ($col = 0; $col < $cols; $col++) {
            $answered = 0;
            if (isset($userAnswers[$col])) {
                for ($row = 0; $row < $rows - 1; $row++) {
                    if (
                        isset($userAnswers[$col][$row]) &&
                        $userAnswers[$col][$row] !== null &&
                        $userAnswers[$col][$row] !== ''
                    ) {
                        $answered++;
                    }
                }
            }
            $columnPerformance[$col] = $answered;
        }

        return $columnPerformance;
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
    public function destroy(KraepelinTestResult $result)
    {
        $result->delete();

        return redirect()->route('admin.kraepelin.results.index')
            ->with('success', 'Test result deleted successfully!');
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
    private function calculateResults($testData, $userAnswers)
    {
        $score = 0;
        $correct = 0;
        $wrong = 0;
        $unanswered = 0;

        foreach ($testData as $colIndex => $column) {
            foreach ($column as $rowIndex => $question) {
                $userAnswer = $userAnswers[$colIndex][$rowIndex] ?? null;
                $correctAnswer = ($question['num1'] + $question['num2']) % 10;

                if ($userAnswer === null || $userAnswer === '') {
                    $unanswered++;
                } elseif ($userAnswer == $correctAnswer) {
                    $score++;
                    $correct++;
                } else {
                    $wrong++;
                }
            }
        }

        return [
            'score' => $score,
            'correct' => $correct,
            'wrong' => $wrong,
            'unanswered' => $unanswered
        ];
    }

    public function generateTest(Request $request)
    {
        $rows = $request->input('rows', 27);
        $cols = $request->input('cols', 22);

        $testData = [];

        for ($col = 0; $col < $cols; $col++) {
            $column = [];
            for ($row = 0; $row < $rows; $row++) {
                // Generate random numbers 1-9
                $column[] = [
                    'num1' => rand(1, 9),
                    'num2' => rand(1, 9)
                ];
            }
            $testData[] = $column;
        }

        return response()->json([
            'success' => true,
            'test_data' => $testData,
            'rows' => $rows,
            'cols' => $cols,
            'total_questions' => ($rows - 1) * $cols
        ]);
    }

      public function resultsIndex(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');
        
        $results = KraepelinTestResult::with('user')
            ->when($search, function ($query, $search) {
                return $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
        
        return Inertia::render('Psychotest/KraepelinTest/Results', [
            'results' => $results,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage
            ]
        ]);
    }

     public function myResults(Request $request)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 10);
        
        $results = KraepelinTestResult::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
        
        return Inertia::render('Psychotest/KraepelinTest/MyResults', [
            'results' => $results
        ]);
    }

    public function showResult($id)
    {
        $result = KraepelinTestResult::with('user')
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        // Parse JSON data
        $result->test_data = json_decode($result->test_data, true);
        $result->answers = json_decode($result->answers, true);
        $result->row_performance = json_decode($result->row_performance, true);
        $result->column_performance = json_decode($result->column_performance, true);

        return Inertia::render('Psychotest/KraepelinTest/ResultDetail', [
            'result' => $result
        ]);
    }

    /**
     * Calculate performance score based on accuracy and speed
     */
    private function calculatePerformanceScore($correct, $wrong, $total)
    {
        if ($total === 0)
            return 0;

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