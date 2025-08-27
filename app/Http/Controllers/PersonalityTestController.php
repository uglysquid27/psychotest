<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class PersonalityTestController extends Controller
{
    public function index()
    {
        // Load questions from the file (updated to match DiscTestController approach)
        $questions = include resource_path('data/personality_questions.php');
        
        return Inertia::render('Psychotest/PersonalityTest/Index', [
            'initialQuestions' => $questions
        ]);
    }

    public function submit(Request $request)
    {
        $userAnswers = $request->input('answers', []);
        
        // Calculate scores for each personality type
        $scores = [
            'M' => 0, // Melankolis
            'S' => 0, // Sanguinis
            'K' => 0, // Koleris
            'P' => 0  // Plegmatis
        ];
        
        // Get questions to map answers to types (updated to match DiscTestController approach)
        $questions = include resource_path('data/personality_questions.php');
        
        // Process answers
        foreach ($userAnswers as $questionIndex => $selectedOptionIndex) {
            if ($selectedOptionIndex !== null && isset($questions[$questionIndex])) {
                $question = $questions[$questionIndex];
                if (isset($question['options'][$selectedOptionIndex])) {
                    $type = $question['options'][$selectedOptionIndex]['type'];
                    $scores[$type]++;
                }
            }
        }
        
        // Calculate percentages
        $total = array_sum($scores);
        $percentages = [];
        foreach ($scores as $type => $score) {
            $percentages[$type] = $total > 0 ? round(($score / $total) * 100) : 0;
        }
        
        // Get personality description
        $personalityType = $this->getPersonalityType($percentages);
        $description = $this->getPersonalityDescription($personalityType);
        
        return response()->json([
            'scores' => $scores,
            'percentages' => $percentages,
            'personalityType' => $personalityType,
            'description' => $description
        ]);
    }
    
    private function getPersonalityType($percentages)
    {
        arsort($percentages);
        return key($percentages);
    }
    
    private function getPersonalityDescription($type)
    {
        $descriptions = [
            'M' => 'Melankolis - Logis, teratur, perfeksionis, analitis, setia. Tipe ini paling baik dalam hal mengurus perincian dan pemikiran secara mendalam, memelihara catatan, bagan dan grafik; menganalisis masyarakat yang terlalu sulit bagi orang lain.',
            'S' => 'Sanguinis - Antusias, ceria, mudah bergaul, optimis, menyenangkan. Tipe ini paling baik dalam hal berurusan dengan orang lain secara antusias; menyatakan pemikiran dengan penuh gairah; memperlihatkan perhatian.',
            'K' => 'Koleris - Berani, tegas, suka memimpin, mandiri, produktif. Tipe ini paling baik dalam hal pekerjaan yang memerlukan keputusan cepat; persoalan yang memerlukan tindakan dan pencapaian seketika; bidang-bidang yang menuntut kontrol dan wewenang yang kuat.',
            'P' => 'Plegmatis - Mudah menyesuaikan diri, tenang, sabar, toleran, pendiam. Tipe ini paling baik dalam posisi penengahan dan persatuan; badai yang perlu diredakan; rutinitas yang terus membosankan bagi orang lain.'
        ];
        
        return $descriptions[$type] ?? 'Tipe kepribadian tidak terdeteksi';
    }
}