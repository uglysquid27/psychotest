import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function DiscTest({ initialQuestions = [] }) {
    const questionsData = Array.isArray(initialQuestions) ? initialQuestions : [];

    const [questions, setQuestions] = useState(questionsData);
    const [userAnswers, setUserAnswers] = useState(
        Array(questionsData.length).fill({
            most: null,
            least: null,
            // We'll track all four options with their assigned values
            options: Array(4).fill(null) // null, 'M', or 'L'
        })
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [scores, setScores] = useState({ D: 0, I: 0, S: 0, C: 0 });
    const [percentages, setPercentages] = useState({ D: 0, I: 0, S: 0, C: 0 });
    const [profile, setProfile] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
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
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (optionIndex, value) => {
    const newAnswers = [...userAnswers];
    const currentAnswer = { ...newAnswers[currentIndex] };
    
    // Create a copy of current options
    const newOptions = [...currentAnswer.options];
    
    // If we're setting a value programmatically (from the new logic)
    if (value) {
        if (value === 'M') {
            // Remove any existing M first
            const currentMIndex = newOptions.findIndex(opt => opt === 'M');
            if (currentMIndex !== -1) {
                newOptions[currentMIndex] = null;
            }
            newOptions[optionIndex] = 'M';
        } 
        else if (value === 'L') {
            // Remove any existing L first
            const currentLIndex = newOptions.findIndex(opt => opt === 'L');
            if (currentLIndex !== -1) {
                newOptions[currentLIndex] = null;
            }
            newOptions[optionIndex] = 'L';
        }
    } 
    // If clicking without a predefined value (the new logic)
    else {
        const currentValue = newOptions[optionIndex];
        const hasM = newOptions.includes('M');
        const hasL = newOptions.includes('L');
        
        // If clicking on an already selected option, deselect it
        if (currentValue === 'M' || currentValue === 'L') {
            newOptions[optionIndex] = null;
        } 
        // If no M selected yet, set this one to M
        else if (!hasM) {
            newOptions[optionIndex] = 'M';
        } 
        // If M is selected but no L, set this one to L
        else if (hasM && !hasL) {
            newOptions[optionIndex] = 'L';
        } 
        // If both M and L are already selected, replace L with this new selection
        else if (hasM && hasL) {
            const currentLIndex = newOptions.findIndex(opt => opt === 'L');
            if (currentLIndex !== -1) {
                newOptions[currentLIndex] = null;
            }
            newOptions[optionIndex] = 'L';
        }
    }

    currentAnswer.options = newOptions;

    // Update most and least based on the options
    const mostIndex = newOptions.findIndex(opt => opt === 'M');
    const leastIndex = newOptions.findIndex(opt => opt === 'L');

    currentAnswer.most = mostIndex !== -1 ? mostIndex : null;
    currentAnswer.least = leastIndex !== -1 ? leastIndex : null;

    newAnswers[currentIndex] = currentAnswer;
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
        if (isSubmitted) return;

        try {
            const response = await fetch(route('disc.submit'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ answers: userAnswers })
            });

            const result = await response.json();
            setScores(result.scores);
            setPercentages(result.percentages);
            setProfile(result.profile);
            setIsSubmitted(true);
            clearInterval(timerRef.current);
            setShowResultsModal(true);
        } catch (error) {
            console.error('Error submitting test:', error);
        }
    };

    const handleNewSession = () => {
        setUserAnswers(Array(questionsData.length).fill({
            most: null,
            least: null,
            options: Array(4).fill(null)
        }));
        setCurrentIndex(0);
        setIsSubmitted(false);
        setScores({ D: 0, I: 0, S: 0, C: 0 });
        setPercentages({ D: 0, I: 0, S: 0, C: 0 });
        setProfile('');
        setTimeLeft(600);
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
    const currentAnswer = userAnswers[currentIndex];

    // Check if exactly one M and one L are selected
    const isQuestionComplete =
        currentAnswer.options.filter(opt => opt === 'M').length === 1 &&
        currentAnswer.options.filter(opt => opt === 'L').length === 1;

    const isTestComplete = userAnswers.every(answer =>
        answer.options.filter(opt => opt === 'M').length === 1 &&
        answer.options.filter(opt => opt === 'L').length === 1
    );

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">DISC Personality Test</h2>}>
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                {/* Header dengan timer */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
                    <div className="text-center md:text-left">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">DISC Personality Test</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temukan kepribadian Anda dengan tes DISC</p>
                    </div>
                    <div className="flex flex-col items-center bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg shadow-md min-w-[120px]">
                        <div className={`text-lg font-semibold ${timeLeft < 60 ? 'text-red-300' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className="text-xs text-white opacity-80">Sisa Waktu</div>
                    </div>
                </div>

                {!testStarted ? (
                    <div className="mb-6 bg-white dark:text-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
                        <h3 className="text-xl font-bold mb-4">Selamat Datang di Tes DISC</h3>
                        <p className="mb-4">Tes ini akan mengungkap gaya perilaku dan kepribadian Anda berdasarkan model DISC.</p>
                        <ul className="text-left list-disc pl-5 mb-6 mx-auto max-w-md">
                            <li>Terdapat {questions.length} soal yang harus diselesaikan</li>
                            <li>Waktu pengerjaan: 10 menit</li>
                            <li>Untuk setiap soal, beri nilai M (Paling Cocok) pada satu pernyataan dan L (Paling Tidak Cocok) pada satu pernyataan dari 4 opsi pilihan</li>
                            <li>Jawablah dengan jujur sesuai dengan diri Anda sendiri</li>
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
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{Math.round(((currentIndex + 1) / questions.length) * 100)}% selesai</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Soal sekarang */}
                        {currentQuestion && (
                            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-blue-800 dark:text-blue-200 text-lg">Soal {currentIndex + 1}:</span>
                                        {isQuestionComplete && (
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200 flex items-center">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Terjawab
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                                        Beri nilai <span className="font-bold text-green-600">M (Paling Cocok)</span> pada satu pernyataan dan <span className="font-bold text-red-600">L (Paling Tidak Cocok)</span> pada satu pernyataan lainnya:
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentQuestion.options.map((option, optionIndex) => (
                                            <div
                                                key={optionIndex}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${currentAnswer.options[optionIndex] === 'M'
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                                                        : currentAnswer.options[optionIndex] === 'L'
                                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                                                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                                                    }`}
                                                onClick={() => {
                                                    // Cycle through M → L → null
                                                    const currentValue = currentAnswer.options[optionIndex];
                                                    let newValue = null;

                                                    if (currentValue === null) {
                                                        newValue = 'M';
                                                    } else if (currentValue === 'M') {
                                                        newValue = 'L';
                                                    } else {
                                                        newValue = null;
                                                    }

                                                    handleAnswer(optionIndex);
                                                }}
                                            >
                                                <div className="flex items-start">
                                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${currentAnswer.options[optionIndex] === 'M'
                                                            ? 'border-green-500 bg-green-500 text-white'
                                                            : currentAnswer.options[optionIndex] === 'L'
                                                                ? 'border-red-500 bg-red-500 text-white'
                                                                : 'border-gray-400 dark:border-gray-500'
                                                        }`}>
                                                        {currentAnswer.options[optionIndex] === 'M' && 'M'}
                                                        {currentAnswer.options[optionIndex] === 'L' && 'L'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">{option.text}</p>
                                                        {/* <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">({option.type})</p> */}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <svg className="w-5 h-5 inline-block mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Klik pada pernyataan untuk mengubah nilai: M (Paling Cocok) atau L (Paling Tidak Cocok). Pastikan ada satu M dan satu L untuk setiap soal.<br />
                                    Jika ingin mengubah pilihan, klik lagi pada pernyataan yang sudah diberi nilai.
                                </div>
                            </div>
                        )}

                        {/* Navigasi */}
                        <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
                            <button onClick={handlePrev} disabled={currentIndex === 0}
                                className="px-5 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                                Sebelumnya
                            </button>

                            {currentIndex < questions.length - 1 ? (
                                <button onClick={handleNext} className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center">
                                    Berikutnya
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!isTestComplete}
                                    className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Submit Jawaban
                                </button>
                            )}
                        </div>

                        {/* Grid soal */}
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
                            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Daftar Soal:</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((_, idx) => (
                                    <button key={idx} onClick={() => handleQuestionClick(idx)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                      ${currentIndex === idx ? 'bg-indigo-600 text-white shadow-lg transform scale-110' :
                                                userAnswers[idx].options.every(opt => opt !== null) ? 'bg-green-500 text-white dark:bg-green-600' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}
                                    >{idx + 1}</button>
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
                            <h3 className="text-xl md:text-2xl font-bold text-center mb-4 text-gray-800 dark:text-white">Hasil Tes DISC</h3>

                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-center mb-3">Profil Kepribadian Anda:</h4>
                                <p className="text-center text-indigo-600 dark:text-indigo-400 font-medium">{profile}</p>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-center mb-3">Skor DISC:</h4>
                                <div className="space-y-4">
                                    {Object.entries(percentages).map(([type, percentage]) => (
                                        <div key={type}>
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium">
                                                    {type === 'D' && 'Dominance'}
                                                    {type === 'I' && 'Influence'}
                                                    {type === 'S' && 'Steadiness'}
                                                    {type === 'C' && 'Conscientiousness'}
                                                    ({type}): {percentage}%
                                                </span>
                                                <span>{scores[type]} poin</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                                <div
                                                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                {testStarted && timeLeft > 0 && timeLeft <= 60 && !isSubmitted && (
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