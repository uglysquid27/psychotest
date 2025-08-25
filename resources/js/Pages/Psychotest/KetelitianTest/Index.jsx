import { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function TesKetelitian({ questions }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(questions.length).fill(null));
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeStarted, setTimeStarted] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const questionRefs = useRef([]);
  const questionsContainerRef = useRef(null);

  // Timer
  useEffect(() => {
    let timer;
    if (!isFinished) {
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((new Date() - timeStarted) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isFinished, timeStarted]);

  // Auto-scroll ke soal aktif
  useEffect(() => {
    if (questionRefs.current[currentIndex] && questionsContainerRef.current) {
      const el = questionRefs.current[currentIndex];
      const container = questionsContainerRef.current;

      let top = 0;

      if (window.innerWidth >= 1024) { // desktop/lg
        const offsetTop = el.offsetTop;
        const offsetHeight = el.offsetHeight;
        const containerHeight = container.offsetHeight;

        top = Math.max(0, offsetTop - containerHeight / 1 + offsetHeight / 1);
      }

      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (answer) => {
    if (isFinished) return;

    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = answer;
    setUserAnswers(newAnswers);

    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
    else {
      // Hitung skor
      const correct = newAnswers.filter((ans, i) => ans === questions[i].answer).length;
      const wrong = questions.length - correct;
      setScore({ correct, wrong });
      setIsFinished(true);
    }
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  // Split soal menjadi dua kolom untuk overview
  const splitQuestionsIntoColumns = () => {
    const mid = Math.ceil(questions.length / 2);
    return {
      leftColumn: questions.slice(0, mid),
      rightColumn: questions.slice(mid)
    };
  };
  const { leftColumn, rightColumn } = splitQuestionsIntoColumns();

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-gray-800 text-xl leading-tight">Tes Ketelitian (S/T)</h2>}
    >
      <div className="min-h-screen bg-gray-100 py-4">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden">

            {/* Header: Progress + Timer */}
            <div className="bg-blue-600 text-white p-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold">
                  Pertanyaan {currentIndex + 1} / {questions.length}
                </div>
                <div className="text-sm bg-blue-800 px-3 py-1 rounded-full">
                  Waktu: {formatTime(timeElapsed)}
                </div>
              </div>
              <div className="w-full bg-blue-300 h-2 mt-2 rounded-full">
                <div 
                  className="bg-blue-100 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row">

              {/* Panel Soal: Overview */}
              <div className="lg:w-2/3 p-4 border-b lg:border-r border-gray-200">
                <h3 className="font-bold text-lg mb-4 text-center">Daftar Soal</h3>
                <div ref={questionsContainerRef} className="max-h-[50vh] overflow-auto mb-4">
                  <div className="flex flex-col md:flex-row md:space-x-4">
                    {/* Kolom Kiri */}
                    <div className="flex-1 mb-4 md:mb-0">
                      {leftColumn.map((q, idx) => {
                        const globalIndex = idx;
                        const userAns = userAnswers[globalIndex];
                        const isActive = globalIndex === currentIndex;

                        // Warna preview hanya muncul saat selesai
                        const bgColor = isFinished
                          ? userAns
                            ? (userAns === q.answer ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300')
                            : 'bg-gray-50 border-gray-200'
                          : (isActive ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200');

                        return (
                          <div
                            key={globalIndex}
                            ref={el => questionRefs.current[globalIndex] = el}
                            onClick={() => navigateToQuestion(globalIndex)}
                            className={`p-3 mb-2 rounded-md border transition-colors cursor-pointer ${bgColor}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm md:text-base">{globalIndex + 1}. {q.left} - {q.right}</span>
                              {isFinished && userAns && (
                                <span className={`font-bold ${userAns === q.answer ? 'text-green-600' : 'text-red-600'}`}>
                                  {userAns}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Kolom Kanan */}
                    <div className="flex-1">
                      {rightColumn.map((q, idx) => {
                        const globalIndex = idx + leftColumn.length;
                        const userAns = userAnswers[globalIndex];
                        const isActive = globalIndex === currentIndex;

                        const bgColor = isFinished
                          ? userAns
                            ? (userAns === q.answer ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300')
                            : 'bg-gray-50 border-gray-200'
                          : (isActive ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200');

                        return (
                          <div
                            key={globalIndex}
                            ref={el => questionRefs.current[globalIndex] = el}
                            onClick={() => navigateToQuestion(globalIndex)}
                            className={`p-3 mb-2 rounded-md border transition-colors cursor-pointer ${bgColor}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm md:text-base">{globalIndex + 1}. {q.left} - {q.right}</span>
                              {isFinished && userAns && (
                                <span className={`font-bold ${userAns === q.answer ? 'text-green-600' : 'text-red-600'}`}>
                                  {userAns}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Jawaban */}
              <div className="lg:w-1/3 p-4 bg-gray-50 mb-4 lg:mb-0">
                <h3 className="font-bold text-lg mb-4 text-center lg:text-left">Jawaban</h3>
                {!isFinished ? (
                  <div className="mb-6 text-center lg:text-left">
                    <p className="text-gray-600 mb-4">Apakah kedua teks di samping SAMA atau TIDAK SAMA?</p>
                    <div className="flex flex-col gap-4 mb-6">
                      <button onClick={() => handleAnswer('S')} className="px-4 py-3 md:px-8 md:py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg md:text-xl shadow-md transition-colors">
                        S (Sama)
                      </button>
                      <button onClick={() => handleAnswer('T')} className="px-4 py-3 md:px-8 md:py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg md:text-xl shadow-md transition-colors">
                        T (Tidak Sama)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="text-xl md:text-2xl font-bold text-green-800 mb-4">Tes Selesai!</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-green-600 font-bold text-2xl md:text-3xl">{score.correct}</div>
                        <div className="text-gray-600 text-sm md:text-base">Jawaban Benar</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-red-600 font-bold text-2xl md:text-3xl">{score.wrong}</div>
                        <div className="text-gray-600 text-sm md:text-base">Jawaban Salah</div>
                      </div>
                    </div>
                    <div className="text-gray-700">
                      <p>Total Waktu: {formatTime(timeElapsed)}</p>
                      <p className="font-bold mt-2">
                        Skor: {((score.correct / questions.length) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
