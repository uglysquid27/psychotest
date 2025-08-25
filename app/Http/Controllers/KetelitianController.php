<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class KetelitianController extends Controller
{
     public function index()
    {
        // Ambil soal dari file PHP
        $questions = include resource_path('data/ketelitian_ST_questions.php');

        // Random sampling 50 soal misal
        shuffle($questions);
        $sample = array_slice($questions, 0, 50);

        return Inertia::render('Psychotest/KetelitianTest/Index', [
            'questions' => $sample
        ]);
    }

    public function submit(Request $request)
    {
        $answers = $request->get('answers', []);
        $questions = include resource_path('data/ketelitian_ST_questions.php');

        $score = 0;
        foreach ($questions as $index => $q) {
            if (isset($answers[$index]) && $answers[$index] === $q['answer']) {
                $score++;
            }
        }

        return response()->json([
            'score' => $score,
            'total' => count($questions)
        ]);
    }
}
