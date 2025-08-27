<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class TesNumerikController extends Controller
{
    public function index()
    {
        $questions = include resource_path('data/numerik_tabel_questions.php');

        return Inertia::render('Psychotest/NumerikTest/Index', [
            'initialQuestions' => $questions
        ]);
    }

    public function submit(Request $request)
    {
        $answers = $request->input('answers', []);
        $questions = include resource_path('data/numerik_tabel_questions.php');

        $score = 0;
        foreach ($questions as $index => $question) {
            if (isset($answers[$index]) && $answers[$index] == $question['answer']) {
                $score++;
            }
        }

        return response()->json([
            'score' => $score,
            'total' => count($questions),
        ]);
    }
}