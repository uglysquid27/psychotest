<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\HitunganQuestion;
use App\Models\HitunganTestResult;

class HitunganController extends Controller
{
    public function index()
    {
        // Get 50 random active questions from database ONLY
        $questions = HitunganQuestion::where('is_active', true)
            ->inRandomOrder()
            ->limit(50)
            ->get()
            ->map(function ($question) {
                return [
                    'question' => $question->question,
                    'answer' => (float) $question->answer // Ensure it's float
                ];
            })
            ->toArray();

        // If not enough questions in database, show error message
        if (count($questions) < 50) {
            return Inertia::render('Psychotest/HitunganTest/TestPage', [
                'questions' => $questions,
                'error' => 'Maaf, belum cukup soal di database. Hanya tersedia ' . count($questions) . ' soal dari 50 soal yang dibutuhkan.'
            ]);
        }

        // Render TestPage.jsx for employee test
        return Inertia::render('Psychotest/HitunganTest/TestPage', [
            'questions' => $questions
        ]);
    }

    public function submit(Request $request)
{
    $user = auth()->user();
    $userAnswers = $request->input('answers');
    $questions = $request->input('questions');
    $timeElapsed = $request->input('time_elapsed', 0);
    
    $score = 0;
    $correctAnswers = 0;
    $wrongAnswers = 0;
    $unanswered = 0;
    $totalQuestions = count($questions);
    
    // Calculate score
    foreach ($questions as $i => $q) {
        if (isset($userAnswers[$i]) && $userAnswers[$i] !== '') {
            if (floatval($userAnswers[$i]) === floatval($q['answer'])) {
                $score++;
                $correctAnswers++;
            } else {
                $wrongAnswers++;
            }
        } else {
            $unanswered++;
        }
    }
    
    $percentage = $totalQuestions > 0 ? ($score / $totalQuestions) * 100 : 0;
    
    // Save to database
    HitunganTestResult::create([
        'user_id' => $user->id,
        'score' => $score,
        'total_questions' => $totalQuestions,
        'correct_answers' => $correctAnswers,
        'wrong_answers' => $wrongAnswers,
        'unanswered' => $unanswered,
        'time_elapsed' => $timeElapsed,
        'percentage' => $percentage,
        'answers' => json_encode($userAnswers),
    ]);
    
    // Return JSON response for AJAX call
    return response()->json([
        'success' => true,
        'score' => $score,
        'total' => $totalQuestions,
        'correctAnswers' => $correctAnswers,
        'wrongAnswers' => $wrongAnswers,
        'unanswered' => $unanswered,
        'timeElapsed' => $timeElapsed,
        'percentage' => $percentage,
        'message' => 'Hasil tes telah disimpan.'
    ]);
}

    // ADMIN SECTION - Question Management
    public function questionsIndex(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');
        
        $questions = HitunganQuestion::query()
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('question', 'like', "%{$search}%")
                      ->orWhere('answer', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
        
        return Inertia::render('Psychotest/HitunganTest/Index', [
            'questions' => $questions,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage
            ]
        ]);
    }

    public function create()
    {
        return Inertia::render('Psychotest/HitunganTest/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'question' => 'required|string|max:1000',
            'answer' => 'required|numeric',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3'
        ]);

        HitunganQuestion::create($validated);

        return redirect()->route('admin.hitungan.questions.index')
            ->with('success', 'Question created successfully!');
    }

    public function edit(HitunganQuestion $question)
    {
        return Inertia::render('Psychotest/HitunganTest/Edit', [
            'question' => $question
        ]);
    }

    public function update(Request $request, HitunganQuestion $question)
    {
        $validated = $request->validate([
            'question' => 'required|string|max:1000',
            'answer' => 'required|numeric',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3'
        ]);

        $question->update($validated);

        return redirect()->route('admin.hitungan.questions.index')
            ->with('success', 'Question updated successfully!');
    }

    public function destroy(HitunganQuestion $question)
    {
        $question->delete();

        return redirect()->route('admin.hitungan.questions.index')
            ->with('success', 'Question deleted successfully!');
    }

    public function bulkToggleActive(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'is_active' => 'required|boolean'
        ]);

        HitunganQuestion::whereIn('id', $request->ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json(['message' => 'Questions updated successfully']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        HitunganQuestion::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Questions deleted successfully']);
    }

    public function downloadTemplate()
    {
        $csv = "question,answer,difficulty_level,is_active\n";
        $csv .= "8 + 1 + 5,14,1,1\n";
        $csv .= "10 x 2 x 3,60,1,1\n";
        $csv .= "1 - 1 x 1 - 1,-1,2,1\n";
        $csv .= "4 x 5 : 1 - 3,17,2,1\n";
        $csv .= "3 x 3 : 3 + 21,24,2,1\n";
        $csv .= "100 x 10 : 100 - 9,1,3,1\n";
        $csv .= "16 x 2 : 8 - 4,0,3,1\n";
        $csv .= "(12 + 28 + 4 + 4) : 4,12,3,1\n";
        $csv .= "40 x 90 : 45 - 48,32,3,1\n";
        $csv .= "0.125 x 8 + 3,4,3,1\n";
        
        return response($csv)
            ->header('Content-Type', 'text/csv; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="hitungan_template.csv"');
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
        
        try {
            $content = file_get_contents($file->getPathname());
            
            // Detect and convert encoding
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($encoding && $encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            }
            
            // Remove BOM if present
            $bom = pack('H*','EFBBBF');
            $content = preg_replace("/^$bom/", '', $content);
            
            // Normalize line endings
            $content = str_replace(["\r\n", "\r"], "\n", $content);
            
            $lines = explode("\n", $content);
            
            // Skip empty lines at the beginning
            $startIndex = 0;
            while ($startIndex < count($lines) && trim($lines[$startIndex]) === '') {
                $startIndex++;
            }
            
            // Detect if first line is header
            $firstLine = strtolower(trim($lines[$startIndex] ?? ''));
            $hasHeader = str_contains($firstLine, 'question') || 
                         str_contains($firstLine, 'answer') ||
                         str_contains($firstLine, 'difficulty') ||
                         str_contains($firstLine, 'is_active');
            
            if ($hasHeader) {
                $startIndex++;
            }
            
            for ($i = $startIndex; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) {
                    continue;
                }
                
                // Parse CSV line
                $row = str_getcsv($line);
                
                // Skip if not enough columns
                if (count($row) < 2) {
                    $errors[] = "Baris " . ($i + 1) . ": Format tidak valid (kurang kolom)";
                    $skipped++;
                    continue;
                }
                
                // Clean up the data
                $row = array_map(function($value) {
                    return trim($value, " \t\n\r\0\x0B\"'");
                }, $row);
                
                $result = $this->importQuestion($row);
                
                if ($result['success']) {
                    $imported++;
                } else {
                    $errors[] = "Baris " . ($i + 1) . ": " . $result['error'];
                    $skipped++;
                }
            }
            
            $message = "Import selesai. ";
            $message .= "Berhasil: $imported soal. ";
            if ($skipped > 0) {
                $message .= "Gagal: $skipped soal. ";
            }
            
            if ($imported > 0) {
                return redirect()->route('admin.hitungan.questions.index')
                    ->with('success', $message)
                    ->with('import_errors', array_slice($errors, 0, 10)); // Show first 10 errors only
            } else {
                return redirect()->route('admin.hitungan.questions.index')
                    ->with('error', 'Tidak ada soal yang berhasil diimport. ' . implode(' ', $errors));
            }
            
        } catch (\Exception $e) {
            \Log::error('Import error: ' . $e->getMessage());
            return redirect()->route('admin.hitungan.questions.index')
                ->with('error', 'Error saat import: ' . $e->getMessage());
        }
    }

    private function importQuestion($row)
    {
        try {
            // Ensure we have at least 4 columns with default values
            $row = array_pad($row, 4, '');
            
            $data = [
                'question' => trim($row[0]),
                'answer' => trim($row[1]),
                'difficulty_level' => (int)trim($row[2]),
                'is_active' => true, // Default to active
            ];
            
            // Validate required fields
            if (empty($data['question'])) {
                return ['success' => false, 'error' => 'Pertanyaan tidak boleh kosong'];
            }
            
            // Validate answer
            if (!is_numeric($data['answer'])) {
                // Try to calculate if it's an expression
                try {
                    $expression = str_replace(
                        ['x', ':', '÷'],
                        ['*', '/', '/'],
                        $data['answer']
                    );
                    eval('$calculated = ' . $expression . ';');
                    $data['answer'] = $calculated;
                } catch (\Exception $e) {
                    return ['success' => false, 'error' => "Jawaban harus angka atau ekspresi matematika (ditemukan: {$row[1]})"];
                }
            }
            
            // Validate difficulty level
            if ($data['difficulty_level'] < 1 || $data['difficulty_level'] > 3) {
                $data['difficulty_level'] = 1; // Default to easy
            }
            
            // Handle is_active from column 3 if provided
            if (isset($row[3]) && $row[3] !== '') {
                $isActive = strtolower(trim($row[3]));
                $data['is_active'] = in_array($isActive, ['1', 'true', 'yes', 'y', 'aktif', 'active']);
            }
            
            // Check if question already exists (case-insensitive)
            $exists = HitunganQuestion::whereRaw('LOWER(question) = ?', [strtolower($data['question'])])
                ->exists();
                
            if (!$exists) {
                HitunganQuestion::create($data);
                return ['success' => true];
            } else {
                return ['success' => false, 'error' => 'Soal sudah ada di database'];
            }
            
        } catch (\Exception $e) {
            \Log::error('Import question error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Error: ' . $e->getMessage()];
        }
    }
}