import { useState, useEffect, useRef } from "react";
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

export default function KraepelinSimple({ testConfig }) {
  // Use dynamic configuration from props
  const ROWS = testConfig?.rows || 45;
  const COLS = testConfig?.columns || 60;
  const TIME_PER_COL = testConfig?.timePerColumn || 15;
  const DIFFICULTY = testConfig?.difficulty || 'sedang';

  const [currentRow, setCurrentRow] = useState(ROWS - 2);
  const [currentCol, setCurrentCol] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0, unanswered: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_COL);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [numberMatrix, setNumberMatrix] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [rowPerformance, setRowPerformance] = useState([]);
  const [columnPerformance, setColumnPerformance] = useState([]);
  const [answerMatrix, setAnswerMatrix] = useState([]);
  const [showGuide, setShowGuide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testId, setTestId] = useState(null);
  const keypadRef = useRef(null);
  const rowRefs = useRef([]);
  const containerRef = useRef(null);
  const activeQuestionRef = useRef(null);

  useEffect(() => {
    initializeTest();
  }, [ROWS, COLS, DIFFICULTY]);

  const initializeTest = async () => {
  setIsLoading(true);
  
  try {
    // Generate test data from backend with configuration
    const response = await axios.post(route('kraepelin.generate-test-data'), {
      rows: ROWS,
      columns: COLS,
      difficulty: DIFFICULTY
    });

    if (response.data.success) {
      const matrix = response.data.test_data;
      const formattedMatrix = [];
      
      // Convert to 2D array format for the frontend
      for (let col = 0; col < COLS; col++) {
        const column = [];
        for (let row = 0; row < ROWS; row++) {
          // Backend returns {num1: x, num2: y} structure
          // We just need num1 for the display matrix
          column.push(matrix[col][row].num1);
        }
        formattedMatrix.push(column);
      }
      
      setNumberMatrix(formattedMatrix);
      setUserAnswers(Array(ROWS).fill().map(() => Array(COLS).fill(null)));
    }
  } catch (error) {
    console.error('Failed to generate test data:', error);
    // Fallback to local generation
    generateRandomMatrix();
  } finally {
    setIsLoading(false);
  }
};

  const generateRandomMatrix = () => {
    const matrix = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        // Generate numbers based on difficulty
        let num;
        switch (DIFFICULTY) {
          case 'sulit':
            // Hard: more varied numbers, includes 0 occasionally
            num = Math.random() < 0.05 ? 0 : Math.floor(Math.random() * 9) + 1;
            break;
          case 'mudah':
            // Easy: focus on middle numbers
            const easyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            const weights = [5, 10, 15, 20, 25, 20, 15, 10, 5];
            const rand = Math.random() * 100;
            let cumulative = 0;
            for (let i = 0; i < easyNumbers.length; i++) {
              cumulative += weights[i];
              if (rand <= cumulative) {
                num = easyNumbers[i];
                break;
              }
            }
            num = num || Math.floor(Math.random() * 9) + 1;
            break;
          default: // sedang
            num = Math.floor(Math.random() * 9) + 1;
        }
        row.push(num);
      }
      matrix.push(row);
    }
    setNumberMatrix(matrix);
    setUserAnswers(Array(ROWS).fill().map(() => Array(COLS).fill(null)));
  };

  // Auto-scroll to active question within container only
  useEffect(() => {
    if (activeQuestionRef.current && containerRef.current && isTimerRunning) {
      const container = containerRef.current;
      const element = activeQuestionRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      const relativeTop = elementRect.top - containerRect.top;
      const relativeBottom = elementRect.bottom - containerRect.top;
      
      // Check if element is outside visible area
      if (relativeTop < 0 || relativeBottom > container.clientHeight) {
        // Scroll within the container only
        const scrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (element.offsetHeight / 2);
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentRow, currentCol, isTimerRunning]);

  // Scroll to active row when test is running
  useEffect(() => {
    if (isTimerRunning && rowRefs.current[currentRow]) {
      setTimeout(() => {
        rowRefs.current[currentRow]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isTimerRunning]);

  // Scroll keypad into view
  useEffect(() => {
    if (keypadRef.current && !isFinished) {
      keypadRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentRow, currentCol, isFinished]);

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

  const startTest = async () => {
    try {
        const response = await axios.post(route('kraepelin.start'), {
            rows: ROWS,
            columns: COLS,
            time_per_column: TIME_PER_COL,
            difficulty: DIFFICULTY,
            setting_id: testConfig?.settingId || null
        });

        if (response.data.success) {
            setTestId(response.data.data.test_id); // This should set the testId
            setIsTimerRunning(true);
            setShowGuide(false);
        }
    } catch (error) {
        console.error('Failed to start test:', error);
        setIsTimerRunning(true);
        setShowGuide(false);
    }
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
      // Decrease score if removing an answer
      const correctAnswer = (numberMatrix[currentRow][currentCol] + numberMatrix[currentRow + 1][currentCol]) % 10;
      if (newAnswers[currentRow][currentCol] === correctAnswer) {
        setScore(prev => ({ ...prev, correct: Math.max(0, prev.correct - 1) }));
      } else {
        setScore(prev => ({ ...prev, wrong: Math.max(0, prev.wrong - 1) }));
      }
      
      newAnswers[currentRow][currentCol] = null;
      setUserAnswers(newAnswers);
    } else if (currentRow < ROWS - 2) {
      setCurrentRow(prev => prev + 1);
    }
  };

  const calculateAnswerMatrix = () => {
    const matrix = [];
    for (let row = 0; row < ROWS - 1; row++) {
      const rowData = [];
      for (let col = 0; col < COLS; col++) {
        const userAnswer = userAnswers[row]?.[col];
        if (userAnswer === null || userAnswer === '') {
          rowData.push({
            status: 'unanswered',
            userAnswer: null,
            correctAnswer: (numberMatrix[row][col] + numberMatrix[row + 1][col]) % 10
          });
        } else {
          const correctAnswer = (numberMatrix[row][col] + numberMatrix[row + 1][col]) % 10;
          rowData.push({
            status: userAnswer === correctAnswer ? 'correct' : 'wrong',
            userAnswer: userAnswer,
            correctAnswer: correctAnswer
          });
        }
      }
      matrix.push(rowData);
    }
    return matrix;
  };

  const calculateRowPerformanceData = () => {
    const rowData = Array(ROWS - 1).fill(0);
    for (let row = 0; row < ROWS - 1; row++) {
      for (let col = 0; col < COLS; col++) {
        if (userAnswers[row] && userAnswers[row][col] !== null && userAnswers[row][col] !== '') {
          rowData[row]++;
        }
      }
    }
    return rowData;
  };

  const calculateColumnPerformanceData = () => {
    const colData = Array(COLS).fill(0);
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 1; row++) {
        if (userAnswers[row] && userAnswers[row][col] !== null && userAnswers[row][col] !== '') {
          colData[col]++;
        }
      }
    }
    return colData;
  };

  const calculatePerformanceByColumn = () => {
    const perfData = [];
    for (let col = 0; col < COLS; col++) {
      let correct = 0;
      let total = 0;
      
      for (let row = 0; row < ROWS - 1; row++) {
        if (userAnswers[row] && userAnswers[row][col] !== null) {
          total++;
          const correctAnswer = (numberMatrix[row][col] + numberMatrix[row + 1][col]) % 10;
          if (userAnswers[row][col] === correctAnswer) {
            correct++;
          }
        }
      }
      
      if (total > 0) {
        perfData.push({
          column: col + 1,
          correct: correct,
          total: total
        });
      }
    }
    return perfData;
  };

  const submitTest = async () => {
    if (isFinished || isSubmitting) return;
    
    setIsSubmitting(true);
    
    const rowPerf = calculateRowPerformanceData();
    const colPerf = calculateColumnPerformanceData();
    const perfByCol = calculatePerformanceByColumn();
    const answerMatrixData = calculateAnswerMatrix();
    
    setRowPerformance(rowPerf);
    setColumnPerformance(colPerf);
    setPerformanceData(perfByCol);
    setAnswerMatrix(answerMatrixData);
    
    const totalTimeElapsed = (COLS * TIME_PER_COL) - timeLeft;
    const totalQuestions = (ROWS - 1) * COLS;
    const unanswered = totalQuestions - (score.correct + score.wrong);
    
    const submissionData = {
        answers: userAnswers,
        number_matrix: numberMatrix,
        time_elapsed: totalTimeElapsed,
        rows: ROWS,
        cols: COLS,
        difficulty: DIFFICULTY,
        test_id: testId
    };
    
    try {
        const response = await axios.post(route('kraepelin.submit'), submissionData);
        
        if (response.data.success) {
            if (response.data.rowPerformance) {
                setRowPerformance(response.data.rowPerformance);
            }
            if (response.data.columnPerformance) {
                setColumnPerformance(response.data.columnPerformance);
            }
            
            setIsFinished(true);
            setIsTimerRunning(false);
            
            // Update score with data from backend
            setScore({
                correct: response.data.correctAnswers || score.correct,
                wrong: response.data.wrongAnswers || score.wrong,
                unanswered: response.data.unanswered || unanswered
            });
        }
    } catch (error) {
        console.error('Failed to save test results:', error);
        setIsFinished(true);
        setIsTimerRunning(false);
    } finally {
        setIsSubmitting(false);
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
        // Test finished, submit results
        submitTest();
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const calculateConsistencyScore = () => {
    if (!rowPerformance || rowPerformance.length === 0) return 0;
    const avg = rowPerformance.reduce((a, b) => a + b, 0) / rowPerformance.length;
    const variance = rowPerformance.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / rowPerformance.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (stdDev * 20));
    return Math.round(consistencyScore);
  };

  const calculateFatigueIndex = () => {
    if (!columnPerformance || columnPerformance.length === 0) return 0;
    const firstHalf = columnPerformance.slice(0, Math.floor(columnPerformance.length / 2));
    const secondHalf = columnPerformance.slice(Math.floor(columnPerformance.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const drop = ((avgFirst - avgSecond) / avgFirst) * 100;
    return Math.max(0, Math.min(100, Math.round(drop)));
  };

  const calculateOverallScore = () => {
    const total = score.correct + score.wrong + score.unanswered;
    if (total === 0) return 0;
    const accuracy = (score.correct / total) * 100;
    const speed = ((score.correct + score.wrong) / ((COLS * (ROWS - 1)) || 1)) * 100;
    return Math.round((accuracy * 0.6) + (speed * 0.4));
  };

  const getPerformanceFeedback = () => {
    const total = score.correct + score.wrong + score.unanswered;
    if (total === 0) return { title: "Belum Ada Data", desc: "Silakan mulai tes", color: "slate" };
    const accuracy = (score.correct / total) * 100;

    if (accuracy >= 90) return { title: "Luar Biasa!", desc: "Performa sempurna", color: "emerald" };
    if (accuracy >= 80) return { title: "Sangat Baik", desc: "Hasil memuaskan", color: "green" };
    if (accuracy >= 70) return { title: "Baik", desc: "Terus tingkatkan", color: "lime" };
    if (accuracy >= 60) return { title: "Cukup", desc: "Ada ruang perbaikan", color: "amber" };
    return { title: "Perlu Latihan", desc: "Fokus pada akurasi", color: "rose" };
  };

  const getEncouragingMessage = () => {
    const progress = ((currentCol + 1) / COLS) * 100;
    const accuracy = score.correct + score.wrong > 0 
      ? (score.correct / (score.correct + score.wrong)) * 100 
      : 0;

    if (progress < 25) {
      return "Kamu hebat! Luangkan waktu dan tetap fokus. 🌟";
    } else if (progress < 50) {
      if (accuracy > 75) {
        return "Kerja bagus! Akurasi Anda mengesankan! 💪";
      }
      return "Teruskan! Kamu membuat kemajuan yang stabil. 🚀";
    } else if (progress < 75) {
      return "Lebih dari setengah jalan! Kamu melakukan dengan luar biasa! 🎯";
    } else {
      return "Hampir selesai! Selesaikan dengan kuat, kamu bisa! 🏆";
    }
  };

  const getDifficultyLabel = () => {
    switch (DIFFICULTY) {
      case 'mudah': return 'Mudah';
      case 'sedang': return 'Sedang';
      case 'sulit': return 'Sulit';
      default: return 'Kustom';
    }
  };

  const renderNumberMatrix = () => {
    if (isLoading || numberMatrix.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 text-lg font-medium">Menyiapkan tes Anda...</p>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-6xl overflow-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner pt-8 pb-4">
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
                        ? "bg-gradient-to-r from-amber-50 to-orange-50" 
                        : ""
                    }`}
                  >
                    {row.map((num, colIndex) => {
                      const isActiveColumn = colIndex === currentCol;
                      const isCurrentCell = isActiveColumn && rowIndex === currentRow;
                      const isPairCell = isActiveColumn && rowIndex === currentRow + 1;
                      const alreadyAnswered = userAnswers[rowIndex]?.[colIndex] !== null;
                      const showAnswer = alreadyAnswered && isWorkableRow;
                      
                      return (
                        <td
                          key={`${rowIndex}-${colIndex}`}
                          ref={isCurrentCell ? activeQuestionRef : null}
                          className={`text-center p-2 border border-slate-300
                            w-14 sm:w-16 md:w-20 h-10 sm:h-12 md:h-14
                            transition-all duration-200
                            ${isCurrentCell 
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-400 ring-offset-2 shadow-lg scale-105 font-bold text-white' 
                              : ''
                            }
                            ${isPairCell
                              ? 'bg-gradient-to-br from-orange-200 to-amber-200 text-orange-800 border-orange-400 shadow-md'
                              : ''
                            }
                            ${showAnswer && !isCurrentCell && !isPairCell
                              ? 'bg-gradient-to-br from-emerald-50 to-green-50' 
                              : ''
                            }
                            ${isBottomRow 
                              ? 'bg-gradient-to-b from-slate-200 to-slate-300 opacity-80' 
                              : ''
                            }
                            ${!isActiveColumn && !isBottomRow && !isCurrentCell && !isPairCell
                              ? 'opacity-40' 
                              : ''
                            }
                          `}
                        >
                          <div className="flex items-center justify-center gap-1 md:gap-2 w-full h-full">
                            <span className={`text-lg sm:text-xl md:text-2xl font-semibold ${
                              isCurrentCell ? 'text-white' : 
                              isPairCell ? 'text-orange-800' :
                              'text-slate-700'
                            }`}>
                              {num}
                            </span>
                            {/* Show answer in current cell if answered */}
                            {isCurrentCell && userAnswers[rowIndex]?.[colIndex] !== null && (
                              <span className="text-white font-bold text-base sm:text-lg md:text-xl">
                                {userAnswers[rowIndex][colIndex]}
                              </span>
                            )}
                            {/* Show answer in previous row for the pair cell */}
                            {rowIndex > 0 && isActiveColumn && userAnswers[rowIndex-1]?.[colIndex] !== null && (
                              <span className="text-emerald-600 font-bold text-base sm:text-lg md:text-xl">
                                {userAnswers[rowIndex-1][colIndex]}
                              </span>
                            )}
                            {/* Show answer in normal answered cells (not current or pair) */}
                            {showAnswer && !isCurrentCell && !isPairCell && rowIndex < currentRow && (
                              <span className="text-emerald-600 font-bold text-base sm:text-lg md:text-xl">
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

  const renderAnswerMatrix = () => {
    if (answerMatrix.length === 0) {
      const matrix = calculateAnswerMatrix();
      setAnswerMatrix(matrix);
      return null;
    }

    return (
      <div className="soft-beige-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-4 md:p-6 border border-slate-200">
        <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-4 md:mb-6" style={{fontFamily: "'Raleway', sans-serif"}}>
          Matrix Jawaban
          <span className="text-sm font-normal text-slate-600 ml-3">
            ({ROWS - 1} baris × {COLS} kolom) - {getDifficultyLabel()}
          </span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="mx-auto border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-slate-500 text-sm font-medium">Baris/Kolom</th>
                {Array.from({ length: COLS }).map((_, colIndex) => (
                  <th key={colIndex} className="p-2 text-slate-500 text-sm font-medium">
                    K{colIndex + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answerMatrix.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-2 text-slate-500 text-sm font-medium text-center border border-slate-200 bg-slate-100">
                    B{rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => {
                    const bgColor = cell.status === 'correct' 
                      ? 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-300' 
                      : cell.status === 'wrong' 
                      ? 'bg-gradient-to-br from-rose-100 to-red-100 border-rose-300' 
                      : 'bg-gradient-to-br from-slate-100 to-gray-100 border-slate-300';
                    
                    const textColor = cell.status === 'correct' 
                      ? 'text-emerald-700' 
                      : cell.status === 'wrong' 
                      ? 'text-rose-700' 
                      : 'text-slate-500';
                    
                    return (
                      <td
                        key={colIndex}
                        className={`text-center p-3 border-2 ${bgColor} transition-all duration-300`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {/* Show numbers being added */}
                          <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                            <span className="font-semibold">{numberMatrix[rowIndex]?.[colIndex]}</span>
                            <span>+</span>
                            <span className="font-semibold">{numberMatrix[rowIndex + 1]?.[colIndex]}</span>
                          </div>
                          
                          {/* Show user answer vs correct answer */}
                          <div className="flex items-center justify-center gap-2">
                            {cell.status === 'unanswered' ? (
                              <span className="text-sm font-medium text-slate-400">-</span>
                            ) : (
                              <>
                                <span className={`text-lg font-bold ${textColor}`}>
                                  {cell.userAnswer}
                                </span>
                                {cell.status === 'wrong' && (
                                  <span className="text-xs text-slate-500">
                                    (✓{cell.correctAnswer})
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Status indicator */}
                          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            cell.status === 'correct' 
                              ? 'bg-emerald-500/20 text-emerald-700' 
                              : cell.status === 'wrong' 
                              ? 'bg-rose-500/20 text-rose-700' 
                              : 'bg-slate-500/20 text-slate-600'
                          }`}>
                            {cell.status === 'correct' ? 'Benar' : cell.status === 'wrong' ? 'Salah' : 'Kosong'}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-green-500 rounded-sm"></div>
            <span className="text-sm text-slate-700">Benar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-rose-400 to-red-500 rounded-sm"></div>
            <span className="text-sm text-slate-700">Salah</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-slate-300 to-gray-400 rounded-sm"></div>
            <span className="text-sm text-slate-700">Tidak Terjawab</span>
          </div>
        </div>
        
        {/* Summary Statistics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-700">{score.correct}</div>
            <div className="text-xs text-emerald-600 font-medium">Jawaban Benar</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-3 border border-rose-200">
            <div className="text-2xl font-bold text-rose-700">{score.wrong}</div>
            <div className="text-xs text-rose-600 font-medium">Jawaban Salah</div>
          </div>
          <div className="bg-gradient-to-br from-slate-100 to-gray-100 rounded-xl p-3 border border-slate-300">
            <div className="text-2xl font-bold text-slate-600">{score.unanswered}</div>
            <div className="text-xs text-slate-500 font-medium">Tidak Terjawab</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{score.correct + score.wrong + score.unanswered}</div>
            <div className="text-xs text-amber-600 font-medium">Total Soal</div>
          </div>
        </div>
      </div>
    );
  };

  const feedback = getPerformanceFeedback();
  const accuracyValue = ((score.correct / (score.correct + score.wrong + score.unanswered)) * 100 || 0).toFixed(1);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Tes Kraepelin - {getDifficultyLabel()}
          <span className="text-sm font-normal text-gray-600 ml-3">
            {ROWS}×{COLS} • {TIME_PER_COL}s/kolom • {testConfig?.totalTimeFormatted}
          </span>
        </h2>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 md:py-12">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
          
          .soft-beige-shadow {
            box-shadow: 0 4px 6px -1px rgba(251, 191, 36, 0.15), 0 2px 4px -1px rgba(251, 191, 36, 0.1);
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
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          .animate-pulse-gentle {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes slideIn {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .slide-in {
            animation: slideIn 0.5s ease-out;
          }
        `}</style>

        {showGuide ? (
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-100">
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 p-6 md:p-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>
                  Tes Kraepelin
                </h1>
                <p className="text-base md:text-xl text-amber-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                  Ukur konsentrasi dan kecepatan perhitungan mental Anda
                  <br />
                  <span className="text-amber-100 text-sm md:text-base">
                    Konfigurasi: {ROWS} baris × {COLS} kolom • {TIME_PER_COL}s per kolom • {getDifficultyLabel()}
                  </span>
                </p>
              </div>

              <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-start gap-4 md:gap-5 soft-beige-shadow bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border border-amber-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Tambahkan Dua Angka</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Tambahkan angka yang <span className="font-semibold text-amber-700">disorot</span> dengan angka <span className="font-semibold text-amber-700">di bawahnya</span>. Ambil digit terakhir dari hasil penjumlahan (misal: 7 + 8 = 15, jawab <span className="font-bold text-orange-600">5</span>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 md:gap-5 soft-beige-shadow bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 md:p-6 border border-orange-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Kerjakan dengan Cepat</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Klik tombol angka atau gunakan <span className="font-semibold text-orange-700">keyboard</span> Anda. Kerjakan dari <span className="font-semibold text-orange-700">bawah ke atas</span> secepat mungkin tanpa mengorbankan akurasi.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 md:gap-5 soft-beige-shadow bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 md:p-6 border border-yellow-100">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-xl md:text-2xl font-bold text-white">3</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Batasan Waktu</h3>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Setiap kolom memiliki waktu <span className="font-bold text-amber-700">{TIME_PER_COL} detik</span>. Timer akan berpindah ke kolom berikutnya secara otomatis.
                        <br />
                        <span className="text-amber-600 font-medium">Total waktu: {testConfig?.totalTimeFormatted}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="soft-beige-shadow bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-yellow-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-yellow-900 mb-1 md:mb-2 text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Tips Penting</h4>
                      <p className="text-xs md:text-sm text-yellow-800 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                        Kerjakan dengan ritme stabil. Pertahankan <span className="font-semibold">keseimbangan antara kecepatan dan akurasi</span>. Fokus adalah kunci!
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startTest}
                  className="w-full py-5 md:py-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-amber-700 hover:via-orange-700 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 md:gap-4"
                  style={{fontFamily: "'Raleway', sans-serif"}}
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Mulai Tes Sekarang
                </button>
              </div>
            </div>
          </div>
        ) : !isFinished ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-amber-100">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="soft-beige-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 md:p-6 border-2 border-emerald-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-emerald-700" style={{fontFamily: "'Raleway', sans-serif"}}>Benar</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-700">{score.correct}</div>
                </div>

                <div className="soft-beige-shadow bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-4 md:p-6 border-2 border-rose-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-rose-700" style={{fontFamily: "'Raleway', sans-serif"}}>Salah</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-rose-700">{score.wrong}</div>
                </div>

                <div className="soft-beige-shadow bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border-2 border-amber-200">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-sm md:text-base font-semibold text-amber-700" style={{fontFamily: "'Raleway', sans-serif"}}>Waktu</span>
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-amber-700">{timeLeft}s</div>
                </div>
              </div>

              <div className="mb-6 md:mb-8">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <span className="text-sm md:text-base font-semibold text-slate-700" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Kolom {currentCol + 1} dari {COLS} • Tingkat: {getDifficultyLabel()}
                  </span>
                  <span className="text-xs md:text-sm font-medium text-slate-500">
                    {Math.round((currentCol / COLS) * 100)}% selesai • {testConfig?.totalQuestions} soal
                  </span>
                </div>
                <div className="h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-full transition-all duration-500 ease-out shadow-md"
                    style={{width: `${((currentCol + (1 - timeLeft / TIME_PER_COL)) / COLS) * 100}%`}}
                  ></div>
                </div>
              </div>

              {/* Encouraging Message */}
              {isTimerRunning && (
                <div className="soft-beige-shadow bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl px-4 py-3 mb-6 md:mb-8">
                  <p className="text-center text-slate-700 font-medium text-sm sm:text-base">
                    {getEncouragingMessage()}
                  </p>
                </div>
              )}

              {/* Number Matrix */}
              <div className="soft-beige-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-slate-200" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {renderNumberMatrix()}
              </div>

              {/* Keypad Section */}
              <div className="space-y-2.5" ref={keypadRef}>
                {/* Timer Display Above Keypad */}
                {isTimerRunning && (
                  <div className={`rounded-2xl p-3 text-center transition-all duration-300 ${
                    timeLeft > 10 
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300' 
                      : timeLeft > 5 
                      ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400' 
                      : 'bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-400 animate-pulse'
                  }`}>
                    <div className="flex items-center justify-center gap-3">
                      <svg className={`w-6 h-6 ${
                        timeLeft > 10 ? 'text-amber-600' : timeLeft > 5 ? 'text-yellow-600' : 'text-red-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className={`text-3xl font-bold ${
                          timeLeft > 10 ? 'text-amber-700' : timeLeft > 5 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {timeLeft}s
                        </div>
                        <div className="text-sm text-slate-600">
                          {timeLeft > 10 ? 'Sisa waktu' : timeLeft > 5 ? 'Cepat!' : 'Hampir habis!'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mini Progress Bar */}
                    <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          timeLeft > 10 
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                            : timeLeft > 5 
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                            : 'bg-gradient-to-r from-red-400 to-orange-500'
                        }`}
                        style={{ width: `${(timeLeft / TIME_PER_COL) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberClick(num)}
                      className="soft-beige-shadow py-4 md:py-6 bg-gradient-to-br from-white to-amber-50 hover:from-amber-100 hover:to-orange-100 text-slate-700 hover:text-amber-900 text-xl md:text-2xl font-bold rounded-xl md:rounded-2xl border-2 border-amber-100 hover:border-amber-300 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
                      style={{fontFamily: "'Inter', sans-serif"}}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    onClick={() => handleNumberClick(0)}
                    className="soft-beige-shadow py-4 md:py-5 bg-gradient-to-br from-white to-slate-50 hover:from-slate-100 hover:to-slate-200 text-slate-700 hover:text-slate-900 text-xl md:text-2xl font-bold rounded-xl md:rounded-2xl border-2 border-slate-200 hover:border-slate-400 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="soft-beige-shadow py-4 md:py-5 bg-gradient-to-br from-rose-100 to-red-100 hover:from-rose-200 hover:to-red-200 text-rose-700 hover:text-rose-900 font-bold rounded-xl md:rounded-2xl border-2 border-rose-200 hover:border-rose-400 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2"
                    style={{fontFamily: "'Raleway', sans-serif"}}
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                    <span className="hidden md:inline text-sm md:text-base">Hapus</span>
                  </button>
                </div>

                {/* Helper Text */}
                <div className="text-center pt-2">
                  <p className="text-slate-600 text-xs">
                    Klik angka untuk menjawab • Tekan Hapus untuk kembali
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-100">
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 p-6 md:p-10">
                <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse-gentle">
                    <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold text-white" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Tes Selesai!
                  </h1>
                </div>
                <p className="text-center text-base md:text-xl text-amber-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                  Lihat hasil dan analisis performa Anda di bawah • Tingkat: {getDifficultyLabel()}
                </p>
              </div>

              <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className={`fade-in-up text-center soft-beige-shadow bg-gradient-to-br from-${feedback.color}-50 to-${feedback.color}-100 rounded-3xl p-6 md:p-10 border-2 border-${feedback.color}-200`} style={{animationDelay: '0.1s'}}>
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

                {/* Answer Matrix Section */}
                <div className="fade-in-up" style={{animationDelay: '0.2s'}}>
                  {renderAnswerMatrix()}
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div className="fade-in-up soft-beige-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-emerald-200" style={{animationDelay: '0.3s'}}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-sm md:text-base font-semibold text-emerald-800" style={{fontFamily: "'Raleway', sans-serif"}}>Jawaban Benar</h3>
                    </div>
                    <div className="text-3xl md:text-5xl font-bold text-emerald-700 mb-1 md:mb-2">{score.correct}</div>
                    <p className="text-xs md:text-sm text-emerald-600 font-medium">dari {score.correct + score.wrong + score.unanswered} soal</p>
                  </div>

                  <div className="fade-in-up soft-beige-shadow bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-rose-200" style={{animationDelay: '0.4s'}}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-blue-100" style={{animationDelay: '0.5s'}}>
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Akurasi</h3>
                    <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2 md:mb-3">{accuracyValue}%</div>
                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Persentase jawaban benar</p>
                    <div className="h-2 md:h-3 bg-blue-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000" style={{width: `${accuracyValue}%`}}></div>
                    </div>
                  </div>

                  <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-purple-100" style={{animationDelay: '0.6s'}}>
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Kecepatan</h3>
                    <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2 md:mb-3">{((score.correct + score.wrong) / ((COLS * (ROWS - 1)) || 1) * 100).toFixed(1)}%</div>
                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Tingkat penyelesaian soal</p>
                    <div className="h-2 md:h-3 bg-purple-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-1000" style={{width: `${((score.correct + score.wrong) / ((COLS * (ROWS - 1)) || 1) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>

                {/* Performance Overview by Column */}
                <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-slate-200" style={{animationDelay: '0.7s'}}>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Performance Overview
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {performanceData.map((data, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Kolom {data.column}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">
                            {data.correct}/{data.total}
                          </span>
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${(data.correct / data.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fade-in-up" style={{animationDelay: '0.8s'}}>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-4 md:mb-6" style={{fontFamily: "'Raleway', sans-serif"}}>Grafik Performa</h3>
                  <PerformanceGraph rowPerformance={rowPerformance} columnPerformance={columnPerformance} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-indigo-100" style={{animationDelay: '0.9s'}}>
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Konsistensi</h3>
                    <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2 md:mb-3">{calculateConsistencyScore()}%</div>
                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Stabilitas performa antar baris</p>
                    <div className="h-2 md:h-3 bg-indigo-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000" style={{width: `${calculateConsistencyScore()}%`}}></div>
                    </div>
                  </div>

                  <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-orange-100" style={{animationDelay: '1s'}}>
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Indeks Kelelahan</h3>
                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2 md:mb-3">{calculateFatigueIndex()}%</div>
                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Penurunan performa seiring waktu</p>
                    <div className="h-2 md:h-3 bg-orange-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000" style={{width: `${calculateFatigueIndex()}%`}}></div>
                    </div>
                  </div>
                </div>

                <div className="fade-in-up flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-6 md:mb-8" style={{animationDelay: '1.1s'}}>
                  <button
                    onClick={handleRestart}
                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-amber-700 hover:via-orange-700 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                    style={{fontFamily: "'Raleway', sans-serif"}}
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Ulangi Tes
                  </button>
                  
                  <button
                    onClick={() => setShowGuide(true)}
                    className="px-8 md:px-10 py-4 md:py-5 bg-white text-amber-700 font-bold rounded-2xl shadow-lg hover:shadow-2xl border-2 border-amber-200 hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                    style={{fontFamily: "'Raleway', sans-serif"}}
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali ke Panduan
                  </button>
                </div>

                <div className="fade-in-up soft-beige-shadow bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 md:p-8" style={{animationDelay: '1.2s'}}>
                  <h3 className="text-lg md:text-xl font-semibold text-amber-900 mb-4 md:mb-5 flex items-center gap-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    Saran Untuk Peningkatan
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                    {[
                      'Latih perhitungan mental secara rutin untuk meningkatkan kecepatan',
                      'Fokus pada akurasi terlebih dahulu, kemudian tingkatkan kecepatan',
                      'Istirahat yang cukup membantu menjaga konsentrasi',
                      'Tinjau pola kesalahan untuk identifikasi area yang perlu diperbaiki'
                    ].map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-3 md:gap-4 bg-white/70 rounded-2xl p-3 md:p-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-sm md:text-base">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {isSubmitting && (
                  <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 soft-beige-shadow bg-white rounded-2xl p-4 md:p-5 border-2 border-amber-200 flex items-center gap-3 md:gap-4">
                    <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                    <span className="text-amber-700 font-semibold text-sm md:text-base" style={{fontFamily: "'Raleway', sans-serif"}}>Menyimpan hasil...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function PerformanceGraph({ rowPerformance, columnPerformance }) {
  const rowChartData = {
    labels: rowPerformance.map((_, idx) => `Baris ${idx + 1}`),
    datasets: [
      {
        label: 'Jawaban per Baris',
        data: rowPerformance,
        backgroundColor: 'rgba(217, 119, 6, 0.6)',
        borderColor: 'rgb(180, 83, 9)',
        borderWidth: 2,
        borderRadius: 12,
      },
    ],
  };

  const colChartData = {
    labels: columnPerformance.map((_, idx) => `Kolom ${idx + 1}`),
    datasets: [
      {
        label: 'Jawaban per Kolom',
        data: columnPerformance,
        backgroundColor: 'rgba(251, 146, 60, 0.6)',
        borderColor: 'rgb(234, 88, 12)',
        borderWidth: 2,
        borderRadius: 12,
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
        titleColor: '#92400e',
        bodyColor: '#475569',
        borderColor: '#fde68a',
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
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#fef3c7',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          padding: 10,
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
            size: 12,
          },
          padding: 10,
        },
      },
    },
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>Performa per Baris</h3>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border border-amber-100" style={{height: '250px', maxHeight: '320px'}}>
          <Bar data={rowChartData} options={chartOptions} />
        </div>
      </div>

      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>Performa per Kolom</h3>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 md:p-6 border border-orange-100" style={{height: '250px', maxHeight: '320px'}}>
          <Bar data={colChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}