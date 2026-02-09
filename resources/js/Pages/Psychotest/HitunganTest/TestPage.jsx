// resources/js/Pages/Psychotest/HitunganTest/TestPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
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

export default function HitunganCepat({ questions = [], error = null }) {
    const [userAnswers, setUserAnswers] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showGuide, setShowGuide] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState({ correct: 0, wrong: 0 });
    const [timeStarted, setTimeStarted] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [questionPerformance, setQuestionPerformance] = useState([]);
    const [activeTab, setActiveTab] = useState('guide'); // 'guide', 'test', 'results'
    
    const questionRefs = useRef([]);
    const questionsContainerRef = useRef(null);
    const timerRef = useRef(null);
    const keypadRef = useRef(null);

    // Initialize with questions from props
    useEffect(() => {
        if (questions.length > 0) {
            setUserAnswers(Array(questions.length).fill(''));
            setCurrentIndex(0);
            setIsFinished(false);
            setScore({ correct: 0, wrong: 0 });
            setTimeStarted(null);
            setTimeElapsed(0);
            clearInterval(timerRef.current);
        }
    }, [questions]);

    // Timer effect
    useEffect(() => {
        if (questions.length > 0 && !isFinished && timeStarted) {
            timerRef.current = setInterval(() => {
                setTimeElapsed(Math.floor((new Date() - timeStarted) / 1000));
            }, 1000);
            
            return () => clearInterval(timerRef.current);
        }
    }, [questions, isFinished, timeStarted]);

    // Auto-scroll to active question
    useEffect(() => {
        if (activeTab === 'test' && questionRefs.current[currentIndex] && questionsContainerRef.current) {
            const el = questionRefs.current[currentIndex];
            const container = questionsContainerRef.current;
            
            const containerRect = container.getBoundingClientRect();
            const elementRect = el.getBoundingClientRect();
            
            const relativeTop = elementRect.top - containerRect.top;
            const relativeBottom = elementRect.bottom - containerRect.top;
            
            if (relativeTop < 0 || relativeBottom > container.clientHeight) {
                const scrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (el.offsetHeight / 2);
                container.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
        }
    }, [currentIndex, activeTab]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const startTest = () => {
        setActiveTab('test');
        setTimeStarted(new Date());
        setShowGuide(false);
    };

    const handleNumberClick = (number) => {
        if (isFinished) return;
        if (!timeStarted) startTest();
        
        const updated = [...userAnswers];
        updated[currentIndex] = updated[currentIndex] + number;
        setUserAnswers(updated);
    };

    const handleBackspace = () => {
        if (isFinished) return;
        
        const updated = [...userAnswers];
        if (updated[currentIndex].length > 0) {
            updated[currentIndex] = updated[currentIndex].slice(0, -1);
            setUserAnswers(updated);
        }
    };

    const handleClear = () => {
        if (isFinished) return;
        
        const updated = [...userAnswers];
        updated[currentIndex] = '';
        setUserAnswers(updated);
    };

    const handleNegative = () => {
        if (isFinished) return;
        
        const updated = [...userAnswers];
        if (updated[currentIndex].startsWith('-')) {
            updated[currentIndex] = updated[currentIndex].substring(1);
        } else {
            updated[currentIndex] = '-' + updated[currentIndex];
        }
        setUserAnswers(updated);
    };

    const handleFraction = () => {
        if (isFinished) return;
        
        const updated = [...userAnswers];
        if (!updated[currentIndex].includes('/')) {
            updated[currentIndex] = updated[currentIndex] + '/';
        }
        setUserAnswers(updated);
    };

    const handleDecimal = () => {
        if (isFinished) return;
        
        const updated = [...userAnswers];
        if (!updated[currentIndex].includes('.')) {
            updated[currentIndex] = updated[currentIndex] + '.';
        }
        setUserAnswers(updated);
    };

    const navigateToQuestion = (index) => {
        if (index >= 0 && index < questions.length && !isFinished) {
            setCurrentIndex(index);
        }
    };

    const calculateScore = () => {
        let correct = 0;
        let wrong = 0;
        const performance = [];
        
        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = checkAnswer(userAnswer, question.answer);
            
            if (isCorrect) {
                correct++;
            } else if (userAnswer && userAnswer.trim() !== '') {
                wrong++;
            }
            
            performance.push({
                question: index + 1,
                correct: isCorrect ? 1 : 0,
                user_answer: userAnswer,
                correct_answer: question.answer
            });
        });
        
        return { correct, wrong, performance };
    };

    const checkAnswer = (userAnswer, correctAnswer) => {
        if (!userAnswer || userAnswer.trim() === '') return false;
        
        try {
            // Parse user answer
            let userValue;
            if (userAnswer.includes('/')) {
                const parts = userAnswer.split('/');
                if (parts.length === 2) {
                    const num = parseFloat(parts[0]);
                    const den = parseFloat(parts[1]);
                    if (den !== 0) {
                        userValue = num / den;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                userValue = parseFloat(userAnswer);
            }
            
            // Compare with tolerance for floating point errors
            return Math.abs(userValue - correctAnswer) < 0.0001;
        } catch (error) {
            return false;
        }
    };

    const submitTest = async () => {
        if (isFinished || isSubmitting) return;
        
        setIsSubmitting(true);
        
        const { correct, wrong, performance } = calculateScore();
        setScore({ correct, wrong });
        setQuestionPerformance(performance);
        
        try {
            const response = await axios.post(route('hitungan.submit'), {
                answers: userAnswers,
                questions: questions,
                time_elapsed: timeElapsed
            });
            
            if (response.data.success) {
                setIsFinished(true);
                setActiveTab('results');
                clearInterval(timerRef.current);
            }
        } catch (error) {
            console.error('Error saving results:', error);
            // Still show results even if save fails
            setIsFinished(true);
            setActiveTab('results');
            clearInterval(timerRef.current);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRestart = () => {
        setUserAnswers(Array(questions.length).fill(''));
        setCurrentIndex(0);
        setIsFinished(false);
        setScore({ correct: 0, wrong: 0 });
        setTimeStarted(null);
        setTimeElapsed(0);
        setQuestionPerformance([]);
        setActiveTab('test');
        clearInterval(timerRef.current);
    };

    const handleNewSession = () => {
        window.location.reload();
    };

    const getEncouragingMessage = () => {
        const progress = ((currentIndex + 1) / questions.length) * 100;
        const answered = userAnswers.filter(ans => ans && ans.trim() !== '').length;
        const accuracy = answered > 0 ? (score.correct / answered) * 100 : 0;

        if (progress < 25) {
            return "Mulai yang baik! Fokus pada ketelitian perhitungan. 🧮";
        } else if (progress < 50) {
            if (accuracy > 80) {
                return "Kerja bagus! Akurasi perhitungan Anda mengesankan! 💪";
            }
            return "Teruskan! Periksa setiap langkah dengan cermat. 📝";
        } else if (progress < 75) {
            return "Lebih dari setengah jalan! Pertahankan konsentrasi! 🎯";
        } else {
            return "Hampir selesai! Akhiri dengan perhitungan yang tepat! 🏆";
        }
    };

    const getPerformanceFeedback = () => {
        const total = score.correct + score.wrong;
        if (total === 0) return { title: "Belum Ada Data", desc: "Silakan mulai tes", color: "slate" };
        const accuracy = (score.correct / total) * 100;

        if (accuracy >= 90) return { title: "Luar Biasa!", desc: "Kemampuan berhitung sempurna", color: "emerald" };
        if (accuracy >= 80) return { title: "Sangat Baik", desc: "Perhitungan akurat", color: "green" };
        if (accuracy >= 70) return { title: "Baik", desc: "Kemampuan berhitung baik", color: "lime" };
        if (accuracy >= 60) return { title: "Cukup", desc: "Butuh lebih teliti", color: "amber" };
        return { title: "Perlu Latihan", desc: "Fokus pada akurasi perhitungan", color: "rose" };
    };

    const calculateAccuracy = () => {
        const total = score.correct + score.wrong;
        if (total === 0) return 0;
        return (score.correct / total) * 100;
    };

    const calculateCompletionRate = () => {
        const answered = userAnswers.filter(ans => ans && ans.trim() !== '').length;
        return (answered / questions.length) * 100;
    };

    // Guide Screen
    if (activeTab === 'guide') {
        return (
            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Tes Hitungan Cepat
                    </h2>
                }
            >
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-6 md:py-12">
                    <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
                        
                        .soft-purple-shadow {
                            box-shadow: 0 4px 6px -1px rgba(147, 51, 234, 0.15), 0 2px 4px -1px rgba(147, 51, 234, 0.1);
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

                    <div className="max-w-4xl mx-auto px-4 md:px-6">
                        <div className="fade-in-up soft-purple-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-100">
                            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 md:p-10">
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>
                                    Tes Hitungan Cepat
                                </h1>
                                <p className="text-base md:text-xl text-indigo-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                                    Ukur kemampuan berhitung mental Anda dengan berbagai operasi matematika
                                </p>
                            </div>

                            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                                <div className="space-y-4 md:space-y-6">
                                    <div className="flex items-start gap-4 md:gap-5 soft-purple-shadow bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-indigo-100">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <span className="text-xl md:text-2xl font-bold text-white">1</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Baca Soal dengan Teliti</h3>
                                            <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                                                Perhatikan setiap <span className="font-semibold text-indigo-700">operasi matematika</span> dalam soal sebelum menghitung.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 md:gap-5 soft-purple-shadow bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 md:p-6 border border-purple-100">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <span className="text-xl md:text-2xl font-bold text-white">2</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Gunakan Keypad Digital</h3>
                                            <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                                                Masukkan jawaban menggunakan <span className="font-semibold text-purple-700">keypad di bagian bawah</span> atau keyboard Anda.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 md:gap-5 soft-purple-shadow bg-gradient-to-br from-pink-50 to-indigo-50 rounded-2xl p-4 md:p-6 border border-pink-100">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <span className="text-xl md:text-2xl font-bold text-white">3</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Format Jawaban Fleksibel</h3>
                                            <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                                                Gunakan <span className="font-bold text-pink-700">angka negatif (-), desimal (.), atau pecahan (/)</span> sesuai kebutuhan.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="soft-purple-shadow bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-4 md:p-6">
                                    <div className="flex items-start gap-3 md:gap-4">
                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-cyan-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <h4 className="font-bold text-cyan-900 mb-1 md:mb-2 text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Tips Penting</h4>
                                            <p className="text-xs md:text-sm text-cyan-800 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                                                Kerjakan dengan <span className="font-semibold">ritme stabil</span>. Pertahankan keseimbangan antara kecepatan dan akurasi perhitungan.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {questions.length > 0 ? (
                                    <button
                                        onClick={startTest}
                                        className="w-full py-5 md:py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 md:gap-4"
                                        style={{fontFamily: "'Raleway', sans-serif"}}
                                    >
                                        <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Mulai Tes Sekarang
                                    </button>
                                ) : (
                                    <div className="soft-purple-shadow bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
                                        <div className="flex items-center justify-center mb-4">
                                            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-800 mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>Soal Belum Tersedia</h4>
                                        <p className="text-gray-600 mb-4" style={{fontFamily: "'Inter', sans-serif"}}>
                                            Admin belum menambahkan soal ke dalam sistem. Silakan kembali ke dashboard.
                                        </p>
                                        <Link
                                            href={route('dashboard')}
                                            className="inline-flex items-center px-6 py-3 bg-indigo-600 border border-transparent rounded-xl font-semibold text-white hover:bg-indigo-700 transition-colors duration-200"
                                        >
                                            Kembali ke Dashboard
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // Test Interface
    if (activeTab === 'test') {
        return (
            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Tes Hitungan Cepat
                    </h2>
                }
            >
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-6 md:py-12">
                    <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
                        
                        .soft-purple-shadow {
                            box-shadow: 0 4px 6px -1px rgba(147, 51, 234, 0.15), 0 2px 4px -1px rgba(147, 51, 234, 0.1);
                        }
                    `}</style>

                    <div className="max-w-6xl mx-auto px-4 md:px-6">
                        <div className="fade-in-up soft-purple-shadow bg-white rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-purple-100">
                            {/* Stats Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                                <div className="soft-purple-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 md:p-6 border-2 border-emerald-200">
                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                        <span className="text-sm md:text-base font-semibold text-emerald-700" style={{fontFamily: "'Raleway', sans-serif"}}>Dijawab</span>
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-bold text-emerald-700">
                                        {userAnswers.filter(ans => ans && ans.trim() !== '').length}
                                    </div>
                                </div>

                                <div className="soft-purple-shadow bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 md:p-6 border-2 border-indigo-200">
                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                        <span className="text-sm md:text-base font-semibold text-indigo-700" style={{fontFamily: "'Raleway', sans-serif"}}>Sisa</span>
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-bold text-indigo-700">
                                        {questions.length - userAnswers.filter(ans => ans && ans.trim() !== '').length}
                                    </div>
                                </div>

                                <div className="soft-purple-shadow bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border-2 border-amber-200">
                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                        <span className="text-sm md:text-base font-semibold text-amber-700" style={{fontFamily: "'Raleway', sans-serif"}}>Waktu</span>
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-bold text-amber-700">
                                        {formatTime(timeElapsed)}
                                    </div>
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
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-md"
                                        style={{width: `${((currentIndex + 1) / questions.length) * 100}%`}}
                                    ></div>
                                </div>
                            </div>

                            {/* Encouraging Message */}
                            {timeStarted && (
                                <div className="soft-purple-shadow bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl px-4 py-3 mb-6 md:mb-8">
                                    <p className="text-center text-slate-700 font-medium text-sm sm:text-base" style={{fontFamily: "'Inter', sans-serif"}}>
                                        {getEncouragingMessage()}
                                    </p>
                                </div>
                            )}

                            {/* Current Question */}
                            <div className="soft-purple-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 md:p-8 mb-6 md:mb-8 border border-slate-200">
                                <div className="text-center mb-6">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2" style={{fontFamily: "'Raleway', sans-serif"}}>
                                        Soal {currentIndex + 1}
                                    </h3>
                                    <p className="text-slate-600 text-sm md:text-base" style={{fontFamily: "'Inter', sans-serif"}}>
                                        Hitung hasil dari ekspresi matematika di bawah:
                                    </p>
                                </div>
                                
                                <div 
                                    ref={el => questionRefs.current[currentIndex] = el}
                                    className="text-2xl md:text-4xl font-bold text-center text-indigo-700 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 mb-6"
                                    style={{fontFamily: "'Inter', sans-serif"}}
                                >
                                    {questions[currentIndex]?.question}
                                </div>
                                
                                <div className="text-center">
                                    <div className="inline-flex items-center gap-2 mb-4">
                                        <span className="text-lg font-semibold text-slate-700">Jawaban:</span>
                                        <div className="min-w-[200px] px-4 py-3 bg-white border-2 border-indigo-300 rounded-xl text-2xl font-bold text-indigo-700">
                                            {userAnswers[currentIndex] || ' '}
                                        </div>
                                    </div>
                                    
                                    {userAnswers[currentIndex] && (
                                        <div className="mt-4">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 border border-green-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-medium">Jawaban tersimpan</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Questions Navigation */}
                            <div className="soft-purple-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 md:p-6 border border-slate-200 mb-6">
                                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>Daftar Soal</h3>
                                <div 
                                    ref={questionsContainerRef}
                                    className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto"
                                >
                                    {questions.map((_, idx) => {
                                        const userAns = userAnswers[idx];
                                        const isCurrent = idx === currentIndex;
                                        const isAnswered = userAns && userAns.trim() !== '';
                                        
                                        let bgColor = 'bg-slate-100 border-slate-300';
                                        let textColor = 'text-slate-700';
                                        
                                        if (isCurrent) {
                                            bgColor = 'bg-gradient-to-br from-indigo-500 to-purple-500 border-indigo-600';
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

                            {/* Keypad Section */}
                            <div className="space-y-4" ref={keypadRef}>
                                {/* Number Keypad */}
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                    {[1, 2, 3, '⌫', 4, 5, 6, '-/+', 7, 8, 9, 'C', '.', 0, '/', '='].map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (typeof item === 'number') {
                                                    handleNumberClick(item.toString());
                                                } else if (item === '⌫') {
                                                    handleBackspace();
                                                } else if (item === '-/+') {
                                                    handleNegative();
                                                } else if (item === 'C') {
                                                    handleClear();
                                                } else if (item === '.') {
                                                    handleDecimal();
                                                } else if (item === '/') {
                                                    handleFraction();
                                                }
                                            }}
                                            className={`
                                                soft-purple-shadow py-4 md:py-5 text-xl md:text-2xl font-bold rounded-xl md:rounded-2xl border-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0
                                                ${typeof item === 'number' 
                                                    ? 'bg-gradient-to-br from-white to-indigo-50 hover:from-indigo-100 hover:to-purple-100 text-slate-700 hover:text-indigo-900 border-indigo-100 hover:border-indigo-300'
                                                    : item === '⌫' || item === 'C'
                                                    ? 'bg-gradient-to-br from-rose-100 to-red-100 hover:from-rose-200 hover:to-red-200 text-rose-700 hover:text-rose-900 border-rose-200 hover:border-rose-400'
                                                    : 'bg-gradient-to-br from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-700 hover:text-indigo-900 border-indigo-200 hover:border-indigo-400'
                                                }
                                            `}
                                            style={{fontFamily: "'Inter', sans-serif"}}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
                                        disabled={currentIndex === 0}
                                        className="soft-purple-shadow py-4 bg-gradient-to-br from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200 text-slate-700 hover:text-slate-900 font-bold rounded-xl md:rounded-2xl border-2 border-slate-200 hover:border-slate-400 transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{fontFamily: "'Raleway', sans-serif"}}
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Sebelumnya
                                    </button>
                                    
                                    <button
                                        onClick={() => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1)}
                                        disabled={currentIndex === questions.length - 1}
                                        className="soft-purple-shadow py-4 bg-gradient-to-br from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-700 hover:text-indigo-900 font-bold rounded-xl md:rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{fontFamily: "'Raleway', sans-serif"}}
                                    >
                                        Selanjutnya
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={submitTest}
                                    className="w-full soft-purple-shadow py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl md:rounded-2xl border-2 border-indigo-500 hover:border-indigo-600 transition-all duration-200 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                    style={{fontFamily: "'Raleway', sans-serif"}}
                                >
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Selesaikan Tes
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
                    Tes Hitungan Cepat
                </h2>
            }
        >
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-6 md:py-12">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
                    
                    .soft-purple-shadow {
                        box-shadow: 0 4px 6px -1px rgba(147, 51, 234, 0.15), 0 2px 4px -1px rgba(147, 51, 234, 0.1);
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
                    <div className="fade-in-up soft-purple-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-100">
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 md:p-10">
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
                            <p className="text-center text-base md:text-xl text-indigo-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                                Lihat hasil dan analisis performa Anda di bawah
                            </p>
                        </div>

                        <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                            {/* Performance Rating */}
                            <div className={`fade-in-up text-center soft-purple-shadow bg-gradient-to-br from-${feedback.color}-50 to-${feedback.color}-100 rounded-3xl p-6 md:p-10 border-2 border-${feedback.color}-200`} style={{animationDelay: '0.1s'}}>
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
                                <div className="fade-in-up soft-purple-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-emerald-200" style={{animationDelay: '0.2s'}}>
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

                                <div className="fade-in-up soft-purple-shadow bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-rose-200" style={{animationDelay: '0.3s'}}>
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
                                <div className="fade-in-up soft-purple-shadow bg-white rounded-3xl p-4 md:p-6 border border-indigo-100" style={{animationDelay: '0.4s'}}>
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Akurasi</h3>
                                    <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2 md:mb-3">{accuracyValue}%</div>
                                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Persentase jawaban benar</p>
                                    <div className="h-2 md:h-3 bg-indigo-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000" style={{width: `${accuracyValue}%`}}></div>
                                    </div>
                                </div>

                                <div className="fade-in-up soft-purple-shadow bg-white rounded-3xl p-4 md:p-6 border border-purple-100" style={{animationDelay: '0.5s'}}>
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
                                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                                    style={{fontFamily: "'Raleway', sans-serif"}}
                                >
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Ulangi Tes
                                </button>
                                
                                <button
                                    onClick={() => setActiveTab('guide')}
                                    className="px-8 md:px-10 py-4 md:py-5 bg-white text-indigo-700 font-bold rounded-2xl shadow-lg hover:shadow-2xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                                    style={{fontFamily: "'Raleway', sans-serif"}}
                                >
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Kembali ke Panduan
                                </button>
                            </div>

                            {/* Tips for Improvement */}
                            <div className="fade-in-up soft-purple-shadow bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl p-6 md:p-8" style={{animationDelay: '0.9s'}}>
                                <h3 className="text-lg md:text-xl font-semibold text-indigo-900 mb-4 md:mb-5 flex items-center gap-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    Saran Untuk Peningkatan
                                </h3>
                                <div className="space-y-3 md:space-y-4">
                                    {[
                                        'Latih operasi matematika dasar (tambah, kurang, kali, bagi) secara rutin',
                                        'Perhatikan urutan operasi (BODMAS/PEMDAS) dalam perhitungan kompleks',
                                        'Gunakan estimasi untuk memeriksa apakah jawaban masuk akal',
                                        'Tinjau soal yang salah untuk memahami pola kesalahan perhitungan'
                                    ].map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-3 md:gap-4 bg-white/70 rounded-2xl p-3 md:p-4">
                                            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
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
                                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 soft-purple-shadow bg-white rounded-2xl p-4 md:p-5 border-2 border-indigo-200 flex items-center gap-3 md:gap-4">
                                    <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <span className="text-indigo-700 font-semibold text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Menyimpan hasil...</span>
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
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 text-center">
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
                titleColor: '#4f46e5',
                bodyColor: '#475569',
                borderColor: '#c7d2fe',
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
                    color: '#e0e7ff',
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
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-indigo-100" style={{height: '300px', maxHeight: '400px'}}>
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}