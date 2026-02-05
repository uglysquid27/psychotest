import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function TesDeret({ initialQuestions = [] }) {
  // Pastikan initialQuestions selalu array
  const questionsData = Array.isArray(initialQuestions) ? initialQuestions : [];
  
  // Pilih 5 soal secara acak dari dataset
  const getRandomQuestions = () => {
    const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  };

  // Langsung inisialisasi state dengan 5 soal acak
  const [questions, setQuestions] = useState(getRandomQuestions());
  const [userAnswers, setUserAnswers] = useState(Array(5).fill(''));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 1 menit
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!testStarted || isSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [testStarted, isSubmitted]);

  // Format waktu mm:ss
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  const handleChange = (e) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = e.target.value;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  const handleQuestionClick = (index) => setCurrentIndex(index);

  const handleSubmit = () => {
    if (isSubmitted) return;

    let calculatedScore = 0;
    userAnswers.forEach((ans, idx) => {
      if (parseInt(ans) === questions[idx].answer) calculatedScore++;
    });

    setScore(calculatedScore);
    setIsSubmitted(true);
    clearInterval(timerRef.current);
    setShowResultsModal(true);
  };

  const handleNewSession = () => {
    const newQuestions = getRandomQuestions();
    setQuestions(newQuestions);
    setUserAnswers(Array(5).fill(''));
    setCurrentIndex(0);
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(60);
    setShowResultsModal(false);
    setTestStarted(false);
  };

  const closeModal = () => {
    setShowResultsModal(false);
  };

  const startTest = () => {
    setTestStarted(true);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Deret Angka</h2>}>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header dengan timer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Tes Deret Angka</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Temukan pola dan isi angka yang hilang</p>
          </div>
          <div className="flex flex-col items-center bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg shadow-md min-w-[120px]">
            <div className={`text-lg font-semibold ${timeLeft < 10 ? 'text-red-300' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-white opacity-80">Sisa Waktu</div>
          </div>
        </div>

        {!testStarted ? (
          <div className="mb-6 bg-white dark:text-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Selamat Datang di Tes Deret Angka</h3>
            <p className="mb-4">Tes ini akan menguji kemampuan Anda dalam mengenali pola deret angka.</p>
            <ul className="text-left list-disc pl-5 mb-6 mx-auto max-w-md">
              <li>Terdapat 5 soal yang harus diselesaikan</li>
              <li>Waktu pengerjaan: 1 menit</li>
              <li>Isi angka yang hilang pada setiap deret</li>
              <li>Klik "Mulai Tes" ketika Anda siap</li>
            </ul>
            <button 
              onClick={startTest}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-lg font-semibold"
            >
              Mulai Tes
            </button>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Soal {currentIndex + 1} dari {questions.length}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{Math.round(((currentIndex + 1)/questions.length)*100)}% selesai</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" style={{ width: `${((currentIndex+1)/questions.length)*100}%` }}></div>
              </div>
            </div>

            {/* Soal sekarang - Ditempatkan di atas tombol navigasi */}
            {currentQuestion && (
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200 text-lg">Soal {currentIndex + 1}:</span>
                    {userAnswers[currentIndex] && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Terjawab
                      </span>
                    )}
                  </div>
                  
                  {/* Counter di bawah header */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Angka ke-{currentQuestion.sequence.findIndex(num => num === null) + 1} dari {currentQuestion.sequence.length}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6 dark:text-white">
                  {currentQuestion.sequence.map((num, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-lg md:text-xl font-semibold transition-all duration-300
                        ${num === null ? 
                          'border-2 border-dashed border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 
                          'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-md'
                        }`}
                      >
                        {num === null ? '?' : num}
                      </div>
                      {num === null && (
                        <div className="mt-3">
                          <input 
                            type="number" 
                            value={userAnswers[currentIndex]} 
                            onChange={handleChange}
                            className="w-16 md:w-20 border border-gray-300 rounded-lg px-3 py-2 text-center font-medium text-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <svg className="w-5 h-5 inline-block mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Temukan pola dan isi angka yang hilang (ditandai dengan ?)
                </div>
              </div>
            )}

            {/* Navigasi - Tepat di bawah soal */}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
              <button onClick={handlePrev} disabled={currentIndex===0}
                className="px-5 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Sebelumnya
              </button>
              
              {currentIndex < questions.length-1 ? (
                <button onClick={handleNext} className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center">
                  Berikutnya
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button onClick={handleSubmit} className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Jawaban
                </button>
              )}
            </div>

            {/* Grid soal - Ditempatkan di bawah tombol navigasi */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Daftar Soal:</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => (
                  <button key={idx} onClick={() => handleQuestionClick(idx)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                      ${currentIndex === idx ? 'bg-indigo-600 text-white shadow-lg transform scale-110' :
                        userAnswers[idx] ? 'bg-green-500 text-white dark:bg-green-600' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                  >{idx+1}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Modal untuk hasil */}
        {showResultsModal && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeModal}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto p-6">
              <h3 className="text-xl md:text-2xl font-bold text-center mb-4 text-gray-800 dark:text-white">Hasil Tes Deret Angka</h3>
              <div className="flex justify-center items-center mb-6">
                <div className="relative">
                  <div className="rounded-full w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border-4 border-indigo-100 dark:border-indigo-900/30">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{score}</div>
                      <div className="text-gray-600 dark:text-gray-300">dari {questions.length}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center mb-6">
                <div className={`text-lg font-semibold ${
                  score >= questions.length*0.8 ? 'text-green-600 dark:text-green-400' :
                  score >= questions.length*0.6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {score >= questions.length*0.8 ? 'Luar Biasa! 🎉' :
                  score >= questions.length*0.6 ? 'Bagus! 👍' : 'Perlu latihan lebih'}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Skor Anda: {score} ({Math.round((score/questions.length)*100)}%)</p>
              </div>
              <div className="text-center">
                <button onClick={handleNewSession}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sesi Baru
                </button>
              </div>
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Peringatan waktu hampir habis */}
        {testStarted && timeLeft > 0 && timeLeft <= 10 && !isSubmitted && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg animate-pulse">
            <div className="font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waktu hampir habis!
            </div>
            <div className="text-center text-xl font-bold">{formatTime(timeLeft)}</div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </AuthenticatedLayout>
  );
}