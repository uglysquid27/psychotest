// resources/js/Pages/Psychotest/KetelitianTest/TestPage.jsx
import { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function TesKetelitian({ questions }) {
  const [testStarted, setTestStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(questions.length).fill(null));
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeStarted, setTimeStarted] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionPerformance, setQuestionPerformance] = useState([]);
  const [showGuideFirst] = useState(true); // New state for initial guide
  const questionRefs = useRef([]);
  const questionsContainerRef = useRef(null);
  const timerRef = useRef(null);

  // Timer hanya berjalan saat testStarted = true dan belum selesai
  useEffect(() => {
    if (!testStarted || isFinished) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(Math.floor((new Date() - timeStarted) / 1000));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [testStarted, isFinished, timeStarted]);

  // Auto-scroll ke soal aktif
  useEffect(() => {
    if (testStarted && questionRefs.current[currentIndex] && questionsContainerRef.current) {
      const el = questionRefs.current[currentIndex];
      const container = questionsContainerRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();
      
      const relativeTop = elementRect.top - containerRect.top;
      const relativeBottom = elementRect.bottom - containerRect.top;
      
      // Check if element is outside visible area
      if (relativeTop < 0 || relativeBottom > container.clientHeight) {
        const scrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (el.offsetHeight / 2);
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, testStarted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startTest = () => {
    setTestStarted(true);
    setTimeStarted(new Date());
    setShowGuide(false);
  };

  const submitTest = async () => {
    if (isFinished || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Hitung skor
    const correct = userAnswers.filter((ans, i) => ans === questions[i].answer).length;
    const wrong = questions.length - correct;
    setScore({ correct, wrong });
    
    // Calculate performance data
    const perfData = [];
    for (let i = 0; i < questions.length; i++) {
      if (userAnswers[i] !== null) {
        perfData.push({
          question: i + 1,
          correct: userAnswers[i] === questions[i].answer ? 1 : 0,
          answered: 1
        });
      }
    }
    setQuestionPerformance(perfData);
    
    // Prepare data for submission
    const submissionData = {
        answers: userAnswers,
        questions: questions,
        time_elapsed: timeElapsed
    };
    
    try {
        const response = await axios.post(route('ketelitian.submit'), submissionData);
        
        if (response.data.success) {
            setIsFinished(true);
            clearInterval(timerRef.current);
            
            // Optional: Show success message
            console.log('Test results saved successfully');
        }
    } catch (error) {
        console.error('Failed to save test results:', error);
        // Still finish test locally even if save fails
        setIsFinished(true);
        clearInterval(timerRef.current);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAnswer = (answer) => {
      if (isFinished || !testStarted) return;

      const newAnswers = [...userAnswers];
      newAnswers[currentIndex] = answer;
      setUserAnswers(newAnswers);

      if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          // Auto submit when last question answered
          submitTest();
      }
  };

  const handleBackspace = () => {
    if (currentIndex > 0) {
      const newAnswers = [...userAnswers];
      if (newAnswers[currentIndex] !== null) {
        newAnswers[currentIndex] = null;
        setUserAnswers(newAnswers);
      } else {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length && testStarted && !isFinished) {
      setCurrentIndex(index);
    }
  };

  const handleRestart = () => {
    setTestStarted(false);
    setShowGuide(true);
    setCurrentIndex(0);
    setUserAnswers(Array(questions.length).fill(null));
    setScore({ correct: 0, wrong: 0 });
    setIsFinished(false);
    setTimeStarted(null);
    setTimeElapsed(0);
    setQuestionPerformance([]);
    clearInterval(timerRef.current);
  };

  const handleNewSession = () => {
    window.location.reload();
  };

  const calculateAccuracy = () => {
    if (score.correct + score.wrong === 0) return 0;
    return (score.correct / (score.correct + score.wrong)) * 100;
  };

  const calculateCompletionRate = () => {
    const answered = userAnswers.filter(ans => ans !== null).length;
    return (answered / questions.length) * 100;
  };

  const getPerformanceFeedback = () => {
    const accuracy = calculateAccuracy();
    if (accuracy >= 90) return { title: "Luar Biasa!", desc: "Ketelitian sempurna", color: "emerald" };
    if (accuracy >= 80) return { title: "Sangat Baik", desc: "Detail-oriented", color: "green" };
    if (accuracy >= 70) return { title: "Baik", desc: "Perhatian yang baik", color: "lime" };
    if (accuracy >= 60) return { title: "Cukup", desc: "Butuh lebih teliti", color: "amber" };
    return { title: "Perlu Latihan", desc: "Fokus pada detail", color: "rose" };
  };

  const getEncouragingMessage = () => {
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const answered = userAnswers.filter(ans => ans !== null).length;
    const accuracy = answered > 0 
      ? (userAnswers.slice(0, currentIndex).filter((ans, i) => ans === questions[i].answer).length / answered) * 100 
      : 0;

    if (progress < 25) {
      return "Mulai yang baik! Fokus pada setiap detail. 🔍";
    } else if (progress < 50) {
      if (accuracy > 80) {
        return "Kerja bagus! Ketelitian Anda mengesankan! 💪";
      }
      return "Teruskan! Periksa dengan seksama. 📝";
    } else if (progress < 75) {
      return "Lebih dari setengah jalan! Pertahankan konsentrasi! 🎯";
    } else {
      return "Hampir selesai! Akhiri dengan ketelitian maksimal! 🏆";
    }
  };

  // Guide/Introduction Screen
  if (showGuide) {
    return (
      <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800">
            Tes Ketelitian (S/T)
          </h2>
        }
      >
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 md:py-12">
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
            
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
            
            .animate-pulse-gentle {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}</style>

          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-100">
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 p-6 md:p-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>
                  Tes Ketelitian (S/T)
                </h1>
                <p className="text-base md:text-xl text-blue-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                  Ukur kemampuan Anda dalam memperhatikan detail dan menemukan perbedaan
                </p>
              </div>

              <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-start gap-4 md:gap-5 soft-blue-shadow bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 md:p-6 border border-blue-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">S</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>SAMA (S)</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Tekan tombol <span className="font-bold text-green-600">S</span> jika kedua teks <span className="font-semibold text-blue-700">identik persis</span> tanpa perbedaan apa pun.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 md:gap-5 soft-blue-shadow bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-indigo-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">T</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>TIDAK SAMA (T)</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Tekan tombol <span className="font-bold text-red-600">T</span> jika ada <span className="font-semibold text-indigo-700">perbedaan sekecil apapun</span> pada kedua teks.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 md:gap-5 soft-blue-shadow bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 md:p-6 border border-purple-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">!</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Detail yang Diperiksa</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Perhatikan <span className="font-bold text-purple-700">huruf besar/kecil, spasi, tanda baca, dan angka</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="soft-blue-shadow bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-cyan-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-cyan-900 mb-1 md:mb-2 text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Tips Penting</h4>
                      <p className="text-xs md:text-sm text-cyan-800 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Fokus pada <span className="font-semibold">satu soal pada satu waktu</span>. Scan teks dari kiri ke kanan dan jangan terburu-buru.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startTest}
                  className="w-full py-5 md:py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 md:gap-4"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Main Test Interface
  if (!testStarted && !showGuide) {
    return (
      <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800">
            Tes Ketelitian (S/T)
          </h2>
        }
      >
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 md:py-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-blue-100">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>
                  Tes Ketelitian (S/T)
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto" style={{fontFamily: "'Inter', sans-serif"}}>
                  Uji kemampuan Anda dalam memperhatikan detail dan menemukan perbedaan
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="soft-blue-shadow bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="text-blue-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>{questions.length} Soal</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: "'Inter', sans-serif"}}>Tentukan SAMA atau TIDAK SAMA</p>
                </div>
                
                <div className="soft-blue-shadow bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="text-green-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Tidak Terbatas</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: "'Inter', sans-serif"}}>Waktu fokus pada ketelitian</p>
                </div>
                
                <div className="soft-blue-shadow bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="text-purple-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Detail Oriented</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: "'Inter', sans-serif"}}>Perhatikan setiap karakter</p>
                </div>
              </div>

              <div className="soft-blue-shadow bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center" style={{fontFamily: "'Raleway', sans-serif"}}>
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Petunjuk Pengerjaan
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800" style={{fontFamily: "'Raleway', sans-serif"}}>SAMA (S)</h4>
                      <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Tekan tombol <span className="font-bold text-green-600">S</span> jika kedua teks identik persis tanpa perbedaan</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <span className="font-bold text-red-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800" style={{fontFamily: "'Raleway', sans-serif"}}>TIDAK SAMA (T)</h4>
                      <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Tekan tombol <span className="font-bold text-red-600">T</span> jika ada perbedaan sekecil apapun pada kedua teks</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                      <span className="font-bold text-yellow-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800" style={{fontFamily: "'Raleway', sans-serif"}}>Perhatian Khusus</h4>
                      <p className="text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>Perhatikan huruf besar/kecil, spasi, tanda baca, dan angka</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="soft-blue-shadow bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>Contoh Soal</h3>
                
                <div className="space-y-6">
                  <div className="soft-blue-shadow bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded" style={{fontFamily: "'Inter', sans-serif"}}>"PT. Maju Jaya Sejahtera"</div>
                      <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded" style={{fontFamily: "'Inter', sans-serif"}}>"PT. Maju Jaya Sejahtera"</div>
                    </div>
                    <div className="flex items-center text-green-600 font-medium">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Jawaban: <span className="font-bold ml-1" style={{fontFamily: "'Inter', sans-serif"}}>S (Sama)</span>
                    </div>
                  </div>
                  
                  <div className="soft-blue-shadow bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-lg font-semibold bg-red-100 text-red-800 px-3 py-1 rounded" style={{fontFamily: "'Inter', sans-serif"}}>"021-55667788"</div>
                      <div className="text-lg font-semibold bg-red-100 text-red-800 px-3 py-1 rounded" style={{fontFamily: "'Inter', sans-serif"}}>"021-55667789"</div>
                    </div>
                    <div className="flex items-center text-red-600 font-medium">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Jawaban: <span className="font-bold ml-1" style={{fontFamily: "'Inter', sans-serif"}}>T (Tidak Sama)</span>
                      <span className="ml-2 text-sm text-gray-600" style={{fontFamily: "'Inter', sans-serif"}}>(angka terakhir berbeda)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={startTest}
                  className="w-full py-5 md:py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-lg md:text-xl"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mulai Tes Ketelitian
                  </div>
                </button>
                <p className="text-gray-600 mt-4 text-sm" style={{fontFamily: "'Inter', sans-serif"}}>
                  Siap untuk menguji ketelitian Anda? Klik tombol di atas untuk memulai
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!isFinished) {
    return (
      <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800">
            Tes Ketelitian (S/T)
          </h2>
        }
      >
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 md:py-12">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
            
            .soft-blue-shadow {
              box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.15), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
            }
          `}</style>

          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-blue-100">
              {/* Stats Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="soft-blue-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 md:p-6 border-2 border-emerald-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-emerald-700" style={{fontFamily: "'Raleway', sans-serif"}}>Dijawab</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-700">{userAnswers.filter(ans => ans !== null).length}</div>
                </div>

                <div className="soft-blue-shadow bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 md:p-6 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-blue-700" style={{fontFamily: "'Raleway', sans-serif"}}>Sisa</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-blue-700">{questions.length - userAnswers.filter(ans => ans !== null).length}</div>
                </div>

                <div className="soft-blue-shadow bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border-2 border-amber-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-amber-700" style={{fontFamily: "'Raleway', sans-serif"}}>Waktu</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-amber-700">{formatTime(timeElapsed)}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 md:mb-8">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <span className="text-sm md:text-base font-semibold text-slate-700" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Soal {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-xs md:text-sm font-medium text-slate-500" style={{fontFamily: "'Inter', sans-serif"}}>
                    {Math.round(((currentIndex + 1) / questions.length) * 100)}% selesai
                  </span>
                </div>
                <div className="h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-500 ease-out shadow-md"
                    style={{width: `${((currentIndex + 1) / questions.length) * 100}%`}}
                  ></div>
                </div>
              </div>

              {/* Encouraging Message */}
              {testStarted && (
                <div className="soft-blue-shadow bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl px-4 py-3 mb-6 md:mb-8">
                  <p className="text-center text-slate-700 font-medium text-sm sm:text-base" style={{fontFamily: "'Inter', sans-serif"}}>
                    {getEncouragingMessage()}
                  </p>
                </div>
              )}

              {/* Current Question */}
              <div className="soft-blue-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 md:p-8 mb-6 md:mb-8 border border-slate-200">
                <div className="text-center mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Soal {currentIndex + 1}</h3>
                  <p className="text-slate-600 text-sm md:text-base" style={{fontFamily: "'Inter', sans-serif"}}>Apakah kedua teks di bawah SAMA atau TIDAK SAMA?</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="soft-blue-shadow bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-blue-700" style={{fontFamily: "'Raleway', sans-serif"}}>TEKS A</span>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div 
                      ref={el => questionRefs.current[currentIndex] = el}
                      className="text-xl md:text-2xl font-bold text-slate-800 text-center p-4 bg-white/50 rounded-xl"
                      style={{fontFamily: "'Inter', sans-serif"}}
                    >
                      {questions[currentIndex]?.left}
                    </div>
                  </div>
                  
                  <div className="soft-blue-shadow bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-indigo-700" style={{fontFamily: "'Raleway', sans-serif"}}>TEKS B</span>
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-slate-800 text-center p-4 bg-white/50 rounded-xl"
                      style={{fontFamily: "'Inter', sans-serif"}}>
                      {questions[currentIndex]?.right}
                    </div>
                  </div>
                </div>
                
                {userAnswers[currentIndex] && (
                  <div className="mt-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                      userAnswers[currentIndex] === 'S' 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {userAnswers[currentIndex] === 'S' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      <span className="font-bold">Jawaban: {userAnswers[currentIndex]}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Answer Buttons */}
              <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
                <button
                  onClick={() => handleAnswer('S')}
                  className="soft-blue-shadow py-5 md:py-6 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xl md:text-2xl font-bold rounded-2xl border-2 border-green-400 hover:border-green-500 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    S (SAMA)
                  </div>
                </button>
                
                <button
                  onClick={() => handleAnswer('T')}
                  className="soft-blue-shadow py-5 md:py-6 bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white text-xl md:text-2xl font-bold rounded-2xl border-2 border-red-400 hover:border-red-500 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    T (TIDAK SAMA)
                  </div>
                </button>
              </div>

              {/* Question Navigation */}
              <div className="soft-blue-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 md:p-6 border border-slate-200 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>Daftar Soal</h3>
                <div 
                  ref={questionsContainerRef}
                  className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto"
                >
                  {questions.map((_, idx) => {
                    const userAns = userAnswers[idx];
                    const isCurrent = idx === currentIndex;
                    const isAnswered = userAns !== null;
                    
                    let bgColor = 'bg-slate-100 border-slate-300';
                    let textColor = 'text-slate-700';
                    
                    if (isCurrent) {
                      bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-500 border-blue-600';
                      textColor = 'text-white';
                    } else if (isAnswered) {
                      bgColor = 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-300';
                      textColor = 'text-emerald-800';
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => navigateToQuestion(idx)}
                        className={`h-12 rounded-xl border flex items-center justify-center transition-all duration-200 hover:scale-105 ${bgColor}`}
                      >
                        <span className={`font-bold ${textColor}`}>{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleBackspace}
                  className="soft-blue-shadow py-4 bg-gradient-to-br from-rose-100 to-red-100 hover:from-rose-200 hover:to-red-200 text-rose-700 hover:text-rose-900 font-bold rounded-xl md:rounded-2xl border-2 border-rose-200 hover:border-rose-400 transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                  <span>Kembali</span>
                </button>
                
                <button
                  onClick={submitTest}
                  className="soft-blue-shadow py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-bold rounded-xl md:rounded-2xl border-2 border-blue-500 hover:border-blue-600 transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Selesaikan Tes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Results Screen
  const feedback = getPerformanceFeedback();
  const accuracyValue = calculateAccuracy().toFixed(1);
  const completionRate = calculateCompletionRate().toFixed(1);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Tes Ketelitian (S/T)
        </h2>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 md:py-12">
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
          <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-100">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 p-6 md:p-10">
              <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-white" style={{fontFamily: "'Raleway', sans-serif"}}>
                  Tes Selesai!
                </h1>
              </div>
              <p className="text-center text-base md:text-xl text-blue-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                Lihat hasil dan analisis performa Anda di bawah
              </p>
            </div>

            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              {/* Performance Rating */}
              <div className={`fade-in-up text-center soft-blue-shadow bg-gradient-to-br from-${feedback.color}-50 to-${feedback.color}-100 rounded-3xl p-6 md:p-10 border-2 border-${feedback.color}-200`} style={{animationDelay: '0.1s'}}>
                <div className={`inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-${feedback.color}-400 to-${feedback.color}-600 rounded-full mb-4 md:mb-6 shadow-xl`}>
                  <svg className="w-9 h-9 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h2 className={`text-2xl md:text-4xl font-bold text-${feedback.color}-800 mb-2 md:mb-3`} style={{fontFamily: "'Raleway', sans-serif"}}>
                  {feedback.title}
                </h2>
                <p className={`text-base md:text-xl text-${feedback.color}-700 font-medium`} style={{fontFamily: "'Inter', sans-serif"}}>
                  {feedback.desc}
                </p>
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="fade-in-up soft-blue-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-emerald-200" style={{animationDelay: '0.2s'}}>
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-emerald-800" style={{fontFamily: "'Raleway', sans-serif"}}>Jawaban Benar</h3>
                  </div>
                  <div className="text-3xl md:text-5xl font-bold text-emerald-700 mb-1 md:mb-2">{score.correct}</div>
                  <p className="text-xs md:text-sm text-emerald-600 font-medium">dari {questions.length} soal</p>
                </div>

                <div className="fade-in-up soft-blue-shadow bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-rose-200" style={{animationDelay: '0.3s'}}>
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-rose-800" style={{fontFamily: "'Raleway', sans-serif"}}>Jawaban Salah</h3>
                  </div>
                  <div className="text-3xl md:text-5xl font-bold text-rose-700 mb-1 md:mb-2">{score.wrong}</div>
                  <p className="text-xs md:text-sm text-rose-600 font-medium">kesalahan tercatat</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl p-4 md:p-6 border border-blue-100" style={{animationDelay: '0.4s'}}>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Akurasi</h3>
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2 md:mb-3">{accuracyValue}%</div>
                  <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Persentase jawaban benar</p>
                  <div className="h-2 md:h-3 bg-blue-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000" style={{width: `${accuracyValue}%`}}></div>
                  </div>
                </div>

                <div className="fade-in-up soft-blue-shadow bg-white rounded-3xl p-4 md:p-6 border border-purple-100" style={{animationDelay: '0.5s'}}>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Waktu Penyelesaian</h3>
                  <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2 md:mb-3">{formatTime(timeElapsed)}</div>
                  <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Total waktu pengerjaan</p>
                  <div className="h-2 md:h-3 bg-purple-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-1000" style={{width: `${Math.min(100, (timeElapsed / 600) * 100)}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Performance Graph */}
              {questionPerformance.length > 0 && (
                <div className="fade-in-up" style={{animationDelay: '0.6s'}}>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-4 md:mb-6" style={{fontFamily: "'Raleway', sans-serif"}}>Grafik Performa</h3>
                  <PerformanceGraph questionPerformance={questionPerformance} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="fade-in-up flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-6 md:mb-8" style={{animationDelay: '0.8s'}}>
                <button
                  onClick={handleRestart}
                  className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Ulangi Tes
                </button>
                
                <button
                  onClick={() => setShowGuide(true)}
                  className="px-8 md:px-10 py-4 md:py-5 bg-white text-blue-700 font-bold rounded-2xl shadow-lg hover:shadow-2xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Kembali ke Panduan
                </button>
              </div>

              {/* Tips for Improvement */}
              <div className="fade-in-up soft-blue-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 md:p-8" style={{animationDelay: '0.9s'}}>
                <h3 className="text-lg md:text-xl font-semibold text-blue-900 mb-4 md:mb-5 flex items-center gap-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  Saran Untuk Peningkatan
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {[
                    'Latih kemampuan observasi dengan memperhatikan detail kecil dalam kehidupan sehari-hari',
                    'Fokus pada satu teks pada satu waktu sebelum membandingkannya',
                    'Buat pola scanning dari kiri ke kanan untuk setiap teks',
                    'Tinjau soal yang salah untuk memahami pola kesalahan Anda'
                  ].map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 md:gap-4 bg-white/70 rounded-2xl p-3 md:p-4">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-sm md:text-base" style={{fontFamily: "'Inter', sans-serif"}}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isSubmitting && (
                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 soft-blue-shadow bg-white rounded-2xl p-4 md:p-5 border-2 border-blue-200 flex items-center gap-3 md:gap-4">
                  <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-blue-700 font-semibold text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Menyimpan hasil...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function PerformanceGraph({ questionPerformance }) {
  if (!questionPerformance || questionPerformance.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 text-center">
        <p className="text-slate-600">Data performa tidak tersedia</p>
      </div>
    );
  }

  const chartData = {
    labels: questionPerformance.map(p => `Soal ${p.question}`),
    datasets: [
      {
        label: 'Jawaban Benar (1=Benar, 0=Salah)',
        data: questionPerformance.map(p => p.correct),
        backgroundColor: questionPerformance.map(p => 
          p.correct === 1 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: questionPerformance.map(p => 
          p.correct === 1 ? 'rgb(21, 128, 61)' : 'rgb(185, 28, 28)'
        ),
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 13,
            weight: '600'
          },
          color: '#475569',
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1e40af',
        bodyColor: '#475569',
        borderColor: '#93c5fd',
        borderWidth: 2,
        padding: 14,
        cornerRadius: 12,
        titleFont: {
          family: "'Raleway', sans-serif",
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
        },
        callbacks: {
          label: function(context) {
            const value = context.raw;
            return value === 1 ? 'Benar' : 'Salah';
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: function(value) {
            return value === 1 ? 'Benar' : value === 0 ? 'Salah' : '';
          },
          color: '#64748b',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          padding: 10,
        },
        grid: {
          color: '#dbeafe',
          drawBorder: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          maxRotation: 45,
        },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 md:p-6 border border-blue-100" style={{height: '300px', maxHeight: '400px'}}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}