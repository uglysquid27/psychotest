import { useState, useEffect } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function KraepelinSimple() {
  const ROWS = 27; // jumlah baris
  const COLS = 22; // jumlah soal per baris
  const TIME_PER_ROW = 15; // waktu per baris menjadi 15 detik
  const [currentRow, setCurrentRow] = useState(ROWS - 2); // Start from the second last row
  const [currentCol, setCurrentCol] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROW);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [numberMatrix, setNumberMatrix] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);

  // Generate all numbers at once
  useEffect(() => {
    const matrix = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        // Generate numbers between 1-9
        row.push(Math.floor(Math.random() * 9) + 1);
      }
      matrix.push(row);
    }
    setNumberMatrix(matrix);
    
    // Initialize user answers matrix
    const answers = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    setUserAnswers(answers);
    setIsLoading(false);
  }, []);

  // Timer untuk setiap baris
  useEffect(() => {
    if (isLoading) return;
    
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      nextColumn();
    }
    
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isLoading]);

  const startTest = () => {
    setIsTimerRunning(true);
  };

  const handleNumberClick = (digit) => {
    if (isLoading) return;
    if (!isTimerRunning) startTest();
    
    // Calculate correct answer (sum of current and next row numbers, only last digit)
    const correctAnswer = (numberMatrix[currentRow][currentCol] + numberMatrix[currentRow + 1][currentCol]) % 10;
    
    // Update user answers
    const newAnswers = [...userAnswers];
    newAnswers[currentRow][currentCol] = digit;
    setUserAnswers(newAnswers);
    
    // Check answer
    if (digit === correctAnswer) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
    }
    
    // Move to next question
    nextQuestion();
  };

  const nextQuestion = () => {
    if (currentRow > 0) {
      setCurrentRow((prev) => prev - 1);
    } else {
      nextColumn();
    }
  };

  const nextColumn = () => {
    // Save performance data for this column
    if (currentCol >= 0) {
      const correctInColumn = userAnswers.slice(0, ROWS - 1).filter(
        (row, idx) => row[currentCol] !== null && 
        row[currentCol] === (numberMatrix[idx][currentCol] + numberMatrix[idx + 1][currentCol]) % 10
      ).length;
      
      setPerformanceData(prev => [...prev, {
        column: currentCol + 1,
        correct: correctInColumn,
        total: ROWS - 1
      }]);
    }
    
    if (currentCol < COLS - 1) {
      setCurrentCol((prev) => prev + 1);
      setCurrentRow(ROWS - 2); // Reset to the second last row
      setTimeLeft(TIME_PER_ROW);
    } else {
      setIsFinished(true);
      setIsTimerRunning(false);
    }
  };

  // Render the number matrix
  const renderNumberMatrix = () => {
    if (isLoading || numberMatrix.length === 0) {
      return <div className="mb-6 text-center">Memuat soal...</div>;
    }
    
    return (
      <div className="mb-6 mx-auto max-w-4xl overflow-x-auto">
        <div className="text-center font-bold mb-2">
          Jumlahkan angka dengan angka di bawahnya, dan masukkan digit terakhir hasil penjumlahan
        </div>
        <table className="mx-auto border-collapse">
          <tbody>
            {numberMatrix.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((num, colIndex) => {
                  const isCurrentCell = rowIndex === currentRow && colIndex === currentCol;
                  const isAnswered = userAnswers[rowIndex] && userAnswers[rowIndex][colIndex] !== null;
                  const isActiveColumn = colIndex === currentCol;
                  
                  return (
                    <td 
                      key={`${rowIndex}-${colIndex}`}
                      className={`text-center p-1 border border-gray-800 w-10 h-10
                        ${isCurrentCell ? 'bg-yellow-300 font-bold' : ''}
                        ${isAnswered ? 'bg-blue-100' : ''}
                        ${!isActiveColumn ? 'opacity-70' : ''}
                      `}
                    >
                      {num}
                      {isAnswered && (
                        <div className="text-xs text-green-600">
                          {userAnswers[rowIndex][colIndex]}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Current operation indicator */}
        {!isFinished && currentRow < ROWS - 1 && (
          <div className="mt-4 text-xl font-bold">
            {numberMatrix[currentRow][currentCol]} + {numberMatrix[currentRow + 1][currentCol]} = ?
          </div>
        )}
      </div>
    );
  };

  // Render performance graph
  const renderPerformanceGraph = () => {
    if (performanceData.length === 0) return null;
    
    const maxCorrect = Math.max(...performanceData.map(item => item.correct));
    
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Grafik Performa</h3>
        <div className="flex items-end justify-center h-48 gap-2 border-b-2 border-l-2 border-gray-400 pb-4 pl-4">
          {performanceData.map((data, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="bg-blue-500 w-8 rounded-t transition-all"
                style={{ height: `${(data.correct / maxCorrect) * 100}%` }}
              ></div>
              <div className="text-xs mt-1">{data.correct}</div>
              <div className="text-xs">{index + 1}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-2 text-sm">Kolom</div>
      </div>
    );
  };

  return (
        <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Tes Kraepelin
        </h2>
      }
    >
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white border border-gray-300 p-4 text-center w-full max-w-5xl rounded-lg shadow-md">
        {/* Header */}
        <div className="text-lg font-bold mb-2">
          Kolom {currentCol + 1} dari {COLS} | Baris {ROWS - currentRow - 1} dari {ROWS - 1}
        </div>
        <div className="text-md mb-2">
          Waktu: {timeLeft} detik | Benar: {score.correct} | Salah: {score.wrong}
        </div>

        {/* Timer Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-1000" 
            style={{ width: `${(timeLeft / TIME_PER_ROW) * 100}%` }}
          ></div>
        </div>

        {/* Number Matrix Display */}
        {renderNumberMatrix()}

        {/* Results Display */}
        {isFinished && (
          <div className="mt-4 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="font-bold text-2xl text-green-800 mb-4">📊 Hasil Tes Kraepelin</div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <p className="text-lg">
                Jumlah Benar: <span className="font-bold text-green-600">{score.correct}</span>
              </p>
              <p className="text-lg">
                Jumlah Salah: <span className="font-bold text-red-600">{score.wrong}</span>
              </p>
              <p className="text-lg">
                Total Soal: <span className="font-bold text-blue-600">{score.correct + score.wrong}</span>
              </p>
              <p className="text-lg">
                Akurasi:{" "}
                <span className="font-bold text-blue-600">
                  {score.correct + score.wrong > 0
                    ? ((score.correct / (score.correct + score.wrong)) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </p>
            </div>
            
            {/* Performance Graph */}
            {renderPerformanceGraph()}
          </div>
        )}

        {/* Keypad */}
        {!isFinished && !isLoading && (
          <>
            <div className="grid grid-cols-5 gap-3 mt-6 mx-auto max-w-md">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleNumberClick(digit)}
                  className="w-16 h-16 bg-blue-100 hover:bg-blue-200 font-bold text-2xl border border-gray-300 rounded-lg transition-colors"
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Start Button */}
            {!isTimerRunning && (
              <button
                onClick={startTest}
                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg"
              >
                Mulai Tes
              </button>
            )}
          </>
        )}
      </div>
    </div>
     </AuthenticatedLayout>
  );
}