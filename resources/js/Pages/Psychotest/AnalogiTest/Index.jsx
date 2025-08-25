import { useState, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function AnalogiTest({ questions }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [finished, setFinished] = useState(false);
    const [scoreResult, setScoreResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [testStarted, setTestStarted] = useState(false);
    const [blurQuestion, setBlurQuestion] = useState(true);

    const { post } = useForm();

    // Timer countdown
    useEffect(() => {
        if (!testStarted) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [testStarted]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startTest = () => {
        setTestStarted(true);
        setBlurQuestion(false);
    };

    const handleAnswer = (option) => {
        const newAnswers = [...answers];
        newAnswers[currentIndex] = option;
        setAnswers(newAnswers);

        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        post(route('analogi.submit'), {
            answers: answers,
            questions: questions
        }, {
            onSuccess: (page) => {
                setScoreResult(page.props);
                setFinished(true);
            },
        });
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const navigateToQuestion = (index) => {
        setCurrentIndex(index);
    };

    if (finished) {
        return (
            <AuthenticatedLayout
                header={<h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">Tes Analogi</h2>}
            >
                <div className="min-h-screen bg-gray-100 py-4">
                    <div className="container mx-auto px-4">
                        <div className="bg-white border border-gray-300 p-4 sm:p-6 rounded-lg shadow-md text-center">
                            <h2 className="text-2xl font-bold mb-4 text-green-600">Tes Selesai 🎉</h2>
                            <div className="bg-blue-100 p-4 rounded-lg mb-4">
                                <p className="text-xl font-semibold">
                                    Skor: {scoreResult?.score} / {scoreResult?.total}
                                </p>
                                <p className="text-lg text-gray-600">
                                    Persentase: {Math.round((scoreResult?.score / scoreResult?.total) * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentIndex];

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">Tes Analogi</h2>}
        >
            <div className="min-h-screen bg-gray-100 py-4">
                <div className="container mx-auto px-4">
                    <div className="bg-white border border-gray-300 p-4 sm:p-6 rounded-lg shadow-md">
                        {/* Timer */}
                        {testStarted && (
                            <div className="bg-red-100 p-3 rounded-lg mb-6 text-center">
                                <p className="text-lg font-semibold text-red-600">
                                    ⏰ Waktu tersisa: {formatTime(timeLeft)}
                                </p>
                            </div>
                        )}

                        {/* Progress */}
                        {testStarted && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium">
                                        Progress: {answers.filter(a => a !== undefined).length} dari {questions.length}
                                    </span>
                                    <span className="text-sm font-medium">
                                        Soal {currentIndex + 1} dari {questions.length}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Question */}
                        <div className="bg-gray-50 p-6 rounded-lg mb-8 relative">
                            {!testStarted && (
                                <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-10 rounded-lg">
                                    <p className="text-lg font-medium mb-4 text-gray-600">Klik tombol mulai untuk memulai tes</p>
                                    <button
                                        onClick={startTest}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Mulai Tes
                                    </button>
                                </div>
                            )}
                            
                            <h2 className={`text-xl font-semibold text-center mb-4 transition-all duration-500 ${blurQuestion ? 'blur-md' : 'blur-none'}`}>
                                {currentQuestion.question}
                            </h2>
                            
                            {testStarted && (
                                <div className="grid gap-3">
                                    {currentQuestion.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(option)}
                                            className={`px-6 py-3 rounded-lg text-left transition-all ${
                                                currentAnswer === option
                                                    ? 'bg-blue-600 text-white border-2 border-blue-600'
                                                    : 'bg-white text-gray-800 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Navigation */}
                        {testStarted && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentIndex === 0}
                                    className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-md disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto order-2 sm:order-1"
                                >
                                    ← Sebelumnya
                                </button>
                                
                                <div className="flex gap-2 flex-wrap justify-center order-1 sm:order-2">
                                    {questions.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => navigateToQuestion(index)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                                ${currentIndex === index ? 'bg-blue-500 text-white' : 
                                                answers[index] ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="order-3 w-full sm:w-auto flex justify-center sm:block">
                                    {currentIndex < questions.length - 1 ? (
                                        <button
                                            onClick={handleNext}
                                            className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md text-sm sm:text-base w-full sm:w-auto"
                                        >
                                            Berikutnya →
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmit}
                                            className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-md text-sm sm:text-base w-full sm:w-auto"
                                        >
                                            Selesaikan Tes
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}