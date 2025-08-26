import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';

// Generate soal
const generateQuestions = (num = 10) => {
  const questions = [];
  const rotations = [0, 90, 180, 270];

  for (let i = 0; i < num; i++) {
    const correctRotation = rotations[Math.floor(Math.random() * rotations.length)];
    const options = [...rotations].sort(() => Math.random() - 0.5);

    questions.push({
      id: i + 1,
      correctRotation,
      options
    });
  }

  return questions;
};

export default function TesSpasialRotation() {
  const [questions] = useState(generateQuestions(10));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(questions.length).fill(null));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (rot) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = rot;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

  const handleSubmit = () => {
    let calculatedScore = 0;
    userAnswers.forEach((ans, idx) => {
      if (ans === questions[idx].correctRotation) calculatedScore++;
    });

    setScore(calculatedScore);
    setIsSubmitted(true);

    router.post('/tes-spasial/submit', {
      answers: userAnswers,
      score: calculatedScore,
      total: questions.length
    });
  };

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Spasial - Mental Rotation</h2>}>
      <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded shadow-md">
        {!isSubmitted ? (
          <>
            <div className="flex justify-between mb-4">
              <span>Soal {currentIndex + 1} / {questions.length}</span>
              <span>Jawaban: {userAnswers[currentIndex] ?? '-'}</span>
            </div>

            {/* Soal utama */}
            <div className="flex justify-center mb-6">
              <svg width="150" height="150">
                <polygon points="75,20 20,130 130,130" fill="skyblue" />
              </svg>
            </div>

            {/* Opsi jawaban */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {currentQuestion.options.map((rot) => (
                <button key={rot} onClick={() => handleAnswer(rot)}
                  className={`p-4 border rounded flex justify-center items-center
                    ${userAnswers[currentIndex] === rot ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <svg width="80" height="80">
                    <polygon points="40,10 10,70 70,70" fill="skyblue"
                      transform={`rotate(${rot} 40 40)`} />
                  </svg>
                </button>
              ))}
            </div>

            {/* Navigasi */}
            <div className="flex justify-between">
              <button onClick={handlePrev} disabled={currentIndex === 0}
                className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50">Sebelumnya</button>
              {currentIndex < questions.length - 1 ? (
                <button onClick={handleNext} className="px-4 py-2 bg-indigo-600 text-white rounded">Berikutnya</button>
              ) : (
                <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded">Submit</button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">Hasil Tes Spasial</h3>
            <p className="text-lg mb-2">Skor Anda: {score} dari {questions.length}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded">Coba Lagi</button>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
