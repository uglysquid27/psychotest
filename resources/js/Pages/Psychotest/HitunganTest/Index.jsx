import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Questions from the Excel file - now as a dataset for generating more questions
const QUESTION_DATASET = [
  // First set of questions (Hitungan Cepat 1)
  { question: "8 + 1 + 5", answer: 14 },
  { question: "10 x 2 x 3", answer: 60 },
  { question: "1 - 1 x 1 - 1", answer: -1 },
  { question: "4 x 5 : 1 - 3", answer: 17 },
  { question: "3 x 3 : 3 + 21", answer: 24 },
  { question: "100 x 10 : 100 - 9", answer: 1 },
  { question: "16 x 2 : 8 - 4", answer: 0 },
  { question: "(12 + 28 + 4 + 4) : 4", answer: 12 },
  { question: "40 x 90 : 45 - 48", answer: 32 },
  { question: "0.125 x 8 + 3", answer: 4 },
  { question: "8 x 0.375 - 2", answer: 1 },
  { question: "(10 + 41 + 9) : 60", answer: 1 },
  { question: "7 x 14 : 49 + 9", answer: 11 },
  { question: "18 x 12 : 2 + 7 - 87", answer: 28 },
  { question: "4 x 9 + 29 - 7", answer: 58 },
  { question: "3 x 4 : 3 + 84 + 9", answer: 97 },
  { question: "(15 x 5 + 5 + 2) : 82", answer: 1 },
  { question: "1000 : 500 + 98 - 90", answer: 10 },
  { question: "(60 + 25 + 40 + 10) : 5", answer: 27 },
  { question: "80 : 40 + 60 - 7", answer: 55 },
  { question: "6 x 7 + 92 - 42", answer: 92 },
  { question: "(5 + 74 + 4 - 2) : 9", answer: 9 },
  { question: "99 x 9 : 99 - 8", answer: 1 },
  { question: "85 + 43 - 40", answer: 88 },
  { question: "160 : 16 + 20 - 30", answer: 0 },
  { question: "(3 x 7 + 7 + 4) : 4", answer: 8 },
  { question: "54 x 4 : 9 - 3", answer: 21 },
  { question: "8 x 9 + 14 - 39", answer: 47 },
  { question: "36 + 72 - 28", answer: 80 },
  { question: "10 + 8 x 0.875", answer: 17 },
  { question: "(8 x 2 + 2 + 10) : 4", answer: 7 },
  { question: "17 + 86 - 82 - 2", answer: 19 },
  { question: "6 x 7 : 6 + 17 + 20", answer: 44 },
  { question: "6 x 60 : 5 + 5", answer: 77 },
  { question: "490 : 49 + 65 - 75", answer: 0 },
  { question: "2 x 3 : 3 + 2 + 8 - 6", answer: 6 },
  { question: "8 x 9 : 9 + 8 + 4 - 2", answer: 18 },
  { question: "45 x 45 : 45 - 4", answer: 41 },
  { question: "8 x 7 + 14 + 5", answer: 75 },
  { question: "(20+70+80+40) : 42", answer: 5 },
  { question: "7 x 8 : 7 + 7 + 3 - 1", answer: 17 },
  { question: "40 + 19 - 15 - 5", answer: 39 },
  { question: "25 + 61 - 17", answer: 69 },
  { question: "16 x 5 : 10 - 4", answer: 4 },
  { question: "10 x 12 - 40 - 15", answer: 65 },
  { question: "82 x 2 : 41 - 8", answer: -4 },
  { question: "9 x 1 - 3 - 4", answer: 2 },
  { question: "3 x 2 x 2 x 0 - 67 + 82", answer: 15 },
  { question: "79 + 16 - 62", answer: 33 },
  { question: "5 x 10 + 30 - 18", answer: 62 },
];

// Function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Function to generate a random subset of questions
const generateRandomQuestions = (count = 20) => {
  // Shuffle the dataset and take the first 'count' questions
  const shuffled = shuffleArray(QUESTION_DATASET);
  return shuffled.slice(0, count);
};

// Function to parse a question string into a calculable expression
const parseQuestion = (questionStr) => {
  // Replace operators with JavaScript equivalents
  let expression = questionStr
    .replace(/:/g, '/')  // Replace division symbol
    .replace(/x/g, '*')  // Replace multiplication symbol
    .replace(/,/g, '.')  // Ensure decimal points use dot notation
    .replace(/\(/g, '(') // Ensure proper parentheses
    .replace(/\)/g, ')');
  
  return expression;
};

// Function to calculate the result of a question
const calculateResult = (questionObj) => {
  return questionObj.answer;
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

export default function HitunganCepat() {
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [showNegative, setShowNegative] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(20); // Default number of questions
  const inputRefs = useRef([]);
  const containerRef = useRef(null);

  // Initialize with random questions on component mount
  useEffect(() => {
    generateNewQuestions();
  }, []);

  // Function to generate new random questions
  const generateNewQuestions = () => {
    const newQuestions = generateRandomQuestions(questionCount);
    setQuestions(newQuestions);
    setUserAnswers(Array(newQuestions.length).fill(''));
    setCurrentInputIndex(0);
    setIsTestFinished(false);
    setScore(0);
  };

  // Effect to scroll to the active input
  useEffect(() => {
    if (currentInputIndex !== null && inputRefs.current[currentInputIndex]) {
      const inputElement = inputRefs.current[currentInputIndex];
      const containerElement = containerRef.current;
      
      // Calculate input element position relative to container
      const inputTop = inputElement.offsetTop;
      const inputHeight = inputElement.offsetHeight;
      const containerHeight = containerElement.offsetHeight;
      
      // Scroll to the correct position
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

  // Function to finish the test and calculate score
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

  // Render test results after completion
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
                      {index + 1}. {question.question} = {userAnswers[index] || '(Tidak dijawab)'}
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
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.location.reload()}
              className="py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              Coba Lagi
            </button>
            <button
              onClick={generateNewQuestions}
              className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Soal Baru
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Tes Hitungan Cepat</h2>}>
      <div className="flex flex-col h-screen">
        {/* Question Count Selector */}
        {!isTestFinished && questions.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-center">Jumlah Soal</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[10, 20, 30, 40, 50].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setQuestionCount(count);
                      generateNewQuestions();
                    }}
                    className={`py-2 rounded ${
                      questionCount === count 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <button
                onClick={generateNewQuestions}
                className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Mulai Tes
              </button>
            </div>
          </div>
        )}

        {/* Question Area with Scroll - Added larger bottom padding */}
        {questions.length > 0 && !isTestFinished && (
          <>
            <div 
              ref={containerRef}
              className="flex-1 overflow-y-auto p-6 pb-80" // Larger bottom padding for numpad
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Soal {currentInputIndex + 1} dari {questions.length}
                  </span>
                  {/* <button
                    onClick={generateNewQuestions}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Acak Soal Baru
                  </button> */}
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

            {/* Fixed Numpad at Bottom with common layout */}
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

                  {/* Row 5: Finish button spanning 2 columns */}
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
          </>
        )}
        
        {/* Show test results if finished */}
        {isTestFinished && renderTestResults()}
      </div>
    </AuthenticatedLayout>
  );
}