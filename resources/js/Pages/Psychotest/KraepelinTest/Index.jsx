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

export default function KraepelinSimple() {
  const ROWS = 5;
  const COLS = 5;
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
  const [rowPerformance, setRowPerformance] = useState([]);
  const [columnPerformance, setColumnPerformance] = useState([]);
  const [showGuide, setShowGuide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setShowGuide(false);
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

 const submitTest = async () => {
    if (isFinished || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Calculate performance data
    const rowPerf = calculateRowPerformanceData();
    const colPerf = calculateColumnPerformanceData();
    setRowPerformance(rowPerf);
    setColumnPerformance(colPerf);
    
    // Calculate total time elapsed
    const totalTimeElapsed = (COLS * TIME_PER_COL) - timeLeft;
    
    // DEBUG: Log what we're sending
    console.log('Number Matrix:', numberMatrix);
    console.log('User Answers:', userAnswers);
    console.log('Rows:', ROWS, 'Cols:', COLS);
    
    // Prepare submission data - send the RAW number matrix
    const submissionData = {
        answers: userAnswers,
        number_matrix: numberMatrix, // Send the raw 5x5 number matrix
        time_elapsed: totalTimeElapsed,
        rows: ROWS,
        cols: COLS
    };
    
    try {
        const response = await axios.post(route('kraepelin.submit'), submissionData);
        
        if (response.data.success) {
            console.log('Server Response:', response.data);
            
            // Store performance data from backend
            if (response.data.rowPerformance) {
                setRowPerformance(response.data.rowPerformance);
            }
            if (response.data.columnPerformance) {
                setColumnPerformance(response.data.columnPerformance);
            }
            
            setIsFinished(true);
            setIsTimerRunning(false);
            
            // Update score with data from server
            if (response.data.score !== undefined) {
                setScore({
                    correct: response.data.correctAnswers || response.data.score || score.correct,
                    wrong: response.data.wrongAnswers || score.wrong
                });
            }
            
            console.log('Kraepelin test results saved successfully');
        }
    } catch (error) {
        console.error('Failed to save test results:', error);
        console.error('Error details:', error.response?.data);
        // Still finish the test locally
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
      
      // Add to performance data for column graph
      const columnPerformance = {
        column: currentCol + 1,
        correct: correctInColumn,
        total: ROWS - 1,
        answered: userAnswers.reduce((count, row) => 
          count + (row[currentCol] !== null ? 1 : 0), 0
        )
      };
      setPerformanceData(prev => [...prev, columnPerformance]);
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

  // Performance Graph Component
  const PerformanceGraph = ({ rowPerformance, columnPerformance }) => {
    // Row Performance Chart (Bottom to Top)
    const rowChartData = {
      labels: Array.from({ length: rowPerformance.length }, (_, i) => `Row ${i + 1}`),
      datasets: [
        {
          label: 'Questions Answered',
          data: rowPerformance,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };

    const rowChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Performance by Row (Bottom to Top)',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `Answered: ${context.raw} questions`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.max(...rowPerformance) + 5,
          title: {
            display: true,
            text: 'Questions Answered'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Row Number'
          }
        }
      },
    };

    // Column Performance Chart (Left to Right)
    const columnChartData = {
      labels: Array.from({ length: columnPerformance.length }, (_, i) => `Col ${i + 1}`),
      datasets: [
        {
          label: 'Questions Answered',
          data: columnPerformance,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    };

    const columnChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Performance by Column (Left to Right)',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `Answered: ${context.raw} questions`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.max(...columnPerformance) + 5,
          title: {
            display: true,
            text: 'Questions Answered'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Column Number'
          }
        }
      },
    };

    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4">Row Performance Analysis</h3>
          <p className="text-gray-600 mb-4">
            Shows how many questions you answered in each row. Typically, 
            answers decrease as you move up (showing fatigue).
          </p>
          <div className="h-64">
            <Bar options={rowChartOptions} data={rowChartData} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-gray-600">Highest Row</div>
              <div className="text-xl font-bold text-blue-600">
                Row {rowPerformance.indexOf(Math.max(...rowPerformance)) + 1}: {Math.max(...rowPerformance)} answers
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-sm text-gray-600">Lowest Row</div>
              <div className="text-xl font-bold text-red-600">
                Row {rowPerformance.indexOf(Math.min(...rowPerformance)) + 1}: {Math.min(...rowPerformance)} answers
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4">Column Performance Analysis</h3>
          <p className="text-gray-600 mb-4">
            Shows how many questions you answered in each column. 
            Consistent performance across columns indicates good time management.
          </p>
          <div className="h-64">
            <Bar options={columnChartOptions} data={columnChartData} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-gray-600">Best Column</div>
              <div className="text-xl font-bold text-green-600">
                Column {columnPerformance.indexOf(Math.max(...columnPerformance)) + 1}: {Math.max(...columnPerformance)} answers
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-sm text-gray-600">Average per Column</div>
              <div className="text-xl font-bold text-yellow-600">
                {Math.round(columnPerformance.reduce((a, b) => a + b, 0) / columnPerformance.length)} answers
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-bold text-gray-700 mb-2">Interpretation Guide:</h4>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• <span className="font-medium">Ideal Pattern:</span> Consistent answers across all rows and columns</li>
            <li>• <span className="font-medium">Fatigue Pattern:</span> Decreasing answers as you move up rows</li>
            <li>• <span className="font-medium">Time Pressure:</span> Decreasing answers in later columns</li>
            <li>• <span className="font-medium">Consistency Score:</span> Higher consistency = better mental stamina</li>
          </ul>
        </div>
      </div>
    );
  };

  // Guide/Introduction Screen
  if (showGuide) {
    return (
      <AuthenticatedLayout
        fullScreen={true}
        header={
          <h2 className="font-semibold text-slate-800 text-xl leading-tight">
            Kraepelin Addition Test
          </h2>
        }
      >
        <div className="h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 overflow-y-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
                Kraepelin Test
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Uji kemampuan berhitung cepat, konsentrasi, dan ketahanan mental Anda
              </p>
            </div>

            {/* Test Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 transform transition-transform hover:scale-105">
                <div className="text-teal-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">22 Kolom</h3>
                <p className="text-slate-600">Setiap kolom berisi 26 pasangan angka yang harus dijumlahkan</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 transform transition-transform hover:scale-105">
                <div className="text-cyan-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">15 Detik/Kolom</h3>
                <p className="text-slate-600">Waktu terbatas untuk meningkatkan tekanan dan menguji ketahanan</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 transform transition-transform hover:scale-105">
                <div className="text-blue-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-3">Akurasi & Kecepatan</h3>
                <p className="text-slate-600">Nilai berdasarkan kombinasi kecepatan dan ketepatan jawaban</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl shadow-2xl p-8 mb-10 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Cara Mengerjakan Tes Kraepelin
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Jumlahkan Dua Angka</h4>
                    <p className="text-teal-100">Jumlahkan angka di baris atas dengan angka di baris bawah pada kolom yang sama</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Masukkan Digit Terakhir</h4>
                    <p className="text-teal-100">Jika hasil penjumlahan lebih dari 9, masukkan hanya digit terakhirnya</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Kerjakan dari Bawah ke Atas</h4>
                    <p className="text-teal-100">Mulai dari baris terbawah yang tersedia dan naik ke atas dalam satu kolom</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-5 mt-1">
                    <span className="font-bold text-white text-xl">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Pindah Kolom Otomatis</h4>
                    <p className="text-teal-100">Setelah 15 detik atau selesai satu kolom, pindah ke kolom berikutnya secara otomatis</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Example */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Contoh Perhitungan</h3>
              
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center text-2xl font-bold text-teal-700 mb-2">
                      7
                    </div>
                    <div className="text-sm text-slate-600">Angka atas</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">+</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center text-2xl font-bold text-cyan-700 mb-2">
                      8
                    </div>
                    <div className="text-sm text-slate-600">Angka bawah</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">=</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-teal-200 to-cyan-200 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-800 mb-2">
                      15
                    </div>
                    <div className="text-sm text-slate-600">Hasil jumlah</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">→</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-2">
                      5
                    </div>
                    <div className="text-sm text-slate-600">Digit terakhir</div>
                  </div>
                </div>
                <p className="text-slate-600 text-center">
                  <strong>Contoh:</strong> 7 + 8 = 15 → masukkan <span className="font-bold text-green-600">5</span> (digit terakhir)
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-800 mb-2">Contoh Lain:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="font-medium text-slate-700 w-24">3 + 6 = 9</span>
                      <span className="mx-2">→</span>
                      <span className="font-bold text-teal-600">Jawaban: 9</span>
                    </li>
                    <li className="flex items-center">
                      <span className="font-medium text-slate-700 w-24">4 + 9 = 13</span>
                      <span className="mx-2">→</span>
                      <span className="font-bold text-teal-600">Jawaban: 3</span>
                    </li>
                    <li className="flex items-center">
                      <span className="font-medium text-slate-700 w-24">8 + 8 = 16</span>
                      <span className="mx-2">→</span>
                      <span className="font-bold text-teal-600">Jawaban: 6</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-teal-50 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-800 mb-2">Tips Sukses:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-teal-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Fokus pada satu kolom pada satu waktu</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-teal-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Gunakan keypad untuk jawaban cepat</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-teal-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Jangan panik saat waktu hampir habis</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Test Structure */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 mb-10 text-white">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Struktur Tes
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 p-5 rounded-xl">
                  <div className="text-4xl font-bold text-teal-300 mb-2">27</div>
                  <div className="text-lg font-medium mb-1">Baris Angka</div>
                  <div className="text-teal-200 text-sm">Setiap baris berisi 22 angka acak dari 1-9</div>
                </div>
                <div className="bg-white/10 p-5 rounded-xl">
                  <div className="text-4xl font-bold text-cyan-300 mb-2">22</div>
                  <div className="text-lg font-medium mb-1">Kolom Soal</div>
                  <div className="text-cyan-200 text-sm">Setiap kolom harus diselesaikan dalam 15 detik</div>
                </div>
                <div className="bg-white/10 p-5 rounded-xl">
                  <div className="text-4xl font-bold text-blue-300 mb-2">572</div>
                  <div className="text-lg font-medium mb-1">Total Soal</div>
                  <div className="text-blue-200 text-sm">Semua pasangan angka yang harus dijumlahkan</div>
                </div>
                <div className="bg-white/10 p-5 rounded-xl">
                  <div className="text-4xl font-bold text-emerald-300 mb-2">5:30</div>
                  <div className="text-lg font-medium mb-1">Total Waktu</div>
                  <div className="text-emerald-200 text-sm">Waktu maksimal untuk menyelesaikan tes</div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center mb-10">
              <button 
                onClick={startTest}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-5 px-16 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 text-xl"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mulai Tes Kraepelin
                </div>
              </button>
              <p className="text-slate-600 mt-4 text-sm">
                Siap untuk menguji kemampuan berhitung dan konsentrasi Anda?
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
              <p className="text-slate-600 text-sm">
                <strong>Catatan:</strong> Tes ini dirancang untuk mengukur kecepatan, ketepatan, dan ketahanan mental. 
                Hasilnya dapat bervariasi tergantung kondisi fisik dan mental saat mengerjakan.
              </p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Main Test Interface
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

              {/* Instructions (only show when timer not running but test has started) */}
              {!isTimerRunning && !showGuide && (
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
                    <div className="mt-4 text-center">
                      <button
                        onClick={startTest}
                        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        Start Test
                      </button>
                    </div>
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

  // Helper functions
  function getEncouragingMessage() {
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
  }

  function renderNumberMatrix() {
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
                      const alreadyAnswered = userAnswers[rowIndex] && userAnswers[rowIndex][colIndex] !== null;
                      
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
  }

  function renderFinishedScreen() {
    const totalQuestions = (ROWS - 1) * COLS; // 572 questions
    const answeredQuestions = rowPerformance.reduce((a, b) => a + b, 0);
    const accuracyValue = score.correct + score.wrong > 0 
      ? ((score.correct / (score.correct + score.wrong)) * 100).toFixed(1)
      : 0;
    const completionRate = ((answeredQuestions / totalQuestions) * 100).toFixed(1);
    const totalTimeElapsed = (COLS * TIME_PER_COL) - timeLeft;
    
    // Helper functions moved inside renderFinishedScreen to access local variables
    const calculateConsistencyScore = () => {
        if (rowPerformance.length === 0) return 0;
        
        const max = Math.max(...rowPerformance);
        const min = Math.min(...rowPerformance);
        const range = max - min;
        
        // Higher score = more consistent (smaller range)
        const consistency = 100 - (range / max * 100);
        return Math.max(0, Math.min(100, Math.round(consistency)));
    };

    const calculateFatigueIndex = () => {
        if (rowPerformance.length < 2) return 0;
        
        // Compare first half vs second half of rows (fatigue typically shows in later rows)
        const midpoint = Math.floor(rowPerformance.length / 2);
        const firstHalf = rowPerformance.slice(0, midpoint);
        const secondHalf = rowPerformance.slice(midpoint);
        
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        // Calculate percentage decrease
        const decrease = avgFirst > 0 ? ((avgFirst - avgSecond) / avgFirst) * 100 : 0;
        return Math.max(0, Math.min(100, Math.round(decrease)));
    };

    const calculateOverallScore = () => {
        const accuracyNum = parseFloat(accuracyValue);
        const consistency = calculateConsistencyScore();
        const completion = parseFloat(completionRate);
        
        // Weighted score: 50% accuracy, 30% completion, 20% consistency
        const overall = (accuracyNum * 0.5) + (completion * 0.3) + (consistency * 0.2);
        return Math.round(overall);
    };

    return (
      <div className="max-w-6xl mx-auto mt-8">
        {/* Score Summary */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-xl p-8 border-2 border-teal-200 mb-8">
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

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-teal-600 mb-2">
                {score.correct}
              </div>
              <div className="text-slate-600 font-medium">Correct</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-rose-600 mb-2">
                {score.wrong}
              </div>
              <div className="text-slate-600 font-medium">Incorrect</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-cyan-600 mb-2">
                {accuracyValue}%
              </div>
              <div className="text-slate-600 font-medium">Accuracy</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-md border border-slate-200">
              <div className="text-4xl font-bold text-emerald-600 mb-2">
                {completionRate}%
              </div>
              <div className="text-slate-600 font-medium">Completion</div>
            </div>
          </div>

          {/* Test Statistics */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Test Statistics
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Total Time</div>
                <div className="text-xl font-bold text-slate-800">
                  {Math.floor(totalTimeElapsed / 60)}:{String(totalTimeElapsed % 60).padStart(2, '0')}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Questions Answered</div>
                <div className="text-xl font-bold text-slate-800">
                  {answeredQuestions} / {totalQuestions}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Speed</div>
                <div className="text-xl font-bold text-slate-800">
                  {Math.round(answeredQuestions / (totalTimeElapsed / 60))} Q/min
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Graphs */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200 mb-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-6">Performance Analysis</h3>
          
          {rowPerformance.length > 0 && columnPerformance.length > 0 ? (
            <PerformanceGraph 
              rowPerformance={rowPerformance} 
              columnPerformance={columnPerformance} 
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading performance data...</p>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl shadow-xl p-8 border-2 border-slate-300 mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Performance Summary</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
              <div>
                <div className="font-medium text-slate-800">Consistency Score</div>
                <div className="text-sm text-slate-600">How consistent you were across rows</div>
              </div>
              <div className="text-xl font-bold text-teal-600">
                {calculateConsistencyScore()}%
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
              <div>
                <div className="font-medium text-slate-800">Fatigue Index</div>
                <div className="text-sm text-slate-600">How much your performance decreased over time</div>
              </div>
              <div className="text-xl font-bold text-rose-600">
                {calculateFatigueIndex()}%
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
              <div>
                <div className="font-medium text-slate-800">Overall Performance</div>
                <div className="text-sm text-slate-600">Combined score based on accuracy and speed</div>
              </div>
              <div className={`text-xl font-bold ${
                parseFloat(accuracyValue) >= 80 ? 'text-green-600' : 
                parseFloat(accuracyValue) >= 60 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {calculateOverallScore()}%
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleRestart}
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            Take Test Again
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="px-8 py-4 bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            Back to Guide
          </button>
          {isSubmitting && (
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin mr-2"></div>
              <span className="text-slate-600">Saving results...</span>
            </div>
          )}
        </div>

        {/* Tips for Improvement */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <h4 className="font-bold text-blue-800 mb-3">Tips for Improvement:</h4>
          <ul className="text-blue-700 space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Practice mental math regularly to improve speed</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Focus on accuracy first, then gradually increase speed</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Take breaks to maintain concentration during long tests</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  
}