<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\KetelitianQuestion;

class KetelitianController extends Controller
{
    public function index()
{
    $questions = KetelitianQuestion::where('is_active', true)
        ->inRandomOrder()
        ->limit(50)
        ->get()
        ->map(function ($question) {
            return [
                'left' => $question->left_text,
                'right' => $question->right_text,
                'answer' => $question->answer
            ];
        })
        ->toArray();

    // Render TestPage.jsx for employee test
    return Inertia::render('Psychotest/KetelitianTest/TestPage', [
        'questions' => $questions
    ]);
}


    public function submit(Request $request)
    {
        $answers = $request->get('answers', []);
        
        // Get all active questions from database
        $questions = KetelitianQuestion::where('is_active', true)->get();
        
        $score = 0;
        foreach ($questions as $index => $q) {
            if (isset($answers[$index]) && $answers[$index] === $q['answer']) {
                $score++;
            }
        }

        return response()->json([
            'score' => $score,
            'total' => $questions->count()
        ]);
    }

public function questionsIndex(Request $request)
{
    $perPage = $request->get('per_page', 10);
    $search = $request->get('search', '');
    
    $questions = KetelitianQuestion::query()
        ->when($search, function ($query, $search) {
            return $query->where(function ($q) use ($search) {
                $q->where('left_text', 'like', "%{$search}%")
                  ->orWhere('right_text', 'like', "%{$search}%");
            });
        })
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);
    
    // Render Index.jsx for admin question list
    return Inertia::render('Psychotest/KetelitianTest/Index', [
        'questions' => $questions,
        'filters' => [
            'search' => $search,
            'per_page' => $perPage
        ]
    ]);
}

public function create()
{
    return Inertia::render('Psychotest/KetelitianTest/Create');
}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'left_text' => 'required|string|max:1000',
            'right_text' => 'required|string|max:1000',
            'answer' => 'required|in:S,T',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3'
        ]);

        KetelitianQuestion::create($validated);

        return redirect()->route('admin.ketelitian.questions.index')
            ->with('success', 'Question created successfully!');
    }

    public function edit(KetelitianQuestion $question)
{
    return Inertia::render('Psychotest/KetelitianTest/Edit', [
        'question' => $question
    ]);
}

    public function update(Request $request, KetelitianQuestion $question)
    {
        $validated = $request->validate([
            'left_text' => 'required|string|max:1000',
            'right_text' => 'required|string|max:1000',
            'answer' => 'required|in:S,T',
            'is_active' => 'boolean',
            'difficulty_level' => 'required|integer|min:1|max:3'
        ]);

        $question->update($validated);

        return redirect()->route('admin.ketelitian.questions.index')
            ->with('success', 'Question updated successfully!');
    }

    public function destroy(KetelitianQuestion $question)
    {
        $question->delete();

        return redirect()->route('admin.ketelitian.questions.index')
            ->with('success', 'Question deleted successfully!');
    }

    public function bulkToggleActive(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'is_active' => 'required|boolean'
        ]);

        KetelitianQuestion::whereIn('id', $request->ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json(['message' => 'Questions updated successfully']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        KetelitianQuestion::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Questions deleted successfully']);
    }

    // In your KetelitianController.php, add this method:
public function downloadTemplate()
{
    $csv = "left_text,right_text,answer,difficulty_level,is_active\n";
    $csv .= "PT Astra International Tbk,PT Astra International Tbk,S,1,1\n";
    $csv .= "0812-3456-7890,0812-3456-7891,T,1,1\n";
    $csv .= "Budi Santoso,Budi Santoso,S,1,1\n";
    $csv .= "Jl. Sudirman No. 123,Jl. Sudirman No. 124,T,2,1\n";
    $csv .= "Invoice #INV-2024-00123,Invoice #INV-2024-00123,S,2,1\n";
    $csv .= "Project Alpha Budget $50.000,Project Alpha Budget $50.000,S,2,1\n";
    $csv .= "Serial: A1B2-C3D4-E5F6,Serial: A1B2-C3D4-E5F6,S,3,1\n";
    $csv .= "Product Code: XPR-2024,Product Code: XPR-2024,S,3,1\n";
    $csv .= "License: ABC-123-DEF,License: ABC-123-DEG,T,3,1\n";
    
    return response($csv)
        ->header('Content-Type', 'text/csv; charset=utf-8')
        ->header('Content-Disposition', 'attachment; filename="ketelitian_template.csv"');
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
        $hasHeader = str_contains($firstLine, 'left_text') || 
                     str_contains($firstLine, 'right_text') || 
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
            if (count($row) < 3) {
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
            return redirect()->route('admin.ketelitian.questions.index')
                ->with('success', $message)
                ->with('import_errors', array_slice($errors, 0, 10)); // Show first 10 errors only
        } else {
            return redirect()->route('admin.ketelitian.questions.index')
                ->with('error', 'Tidak ada soal yang berhasil diimport. ' . implode(' ', $errors));
        }
        
    } catch (\Exception $e) {
        \Log::error('Import error: ' . $e->getMessage());
        return redirect()->route('admin.ketelitian.questions.index')
            ->with('error', 'Error saat import: ' . $e->getMessage());
    }
}

private function importQuestion($row)
{
    try {
        // Ensure we have at least 5 columns with default values
        $row = array_pad($row, 5, '');
        
        $data = [
            'left_text' => trim($row[0]),
            'right_text' => trim($row[1]),
            'answer' => strtoupper(trim($row[2])),
            'difficulty_level' => (int)trim($row[3]),
            'is_active' => true, // Default to active
        ];
        
        // Validate required fields
        if (empty($data['left_text']) || empty($data['right_text'])) {
            return ['success' => false, 'error' => 'Teks kiri/kanan tidak boleh kosong'];
        }
        
        // Validate answer
        $data['answer'] = strtoupper($data['answer']);
        if (!in_array($data['answer'], ['S', 'T'])) {
            // Try to interpret common variations
            $answerLower = strtolower($data['answer']);
            if ($answerLower === 'sama' || $answerLower === 'ya' || $answerLower === 'y' || $answerLower === 'true') {
                $data['answer'] = 'S';
            } elseif ($answerLower === 'tidak sama' || $answerLower === 'tidak' || $answerLower === 't' || $answerLower === 'false') {
                $data['answer'] = 'T';
            } else {
                return ['success' => false, 'error' => "Jawaban harus 'S' atau 'T' (ditemukan: {$row[2]})"];
            }
        }
        
        // Validate difficulty level
        if ($data['difficulty_level'] < 1 || $data['difficulty_level'] > 3) {
            $data['difficulty_level'] = 1; // Default to easy
        }
        
        // Handle is_active from column 4 if provided
        if (isset($row[4]) && $row[4] !== '') {
            $isActive = strtolower(trim($row[4]));
            $data['is_active'] = in_array($isActive, ['1', 'true', 'yes', 'y', 'aktif', 'active']);
        }
        
        // Check if question already exists (case-insensitive)
        $exists = KetelitianQuestion::whereRaw('LOWER(left_text) = ?', [strtolower($data['left_text'])])
            ->whereRaw('LOWER(right_text) = ?', [strtolower($data['right_text'])])
            ->exists();
            
        if (!$exists) {
            KetelitianQuestion::create($data);
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