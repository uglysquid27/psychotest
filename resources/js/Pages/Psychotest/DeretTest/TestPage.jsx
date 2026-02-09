import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router } from '@inertiajs/react';
import axios from 'axios';

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
  const [showGuide, setShowGuide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const activeQuestionRef = useRef(null);

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

  // Auto-scroll to active question
  useEffect(() => {
    if (activeQuestionRef.current && containerRef.current && !showGuide && !isSubmitted) {
      const container = containerRef.current;
      const element = activeQuestionRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      const relativeTop = elementRect.top - containerRect.top;
      const relativeBottom = elementRect.bottom - containerRect.top;
      
      if (relativeTop < 0 || relativeBottom > container.clientHeight) {
        const scrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (element.offsetHeight / 2);
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, showGuide, isSubmitted]);

  // Format waktu mm:ss
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  const handleNumberClick = (digit) => {
    if (isSubmitted) return;
    
    const newAnswers = [...userAnswers];
    const currentAnswer = newAnswers[currentIndex] || '';
    
    // If pressing 0 on empty input
    if (digit === 0 && currentAnswer === '') {
      newAnswers[currentIndex] = '0';
    } 
    // If pressing 0 on "0", do nothing
    else if (digit === 0 && currentAnswer === '0') {
      return;
    }
    // If we have an existing answer, append the digit
    else if (currentAnswer !== '' && currentAnswer !== '0') {
      // Only allow up to 3 digits
      if (currentAnswer.length < 3) {
        newAnswers[currentIndex] = currentAnswer + digit.toString();
      }
    } 
    // Start new answer
    else {
      newAnswers[currentIndex] = digit.toString();
    }
    
    setUserAnswers(newAnswers);
  };

  const handleBackspace = () => {
    if (isSubmitted) return;
    
    const newAnswers = [...userAnswers];
    const currentAnswer = newAnswers[currentIndex] || '';
    
    if (currentAnswer.length > 1) {
      // Remove last digit
      newAnswers[currentIndex] = currentAnswer.slice(0, -1);
    } else {
      // Clear the answer
      newAnswers[currentIndex] = '';
    }
    
    setUserAnswers(newAnswers);
  };

  const clearCurrentAnswer = () => {
    if (isSubmitted) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = '';
    setUserAnswers(newAnswers);
  };

  const handleNext = () => { 
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); 
  };
  
  const handlePrev = () => { 
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1); 
  };
  
  const handleQuestionClick = (index) => setCurrentIndex(index);

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting) return;

    let calculatedScore = 0;
    const results = [];
    
    userAnswers.forEach((ans, idx) => {
      const correctAnswer = parseInt(questions[idx]?.answer);
      const userAnswer = ans ? parseInt(ans) : null;
      
      if (userAnswer === correctAnswer) {
        calculatedScore++;
        results.push({ correct: true, userAnswer, correctAnswer });
      } else {
        results.push({ correct: false, userAnswer, correctAnswer });
      }
    });

    setScore(calculatedScore);
    setIsSubmitted(true);
    clearInterval(timerRef.current);
    setIsSubmitting(true);

    // Calculate time elapsed
    const timeElapsed = 60 - timeLeft;

    try {
      const response = await axios.post(route('deret.submit'), {
        userAnswers: userAnswers,
        questions: questions,
        timeElapsed: timeElapsed
      });

      console.log('Submit response:', response.data);

      if (response.data.success) {
        setShowResultsModal(true);
      } else {
        alert('Gagal menyimpan hasil: ' + response.data.message);
        setShowResultsModal(true);
      }
    } catch (error) {
      console.error('Error submitting test:', error.response || error);
      alert('Terjadi kesalahan saat menyimpan hasil tes: ' + (error.response?.data?.message || error.message));
      setShowResultsModal(true);
    } finally {
      setIsSubmitting(false);
    }
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
    setIsSubmitting(false);
  };

  const handleRestart = () => {
    setUserAnswers(Array(5).fill(''));
    setCurrentIndex(0);
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(60);
    setShowResultsModal(false);
    setShowGuide(false);
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowResultsModal(false);
  };

  const startTest = () => {
    setShowGuide(false);
  };

  const getPerformanceFeedback = () => {
    const accuracy = (score / questions.length) * 100;
    
    if (accuracy >= 90) return { 
      title: "Luar Biasa!", 
      desc: "Pola berpikir yang sangat tajam", 
      color: "emerald" 
    };
    if (accuracy >= 80) return { 
      title: "Sangat Baik", 
      desc: "Kemampuan analisis pola sangat baik", 
      color: "green" 
    };
    if (accuracy >= 70) return { 
      title: "Baik", 
      desc: "Mampu mengenali pola dengan baik", 
      color: "lime" 
    };
    if (accuracy >= 60) return { 
      title: "Cukup", 
      desc: "Perlu sedikit latihan lagi", 
      color: "amber" 
    };
    return { 
      title: "Perlu Latihan", 
      desc: "Fokus pada pola dan hubungan angka", 
      color: "rose" 
    };
  };

  const getEncouragingMessage = () => {
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const answeredQuestions = userAnswers.filter(ans => ans !== '').length;
    
    if (progress < 30) {
      return "Ayo mulai! Fokus pada pola deret angka. 🌟";
    } else if (progress < 60) {
      if (answeredQuestions > currentIndex) {
        return "Bagus! Lanjutkan dengan ritme yang sama. 💪";
      }
      return "Analisis pola dengan teliti, kamu bisa! 🔍";
    } else if (progress < 90) {
      return "Hampir selesai! Pertahankan konsentrasi. 🎯";
    } else {
      return "Soal terakhir! Berikan yang terbaik! 🏆";
    }
  };

  const currentQuestion = questions[currentIndex];
  const feedback = getPerformanceFeedback();
  const accuracyValue = questions.length > 0 ? ((score / questions.length) * 100).toFixed(1) : '0';

  // Guide/Introduction Screen
  if (showGuide) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Deret Angka</h2>}>
        <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 min-h-screen py-8 px-4">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
            
            .soft-blue-shadow {
              box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.15), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
            }
            
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .fade-in-up {
              animation: fadeInUp 0.6s ease-out forwards;
              opacity: 0;
            }
          `}</style>
          
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10 fade-in-up">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 rounded-full mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                Tes Deret Angka
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto" style={{fontFamily: "'Inter', sans-serif"}}>
                Uji kemampuan logika dan pola pikir Anda dalam mengenali pola deret angka
              </p>
            </div>

            {/* Test Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="fade-in-up soft-blue-shadow bg-white rounded-2xl p-6 border border-gray-100 transform transition-transform hover:scale-105" style={{animationDelay: '0.1s'}}>
                <div className="text-blue-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>5 Soal</h3>
                <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Setiap soal memiliki pola unik yang harus dipecahkan</p>
              </div>
              
              <div className="fade-in-up soft-blue-shadow bg-white rounded-2xl p-6 border border-gray-100 transform transition-transform hover:scale-105" style={{animationDelay: '0.2s'}}>
                <div className="text-cyan-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>1 Menit</h3>
                <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Waktu terbatas untuk menguji kecepatan berpikir dan analisis</p>
              </div>
              
              <div className="fade-in-up soft-blue-shadow bg-white rounded-2xl p-6 border border-gray-100 transform transition-transform hover:scale-105" style={{animationDelay: '0.3s'}}>
                <div className="text-indigo-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Multi-digit</h3>
                <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Jawaban bisa berupa angka 1-3 digit (contoh: 25, 100, 150)</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="fade-in-up soft-blue-shadow bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 rounded-2xl p-8 mb-10 text-white" style={{animationDelay: '0.4s'}}>
              <h2 className="text-3xl font-bold mb-6 flex items-center" style={{fontFamily: "'Raleway', sans-serif"}}>
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
                    <h4 className="font-bold text-xl mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Analisis Pola</h4>
                    <p className="text-blue-100" style={{fontFamily: "'Inter', sans-serif"}}>Perhatikan deret angka dengan seksama dan identifikasi polanya</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Tentukan Angka Hilang</h4>
                    <p className="text-blue-100" style={{fontFamily: "'Inter', sans-serif"}}>Cari angka yang tepat untuk melengkapi deret pada posisi yang ditandai "?"</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Masukkan Jawaban</h4>
                    <p className="text-blue-100" style={{fontFamily: "'Inter', sans-serif"}}>Gunakan keypad untuk memasukkan angka jawaban (1-3 digit)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Periksa Kembali</h4>
                    <p className="text-blue-100" style={{fontFamily: "'Inter', sans-serif"}}>Pastikan jawaban Anda konsisten dengan pola yang berlanjut</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How to input numbers */}
            <div className="fade-in-up soft-blue-shadow bg-white rounded-2xl p-8 mb-10 border border-gray-200" style={{animationDelay: '0.5s'}}>
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center" style={{fontFamily: "'Raleway', sans-serif"}}>Cara Memasukkan Jawaban</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl border-2 border-blue-200 mb-2">
                      <span className="text-2xl font-bold text-blue-700">1</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2" style={{fontFamily: "'Inter', sans-serif"}}>Klik angka untuk menambahkan digit</p>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-lg font-bold">1</button>
                    <button className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-lg font-bold">2</button>
                    <button className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-lg font-bold">3</button>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl border-2 border-cyan-200 mb-2">
                      <span className="text-2xl font-bold text-cyan-700">2</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2" style={{fontFamily: "'Inter', sans-serif"}}>Untuk multi-digit, klik angka berurutan</p>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-lg font-bold">2</button>
                    <button className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-lg font-bold">5</button>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg flex items-center justify-center text-lg font-bold border-2 border-emerald-200">25</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl border-2 border-emerald-200 mb-2">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mt-2" style={{fontFamily: "'Inter', sans-serif"}}>Tekan Hapus untuk menghapus digit terakhir</p>
                  </div>
                  <div className="flex justify-center">
                    <button className="w-20 h-12 bg-gradient-to-br from-rose-100 to-red-100 rounded-lg flex items-center justify-center text-lg font-bold border-2 border-rose-200">Hapus</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="fade-in-up text-center mb-8" style={{animationDelay: '0.6s'}}>
              <button 
                onClick={startTest}
                className="soft-blue-shadow bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 text-white font-bold py-5 px-16 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-xl"
                style={{fontFamily: "'Raleway', sans-serif"}}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Deret
                </div>
              </button>
              <p className="text-gray-600 mt-4 text-sm" style={{fontFamily: "'Inter', sans-serif"}}>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 py-6 md:py-12">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
          
          .soft-blue-shadow {
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.15), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0;
          }
        `}</style>

        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-blue-100">
            {/* Header dengan timer dan score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="soft-blue-shadow bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 md:p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-sm md:text-base font-semibold text-blue-700" style={{fontFamily: "'Raleway', sans-serif"}}>Progress</span>
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-blue-700">{currentIndex + 1}/{questions.length}</div>
                <p className="text-xs md:text-sm text-blue-600 font-medium">Soal dikerjakan</p>
              </div>

              <div className="soft-blue-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 md:p-6 border-2 border-emerald-200">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-sm md:text-base font-semibold text-emerald-700" style={{fontFamily: "'Raleway', sans-serif"}}>Dijawab</span>
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-700">{userAnswers.filter(ans => ans !== '').length}</div>
                <p className="text-xs md:text-sm text-emerald-600 font-medium">Jawaban terisi</p>
              </div>

              <div className={`soft-blue-shadow rounded-2xl p-4 md:p-6 border-2 ${
                timeLeft > 30 
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200' 
                  : timeLeft > 10 
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' 
                  : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 animate-pulse'
              }`}>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className={`text-sm md:text-base font-semibold ${
                    timeLeft > 30 ? 'text-blue-700' : timeLeft > 10 ? 'text-yellow-700' : 'text-rose-700'
                  }`} style={{fontFamily: "'Raleway', sans-serif"}}>
                    Sisa Waktu
                  </span>
                  <svg className={`w-5 h-5 md:w-6 md:h-6 ${
                    timeLeft > 30 ? 'text-blue-600' : timeLeft > 10 ? 'text-yellow-600' : 'text-rose-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'" />
                  </svg>
                </div>
                <div className={`text-3xl md:text-4xl font-bold ${
                  timeLeft > 30 ? 'text-blue-700' : timeLeft > 10 ? 'text-yellow-700' : 'text-rose-700'
                }`}>
                  {formatTime(timeLeft)}
                </div>
                <p className={`text-xs md:text-sm font-medium ${
                  timeLeft > 30 ? 'text-blue-600' : timeLeft > 10 ? 'text-yellow-600' : 'text-rose-600'
                }`}>
                  {timeLeft > 30 ? 'Masih banyak waktu' : timeLeft > 10 ? 'Waktu hampir habis!' : 'Cepat!'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 md:mb-8">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <span className="text-sm md:text-base font-semibold text-slate-700" style={{fontFamily: "'Raleway', sans-serif"}}>
                  Soal {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-xs md:text-sm font-medium text-slate-500" style={{fontFamily: "'Inter', sans-serif"}}>
                  {Math.round(((currentIndex + 1)/questions.length)*100)}% selesai
                </span>
              </div>
              <div className="h-3 md:h-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{width: `${((currentIndex + 1)/questions.length)*100}%`}}
                ></div>
              </div>
            </div>

            {/* Encouraging Message */}
            {!isSubmitted && (
              <div className="soft-blue-shadow bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl px-4 py-3 mb-6 md:mb-8">
                <p className="text-center text-slate-700 font-medium text-sm sm:text-base" style={{fontFamily: "'Inter', sans-serif"}}>
                  {getEncouragingMessage()}
                </p>
              </div>
            )}

            {/* Main Content Area with Scroll */}
            <div 
              ref={containerRef}
              className="soft-blue-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-slate-200" 
              style={{ maxHeight: '500px', overflowY: 'auto' }}
            >
              {/* Soal sekarang */}
              {currentQuestion && (
                <div ref={activeQuestionRef} className="mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-800 text-lg" style={{fontFamily: "'Raleway', sans-serif"}}>
                        Soal {currentIndex + 1}:
                      </span>
                      {userAnswers[currentIndex] && (
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 rounded-full flex items-center border border-emerald-200">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {userAnswers[currentIndex].length} digit
                        </span>
                      )}
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-2 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-700 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                        Masukkan jawaban 1-3 digit
                      </span>
                    </div>
                  </div>
                  
                  {/* Sequence Display */}
                  <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6">
                    {currentQuestion.sequence && currentQuestion.sequence.map((num, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-300 shadow-md
                          ${num === null ? 
                            'bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-dashed border-yellow-300' : 
                            'bg-gradient-to-br from-white to-blue-50 border border-blue-200'
                          }`}
                          style={{fontFamily: "'Inter', sans-serif"}}
                        >
                          {num === null ? '?' : num}
                        </div>
                        {num === null && (
                          <div className="mt-3">
                            <div className="w-24 h-16 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl flex items-center justify-center shadow-inner">
                              <span className="text-2xl font-bold text-emerald-700 min-w-[60px] text-center">
                                {userAnswers[currentIndex] || '?'}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 text-center">
                              {userAnswers[currentIndex] ? `${userAnswers[currentIndex].length}/3 digit` : 'Klik angka di bawah'}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Answer Status */}
                  {userAnswers[currentIndex] && (
                    <div className="text-center text-sm text-gray-600 mt-4 bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-100">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span style={{fontFamily: "'Inter', sans-serif"}}>
                          Jawaban Anda: <span className="font-bold text-emerald-700">{userAnswers[currentIndex]}</span>
                          {userAnswers[currentIndex].length < 3 && (
                            <span className="ml-2 text-amber-600">(Anda bisa tambah digit)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Question Navigator */}
              <div className="soft-blue-shadow bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 md:p-6 border border-blue-100 mt-6">
                <h3 className="font-medium text-gray-700 mb-3 text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Navigasi Soal:</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleQuestionClick(idx)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 shadow-sm
                        ${currentIndex === idx ? 
                          'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg transform scale-110' :
                          userAnswers[idx] ? 
                          'bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-800 border border-emerald-300' :
                          'bg-gradient-to-br from-gray-100 to-blue-100 text-gray-800 border border-gray-300'
                        }`}
                      style={{fontFamily: "'Inter', sans-serif"}}
                    >
                      {idx+1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keypad Section */}
            <div className="space-y-4">
              {/* Timer Display Above Keypad */}
              {!isSubmitted && (
                <div className={`rounded-2xl p-4 text-center transition-all duration-300 ${
                  timeLeft > 30 
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300' 
                    : timeLeft > 10 
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400' 
                    : 'bg-gradient-to-r from-rose-100 to-red-100 border-2 border-red-400 animate-pulse'
                }`}>
                  <div className="flex items-center justify-center gap-3">
                    <svg className={`w-7 h-7 ${
                      timeLeft > 30 ? 'text-blue-600' : timeLeft > 10 ? 'text-yellow-600' : 'text-rose-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'" />
                    </svg>
                    <div>
                      <div className={`text-3xl font-bold ${
                        timeLeft > 30 ? 'text-blue-700' : timeLeft > 10 ? 'text-yellow-700' : 'text-rose-700'
                      }`}>
                        {formatTime(timeLeft)}
                      </div>
                      <div className="text-sm text-slate-600" style={{fontFamily: "'Inter', sans-serif"}}>
                        {timeLeft > 30 ? 'Waktu tersisa' : timeLeft > 10 ? 'Waktu hampir habis!' : 'Cepat, hampir selesai!'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timeLeft > 30 
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-500' 
                          : timeLeft > 10 
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                          : 'bg-gradient-to-r from-rose-400 to-red-500'
                      }`}
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    disabled={isSubmitted || (userAnswers[currentIndex] && userAnswers[currentIndex].length >= 3)}
                    className={`soft-blue-shadow py-4 md:py-5 text-xl md:text-2xl font-bold rounded-xl md:rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0
                      ${isSubmitted || (userAnswers[currentIndex] && userAnswers[currentIndex].length >= 3)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-br from-white to-blue-50 hover:from-blue-100 hover:to-cyan-100 text-slate-700 hover:text-blue-900 border-blue-100 hover:border-blue-300'
                      }`}
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Bottom row - 0, Backspace, Clear */}
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <button
                  onClick={() => handleNumberClick(0)}
                  disabled={isSubmitted || (userAnswers[currentIndex] && userAnswers[currentIndex].length >= 3)}
                  className={`soft-blue-shadow py-4 md:py-5 text-xl md:text-2xl font-bold rounded-xl md:rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl
                    ${isSubmitted || (userAnswers[currentIndex] && userAnswers[currentIndex].length >= 3)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-br from-white to-slate-50 hover:from-slate-100 hover:to-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-400'
                    }`}
                  style={{fontFamily: "'Inter', sans-serif"}}
                >
                  0
                </button>
                
                <button
                  onClick={handleBackspace}
                  disabled={isSubmitted || !userAnswers[currentIndex]}
                  className={`soft-blue-shadow py-4 md:py-5 font-bold rounded-xl md:rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2
                    ${isSubmitted || !userAnswers[currentIndex]
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-br from-rose-100 to-red-100 hover:from-rose-200 hover:to-red-200 text-rose-700 hover:text-rose-900 border-rose-200 hover:border-rose-400'
                    }`}
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5} d='M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z'" />
                  </svg>
                  <span className="hidden md:inline text-sm md:text-base">Hapus</span>
                </button>
                
                <button
                  onClick={clearCurrentAnswer}
                  disabled={isSubmitted || !userAnswers[currentIndex]}
                  className={`soft-blue-shadow py-4 md:py-5 font-bold rounded-xl md:rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2
                    ${isSubmitted || !userAnswers[currentIndex]
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 hover:text-amber-900 border-amber-200 hover:border-amber-400'
                    }`}
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden md:inline text-sm md:text-base">Hapus Semua</span>
                </button>
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                  onClick={handlePrev} 
                  disabled={currentIndex===0 || isSubmitted}
                  className={`soft-blue-shadow px-5 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center
                    ${currentIndex===0 || isSubmitted
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 border-blue-200 hover:border-blue-400'
                    }`}
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </button>
                
                {currentIndex < questions.length-1 ? (
                  <button 
                    onClick={handleNext} 
                    disabled={isSubmitted}
                    className="soft-blue-shadow px-5 py-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center border border-blue-600"
                    style={{fontFamily: "'Raleway', sans-serif"}}
                  >
                    Berikutnya
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitted || isSubmitting}
                    className={`soft-blue-shadow px-5 py-3 rounded-xl border transition-all duration-200 flex items-center justify-center
                      ${isSubmitted || isSubmitting
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-br from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 border-emerald-600'
                      }`}
                    style={{fontFamily: "'Raleway', sans-serif"}}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Submit Jawaban
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Helper Text */}
              <div className="text-center pt-2">
                <p className="text-slate-600 text-xs" style={{fontFamily: "'Inter', sans-serif"}}>
                  • Klik angka untuk menambah digit (maks 3 digit)
                  <br />
                  • Hapus: hapus satu digit • Hapus Semua: reset jawaban
                  <br />
                  • Jawaban bisa berupa angka 1-999
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal untuk hasil */}
        {showResultsModal && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeModal}></div>
            <div className="fade-in-up relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-auto p-6 border-2 border-blue-100">
              <h3 className="text-xl md:text-2xl font-bold text-center mb-4 text-gray-800" style={{fontFamily: "'Raleway', sans-serif"}}>Hasil Tes Deret Angka</h3>
              <div className="flex justify-center items-center mb-6">
                <div className="relative">
                  <div className="rounded-full w-40 h-40 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center border-4 border-blue-100">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">{score}</div>
                      <div className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>dari {questions.length}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center mb-6">
                <div className={`text-lg font-semibold ${
                  score >= questions.length*0.8 ? 'text-emerald-600' :
                  score >= questions.length*0.6 ? 'text-yellow-600' : 'text-rose-600'
                }`} style={{fontFamily: "'Raleway', sans-serif"}}>
                  {score >= questions.length*0.8 ? 'Luar Biasa! 🎉' :
                  score >= questions.length*0.6 ? 'Bagus! 👍' : 'Perlu latihan lebih'}
                </div>
                <p className="text-gray-600 mt-2" style={{fontFamily: "'Inter', sans-serif"}}>Skor Anda: {score} ({Math.round((score/questions.length)*100)}%)</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleRestart}
                  className="soft-blue-shadow px-5 py-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center border border-blue-600"
                  style={{fontFamily: "'Raleway', sans-serif"}}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Coba Lagi
                </button>
                <button onClick={() => setShowGuide(true)}
                  className="soft-blue-shadow px-5 py-3 bg-gradient-to-br from-white to-blue-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-200 flex items-center justify-center border border-blue-200"
                  style={{fontFamily: "'Raleway', sans-serif"}}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Kembali ke Panduan
                </button>
              </div>
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
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
          <div className="fixed bottom-4 right-4 soft-blue-shadow bg-gradient-to-br from-rose-100 to-red-100 text-rose-700 p-4 rounded-2xl shadow-lg animate-pulse border-2 border-rose-300">
            <div className="font-semibold flex items-center text-sm" style={{fontFamily: "'Raleway', sans-serif"}}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waktu hampir habis!
            </div>
            <div className="text-center text-xl font-bold">{formatTime(timeLeft)}</div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
