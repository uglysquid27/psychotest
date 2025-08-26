<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class SpasialController extends Controller
{
    public function index()
    {
        // Generate soal mental rotation sederhana
        $questions = [];
        $rotations = [0, 90, 180, 270];

        for ($i = 0; $i < 10; $i++) {
            $rotation = $rotations[array_rand($rotations)];
            $options = $rotations;
            shuffle($options); // acak pilihan jawaban

            $questions[] = [
                'rotation' => $rotation,
                'options' => $options
            ];
        }

        return Inertia::render('Psychotest/Spasial/Index', [
            'initialQuestions' => $questions
        ]);
    }

    public function submit(Request $request)
    {
        $answers = $request->input('answers', []);
        $score = $request->input('score', 0);
        $total = $request->input('total', count($answers));

        // Simpan ke database jika perlu
        // Contoh:
        // \App\Models\TesSpasialResult::create([
        //     'user_id' => auth()->id(),
        //     'answers' => json_encode($answers),
        //     'score' => $score,
        //     'total' => $total
        // ]);

        return response()->json([
            'message' => 'Tes Spasial berhasil dikirim',
            'score' => $score,
            'total' => $total
        ]);
    }
}
