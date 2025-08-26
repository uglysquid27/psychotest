<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class HitunganController extends Controller
{
    public function index()
    {
        // Kita generate 50 soal random di backend
        $questions = [];
        for ($i = 0; $i < 50; $i++) {
            $a = rand(1, 50);
            $b = rand(1, 50);
            $operators = ['+', '-', '*'];
            $operator = $operators[array_rand($operators)];

            switch ($operator) {
                case '+': $answer = $a + $b; break;
                case '-': $answer = $a - $b; break;
                case '*': $answer = $a * $b; break;
            }

            $questions[] = [
                'a' => $a,
                'b' => $b,
                'operator' => $operator,
                'answer' => $answer
            ];
        }

        return Inertia::render('Psychotest/HitunganTest/Index', [
            'questions' => $questions
        ]);
    }

    public function submit(Request $request)
    {
        $userAnswers = $request->input('answers');
        $questions = $request->input('questions');
        $score = 0;

        foreach ($questions as $i => $q) {
            if (isset($userAnswers[$i]) && intval($userAnswers[$i]) === $q['answer']) {
                $score++;
            }
        }

        return response()->json([
            'score' => $score,
            'total' => count($questions)
        ]);
    }
}
