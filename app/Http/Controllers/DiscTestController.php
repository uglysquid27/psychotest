<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class DiscTestController extends Controller
{
    public function index()
    {
        $questions = include resource_path('data/disc_questions.php');
        
        return Inertia::render('Psychotest/DiscTest/Index', [
            'initialQuestions' => $questions
        ]);
    }

 public function submit(Request $request)
{
    $userAnswers = $request->input('answers', []);
    $questions = include resource_path('data/disc_questions.php');
    
    // Calculate scores for each DISC dimension
    $scores = [
        'D' => 0,
        'I' => 0,
        'S' => 0,
        'C' => 0
    ];
    
    foreach ($questions as $index => $question) {
        if (isset($userAnswers[$index]) && is_array($userAnswers[$index])) {
            $answerData = $userAnswers[$index];
            
            // Check if this question has options data
            if (isset($answerData['options']) && is_array($answerData['options'])) {
                $userOptions = $answerData['options'];
                
                // Find which option was marked as 'M' (Most)
                $mostIndex = array_search('M', $userOptions);
                
                if ($mostIndex !== false && isset($question['options'][$mostIndex])) {
                    $selectedOption = $question['options'][$mostIndex];
                    
                    // Check if the type exists in the selected option
                    if (isset($selectedOption['type'])) {
                        $type = $selectedOption['type'];
                        if (isset($scores[$type])) {
                            $scores[$type]++;
                        }
                    }
                }
            }
        }
    }
    
    // Calculate percentages
    $total = array_sum($scores);
    $percentages = [];
    foreach ($scores as $type => $score) {
        $percentages[$type] = $total > 0 ? round(($score / $total) * 100) : 0;
    }
    
    return response()->json([
        'scores' => $scores,
        'percentages' => $percentages,
        'profile' => $this->getProfileDescription($percentages)
    ]);
}
    
    private function getProfileDescription($percentages)
    {
        // This would return a description based on the highest scores
        arsort($percentages);
        $primary = key($percentages);
        
        $descriptions = [
            'D' => 'Dominance - Direct, decisive, problem-solver, risk-taker',
            'I' => 'Influence - Sociable, talkative, lively, optimistic',
            'S' => 'Steadiness - Patient, predictable, consistent, good listener',
            'C' => 'Conscientiousness - Accurate, analytical, precise, systematic'
        ];
        
        return $descriptions[$primary] ?? 'Balanced profile';
    }
}