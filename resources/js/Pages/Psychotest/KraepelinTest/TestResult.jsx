import { useState, useEffect } from "react";
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
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function KraepelinTestResult({ result, testConfig }) {
    const [answerMatrix, setAnswerMatrix] = useState([]);
    const [rowPerformance, setRowPerformance] = useState([]);
    const [columnPerformance, setColumnPerformance] = useState([]);
    const [performanceData, setPerformanceData] = useState([]);
    const [score, setScore] = useState({
        correct: result?.correct_answers || 0,
        wrong: result?.wrong_answers || 0,
        unanswered: result?.unanswered || 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [numberMatrix, setNumberMatrix] = useState([]);
    const [userAnswers, setUserAnswers] = useState([]);
    const [matrixViewMode, setMatrixViewMode] = useState('detailed'); // 'detailed' or 'heatmap'

    const ROWS = result?.rows || 45;
    const COLS = result?.columns || 60;
    const DIFFICULTY = result?.difficulty || 'sedang';
    const TIME_PER_COL = testConfig?.timePerColumn || 15;

    useEffect(() => {
        loadResultData();
    }, [result]);

    const loadResultData = () => {
        setIsLoading(true);
        
        try {
            // Parse JSON data
            const testData = typeof result.test_data === 'string' 
                ? JSON.parse(result.test_data) 
                : result.test_data;
            
            const answers = typeof result.answers === 'string'
                ? JSON.parse(result.answers)
                : result.answers;
            
            const rowPerf = typeof result.row_performance === 'string'
                ? JSON.parse(result.row_performance)
                : result.row_performance || Array(ROWS - 1).fill(0);
            
            const colPerf = typeof result.column_performance === 'string'
                ? JSON.parse(result.column_performance)
                : result.column_performance || Array(COLS).fill(0);

            // Format number matrix - transpose from column-based to row-based
            const formattedMatrix = [];
            if (testData && Array.isArray(testData)) {
                // Check if it's column-based (from generate-test-data)
                if (testData[0] && Array.isArray(testData[0]) && testData[0][0] && typeof testData[0][0] === 'object') {
                    // Column-based format with num1, num2
                    for (let row = 0; row < ROWS; row++) {
                        const rowData = [];
                        for (let col = 0; col < COLS; col++) {
                            rowData.push(testData[col][row].num1);
                        }
                        formattedMatrix.push(rowData);
                    }
                } else {
                    // Already row-based
                    formattedMatrix.push(...testData);
                }
            }
            
            setNumberMatrix(formattedMatrix);
            setUserAnswers(answers || []);
            setRowPerformance(rowPerf);
            setColumnPerformance(colPerf);
            
            // Calculate answer matrix
            const matrix = calculateAnswerMatrix(answers || [], formattedMatrix);
            setAnswerMatrix(matrix);
            
            // Calculate performance by column
            const perfByCol = calculatePerformanceByColumn(answers || [], formattedMatrix);
            setPerformanceData(perfByCol);
            
        } catch (error) {
            console.error('Failed to load result data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAnswerMatrix = (answers, matrix) => {
        if (!matrix.length || !answers.length) return [];
        
        const result = [];
        for (let row = 0; row < ROWS - 1; row++) {
            const rowData = [];
            for (let col = 0; col < COLS; col++) {
                const userAnswer = answers[row]?.[col];
                if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
                    rowData.push({
                        status: 'unanswered',
                        userAnswer: null,
                        correctAnswer: (matrix[row]?.[col] + matrix[row + 1]?.[col]) % 10
                    });
                } else {
                    const correctAnswer = (matrix[row]?.[col] + matrix[row + 1]?.[col]) % 10;
                    rowData.push({
                        status: userAnswer === correctAnswer ? 'correct' : 'wrong',
                        userAnswer: userAnswer,
                        correctAnswer: correctAnswer
                    });
                }
            }
            result.push(rowData);
        }
        return result;
    };

    const calculatePerformanceByColumn = (answers, matrix) => {
        const perfData = [];
        for (let col = 0; col < COLS; col++) {
            let correct = 0;
            let total = 0;
            
            for (let row = 0; row < ROWS - 1; row++) {
                if (answers[row] && answers[row][col] !== null && answers[row][col] !== undefined && answers[row][col] !== '') {
                    total++;
                    const correctAnswer = (matrix[row]?.[col] + matrix[row + 1]?.[col]) % 10;
                    if (answers[row][col] === correctAnswer) {
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
        return Math.max(0, Math.min(100, Math.round(drop || 0)));
    };

    const getPerformanceFeedback = () => {
        const total = score.correct + score.wrong + score.unanswered;
        if (total === 0) return { title: "Belum Ada Data", desc: "Tes belum diselesaikan", color: "slate" };
        const accuracy = (score.correct / total) * 100;

        if (accuracy >= 90) return { title: "Luar Biasa!", desc: "Performa sempurna", color: "emerald" };
        if (accuracy >= 80) return { title: "Sangat Baik", desc: "Hasil memuaskan", color: "green" };
        if (accuracy >= 70) return { title: "Baik", desc: "Terus tingkatkan", color: "lime" };
        if (accuracy >= 60) return { title: "Cukup", desc: "Ada ruang perbaikan", color: "amber" };
        return { title: "Perlu Latihan", desc: "Fokus pada akurasi", color: "rose" };
    };

    const getDifficultyLabel = () => {
        switch (DIFFICULTY) {
            case 'mudah': return 'Mudah';
            case 'sedang': return 'Sedang';
            case 'sulit': return 'Sulit';
            default: return 'Kustom';
        }
    };

    const handleGoBack = () => {
        router.get(route('employee.test-assignments.my'));
    };

    const accuracyValue = ((score.correct / (score.correct + score.wrong + score.unanswered)) * 100 || 0).toFixed(1);
    const feedback = getPerformanceFeedback();

    // ============= RENDER FUNCTIONS FOR MATRIX AND HEATMAPS =============

    const renderRowHeatmap = () => {
        if (answerMatrix.length === 0) return null;
        
        return (
            <div className="soft-beige-shadow bg-white rounded-2xl p-4 md:p-6 border border-slate-200">
                <h3 className="text-md font-semibold text-slate-800 mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Row Performance Heatmap
                    <span className="text-sm font-normal text-slate-600 ml-3">
                        ({ROWS - 1} rows × first 30 columns)
                    </span>
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {answerMatrix.map((row, idx) => {
                        const correct = row.filter(cell => cell.status === 'correct').length;
                        const total = row.length;
                        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                        
                        return (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-600 w-12">Row {idx + 1}</span>
                                <div className="flex-1 flex gap-[2px] overflow-x-auto pb-1">
                                    {row.slice(0, 30).map((cell, cellIdx) => (
                                        <div
                                            key={cellIdx}
                                            className={`
                                                w-2 h-4 flex-shrink-0
                                                ${cell.status === 'correct' 
                                                    ? 'bg-emerald-500' 
                                                    : cell.status === 'wrong' 
                                                    ? 'bg-rose-500' 
                                                    : 'bg-slate-300'
                                                }
                                                hover:ring-1 hover:ring-slate-400 transition-all cursor-help
                                            `}
                                            title={`Row ${idx + 1}, Col ${cellIdx + 1}: ${cell.status === 'correct' ? '✓ Correct' : cell.status === 'wrong' ? '✗ Wrong (correct: ' + cell.correctAnswer + ')' : '○ Unanswered'}`}
                                        />
                                    ))}
                                    {COLS > 30 && (
                                        <span className="text-xs text-slate-500 ml-1 flex-shrink-0">
                                            +{COLS - 30} more
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                                    percentage >= 80 ? 'bg-green-100 text-green-700' :
                                    percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                    percentage >= 40 ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {percentage}%
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        <span className="text-slate-600">Correct</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
                        <span className="text-slate-600">Wrong</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
                        <span className="text-slate-600">Unanswered</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderColumnHeatmap = () => {
        if (answerMatrix.length === 0) return null;
        
        return (
            <div className="soft-beige-shadow bg-white rounded-2xl p-4 md:p-6 border border-slate-200">
                <h3 className="text-md font-semibold text-slate-800 mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Column Performance Heatmap
                    <span className="text-sm font-normal text-slate-600 ml-3">
                        ({COLS} columns)
                    </span>
                </h3>
                <div className="overflow-x-auto">
                    <div className="flex gap-[2px] min-w-fit pb-2">
                        {Array.from({ length: COLS }).map((_, idx) => {
                            let correct = 0;
                            let total = 0;
                            answerMatrix.forEach(row => {
                                if (row[idx]) {
                                    total++;
                                    if (row[idx].status === 'correct') correct++;
                                }
                            });
                            const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                            
                            return (
                                <div key={idx} className="flex flex-col items-center">
                                    <div 
                                        className={`
                                            w-4 h-8
                                            ${percentage >= 80 ? 'bg-green-500' :
                                              percentage >= 60 ? 'bg-yellow-500' :
                                              percentage >= 40 ? 'bg-orange-500' :
                                              'bg-red-500'}
                                            hover:ring-1 hover:ring-slate-400 transition-all cursor-help
                                        `}
                                        style={{ opacity: total > 0 ? 0.9 : 0.3 }}
                                        title={`Column ${idx + 1}: ${correct}/${total} correct (${percentage}%)`}
                                    />
                                    <span className="text-[10px] text-slate-600 mt-1">C{idx + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                        <span className="text-xs text-slate-600">80-100%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                        <span className="text-xs text-slate-600">60-79%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                        <span className="text-xs text-slate-600">40-59%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                        <span className="text-xs text-slate-600">0-39%</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderAnswerMatrix = () => {
        if (answerMatrix.length === 0) return null;

        return (
            <div className="soft-beige-shadow bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-4 md:p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-semibold text-slate-800" style={{fontFamily: "'Raleway', sans-serif"}}>
                        Answer Matrix - Detailed View
                        <span className="text-sm font-normal text-slate-600 ml-3">
                            ({ROWS - 1} rows × {COLS} columns) - {getDifficultyLabel()}
                        </span>
                    </h3>
                    <button
                        onClick={() => setMatrixViewMode(matrixViewMode === 'detailed' ? 'heatmap' : 'detailed')}
                        className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                    >
                        {matrixViewMode === 'detailed' ? 'Switch to Heatmap View' : 'Switch to Detailed View'}
                    </button>
                </div>
                
                {matrixViewMode === 'detailed' ? (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="mx-auto border-collapse">
                            <thead className="sticky top-0 bg-slate-100 z-10">
                                <tr>
                                    <th className="p-2 text-slate-500 text-sm font-medium border border-slate-300 bg-slate-100">Row/Col</th>
                                    {Array.from({ length: COLS }).map((_, colIndex) => (
                                        <th key={colIndex} className="p-2 text-slate-500 text-sm font-medium border border-slate-300 bg-slate-100 min-w-[80px]">
                                            C{colIndex + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {answerMatrix.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-2 text-slate-500 text-sm font-medium text-center border border-slate-300 bg-slate-50 sticky left-0">
                                            R{rowIndex + 1}
                                        </td>
                                        {row.map((cell, colIndex) => {
                                            const bgColor = cell.status === 'correct' 
                                                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' 
                                                : cell.status === 'wrong' 
                                                ? 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300' 
                                                : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300';
                                            
                                            const textColor = cell.status === 'correct' 
                                                ? 'text-emerald-700' 
                                                : cell.status === 'wrong' 
                                                ? 'text-rose-700' 
                                                : 'text-slate-500';
                                            
                                            return (
                                                <td
                                                    key={colIndex}
                                                    className={`text-center p-2 border ${bgColor} transition-all duration-300`}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                                                            <span className="font-semibold">{numberMatrix[rowIndex]?.[colIndex]}</span>
                                                            <span>+</span>
                                                            <span className="font-semibold">{numberMatrix[rowIndex + 1]?.[colIndex]}</span>
                                                        </div>
                                                        
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
                                                        
                                                        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                            cell.status === 'correct' 
                                                                ? 'bg-emerald-100 text-emerald-700' 
                                                                : cell.status === 'wrong' 
                                                                ? 'bg-rose-100 text-rose-700' 
                                                                : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {cell.status === 'correct' ? '✓' : cell.status === 'wrong' ? '✗' : '○'}
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
                ) : (
                    <div className="overflow-x-auto">
                        <div className="grid gap-[2px] bg-slate-200 p-[2px] rounded-lg" 
                             style={{ gridTemplateColumns: `repeat(${COLS}, minmax(16px, 1fr))` }}>
                            {answerMatrix.map((row, rowIdx) => (
                                row.map((cell, colIdx) => (
                                    <div
                                        key={`${rowIdx}-${colIdx}`}
                                        className={`
                                            aspect-square w-full
                                            ${cell.status === 'correct' 
                                                ? 'bg-emerald-500' 
                                                : cell.status === 'wrong' 
                                                ? 'bg-rose-500' 
                                                : 'bg-slate-300'
                                            }
                                            hover:ring-1 hover:ring-slate-400 transition-all cursor-help
                                        `}
                                        title={`Row ${rowIdx + 1}, Col ${colIdx + 1}: ${cell.status === 'correct' ? '✓ Correct' : cell.status === 'wrong' ? '✗ Wrong (correct: ' + cell.correctAnswer + ')' : '○ Unanswered'}`}
                                    />
                                ))
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-green-500 rounded-sm"></div>
                        <span className="text-sm text-slate-700">Correct ({score.correct})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-br from-rose-400 to-red-500 rounded-sm"></div>
                        <span className="text-sm text-slate-700">Wrong ({score.wrong})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-br from-slate-300 to-gray-400 rounded-sm"></div>
                        <span className="text-sm text-slate-700">Unanswered ({score.unanswered})</span>
                    </div>
                </div>
                
                {/* Summary Statistics */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{score.correct}</div>
                        <div className="text-xs text-emerald-600 font-medium">Correct Answers</div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-3 border border-rose-200">
                        <div className="text-2xl font-bold text-rose-700">{score.wrong}</div>
                        <div className="text-xs text-rose-600 font-medium">Wrong Answers</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-100 to-gray-100 rounded-xl p-3 border border-slate-300">
                        <div className="text-2xl font-bold text-slate-600">{score.unanswered}</div>
                        <div className="text-xs text-slate-500 font-medium">Unanswered</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">{score.correct + score.wrong + score.unanswered}</div>
                        <div className="text-xs text-amber-600 font-medium">Total Questions</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPerformanceOverview = () => {
        if (performanceData.length === 0) return null;

        return (
            <div className="soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-slate-200">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>
                    Performance by Column
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
                                        className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                                        style={{ width: `${(data.correct / data.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Kraepelin Test Result
                    </h2>
                }
            >
                <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 md:py-12">
                    <div className="max-w-6xl mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                            <p className="text-slate-600 text-lg font-medium">Loading result data...</p>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Kraepelin Test Result - {getDifficultyLabel()}
                    <span className="text-sm font-normal text-gray-600 ml-3">
                        {ROWS}×{COLS} • Completed: {new Date(result?.created_at).toLocaleDateString('id-ID')}
                    </span>
                </h2>
            }
        >
            <Head title="Kraepelin Test Result" />

            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 md:py-12">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
                    
                    .soft-beige-shadow {
                        box-shadow: 0 4px 6px -1px rgba(251, 191, 36, 0.15), 0 2px 4px -1px rgba(251, 191, 36, 0.1);
                    }
                    
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .fade-in-up {
                        animation: fadeInUp 0.6s ease-out forwards;
                        opacity: 0;
                    }
                `}</style>

                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-100">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 p-6 md:p-10">
                            <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-bold text-white" style={{fontFamily: "'Raleway', sans-serif"}}>
                                    Test Result
                                </h1>
                            </div>
                            <p className="text-center text-base md:text-xl text-amber-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                                Completed on {new Date(result?.created_at).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>

                        <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                            {/* Feedback */}
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

                            {/* Score Cards */}
                            <div className="grid grid-cols-2 gap-4 md:gap-6">
                                <div className="fade-in-up soft-beige-shadow bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-emerald-200" style={{animationDelay: '0.2s'}}>
                                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm md:text-base font-semibold text-emerald-800" style={{fontFamily: "'Raleway', sans-serif"}}>Correct Answers</h3>
                                    </div>
                                    <div className="text-3xl md:text-5xl font-bold text-emerald-700 mb-1 md:mb-2">{score.correct}</div>
                                    <p className="text-xs md:text-sm text-emerald-600 font-medium">out of {score.correct + score.wrong + score.unanswered} questions</p>
                                </div>

                                <div className="fade-in-up soft-beige-shadow bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-rose-200" style={{animationDelay: '0.3s'}}>
                                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <h3 className="text-sm md:text-base font-semibold text-rose-800" style={{fontFamily: "'Raleway', sans-serif"}}>Wrong Answers</h3>
                                    </div>
                                    <div className="text-3xl md:text-5xl font-bold text-rose-700 mb-1 md:mb-2">{score.wrong}</div>
                                    <p className="text-xs md:text-sm text-rose-600 font-medium">errors recorded</p>
                                </div>
                            </div>

                            {/* Accuracy & Speed */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-blue-100" style={{animationDelay: '0.4s'}}>
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Accuracy</h3>
                                    <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2 md:mb-3">{accuracyValue}%</div>
                                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Percentage of correct answers</p>
                                    <div className="h-2 md:h-3 bg-blue-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000" style={{width: `${accuracyValue}%`}}></div>
                                    </div>
                                </div>

                                <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-purple-100" style={{animationDelay: '0.5s'}}>
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Completion Rate</h3>
                                    <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2 md:mb-3">{((score.correct + score.wrong) / ((COLS * (ROWS - 1)) || 1) * 100).toFixed(1)}%</div>
                                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Questions answered</p>
                                    <div className="h-2 md:h-3 bg-purple-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-1000" style={{width: `${((score.correct + score.wrong) / ((COLS * (ROWS - 1)) || 1) * 100)}%`}}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Consistency & Fatigue */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-indigo-100" style={{animationDelay: '0.6s'}}>
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Consistency</h3>
                                    <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2 md:mb-3">{calculateConsistencyScore()}%</div>
                                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Performance stability across rows</p>
                                    <div className="h-2 md:h-3 bg-indigo-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000" style={{width: `${calculateConsistencyScore()}%`}}></div>
                                    </div>
                                </div>

                                <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl p-4 md:p-6 border border-orange-100" style={{animationDelay: '0.7s'}}>
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2 md:mb-3" style={{fontFamily: "'Raleway', sans-serif"}}>Fatigue Index</h3>
                                    <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2 md:mb-3">{calculateFatigueIndex()}%</div>
                                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">Performance decline over time</p>
                                    <div className="h-2 md:h-3 bg-orange-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000" style={{width: `${calculateFatigueIndex()}%`}}></div>
                                    </div>
                                </div>
                            </div>

                            {/* HEATMAPS - Row and Column Performance Summary */}
                            <div className="fade-in-up w-full" style={{animationDelay: '0.8s'}}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRowHeatmap()}
        {renderColumnHeatmap()}
    </div>
</div>

                            {/* Performance by Column Overview */}
                            <div className="fade-in-up w-full" style={{animationDelay: '0.9s'}}>
    {renderPerformanceOverview()}
</div>


                            {/* DETAILED ANSWER MATRIX */}
                            <div className="fade-in-up" style={{animationDelay: '1s'}}>
                                {renderAnswerMatrix()}
                            </div>

                            {/* Performance Graph */}
                            <div className="fade-in-up" style={{animationDelay: '1.1s'}}>
                                <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-4 md:mb-6" style={{fontFamily: "'Raleway', sans-serif"}}>Performance Graph</h3>
                                <PerformanceGraph rowPerformance={rowPerformance} columnPerformance={columnPerformance} />
                            </div>

                            {/* Back Button */}
                            <div className="fade-in-up flex justify-center gap-3 md:gap-4 mb-6 md:mb-8" style={{animationDelay: '1.2s'}}>
                                <button
                                    onClick={handleGoBack}
                                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-amber-700 hover:via-orange-700 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                                    style={{fontFamily: "'Raleway', sans-serif"}}
                                >
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to My Assignments
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function PerformanceGraph({ rowPerformance, columnPerformance }) {
    const rowChartData = {
        labels: rowPerformance.map((_, idx) => `Row ${idx + 1}`),
        datasets: [
            {
                label: 'Answers per Row',
                data: rowPerformance,
                backgroundColor: 'rgba(217, 119, 6, 0.6)',
                borderColor: 'rgb(180, 83, 9)',
                borderWidth: 2,
                borderRadius: 12,
            },
        ],
    };

    const colChartData = {
        labels: columnPerformance.map((_, idx) => `Column ${idx + 1}`),
        datasets: [
            {
                label: 'Answers per Column',
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
                <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>Performance per Row</h3>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 md:p-6 border border-amber-100" style={{height: '250px', maxHeight: '320px'}}>
                    <Bar data={rowChartData} options={chartOptions} />
                </div>
            </div>

            <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-4 md:mb-5" style={{fontFamily: "'Raleway', sans-serif"}}>Performance per Column</h3>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 md:p-6 border border-orange-100" style={{height: '250px', maxHeight: '320px'}}>
                    <Bar data={colChartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}