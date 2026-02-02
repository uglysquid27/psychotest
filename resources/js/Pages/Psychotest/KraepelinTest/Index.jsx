import { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function KraepelinSimple() {
  const ROWS = 27;
  const COLS = 22;
  const TIME_PER_COL = 15;

  const [currentRow, setCurrentRow] = useState(ROWS - 2);
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

  // Generate matrix angka
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

  // Timer per kolom
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

  // Scroll ke row aktif
  useEffect(() => {
    if (rowRefs.current[currentRow]) {
      rowRefs.current[currentRow].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentRow, currentCol]);

  // Scroll ke row aktif ketika test dimulai
  useEffect(() => {
    if (isTimerRunning && rowRefs.current[currentRow]) {
      setTimeout(() => {
        rowRefs.current[currentRow].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isTimerRunning]);

  // Scroll keypad ke bawah
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
      setCurrentRow(prev => prev + 1);
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

  const getEncouragingMessage = () => {
    const progress = ((currentCol + 1) / COLS) * 100;
    const accuracy = score.correct + score.wrong > 0 
      ? (score.correct / (score.correct + score.wrong)) * 100 
      : 0;

    if (progress < 25) {
      return "You're doing great! Take your time and stay focused. 🌟";
    } else if (progress < 50) {
      if (accuracy > 75) {
        return "Excellent work! Your accuracy is impressive! 💪";
      }
      return "Keep going! You're making steady progress. 🚀";
    } else if (progress < 75) {
      return "More than halfway there! You're doing wonderfully! 🎯";
    } else {
      return "Almost done! Finish strong, you've got this! 🏆";
    }
  };

  const renderNumberMatrix = () => {
    if (isLoading || numberMatrix.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 text-lg font-medium">Preparing your test...</p>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center" ref={containerRef}>
        <div className="w-full max-w-6xl overflow-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner pt-12 pb-4" style={{ maxHeight: 'calc(100% - 2rem)' }}>
          <table className="mx-auto border-collapse">
            <tbody>
              {numberMatrix.map((row, rowIndex) => {
                const isBottomRow = rowIndex === ROWS - 1;
                const isWorkableRow = rowIndex < ROWS - 1;
                
                return (
                  <tr 
                    key={rowIndex} 
                    ref={el => rowRefs.current[rowIndex] = el}
                    className={`transition-colors duration-200 ${
                      rowIndex === currentRow 
                        ? "bg-gradient-to-r from-teal-50 to-cyan-50" 
                        : ""
                    }`}
                  >
                    {row.map((num, colIndex) => {
                      const isActiveColumn = colIndex === currentCol;
                      const isCurrentCell = isActiveColumn && rowIndex === currentRow;
                      const alreadyAnswered = userAnswers[rowIndex][colIndex] !== null;
                      
                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          className={`text-center p-2 border border-slate-300
                            w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14
                            transition-all duration-200
                            ${isCurrentCell 
                              ? 'bg-gradient-to-br from-amber-200 via-yellow-200 to-amber-100 ring-2 ring-amber-400 ring-offset-2 shadow-lg scale-105 font-bold' 
                              : ''
                            }
                            ${alreadyAnswered && isWorkableRow && !isCurrentCell
                              ? 'bg-slate-50' 
                              : ''
                            }
                            ${isBottomRow 
                              ? 'bg-gradient-to-b from-slate-200 to-slate-300 opacity-80' 
                              : ''
                            }
                            ${!isActiveColumn && !isBottomRow && !isCurrentCell
                              ? 'opacity-40' 
                              : ''
                            }
                          `}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-lg sm:text-xl md:text-2xl font-semibold ${
                              isCurrentCell ? 'text-slate-800' : 'text-slate-700'
                            }`}>
                              {num}
                            </span>
                            {alreadyAnswered && isWorkableRow && (
                              <span className="text-teal-600 font-bold text-base sm:text-lg md:text-xl">
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

  const renderFinishedScreen = () => {
    const accuracy = score.correct + score.wrong > 0 
      ? ((score.correct / (score.correct + score.wrong)) * 100).toFixed(1)
      : 0;

    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-xl p-8 border-2 border-teal-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mb-4 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Test Completed! 🎉
            </h2>
            <p className="text-slate-600 text-lg">
              Great job completing the Kraepelin Test!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-teal-600 mb-2">
                {score.correct}
              </div>
              <div className="text-slate-600 font-medium">Correct</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-slate-600 mb-2">
                {score.wrong}
              </div>
              <div className="text-slate-600 font-medium">Incorrect</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-cyan-600 mb-2">
                {accuracy}%
              </div>
              <div className="text-slate-600 font-medium">Accuracy</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 mb-6 shadow-md border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Performance Overview
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {performanceData.map((data, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Column {data.column}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">
                      {data.correct}/{data.total}
                    </span>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${(data.correct / data.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
            >
              Take Test Again
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout
      fullScreen={true}
      header={
        <h2 className="font-semibold text-slate-800 text-xl leading-tight">
          Kraepelin Addition Test
        </h2>
      }
    >
      <div className="h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {isFinished ? (
            <div className="container mx-auto max-w-7xl px-4 py-6">
              {renderFinishedScreen()}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 sm:p-6 text-white flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-base sm:text-lg font-bold mb-1">
                        Column {currentCol + 1} of {COLS} • Row {ROWS - currentRow - 1} of {ROWS - 1}
                      </div>
                      <div className="text-xs sm:text-sm opacity-90">
                        Correct: {score.correct} • Incorrect: {score.wrong}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xl font-bold">{timeLeft}s</span>
                    </div>
                  </div>
                  
                  {/* Timer Progress Bar */}
                  <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timeLeft > 10 
                          ? 'bg-white' 
                          : timeLeft > 5 
                          ? 'bg-yellow-300' 
                          : 'bg-red-300'
                      }`}
                      style={{ width: `${(timeLeft / TIME_PER_COL) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Encouraging Message */}
              {isTimerRunning && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200 px-4 py-3 flex-shrink-0">
                  <p className="text-center text-slate-700 font-medium text-sm sm:text-base">
                    {getEncouragingMessage()}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {!isTimerRunning && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-4 py-4 flex-shrink-0">
                  <div className="max-w-3xl mx-auto">
                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      How to Complete This Test
                    </h3>
                    <ul className="space-y-1.5 text-slate-700 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>Add the two numbers in each column and enter the last digit of the sum</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>Work from bottom to top in each column</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>You have {TIME_PER_COL} seconds per column</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>Take a deep breath, focus, and do your best!</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Number Matrix */}
              <div className="flex-1 overflow-auto p-4">
                {renderNumberMatrix()}
              </div>

              {/* Keypad Section */}
              {!isLoading && (
                <div ref={keypadRef} className="flex-shrink-0 bg-gradient-to-t from-slate-100 to-white border-t-2 border-slate-200 px-4 py-3">
                  {!isTimerRunning ? (
                    <div className="text-center max-w-md mx-auto">
                      <button
                        onClick={startTest}
                        className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg flex items-center justify-center gap-3"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Test
                      </button>
                      <p className="mt-2 text-slate-600 text-xs sm:text-sm">
                        Ready when you are. No rush!
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-sm mx-auto space-y-2.5">
                      {/* Timer Display Above Keypad */}
                      <div className={`rounded-xl p-2.5 text-center transition-all duration-300 ${
                        timeLeft > 10 
                          ? 'bg-gradient-to-r from-teal-100 to-cyan-100 border-2 border-teal-300' 
                          : timeLeft > 5 
                          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400' 
                          : 'bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-400 animate-pulse'
                      }`}>
                        <div className="flex items-center justify-center gap-2">
                          <svg className={`w-5 h-5 ${
                            timeLeft > 10 ? 'text-teal-600' : timeLeft > 5 ? 'text-yellow-600' : 'text-red-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className={`text-2xl font-bold ${
                              timeLeft > 10 ? 'text-teal-700' : timeLeft > 5 ? 'text-yellow-700' : 'text-red-700'
                            }`}>
                              {timeLeft}s
                            </div>
                            <div className="text-xs text-slate-600">
                              {timeLeft > 10 ? 'Time remaining' : timeLeft > 5 ? 'Hurry up!' : 'Almost out!'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mini Progress Bar */}
                        <div className="mt-2 bg-white/50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-1000 ${
                              timeLeft > 10 
                                ? 'bg-gradient-to-r from-teal-400 to-cyan-500' 
                                : timeLeft > 5 
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                                : 'bg-gradient-to-r from-red-400 to-orange-500'
                            }`}
                            style={{ width: `${(timeLeft / TIME_PER_COL) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Keypad */}
                      <div className="bg-white rounded-2xl p-3 shadow-xl border-2 border-slate-200">
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, ""].map((digit, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (digit === "⌫") handleBackspace();
                                else if (digit !== "") handleNumberClick(digit);
                              }}
                              disabled={digit === ""}
                              className={`
                                h-12 sm:h-14 font-bold text-lg sm:text-xl rounded-xl
                                transition-all duration-150 active:scale-95
                                ${digit === "" 
                                  ? "invisible" 
                                  : digit === "⌫" 
                                  ? "bg-gradient-to-br from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg hover:shadow-xl" 
                                  : "bg-gradient-to-br from-white to-slate-50 hover:from-teal-50 hover:to-cyan-50 border-2 border-slate-300 hover:border-teal-400 text-slate-800 shadow-md hover:shadow-lg"
                                }
                              `}
                            >
                              {digit}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Helper Text */}
                      <div className="text-center pb-1">
                        <p className="text-slate-600 text-xs">
                          Tap numbers to answer • Press ⌫ to go back
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}