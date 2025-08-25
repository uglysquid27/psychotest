<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalogiController extends Controller
{
    public function index()
    {
        // Load soal analogi dari file
        $questions = include resource_path('data/analogi_questions.php');
        
        // Acak urutan soal
        shuffle($questions);
        
        // Ambil 50 soal untuk tes (atau sesuaikan kebutuhan)
        $testQuestions = array_slice($questions, 0, 50);

        return Inertia::render('Psychotest/AnalogiTest/Index', [
            'questions' => $testQuestions
        ]);
    }

    public function submit(Request $request)
    {
        $data = $request->validate([
            'answers' => 'required|array',
        ]);

        $allQuestions = include resource_path('data/analogi_questions.php');

        $score = 0;
        foreach ($request->questions as $index => $questionData) {
            if (isset($data['answers'][$index]) && $data['answers'][$index] === $questionData['answer']) {
                $score++;
            }
        }

        return response()->json([
            'score' => $score,
            'total' => count($request->questions),
            'correct_answers' => $request->questions
        ]);
    }
}