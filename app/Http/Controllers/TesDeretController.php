<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class TesDeretController extends Controller
{

public function index()
{
    $questions = include resource_path('data/deret_angka_questions.php');

    return Inertia::render('Psychotest/TesDeret/Index', [
        'initialQuestions' => $questions
    ]);
}

    public function submit(Request $request)
    {
        $answers = $request->input('answers', []);
        $questions = include resource_path('data/deret_angka_questions.php');

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
