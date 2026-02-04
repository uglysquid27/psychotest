// resources/js/Pages/Psychotest/HitunganTest/TestPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

export default function HitunganCepat({ questions = [], error = null }) {
    const [userAnswers, setUserAnswers] = useState([]);
    const [currentInputIndex, setCurrentInputIndex] = useState(0);
    const [showNegative, setShowNegative] = useState(false);
    const [isTestFinished, setIsTestFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [timeStarted, setTimeStarted] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const inputRefs = useRef([]);
    const containerRef = useRef(null);
    const timerRef = useRef(null);

    // Initialize with questions from props
    useEffect(() => {
        if (questions.length > 0) {
            setUserAnswers(Array(questions.length).fill(''));
            setCurrentInputIndex(0);
            setIsTestFinished(false);
            setScore(0);
            setTimeStarted(null);
            setTimeElapsed(0);
            clearInterval(timerRef.current);
        }
    }, [questions]);

    // Timer effect
    useEffect(() => {
        if (questions.length > 0 && !isTestFinished && currentInputIndex !== null && timeStarted) {
            timerRef.current = setInterval(() => {
                setTimeElapsed(Math.floor((new Date() - timeStarted) / 1000));
            }, 1000);
            
            return () => clearInterval(timerRef.current);
        }
    }, [questions, isTestFinished, currentInputIndex, timeStarted]);

    // Effect to scroll to the active input
    useEffect(() => {
        if (currentInputIndex !== null && inputRefs.current[currentInputIndex] && containerRef.current) {
            const inputElement = inputRefs.current[currentInputIndex];
            const containerElement = containerRef.current;
            
            if (containerElement) {
                const inputTop = inputElement.offsetTop;
                const inputHeight = inputElement.offsetHeight;
                const containerHeight = containerElement.offsetHeight;
                
                // Scroll to the correct position
                containerElement.scrollTo({
                    top: inputTop - containerHeight / 2 + inputHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [currentInputIndex]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleInputFocus = (idx) => {
        if (!timeStarted) {
            setTimeStarted(new Date());
        }
        setCurrentInputIndex(idx);
        setShowNegative(false);
    };

    const handleNumpadClick = (value) => {
        if (currentInputIndex === null || isTestFinished) return;

        const updated = [...userAnswers];
        
        if (value === 'negative') {
            if (updated[currentInputIndex].startsWith('-')) {
                updated[currentInputIndex] = updated[currentInputIndex].substring(1);
            } else {
                updated[currentInputIndex] = '-' + (updated[currentInputIndex] || '');
            }
        } else if (value === 'C') {
            updated[currentInputIndex] = '';
        } else if (value === 'backspace') {
            updated[currentInputIndex] = updated[currentInputIndex].slice(0, -1);
        } else if (value === 'fraction') {
            if (!updated[currentInputIndex].includes('/')) {
                updated[currentInputIndex] = (updated[currentInputIndex] || '') + '/';
            }
        } else {
            updated[currentInputIndex] = (updated[currentInputIndex] || '') + value;
        }
        
        setUserAnswers(updated);
    };

    const handleNext = () => {
        if (currentInputIndex === null || isTestFinished) return;
        const next = currentInputIndex + 1;
        if (next < questions.length) {
            setCurrentInputIndex(next);
            setShowNegative(false);
        }
    };

    const handlePrevious = () => {
        if (currentInputIndex === null || currentInputIndex === 0 || isTestFinished) return;
        const prev = currentInputIndex - 1;
        setCurrentInputIndex(prev);
        setShowNegative(false);
    };

    // Function to check if user's answer is correct
    const isAnswerCorrect = (userAnswer, correctResult) => {
        if (!userAnswer || userAnswer.trim() === '') return false;
        
        // Parse user's answer (supporting fractions and decimals)
        let userValue;
        if (userAnswer.includes('/')) {
            const [numerator, denominator] = userAnswer.split('/').map(Number);
            if (denominator === 0) return false;
            userValue = numerator / denominator;
        } else {
            userValue = parseFloat(userAnswer);
        }
        
        // Compare with a small tolerance for rounding errors
        return Math.abs(userValue - correctResult) < 0.0001;
    };

    const handleFinishTest = async () => {
    let correctCount = 0;
    const results = questions.map((question, index) => {
        const correctResult = question.answer;
        const isCorrect = isAnswerCorrect(userAnswers[index], correctResult);
        
        if (isCorrect) correctCount++;
        
        return {
            question,
            userAnswer: userAnswers[index],
            correctResult,
            isCorrect
        };
    });
    
    setScore(correctCount);
    setIsTestFinished(true);
    clearInterval(timerRef.current);
    
    // Save results to server
    try {
        await axios.post(route('hitungan.submit'), {
            answers: userAnswers,
            questions: questions,
            time_elapsed: timeElapsed
        });
    } catch (error) {
        console.error('Error saving results:', error);
        // Still show results even if save fails
    }
};

    // Restart test
    const handleRestart = () => {
        setUserAnswers(Array(questions.length).fill(''));
        setCurrentInputIndex(0);
        setIsTestFinished(false);
        setScore(0);
        setTimeStarted(null);
        setTimeElapsed(0);
        clearInterval(timerRef.current);
    };

    // Render test results after completion
    const renderTestResults = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
                        Hasil Tes Hitungan Cepat
                    </h2>
                    
                    <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                            {score} / {questions.length}
                        </div>
                        <div className="text-lg text-gray-600 dark:text-gray-300">
                            Waktu: {formatTime(timeElapsed)}
                        </div>
                        <div className="text-lg font-semibold mt-2">
                            Skor: {((score / questions.length) * 100).toFixed(1)}%
                        </div>
                        <div className={`text-lg font-semibold mt-2 ${
                            score >= questions.length * 0.8 ? 'text-green-600' :
                            score >= questions.length * 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                            {score >= questions.length * 0.8 ? 'Luar Biasa! 🎉' :
                             score >= questions.length * 0.6 ? 'Bagus! 👍' : 'Perlu latihan lebih lanjut.'}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Detail Jawaban:</h3>
                        <div className="max-h-60 overflow-y-auto">
                            {questions.map((question, index) => {
                                const isCorrect = isAnswerCorrect(userAnswers[index], question.answer);
                                
                                return (
                                    <div 
                                        key={index} 
                                        className={`p-2 mb-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
                                    >
                                        <div className="font-medium">
                                            {index + 1}. {question.question} = {userAnswers[index] || '(Tidak dijawab)'}
                                        </div>
                                        {!isCorrect && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Jawaban benar: {question.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleRestart}
                            className="py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                        >
                            Coba Lagi
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                            Tes Baru
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout 
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>
                    {questions.length > 0 && !isTestFinished && timeStarted && (
                        <div className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                            Waktu: {formatTime(timeElapsed)}
                        </div>
                    )}
                </div>
            }
        >
            {/* Show error if not enough questions */}
            {error && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* Only show test if there are questions */}
            {questions.length > 0 ? (
                <div className="flex flex-col h-screen">
                    {/* Question Area with Scroll */}
                    {!isTestFinished && (
                        <>
                            <div 
                                ref={containerRef}
                                className="flex-1 overflow-y-auto p-6 pb-80"
                            >
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Soal {currentInputIndex + 1} dari {questions.length}
                                        </span>
                                        {timeStarted && (
                                            <button
                                                onClick={handleFinishTest}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                                            >
                                                Selesai
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {questions.map((q, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`flex items-center gap-2 p-3 rounded-lg ${currentInputIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
                                            >
                                                <span className="w-6 text-gray-600 dark:text-gray-300 font-medium">{idx + 1}.</span>
                                                <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">
                                                    {q.question}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-300">=</span>
                                                <input
                                                    ref={el => inputRefs.current[idx] = el}
                                                    id={`input-${idx}`}
                                                    type="text"
                                                    value={userAnswers[idx]}
                                                    onFocus={() => handleInputFocus(idx)}
                                                    readOnly
                                                    className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Numpad at Bottom */}
                            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shadow-lg">
                                <div className="max-w-md mx-auto">
                                    {/* Toggle for negative numbers */}
                                    <div className="flex justify-center mb-2">
                                        <button
                                            onClick={() => setShowNegative(!showNegative)}
                                            className={`px-3 py-1 rounded text-xs ${showNegative ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {showNegative ? 'Sembunyikan Negatif' : 'Tampilkan Negatif'}
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-2">
                                        {/* Row 1: 7, 8, 9, Backspace */}
                                        <button
                                            onClick={() => handleNumpadClick('7')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            7
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('8')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            8
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('9')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            9
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('backspace')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-yellow-500 hover:bg-yellow-600 text-white"
                                        >
                                            ⌫
                                        </button>
                                        
                                        {/* Row 2: 4, 5, 6, Clear */}
                                        <button
                                            onClick={() => handleNumpadClick('4')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            4
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('5')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            5
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('6')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            6
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('C')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-red-500 hover:bg-red-600 text-white"
                                        >
                                            C
                                        </button>
                                        
                                        {/* Row 3: 1, 2, 3, Negative */}
                                        <button
                                            onClick={() => handleNumpadClick('1')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            1
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('2')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            2
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('3')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            3
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('negative')}
                                            className={`py-3 px-2 rounded font-semibold text-lg ${showNegative ? 'bg-red-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            -/+
                                        </button>
                                        
                                        {/* Row 4: 0, Fraction, Previous, Next */}
                                        <button
                                            onClick={() => handleNumpadClick('0')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            0
                                        </button>
                                        <button
                                            onClick={() => handleNumpadClick('fraction')}
                                            className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200"
                                        >
                                            ⁄
                                        </button>
                                        <button
                                            onClick={handlePrevious}
                                            disabled={currentInputIndex === 0}
                                            className="py-3 px-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition disabled:opacity-50 font-semibold"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            disabled={currentInputIndex === questions.length - 1}
                                            className="py-3 px-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Show test results if finished */}
                    {isTestFinished && renderTestResults()}
                </div>
            ) : !error ? (
                // Show empty state if no questions and no error
                <div className="flex flex-col items-center justify-center h-96">
                    <div className="text-center">
                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                            Belum ada soal yang tersedia
                        </h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Tes hitungan akan muncul setelah admin menambahkan soal ke database.
                        </p>
                        <div className="mt-6">
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                Kembali ke Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}
        </AuthenticatedLayout>
    );
}