import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Fungsi untuk menghasilkan soal random dengan hasil bilangan bulat
const generateRandomQuestions = (count) => {
  const operators = ['+', '-', '×'];
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    // Tentukan jumlah operand (1-2), kurangi kompleksitas untuk hindari desimal
    const operandCount = Math.floor(Math.random() * 2) + 1;
    
    if (operandCount === 1) {
      // Soal dengan 1 operator
      const operator = operators[Math.floor(Math.random() * operators.length)];
      
      if (operator === '+') {
        const a = Math.floor(Math.random() * 100) + 1;
        const b = Math.floor(Math.random() * 100) + 1;
        questions.push({ a, operator, b });
      } 
      else if (operator === '-') {
        const a = Math.floor(Math.random() * 100) + 50;
        const b = Math.floor(Math.random() * 50) + 1;
        // Pastikan a > b agar hasilnya positif
        if (a > b) {
          questions.push({ a, operator, b });
        } else {
          // Jika tidak, tukar nilai
          questions.push({ a: b, operator, b: a });
        }
      }
      else if (operator === '×') {
        const a = Math.floor(Math.random() * 12) + 1; // Perkalian 1-12
        const b = Math.floor(Math.random() * 12) + 1;
        questions.push({ a, operator, b });
      }
    } 
    else {
      // Soal dengan 2 operator - hanya kombinasi sederhana
      const operator = operators[Math.floor(Math.random() * operators.length)];
      const operator2 = operators[Math.floor(Math.random() * operators.length)];
      
      // Pastikan hasilnya bulat dengan mengatur urutan operasi
      if (operator === '+' && operator2 === '+') {
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;
        const c = Math.floor(Math.random() * 50) + 1;
        questions.push({ a, operator, b, operator2, c });
      }
      else if (operator === '+' && operator2 === '-') {
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;
        const c = Math.floor(Math.random() * (a + b - 1)) + 1;
        questions.push({ a, operator, b, operator2, c });
      }
      else if (operator === '-' && operator2 === '+') {
        const a = Math.floor(Math.random() * 100) + 50;
        const b = Math.floor(Math.random() * 50) + 1;
        const c = Math.floor(Math.random() * 50) + 1;
        if (a > b) {
          questions.push({ a, operator, b, operator2, c });
        } else {
          questions.push({ a: b, operator, b: a, operator2, c });
        }
      }
      else if (operator === '×' && operator2 === '+') {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const c = Math.floor(Math.random() * 50) + 1;
        questions.push({ a, operator, b, operator2, c });
      }
      else if (operator === '×' && operator2 === '-') {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const product = a * b;
        const c = Math.floor(Math.random() * (product - 1)) + 1;
        questions.push({ a, operator, b, operator2, c });
      }
      else {
        // Fallback ke pertanyaan sederhana
        const a = Math.floor(Math.random() * 100) + 1;
        const b = Math.floor(Math.random() * 100) + 1;
        questions.push({ a, operator: '+', b });
      }
    }
  }
  
  return questions;
};

// Fungsi untuk menghitung hasil dari soal
const calculateResult = (question) => {
  let expression = '';
  
  if (question.operator3 && question.d) {
    // 3 operator
    expression = `${question.a} ${question.operator} ${question.b} ${question.operator2} ${question.c} ${question.operator3} ${question.d}`;
  } else if (question.operator2 && question.c) {
    // 2 operator
    expression = `${question.a} ${question.operator} ${question.b} ${question.operator2} ${question.c}`;
  } else {
    // 1 operator
    expression = `${question.a} ${question.operator} ${question.b}`;
  }
  
  // Ganti simbol untuk kalkulasi
  expression = expression.replace(/×/g, '*').replace(/÷/g, '/');
  
  try {
    // Gunakan Function constructor untuk evaluasi ekspresi matematika
    // Catatan: Dalam aplikasi produksi, gunakan parser matematika yang lebih aman
    return eval(expression);
  } catch (error) {
    console.error("Error calculating result:", error);
    return null;
  }
};

// Fungsi untuk memeriksa apakah jawaban user benar
const isAnswerCorrect = (userAnswer, correctResult) => {
  if (!userAnswer || userAnswer.trim() === '') return false;
  
  // Parse jawaban user (mendukung format pecahan dan desimal)
  let userValue;
  if (userAnswer.includes('/')) {
    const [numerator, denominator] = userAnswer.split('/').map(Number);
    if (denominator === 0) return false;
    userValue = numerator / denominator;
  } else {
    userValue = parseFloat(userAnswer);
  }
  
  // Bandingkan dengan toleransi kecil untuk kesalahan pembulatan
  return Math.abs(userValue - correctResult) < 0.0001;
};

export default function HitunganCepat() {
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [showNegative, setShowNegative] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [score, setScore] = useState(0);
  const inputRefs = useRef([]);
  const containerRef = useRef(null);

  // Generate questions on component mount
  useEffect(() => {
    const generatedQuestions = generateRandomQuestions(20);
    setQuestions(generatedQuestions);
    setUserAnswers(Array(generatedQuestions.length).fill(''));
  }, []);

  // Efek untuk scroll ke input yang aktif
  useEffect(() => {
    if (currentInputIndex !== null && inputRefs.current[currentInputIndex]) {
      const inputElement = inputRefs.current[currentInputIndex];
      const containerElement = containerRef.current;
      
      // Hitung posisi elemen input relatif terhadap container
      const inputTop = inputElement.offsetTop;
      const inputHeight = inputElement.offsetHeight;
      const containerHeight = containerElement.offsetHeight;
      
      // Scroll ke posisi yang tepat
      containerElement.scrollTo({
        top: inputTop - containerHeight / 2 + inputHeight / 2,
        behavior: 'smooth'
      });
    }
  }, [currentInputIndex]);

  const handleInputFocus = (idx) => {
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

  // Fungsi untuk menyelesaikan tes dan menghitung skor
  const handleFinishTest = () => {
    let correctCount = 0;
    const results = questions.map((question, index) => {
      const correctResult = calculateResult(question);
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
  };

  // Format pertanyaan berdasarkan jumlah operator
  const formatQuestion = (q) => {
    let questionText = `${q.a} ${q.operator} ${q.b}`;
    
    if (q.operator2 && q.c) {
      questionText += ` ${q.operator2} ${q.c}`;
    }
    
    if (q.operator3 && q.d) {
      questionText += ` ${q.operator3} ${q.d}`;
    }
    
    return questionText;
  };

  // Render hasil tes setelah selesai
  const renderTestResults = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
            Hasil Tes Hitungan Cepat
          </h2>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {score} / {questions.length}
            </div>
            <div className="text-lg text-gray-600 dark:text-gray-300">
              {score >= questions.length * 0.8 ? 'Luar Biasa! 🎉' : 
               score >= questions.length * 0.6 ? 'Bagus! 👍' : 
               'Perlu latihan lebih lanjut.'}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Detail Jawaban:</h3>
            <div className="max-h-60 overflow-y-auto">
              {questions.map((question, index) => {
                const correctResult = calculateResult(question);
                const isCorrect = isAnswerCorrect(userAnswers[index], correctResult);
                
                return (
                  <div 
                    key={index} 
                    className={`p-2 mb-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
                  >
                    <div className="font-medium">
                      {index + 1}. {formatQuestion(question)} = {userAnswers[index] || '(Tidak dijawab)'}
                    </div>
                    {!isCorrect && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Jawaban benar: {correctResult}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>}>
      <div className="flex flex-col h-screen">
        {/* Header dengan informasi progress */}
        {/* <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Soal {currentInputIndex + 1} dari {questions.length}
            </span>
            
            {!isTestFinished && (
              <button
                onClick={handleFinishTest}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
              >
                Selesai
              </button>
            )}
          </div>
        </div> */}

        {/* Area Soal dengan Scroll - Ditambahkan padding bottom lebih besar */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 pb-80" // Padding bottom lebih besar untuk numpad
        >
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((q, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-2 p-3 rounded-lg ${currentInputIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
                >
                  <span className="w-6 text-gray-600 dark:text-gray-300 font-medium">{idx + 1}.</span>
                  <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">
                    {formatQuestion(q)}
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

        {/* Numpad Fixed di Bawah dengan layout umum */}
        {!isTestFinished && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shadow-lg">
            <div className="max-w-md mx-auto">
              {/* Toggle untuk bilangan negatif */}
              <div className="flex justify-center mb-2">
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className={`px-3 py-1 rounded text-xs ${showNegative ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {showNegative ? 'Sembunyikan Negatif' : 'Tampilkan Negatif'}
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {/* Baris 1: 7, 8, 9, Backspace */}
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
                
                {/* Baris 2: 4, 5, 6, Clear */}
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
                
                {/* Baris 3: 1, 2, 3, Negatif */}
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
                
                {/* Baris 4: 0, Pecahan, Previous, Next */}
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

                {/* Baris 5: Tombol Selesai yang memanjang 2 kolom */}
                <button
                  onClick={handleFinishTest}
                  className="col-span-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition"
                >
                  Selesai
                </button>
                <button
                  onClick={() => handleNumpadClick('fraction')}
                  className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200 invisible"
                >
                  ⁄
                </button>
                <button
                  onClick={() => handleNumpadClick('fraction')}
                  className="py-3 px-2 rounded font-semibold text-lg bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700 text-gray-800 dark:text-gray-200 invisible"
                >
                  ⁄
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Tampilkan hasil tes jika sudah selesai */}
        {isTestFinished && renderTestResults()}
      </div>
    </AuthenticatedLayout>
  );
}