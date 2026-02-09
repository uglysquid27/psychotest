<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\DeretQuestion;
use App\Models\DeretTestResult;

class TesDeretController extends Controller
{
    // USER TEST FUNCTIONS

    public function index()
    {
        // Get 5 random active questions from database
        $questions = DeretQuestion::getTestQuestions(5);

        // Check if $questions is an array and convert to Collection if needed
        if (is_array($questions)) {
            $questions = collect($questions);
        }

        // Transform the questions for the frontend
        $formattedQuestions = $questions->map(function($question) {
            return [
                'id' => $question['id'] ?? $question->id ?? null,
                'sequence' => $question['sequence'] ?? $question->sequence ?? [],
                'answer' => $question['answer'] ?? $question->answer ?? null,
                'pattern_type' => $question['pattern_type'] ?? $question->pattern_type ?? null,
                'explanation' => $question['explanation'] ?? $question->explanation ?? null
            ];
        })->toArray();

        return Inertia::render('Psychotest/DeretTest/TestPage', [
            'initialQuestions' => $formattedQuestions
        ]);
    }

    public function submit(Request $request)
    {
        $user = auth()->user();
        
        // Validate the request
        $validated = $request->validate([
            'userAnswers' => 'required|array',
            'questions' => 'required|array',
            'timeElapsed' => 'required|integer|min:0',
        ]);

        $userAnswers = $validated['userAnswers'];
        $questions = $validated['questions'];
        $timeElapsed = $validated['timeElapsed'];

        $score = 0;
        $correctAnswers = 0;
        $wrongAnswers = 0;
        $unanswered = 0;
        $totalQuestions = count($questions);

        // Calculate score
        foreach ($questions as $index => $question) {
            if (isset($userAnswers[$index]) && $userAnswers[$index] !== '' && $userAnswers[$index] !== null) {
                $userAnswer = intval($userAnswers[$index]);
                $correctAnswer = intval($question['answer']);
                
                if ($userAnswer === $correctAnswer) {
                    $score++;
                    $correctAnswers++;
                } else {
                    $wrongAnswers++;
                }
            } else {
                $unanswered++;
            }
        }

        $percentage = $totalQuestions > 0 ? round(($score / $totalQuestions) * 100, 2) : 0;

        try {
            // Save to database
            $testResult = DeretTestResult::create([
                'user_id' => $user->id,
                'score' => $score,
                'total_questions' => $totalQuestions,
                'correct_answers' => $correctAnswers,
                'wrong_answers' => $wrongAnswers,
                'unanswered' => $unanswered,
                'time_elapsed' => $timeElapsed,
                'percentage' => $percentage,
                'answers' => json_encode($userAnswers),
                'questions_used' => json_encode($questions),
            ]);

            \Log::info('Test result saved successfully', [
                'user_id' => $user->id,
                'score' => $score,
                'test_result_id' => $testResult->id
            ]);

            return response()->json([
                'success' => true,
                'score' => $score,
                'total' => $totalQuestions,
                'correctAnswers' => $correctAnswers,
                'wrongAnswers' => $wrongAnswers,
                'unanswered' => $unanswered,
                'timeElapsed' => $timeElapsed,
                'percentage' => $percentage,
                'message' => 'Hasil tes berhasil disimpan!'
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to save test result', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan hasil tes: ' . $e->getMessage()
            ], 500);
        }
    }

    // ADMIN SECTION - Question Management

    public function questionsIndex(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');

        $questions = DeretQuestion::query()
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('pattern_type', 'like', "%{$search}%")
                        ->orWhere('explanation', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return Inertia::render('Psychotest/DeretTest/Index', [
            'questions' => $questions,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage
            ]
        ]);
    }

    public function create()
    {
        return Inertia::render('Psychotest/DeretTest/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sequence' => 'required|array',
            'sequence.*' => 'nullable|numeric',
            'answer' => 'required|integer',
            'pattern_type' => 'nullable|string|max:100',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3',
            'explanation' => 'nullable|string|max:500'
        ]);

        DeretQuestion::create($validated);

        return redirect()->route('admin.deret.questions.index')
            ->with('success', 'Soal deret berhasil dibuat!');
    }

    public function edit(DeretQuestion $question)
    {
        return Inertia::render('Psychotest/DeretTest/Edit', [
            'question' => $question
        ]);
    }

    public function update(Request $request, DeretQuestion $question)
    {
        $validated = $request->validate([
            'sequence' => 'required|array',
            'sequence.*' => 'nullable|numeric',
            'answer' => 'required|integer',
            'pattern_type' => 'nullable|string|max:100',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3',
            'explanation' => 'nullable|string|max:500'
        ]);

        $question->update($validated);

        return redirect()->route('admin.deret.questions.index')
            ->with('success', 'Soal deret berhasil diperbarui!');
    }

    public function destroy(DeretQuestion $question)
    {
        $question->delete();

        return redirect()->route('admin.deret.questions.index')
            ->with('success', 'Soal deret berhasil dihapus!');
    }

    public function bulkToggleActive(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'is_active' => 'required|boolean'
        ]);

        DeretQuestion::whereIn('id', $request->ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json(['message' => 'Soal berhasil diperbarui']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        DeretQuestion::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Soal berhasil dihapus']);
    }

    public function downloadTemplate()
    {
        $csv = "sequence,answer,pattern_type,difficulty_level,explanation,is_active\n";
        $csv .= "\"[2,4,6,null,10]\",8,arithmetic,1,Tambah 2 setiap langkah,1\n";
        $csv .= "\"[1,3,9,null,81]\",27,geometric,2,Kali 3 setiap langkah,1\n";
        $csv .= "\"[5,10,15,null,25]\",20,arithmetic,1,Tambah 5 setiap langkah,1\n";
        $csv .= "\"[100,50,25,null,6.25]\",12.5,geometric,2,Bagi 2 setiap langkah,1\n";
        $csv .= "\"[1,4,9,null,25]\",16,square,3,Bilangan kuadrat,1\n";
        $csv .= "\"[2,3,5,null,13]\",8,fibonacci,3,Bilangan Fibonacci,1\n";
        
        return response($csv)
            ->header('Content-Type', 'text/csv; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="deret_template.csv"');
    }

    public function import(Request $request)
    {
        $request->validate([
            'excel_file' => 'required|file|mimes:csv,txt|max:2048'
        ]);

        $file = $request->file('excel_file');
        $imported = 0;
        $skipped = 0;
        $errors = [];

        \Log::info('Starting import of deret questions file: ' . $file->getClientOriginalName());

        try {
            $content = file_get_contents($file->getPathname());
            \Log::info('File size: ' . strlen($content) . ' bytes');

            // Detect and convert encoding
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            \Log::info('Detected encoding: ' . ($encoding ?: 'unknown'));

            if ($encoding && $encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            }

            // Remove BOM if present
            $bom = pack('H*', 'EFBBBF');
            $content = preg_replace("/^$bom/", '', $content);

            // Normalize line endings
            $content = str_replace(["\r\n", "\r"], "\n", $content);

            $lines = explode("\n", $content);
            \Log::info('Total lines in file: ' . count($lines));

            // Skip empty lines at the beginning
            $startIndex = 0;
            while ($startIndex < count($lines) && trim($lines[$startIndex]) === '') {
                $startIndex++;
            }

            \Log::info('Start index after skipping empty lines: ' . $startIndex);

            // Detect if first line is header
            $firstLine = strtolower(trim($lines[$startIndex] ?? ''));
            \Log::info('First line content: ' . $firstLine);

            $hasHeader = str_contains($firstLine, 'sequence') ||
                str_contains($firstLine, 'answer') ||
                str_contains($firstLine, 'pattern_type') ||
                str_contains($firstLine, 'difficulty') ||
                str_contains($firstLine, 'explanation') ||
                str_contains($firstLine, 'is_active');

            \Log::info('Has header: ' . ($hasHeader ? 'yes' : 'no'));

            if ($hasHeader) {
                $startIndex++;
                \Log::info('Skipping header, new start index: ' . $startIndex);
            }

            for ($i = $startIndex; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) {
                    \Log::debug('Line ' . ($i + 1) . ': Empty line, skipping');
                    continue;
                }

                \Log::debug('Processing line ' . ($i + 1) . ': ' . $line);

                // Parse CSV line
                $row = str_getcsv($line);
                \Log::debug('Parsed row: ' . json_encode($row));

                // Skip if not enough columns
                if (count($row) < 2) {
                    $errorMsg = "Baris " . ($i + 1) . ": Format tidak valid (kurang kolom)";
                    $errors[] = $errorMsg;
                    \Log::warning($errorMsg);
                    $skipped++;
                    continue;
                }

                // Clean up the data
                $row = array_map(function ($value) {
                    return trim($value, " \t\n\r\0\x0B\"'");
                }, $row);

                \Log::debug('Cleaned row: ' . json_encode($row));

                $result = $this->importQuestion($row);

                if ($result['success']) {
                    $imported++;
                    \Log::info('Line ' . ($i + 1) . ': Import successful');
                } else {
                    $errorMsg = "Baris " . ($i + 1) . ": " . $result['error'];
                    $errors[] = $errorMsg;
                    \Log::warning($errorMsg);
                    $skipped++;
                }
            }

            $message = "Import selesai. ";
            $message .= "Berhasil: $imported soal. ";
            if ($skipped > 0) {
                $message .= "Gagal: $skipped soal. ";
            }

            \Log::info('Import completed: ' . $message);

            if ($imported > 0) {
                return redirect()->route('admin.deret.questions.index')
                    ->with('success', $message)
                    ->with('import_errors', array_slice($errors, 0, 10));
            } else {
                return redirect()->route('admin.deret.questions.index')
                    ->with('error', 'Tidak ada soal yang berhasil diimport. ' . implode(' ', $errors));
            }

        } catch (\Exception $e) {
            \Log::error('Import error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return redirect()->route('admin.deret.questions.index')
                ->with('error', 'Error saat import: ' . $e->getMessage());
        }
    }

    private function importQuestion($row)
    {
        try {
            \Log::debug('Starting importQuestion with row: ' . json_encode($row));

            // Ensure we have at least 6 columns with default values
            $row = array_pad($row, 6, '');
            \Log::debug('Padded row: ' . json_encode($row));

            // Parse sequence (should be like [2,4,6,null,10])
            $sequenceStr = trim($row[0], '[] ');
            \Log::debug('Sequence string: ' . $sequenceStr);

            $sequenceParts = array_map('trim', explode(',', $sequenceStr));
            \Log::debug('Sequence parts: ' . json_encode($sequenceParts));

            $sequence = [];
            $nullCount = 0;

            foreach ($sequenceParts as $index => $part) {
                if (strtolower($part) === 'null' || $part === '') {
                    $sequence[] = null;
                    $nullCount++;
                    \Log::debug('Part ' . $index . ': null detected');
                } elseif (is_numeric($part)) {
                    $sequence[] = floatval($part);
                    \Log::debug('Part ' . $index . ': number ' . $part);
                } else {
                    $sequence[] = $part;
                    \Log::debug('Part ' . $index . ': string ' . $part);
                }
            }

            \Log::debug('Final sequence: ' . json_encode($sequence));
            \Log::debug('Null count: ' . $nullCount);

            // Validate that sequence has exactly one null value
            if ($nullCount !== 1) {
                $errorMsg = 'Sequence harus memiliki tepat satu null (angka yang hilang). Ditemukan: ' . $nullCount;
                \Log::warning($errorMsg);
                return ['success' => false, 'error' => $errorMsg];
            }

            $data = [
                'sequence' => $sequence,
                'answer' => trim($row[1]),
                'pattern_type' => trim($row[2]) ?: 'arithmetic',
                'difficulty_level' => (int) trim($row[3]) ?: 1,
                'explanation' => trim($row[4]),
                'is_active' => true,
            ];

            \Log::debug('Data to import: ' . json_encode($data));

            // Validate required fields
            if (empty($data['sequence']) || !is_array($data['sequence'])) {
                $errorMsg = 'Sequence tidak valid';
                \Log::warning($errorMsg);
                return ['success' => false, 'error' => $errorMsg];
            }

            // Validate answer
            if (!is_numeric($data['answer'])) {
                $errorMsg = "Jawaban harus angka (ditemukan: {$row[1]})";
                \Log::warning($errorMsg);
                return ['success' => false, 'error' => $errorMsg];
            }

            // Convert answer to integer
            $data['answer'] = (int) $data['answer'];

            // Validate difficulty level
            if ($data['difficulty_level'] < 1 || $data['difficulty_level'] > 3) {
                $data['difficulty_level'] = 1;
                \Log::info('Difficulty level adjusted to: 1');
            }

            // Handle is_active from column 5 if provided
            if (isset($row[5]) && $row[5] !== '') {
                $isActive = strtolower(trim($row[5]));
                $data['is_active'] = in_array($isActive, ['1', 'true', 'yes', 'y', 'aktif', 'active']);
                \Log::debug('is_active parsed: ' . ($data['is_active'] ? 'true' : 'false'));
            }

            // Check if similar question already exists
            $exists = DeretQuestion::where('answer', $data['answer'])
                ->whereJsonContains('sequence', $sequence)
                ->exists();

            if (!$exists) {
                DeretQuestion::create($data);
                \Log::info('Question created successfully');
                return ['success' => true];
            } else {
                $errorMsg = 'Soal serupa sudah ada di database';
                \Log::warning($errorMsg);
                return ['success' => false, 'error' => $errorMsg];
            }

        } catch (\Exception $e) {
            \Log::error('Import question error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return ['success' => false, 'error' => 'Error: ' . $e->getMessage()];
        }
    }
}