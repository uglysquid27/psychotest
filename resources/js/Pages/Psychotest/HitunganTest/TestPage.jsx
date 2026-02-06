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
    const [showGuide, setShowGuide] = useState(true); // New state for guide
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

    const startTest = () => {
        setTimeStarted(new Date());
        setShowGuide(false);
    };

    const handleInputFocus = (idx) => {
        if (!timeStarted) {
            startTest();
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
        setShowGuide(false); // Go directly to test, not guide
        clearInterval(timerRef.current);
    };

    // Guide/Introduction Screen
    if (showGuide) {
        return (
            <AuthenticatedLayout 
                header={
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>
                    </div>
                }
            >
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 min-h-screen py-8 px-4">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6 shadow-2xl">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                                Tes Hitungan Cepat
                            </h1>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Uji kemampuan berhitung mental Anda dengan berbagai operasi matematika
                            </p>
                        </div>

                        {/* Test Info Cards */}
                        <div className="grid md:grid-cols-3 gap-6 mb-10">
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                                <div className="text-indigo-600 mb-4">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-xl mb-3">20 Soal</h3>
                                <p className="text-gray-600">Berbagai jenis soal matematika yang menantang</p>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                                <div className="text-purple-600 mb-4">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-xl mb-3">Waktu Fleksibel</h3>
                                <p className="text-gray-600">Kerjakan dengan tempo Anda sendiri, fokus pada ketepatan</p>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-transform hover:scale-105">
                                <div className="text-pink-600 mb-4">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-xl mb-3">Kalkulator Mental</h3>
                                <p className="text-gray-600">Gunakan kemampuan berhitung cepat tanpa alat bantu</p>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-8 mb-10 text-white">
                            <h2 className="text-3xl font-bold mb-6 flex items-center">
                                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Petunjuk Pengerjaan
                            </h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                                        <span className="font-bold text-white text-xl">1</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Baca Soal dengan Teliti</h4>
                                        <p className="text-indigo-100">Perhatikan setiap operasi matematika dalam soal sebelum menghitung</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                                        <span className="font-bold text-white text-xl">2</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Gunakan Keypad Digital</h4>
                                        <p className="text-indigo-100">Masukkan jawaban menggunakan keypad di bagian bawah layar</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                                        <span className="font-bold text-white text-xl">3</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Format Jawaban Fleksibel</h4>
                                        <p className="text-indigo-100">Gunakan angka negatif (-), desimal, atau pecahan (/) sesuai kebutuhan</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                                        <span className="font-bold text-white text-xl">4</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-2">Navigasi Mudah</h4>
                                        <p className="text-indigo-100">Gunakan tombol Previous/Next untuk berpindah antar soal</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Keypad Guide */}
                        <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Keypad Digital</h3>
                            
                            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-6">
                                    {/* Keypad Demo */}
                                    {['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '-/+', '0', '⁄', 'Prev', 'Next'].map((key, idx) => (
                                        <div key={idx} className={`
                                            h-12 flex items-center justify-center rounded-lg font-medium
                                            ${['⌫', 'C'].includes(key) ? 'bg-red-100 text-red-700 border border-red-200' :
                                              ['-/+', '⁄'].includes(key) ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                              ['Prev', 'Next'].includes(key) ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                              'bg-white text-gray-800 border border-gray-200'
                                            }
                                        `}>
                                            {key}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-700">Fungsi Tombol:</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center">
                                                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                                                    <span className="text-red-600 font-bold">⌫</span>
                                                </div>
                                                <span>Backspace - Hapus karakter terakhir</span>
                                            </li>
                                            <li className="flex items-center">
                                                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                                                    <span className="text-red-600 font-bold">C</span>
                                                </div>
                                                <span>Clear - Hapus semua input</span>
                                            </li>
                                            <li className="flex items-center">
                                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                                                    <span className="text-blue-600 font-bold">-/+</span>
                                                </div>
                                                <span>Negatif/Positif - Ubah tanda angka</span>
                                            </li>
                                            <li className="flex items-center">
                                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                                                    <span className="text-blue-600 font-bold">⁄</span>
                                                </div>
                                                <span>Pecahan - Masukkan jawaban dalam bentuk pecahan</span>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-indigo-50 p-5 rounded-xl">
                                        <h4 className="font-bold text-gray-800 mb-3">Tips Format Jawaban:</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Angka desimal: <code className="bg-gray-100 px-2 py-1 rounded">3.14</code></span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Pecahan: <code className="bg-gray-100 px-2 py-1 rounded">3/4</code></span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Angka negatif: <code className="bg-gray-100 px-2 py-1 rounded">-5.25</code></span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Examples */}
                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-8 mb-10 border border-pink-200">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Contoh Soal</h3>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-lg font-semibold bg-indigo-100 text-indigo-800 px-3 py-1 rounded">
                                            15 + 8 × 2
                                        </div>
                                        <div className="text-lg font-bold text-green-600">= 31</div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <strong>Penyelesaian:</strong> 8 × 2 = 16, lalu 15 + 16 = 31
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-lg font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded">
                                            (12 - 5) × 4 ÷ 2
                                        </div>
                                        <div className="text-lg font-bold text-green-600">= 14</div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <strong>Penyelesaian:</strong> 12 - 5 = 7, 7 × 4 = 28, 28 ÷ 2 = 14
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-lg font-semibold bg-pink-100 text-pink-800 px-3 py-1 rounded">
                                            ¾ + ½
                                        </div>
                                        <div className="text-lg font-bold text-green-600">= 5/4 atau 1.25</div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <strong>Penyelesaian:</strong> ¾ = 0.75, ½ = 0.5, jumlah = 1.25 atau 5/4
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                            -8 + 15
                                        </div>
                                        <div className="text-lg font-bold text-green-600">= 7</div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <strong>Penyelesaian:</strong> 15 - 8 = 7
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tips Section */}
                        <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                <svg className="w-6 h-6 mr-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Tips untuk Hasil Terbaik
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">Kerjakan Soal Sulit Dahulu</h4>
                                            <p className="text-gray-600 text-sm">Mulai dengan soal yang memerlukan pemikiran lebih dalam</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">Periksa Kembali</h4>
                                            <p className="text-gray-600 text-sm">Selalu cek ulang jawaban sebelum pindah ke soal berikutnya</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mr-4">
                                            <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">Kelola Waktu</h4>
                                            <p className="text-gray-600 text-sm">Jangan terlalu lama di satu soal, lanjutkan jika terjebak</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">Gunakan Shortcut</h4>
                                            <p className="text-gray-600 text-sm">Manfaatkan tombol Prev/Next untuk navigasi cepat</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <div className="text-center mb-8">
                            {questions.length > 0 ? (
                                <>
                                    <button 
                                        onClick={startTest}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 px-16 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-xl"
                                    >
                                        <div className="flex items-center justify-center">
                                            <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Mulai Tes Hitungan
                                        </div>
                                    </button>
                                    <p className="text-gray-600 mt-4 text-sm">
                                        Siap untuk menguji kemampuan berhitung cepat Anda? {questions.length} soal menanti!
                                    </p>
                                </>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                    <div className="flex items-center justify-center mb-4">
                                        <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 mb-2">Soal Belum Tersedia</h4>
                                    <p className="text-gray-600 mb-4">Admin belum menambahkan soal ke dalam sistem. Silakan kembali ke dashboard.</p>
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
            </AuthenticatedLayout>
        );
    }

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
                            onClick={() => setShowGuide(true)}
                            className="py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                        >
                            Kembali ke Panduan
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Show error if not enough questions
    if (error) {
        return (
            <AuthenticatedLayout 
                header={
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>
                    </div>
                }
            >
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // Only show test if there are questions
    if (questions.length === 0) {
        return (
            <AuthenticatedLayout 
                header={
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>
                    </div>
                }
            >
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
            </AuthenticatedLayout>
        );
    }

    // Main Test Interface
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
        </AuthenticatedLayout>
    );
}