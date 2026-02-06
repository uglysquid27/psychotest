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
  const [showGuide, setShowGuide] = useState(true); // New state for guide
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!showGuide && !isSubmitted) {
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
    }
  }, [showGuide, isSubmitted]);

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

  const handleNext = () => { 
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); 
  };
  
  const handlePrev = () => { 
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1); 
  };
  
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
    setShowGuide(false);
  };

  const handleRestart = () => {
    setUserAnswers(Array(5).fill(''));
    setCurrentIndex(0);
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(60);
    setShowResultsModal(false);
    setShowGuide(false);
  };

  const closeModal = () => {
    setShowResultsModal(false);
  };

  const startTest = () => {
    setShowGuide(false);
  };

  const currentQuestion = questions[currentIndex];

  // Guide/Introduction Screen
  if (showGuide) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Deret Angka</h2>}>
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 min-h-screen py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                Tes Deret Angka
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Uji kemampuan logika dan pola pikir Anda dalam mengenali pola deret angka
              </p>
            </div>

            {/* Test Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                <div className="text-cyan-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">5 Soal</h3>
                <p className="text-gray-600">Setiap soal memiliki pola unik yang harus dipecahkan</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                <div className="text-blue-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">1 Menit</h3>
                <p className="text-gray-600">Waktu terbatas untuk menguji kecepatan berpikir dan analisis</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                <div className="text-indigo-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">Pola Beragam</h3>
                <p className="text-gray-600">Deret aritmatika, geometri, dan pola khusus lainnya</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-2xl p-8 mb-10 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cara Mengerjakan Tes Deret
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Analisis Pola</h4>
                    <p className="text-cyan-100">Perhatikan deret angka dengan seksama dan identifikasi polanya</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Tentukan Angka Hilang</h4>
                    <p className="text-cyan-100">Cari angka yang tepat untuk melengkapi deret pada posisi yang ditandai "?"</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Masukkan Jawaban</h4>
                    <p className="text-cyan-100">Ketik angka jawaban pada kotak input di bawah tanda tanya</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Periksa Kembali</h4>
                    <p className="text-cyan-100">Pastikan jawaban Anda konsisten dengan pola yang berlanjut</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Examples */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Jenis-jenis Pola Deret</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-cyan-50 p-5 rounded-xl">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-cyan-500 text-white rounded-full flex items-center justify-center mr-2">A</span>
                      Deret Aritmatika
                    </h4>
                    <div className="mb-3">
                      <div className="flex justify-center items-center gap-3 mb-2">
                        {[2, 5, 8, 11, 14, '?'].map((num, idx) => (
                          <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${num === '?' ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-cyan-100'}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        <strong>Pola:</strong> +3 setiap angka → Jawaban: <span className="font-bold text-green-600">17</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-5 rounded-xl">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2">G</span>
                      Deret Geometri
                    </h4>
                    <div className="mb-3">
                      <div className="flex justify-center items-center gap-3 mb-2">
                        {[3, 6, 12, 24, 48, '?'].map((num, idx) => (
                          <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${num === '?' ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-blue-100'}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        <strong>Pola:</strong> ×2 setiap angka → Jawaban: <span className="font-bold text-green-600">96</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-5 rounded-xl">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2">K</span>
                      Pola Khusus
                    </h4>
                    <div className="mb-3">
                      <div className="flex justify-center items-center gap-3 mb-2">
                        {[1, 1, 2, 3, 5, '?'].map((num, idx) => (
                          <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${num === '?' ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-indigo-100'}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        <strong>Pola:</strong> Fibonacci (jumlah 2 angka sebelumnya) → Jawaban: <span className="font-bold text-green-600">8</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-5 rounded-xl">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2">B</span>
                      Pola Bergantian
                    </h4>
                    <div className="mb-3">
                      <div className="flex justify-center items-center gap-3 mb-2">
                        {[2, 4, 3, 6, 5, '?'].map((num, idx) => (
                          <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${num === '?' ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-purple-100'}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        <strong>Pola:</strong> +2, -1, +3, -1, +? → Jawaban: <span className="font-bold text-green-600">10</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Tips */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-lg p-8 mb-10 text-white">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Strategi Pemecahan Soal
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center mr-4 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Cari Selisih</h4>
                      <p className="text-gray-300 text-sm">Hitung selisih antar angka untuk menemukan pola aritmatika</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-4 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Periksa Rasio</h4>
                      <p className="text-gray-300 text-sm">Cari rasio perkalian untuk pola geometri</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-4 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Kelompokkan Angka</h4>
                      <p className="text-gray-300 text-sm">Coba kelompokkan angka untuk pola kompleks</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Hitung Mundur</h4>
                      <p className="text-gray-300 text-sm">Jika bingung, coba analisis dari akhir deret</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Management */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Waktu (60 Detik)</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="font-bold text-cyan-700">1</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">00:60 - 00:45</h4>
                      <p className="text-sm text-gray-600">Analisis cepat semua soal (15 detik)</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Soal mudah pertama</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="font-bold text-blue-700">2</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">00:45 - 00:25</h4>
                      <p className="text-sm text-gray-600">Kerjakan 3 soal pertama (20 detik)</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Prioritaskan yang pasti</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="font-bold text-indigo-700">3</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">00:25 - 00:10</h4>
                      <p className="text-sm text-gray-600">Selesaikan 2 soal terakhir (15 detik)</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Fokus pada pola kompleks</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="font-bold text-green-700">4</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">00:10 - 00:00</h4>
                      <p className="text-sm text-gray-600">Periksa ulang jawaban (10 detik)</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Final check sebelum submit</div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center mb-8">
              <button 
                onClick={startTest}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 px-16 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-xl"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Deret
                </div>
              </button>
              <p className="text-gray-600 mt-4 text-sm">
                Siap untuk menguji kemampuan analisis pola Anda? 5 soal menanti!
              </p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Main Test Interface
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
              <div className="flex flex-col gap-3">
                <button onClick={handleRestart}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Coba Lagi
                </button>
                <button onClick={() => setShowGuide(true)}
                  className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Kembali ke Panduan
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
        {!showGuide && timeLeft > 0 && timeLeft <= 10 && !isSubmitted && (
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