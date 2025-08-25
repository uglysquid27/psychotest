import { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function KraepelinSimple() {
  const ROWS = 27;
  const COLS = 22;
  const TIME_PER_COL = 15;

  const [currentRow, setCurrentRow] = useState(ROWS - 2); // mulai dari baris kedua dari bawah
  const [currentCol, setCurrentCol] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_COL);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [numberMatrix, setNumberMatrix] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const keypadRef = useRef(null);
  const rowRefs = useRef([]);
  const containerRef = useRef(null);

  // generate matrix angka
  useEffect(() => {
    const matrix = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * 9) + 1);
      }
      matrix.push(row);
    }
    setNumberMatrix(matrix);
    setUserAnswers(Array(ROWS).fill().map(() => Array(COLS).fill(null)));
    setIsLoading(false);
  }, []);

  // timer per kolom
  useEffect(() => {
    if (isLoading) return;
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      nextColumn();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isLoading]);

  // scroll ke row aktif
  useEffect(() => {
    if (rowRefs.current[currentRow]) {
      rowRefs.current[currentRow].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentRow, currentCol]);

  // scroll ke row aktif ketika test dimulai
  useEffect(() => {
    if (isTimerRunning && rowRefs.current[currentRow]) {
      // Small delay to ensure the DOM is updated
      setTimeout(() => {
        rowRefs.current[currentRow].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isTimerRunning]);

  // scroll keypad ke bawah biar gampang di mobile
  useEffect(() => {
    if (keypadRef.current && !isFinished) {
      keypadRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentRow, currentCol, isFinished]);

  const startTest = () => {
    setIsTimerRunning(true);
  };

  const handleNumberClick = (digit) => {
    if (isLoading) return;
    if (!isTimerRunning) startTest();
    if (!numberMatrix[currentRow] || !numberMatrix[currentRow + 1]) return;

    const correctAnswer =
      (numberMatrix[currentRow][currentCol] +
        numberMatrix[currentRow + 1][currentCol]) % 10;

    const newAnswers = [...userAnswers];
    newAnswers[currentRow][currentCol] = digit;
    setUserAnswers(newAnswers);

    if (digit === correctAnswer) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    // pindah ke row atas tanpa hapus jawaban lama
    if (currentRow > 0) {
      setCurrentRow(prev => prev - 1);
    } else {
      nextColumn();
    }
  };

  const handleBackspace = () => {
    const newAnswers = [...userAnswers];
    if (newAnswers[currentRow][currentCol] !== null) {
      newAnswers[currentRow][currentCol] = null;
      setUserAnswers(newAnswers);
    } else if (currentRow < ROWS - 2) {
      setCurrentRow(prev => prev + 1); // mundur ke row bawah
    }
  };

  const nextColumn = () => {
    if (currentCol >= 0) {
      const correctInColumn = userAnswers.slice(0, ROWS - 1).filter(
        (row, idx) =>
          row[currentCol] !== null &&
          row[currentCol] ===
            (numberMatrix[idx][currentCol] + numberMatrix[idx + 1][currentCol]) % 10
      ).length;
      setPerformanceData(prev => [
        ...prev,
        { column: currentCol + 1, correct: correctInColumn, total: ROWS - 1 }
      ]);
    }

    if (currentCol < COLS - 1) {
      setCurrentCol(prev => prev + 1);
      setCurrentRow(ROWS - 2);
      setTimeLeft(TIME_PER_COL);
    } else {
      setIsFinished(true);
      setIsTimerRunning(false);
    }
  };

  const renderNumberMatrix = () => {
    if (isLoading || numberMatrix.length === 0) {
      return <div className="mb-6 text-center">Memuat soal...</div>;
    }

    return (
      <div className="mb-4 mx-auto max-w-4xl overflow-x-auto" ref={containerRef}>
        <div className="overflow-auto max-h-[70vh] mb-4">
          <table className="mx-auto border-collapse">
            <tbody>
              {numberMatrix.map((row, rowIndex) => {
                const isBottomRow = rowIndex === ROWS - 1;
                const isWorkableRow = rowIndex < ROWS - 1; // Bukan baris paling bawah
                
                return (
                  <tr 
                    key={rowIndex} 
                    ref={el => rowRefs.current[rowIndex] = el}
                    className={rowIndex === currentRow ? "bg-blue-50" : ""}
                  >
                    {row.map((num, colIndex) => {
                      const isActiveColumn = colIndex === currentCol;
                      const isCurrentCell = isActiveColumn && rowIndex === currentRow;
                      const alreadyAnswered = userAnswers[rowIndex][colIndex] !== null;
                      
                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className={`text-center p-1 border border-gray-800 
                            w-8 sm:w-10 h-8 sm:h-10 text-xs sm:text-sm
                            ${isCurrentCell ? 'bg-yellow-300 font-bold' : ''}
                            ${alreadyAnswered && isWorkableRow ? 'bg-gray-200' : ''}
                            ${isBottomRow ? 'bg-gray-300 opacity-70' : ''}
                            ${!isActiveColumn && !isBottomRow ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base sm:text-lg">{num}</span>
                            {alreadyAnswered && isWorkableRow && (
                              <span className="ml-1 sm:ml-2 text-red-600 font-bold text-sm sm:text-base">
                                {userAnswers[rowIndex][colIndex]}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-gray-800 text-xl leading-tight">Tes Kraepelin</h2>}
    >
      <div className="min-h-screen bg-gray-100 py-4">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-md">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-base sm:text-lg font-bold">
                Kolom {currentCol + 1} / {COLS} | Baris {ROWS - currentRow - 1} / {ROWS - 1}
              </div>
              <div className="text-sm sm:text-md">
                Waktu: {timeLeft}s | Benar: {score.correct} | Salah: {score.wrong}
              </div>
            </div>

            {/* Timer Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-4">
              <div
                className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / TIME_PER_COL) * 100}%` }}
              ></div>
            </div>

            {/* Matrix */}
            {renderNumberMatrix()}

            {/* Keypad */}
            {!isFinished && !isLoading && (
              <div ref={keypadRef} className="sticky bottom-0 bg-white pt-4 border-t mt-6">
                {!isTimerRunning && (
                  <div className="text-center mb-4">
                    <button
                      onClick={startTest}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-base sm:text-lg"
                    >
                      Mulai Tes
                    </button>
                  </div>
                )}

                {isTimerRunning && (
                  <div className="mx-auto max-w-xs sm:max-w-sm bg-gray-200 p-4 rounded-xl shadow-lg">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, ""].map((digit, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (digit === "⌫") handleBackspace();
                            else if (digit !== "") handleNumberClick(digit);
                          }}
                          disabled={digit === ""}
                          className={`w-12 h-12 sm:w-14 sm:h-14 font-bold text-lg sm:text-xl rounded-full flex items-center justify-center
                            ${digit === "" ? "invisible" :
                              digit === "⌫" ? "bg-gray-400 hover:bg-gray-500 text-white" :
                              "bg-white hover:bg-gray-100 border border-gray-300 text-gray-800"}
                            transition-colors shadow-md`}
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}