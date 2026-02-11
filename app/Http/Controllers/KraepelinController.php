<?php

namespace App\Http\Controllers;

use App\Models\KraepelinTest;
use App\Models\KraepelinTestResult;
use App\Models\Employee;
use App\Models\KraepelinSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\EmployeeTestAssignment;

class KraepelinController extends Controller
{
    /**
     * Display the Kraepelin test page with settings
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        // Check if employee has access to this test
        if ($user->nik) {
            $assignment = EmployeeTestAssignment::where('nik', $user->nik)
                ->where('test_type', 'kraepelin')
                ->whereIn('status', [
                    EmployeeTestAssignment::STATUS_ASSIGNED,
                    EmployeeTestAssignment::STATUS_IN_PROGRESS,
                ])
                ->first();

            if (!$assignment) {
                return redirect()->route('employee.test-assignments.my')
                    ->with('error', 'Anda tidak memiliki akses ke tes ini. Silakan hubungi administrator.');
            }

            if (!$assignment->isAccessible()) {
                return redirect()->route('employee.test-assignments.my')
                    ->with('error', 'Tes ini sudah melewati batas waktu. Anda tidak dapat mengakses tes ini lagi.');
            }
            
            if (!$user->hasRole('admin') && !$user->hasRole('super_admin')) {
                if ($assignment->due_date) {
                    $dueDate = \Carbon\Carbon::parse($assignment->due_date);
                    $today = \Carbon\Carbon::today();
                    
                    if ($dueDate->lessThan($today)) {
                        $assignment->update([
                            'status' => EmployeeTestAssignment::STATUS_EXPIRED
                        ]);
                        
                        return redirect()->route('employee.test-assignments.my')
                            ->with('error', 'Tes ini sudah melewati batas waktu. Anda tidak dapat mengakses tes ini lagi.');
                    }
                }
            }
        }

        // Get test configuration
        $settingId = $request->get('setting_id');
        $useCustom = $request->get('use_custom', false);
        
        if ($useCustom) {
            // Custom configuration
            $rows = $request->get('custom_rows', 45);
            $columns = $request->get('custom_columns', 60);
            $timePerColumn = $request->get('custom_time_per_column', 15);
            $difficulty = 'custom';
        } elseif ($settingId) {
            // Get specific setting
            $setting = KraepelinSetting::findOrFail($settingId);
            $rows = $setting->rows;
            $columns = $setting->columns;
            $timePerColumn = $setting->time_per_column;
            $difficulty = $setting->difficulty;
        } else {
            // Get default active setting
            $setting = KraepelinSetting::active()->first();
            if (!$setting) {
                // Fallback to default values
                $rows = 45;
                $columns = 60;
                $timePerColumn = 15;
                $difficulty = 'sedang';
            } else {
                $rows = $setting->rows;
                $columns = $setting->columns;
                $timePerColumn = $setting->time_per_column;
                $difficulty = $setting->difficulty;
            }
        }

        // Calculate totals
        $totalQuestions = ($rows - 1) * $columns;
        $totalTime = $columns * $timePerColumn;
        $totalTimeFormatted = $this->formatTime($totalTime);

        return Inertia::render('Psychotest/KraepelinTest/TestPage', [
            'testConfig' => [
                'rows' => $rows,
                'columns' => $columns,
                'timePerColumn' => $timePerColumn,
                'difficulty' => $difficulty,
                'totalQuestions' => $totalQuestions,
                'totalTime' => $totalTime,
                'totalTimeFormatted' => $totalTimeFormatted,
                'settingId' => $settingId ?? null,
                'useCustom' => $useCustom,
                'customRows' => $useCustom ? $rows : null,
                'customColumns' => $useCustom ? $columns : null,
                'customTimePerColumn' => $useCustom ? $timePerColumn : null,
            ]
        ]);
    }

    /**
     * Generate test data based on configuration and difficulty
     */
    public function generateTestData(Request $request)
    {
        $request->validate([
            'rows' => 'required|integer|min:20|max:100',
            'columns' => 'required|integer|min:20|max:100',
            'difficulty' => 'required|in:mudah,sedang,sulit,custom'
        ]);

        $rows = $request->rows;
        $columns = $request->columns;
        $difficulty = $request->difficulty;

        $testData = $this->generateNumberMatrix($rows, $columns, $difficulty);

        return response()->json([
            'success' => true,
            'test_data' => $testData,
            'rows' => $rows,
            'columns' => $columns,
            'total_questions' => ($rows - 1) * $columns
        ]);
    }

    /**
     * Generate number matrix with difficulty-based patterns
     */
    private function generateNumberMatrix($rows, $columns, $difficulty)
    {
        $matrix = [];

        for ($col = 0; $col < $columns; $col++) {
            $column = [];
            $previousPairs = []; // Track recent pairs to avoid repetition
            
            for ($row = 0; $row < $rows; $row++) {
                $num1 = $this->generateNumberBasedOnDifficulty($difficulty, $col, $row);
                $num2 = $this->generateNumberBasedOnDifficulty($difficulty, $col, $row + 1);
                
                // Avoid repetitive patterns (like 4-6-4)
                $pair = $num1 . $num2;
                $attempts = 0;
                while ($this->isRepetitivePattern($pair, $previousPairs) && $attempts < 10) {
                    $num1 = $this->generateNumberBasedOnDifficulty($difficulty, $col, $row);
                    $num2 = $this->generateNumberBasedOnDifficulty($difficulty, $col, $row + 1);
                    $pair = $num1 . $num2;
                    $attempts++;
                }
                
                // Store pair for repetition check
                $previousPairs[] = $pair;
                if (count($previousPairs) > 3) {
                    array_shift($previousPairs); // Keep only last 3 pairs
                }
                
                $column[] = [
                    'num1' => $num1,
                    'num2' => $num2
                ];
            }
            $matrix[] = $column;
        }

        return $matrix;
    }

    /**
     * Generate numbers based on difficulty level
     */
    private function generateNumberBasedOnDifficulty($difficulty, $col, $row)
    {
        // Use unique seed for each position to ensure consistency
        $seed = $col * 1000 + $row + crc32($difficulty);
        mt_srand($seed);
        
        switch ($difficulty) {
            case 'sulit': // Difficult
                // More varied numbers, includes occasional zeros
                if (mt_rand(1, 20) === 1) { // 5% chance of zero
                    return 0;
                }
                
                // Biased distribution to make it more challenging
                $dist = [
                    1 => 10, 2 => 10, 3 => 12, 4 => 12, 5 => 12,
                    6 => 12, 7 => 12, 8 => 10, 9 => 10, 0 => 0
                ];
                
                $rand = mt_rand(1, array_sum($dist));
                $cumulative = 0;
                foreach ($dist as $num => $prob) {
                    $cumulative += $prob;
                    if ($rand <= $cumulative) {
                        return $num;
                    }
                }
                return mt_rand(1, 9);
                
            case 'sedang': // Medium
                // Balanced random distribution
                return mt_rand(1, 9);
                
            case 'mudah': // Easy
                // More predictable, less varied, focuses on middle numbers
                $easyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                $weights = [5, 10, 15, 20, 25, 20, 15, 10, 5];
                
                $rand = mt_rand(1, array_sum($weights));
                $cumulative = 0;
                foreach ($weights as $index => $weight) {
                    $cumulative += $weight;
                    if ($rand <= $cumulative) {
                        return $easyNumbers[$index];
                    }
                }
                return mt_rand(1, 9);
                
            default: // Custom or fallback
                return mt_rand(1, 9);
        }
    }

    /**
     * Check if pattern is repetitive
     */
    private function isRepetitivePattern($currentPair, $previousPairs)
    {
        // Check for same number repeated (e.g., 4-4)
        if (substr($currentPair, 0, 1) == substr($currentPair, 1, 1)) {
            return true;
        }
        
        // Check for patterns like 4-6-4
        if (count($previousPairs) >= 2) {
            $lastTwo = array_slice($previousPairs, -2);
            
            // Check if current pair creates a repetitive sequence
            // Example: if last two pairs were "46" and "64", current "46" would create pattern
            if (count($lastTwo) >= 2) {
                $pattern = $lastTwo[0][1] . $lastTwo[1][0] . $currentPair[0];
                if ($lastTwo[0][0] . $lastTwo[0][1] == $lastTwo[1][1] . $currentPair[1]) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Start a new Kraepelin test session with settings
     */
    public function start(Request $request)
    {
        $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'setting_id' => 'nullable|exists:kraepelin_settings,id',
            'rows' => 'nullable|integer|min:20|max:100',
            'columns' => 'nullable|integer|min:20|max:100',
            'time_per_column' => 'nullable|integer|min:5|max:60',
            'difficulty' => 'nullable|in:mudah,sedang,sulit,custom'
        ]);

        try {
            DB::beginTransaction();

            // Get configuration
            if ($request->setting_id) {
                $setting = KraepelinSetting::findOrFail($request->setting_id);
                $rows = $setting->rows;
                $columns = $setting->columns;
                $timePerColumn = $setting->time_per_column;
                $difficulty = $setting->difficulty;
                $settingId = $setting->id;
            } else {
                $rows = $request->rows ?? 45;
                $columns = $request->columns ?? 60;
                $timePerColumn = $request->time_per_column ?? 15;
                $difficulty = $request->difficulty ?? 'sedang';
                $settingId = null;
            }

            // Generate test data based on difficulty
            $testData = $this->generateNumberMatrix($rows, $columns, $difficulty);

            $kraepelinTest = KraepelinTest::create([
                'employee_id' => $request->employee_id,
                'user_id' => Auth::id(),
                'test_data' => json_encode($testData),
                'rows' => $rows,
                'columns' => $columns,
                'time_per_column' => $timePerColumn,
                'difficulty' => $difficulty,
                'duration_minutes' => ceil(($columns * $timePerColumn) / 60),
                'started_at' => now(),
                'status' => 'active',
                'kraepelin_setting_id' => $settingId,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test berhasil dimulai',
                'data' => [
                    'test_id' => $kraepelinTest->id,
                    'test_data' => $testData,
                    'rows' => $rows,
                    'columns' => $columns,
                    'time_per_column' => $timePerColumn,
                    'difficulty' => $difficulty,
                    'total_questions' => ($rows - 1) * $columns,
                    'total_time' => $columns * $timePerColumn,
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
        $numberMatrix = $request->input('number_matrix', []);
        $timeElapsed = $request->input('time_elapsed', 0);
        $rows = $request->input('rows', 45);
        $cols = $request->input('cols', 60);
        $difficulty = $request->input('difficulty', 'sedang');
        $testId = $request->input('test_id');

        Log::info('Kraepelin Submit - Received data:', [
            'answers_count' => count($userAnswers),
            'number_matrix_count' => count($numberMatrix),
            'rows' => $rows,
            'cols' => $cols,
            'time_elapsed' => $timeElapsed,
            'difficulty' => $difficulty,
            'test_id' => $testId
        ]);

        $score = 0;
        $correctAnswers = 0;
        $wrongAnswers = 0;
        $unanswered = 0;
        $totalQuestions = ($rows - 1) * $cols;

        // Calculate score from number_matrix
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
                if (
                    isset($userAnswers[$row][$col]) &&
                    $userAnswers[$row][$col] !== null &&
                    $userAnswers[$row][$col] !== ''
                ) {
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
                if (
                    isset($userAnswers[$row][$col]) &&
                    $userAnswers[$row][$col] !== null &&
                    $userAnswers[$row][$col] !== ''
                ) {
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
            DB::beginTransaction();
            
            // Update the test record if it exists
            $test = null;
            if ($testId) {
                $test = KraepelinTest::find($testId);
                if ($test) {
                    $test->update([
                        'finished_at' => now(),
                        'time_taken_seconds' => $timeElapsed,
                        'status' => 'completed'
                    ]);
                }
            }

            // Save to database
            $result = KraepelinTestResult::create([
                'user_id' => $user->id,
                'kraepelin_test_id' => $testId,
                'score' => $score,
                'total_questions' => $totalQuestions,
                'correct_answers' => $correctAnswers,
                'wrong_answers' => $wrongAnswers,
                'unanswered' => $unanswered,
                'time_elapsed' => $timeElapsed,
                'percentage' => $percentage,
                'test_data' => json_encode($numberMatrix),
                'answers' => json_encode($userAnswers),
                'row_performance' => json_encode($rowPerformance),
                'column_performance' => json_encode($columnPerformance),
                'rows' => $rows,
                'columns' => $cols,
                'difficulty' => $difficulty,
            ]);

            Log::info('Kraepelin Submit - Saved to database with ID: ' . $result->id);

            // Complete assignment if employee has one
            if ($user->nik) {
                $assignment = EmployeeTestAssignment::where('nik', $user->nik)
                    ->where('test_type', 'kraepelin')
                    ->whereIn('status', [
                        EmployeeTestAssignment::STATUS_ASSIGNED,
                        EmployeeTestAssignment::STATUS_IN_PROGRESS,
                    ])
                    ->first();

                if ($assignment) {
                    $assignment->completeTest($score, $totalQuestions, [
                        'correct_answers' => $correctAnswers,
                        'wrong_answers' => $wrongAnswers,
                        'unanswered' => $unanswered,
                        'time_elapsed' => $timeElapsed,
                        'percentage' => $percentage,
                        'difficulty' => $difficulty,
                        'rows' => $rows,
                        'columns' => $cols,
                    ]);
                }
            }

            DB::commit();

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
                'difficulty' => $difficulty,
                'message' => 'Hasil tes telah disimpan.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving kraepelin test result: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan hasil tes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get test results with filtering
     */
    public function results(Request $request)
    {
        $query = KraepelinTest::with(['result', 'employee', 'user', 'setting'])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }

        $tests = $query->paginate($request->per_page ?? 10);

        return Inertia::render('KraepelinTest/Results', [
            'tests' => $tests,
            'filters' => $request->only(['employee_id', 'status', 'difficulty'])
        ]);
    }

    /**
     * Show detailed test result
     */
    public function show($id)
    {
        $test = KraepelinTest::with(['result', 'employee', 'user', 'setting'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        $detailedResults = null;
        if ($test->result) {
            $detailedResults = [
                'test_data' => json_decode($test->result->test_data, true),
                'answers' => json_decode($test->result->answers, true),
                'row_performance' => json_decode($test->result->row_performance, true),
                'column_performance' => json_decode($test->result->column_performance, true),
            ];
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
     * Get active settings for selection
     */
    public function getActiveSettings()
    {
        $settings = KraepelinSetting::active()
            ->orderBy('difficulty')
            ->get()
            ->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'name' => $setting->name,
                    'rows' => $setting->rows,
                    'columns' => $setting->columns,
                    'time_per_column' => $setting->time_per_column,
                    'difficulty' => $setting->difficulty,
                    'description' => $setting->description,
                    'total_questions' => $setting->total_questions,
                    'total_time' => $setting->total_time,
                    'total_time_formatted' => $setting->total_time_formatted,
                ];
            });

        return response()->json([
            'success' => true,
            'settings' => $settings
        ]);
    }

    /**
     * Format time in seconds to readable format
     */
    private function formatTime($seconds)
    {
        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;
        
        if ($minutes > 0) {
            return "{$minutes} menit {$remainingSeconds} detik";
        }
        return "{$remainingSeconds} detik";
    }

    public function resultsIndex(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');
        $difficulty = $request->get('difficulty', '');

        $results = KraepelinTestResult::with(['user', 'test'])
            ->when($search, function ($query, $search) {
                return $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($difficulty, function ($query, $difficulty) {
                return $query->where('difficulty', $difficulty);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return Inertia::render('Psychotest/KraepelinTest/Results', [
            'results' => $results,
            'filters' => [
                'search' => $search,
                'difficulty' => $difficulty,
                'per_page' => $perPage
            ]
        ]);
    }

    public function myResults(Request $request)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 10);
        $difficulty = $request->get('difficulty', '');

        $results = KraepelinTestResult::where('user_id', $user->id)
            ->with('test')
            ->when($difficulty, function ($query, $difficulty) {
                return $query->where('difficulty', $difficulty);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return Inertia::render('Psychotest/KraepelinTest/MyResults', [
            'results' => $results,
            'filters' => ['difficulty' => $difficulty]
        ]);
    }

    public function showResult($id)
    {
        $result = KraepelinTestResult::with(['user', 'test'])
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
}