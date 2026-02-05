import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CreateDeretQuestion() {
    const { errors, flash } = usePage().props;
    const [form, setForm] = useState({
        sequence: [null, null, null, null, null],
        answer: '',
        pattern_type: 'arithmetic',
        is_active: true,
        difficulty_level: 1,
        explanation: ''
    });
    
    const [excelFile, setExcelFile] = useState(null);
    const [importMode, setImportMode] = useState(false);
    const [importProgress, setImportProgress] = useState(null);
    const [sequenceInputs, setSequenceInputs] = useState(['', '', '', '', '']);

    useEffect(() => {
        if (flash.success) {
            alert(flash.success);
        }
        if (flash.error) {
            alert(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        // Initialize sequence inputs from form
        const inputs = form.sequence.map(val => val === null ? '' : val);
        setSequenceInputs(inputs);
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? e.target.checked : value
        }));
    };

    const handleSequenceChange = (index, value) => {
        const newInputs = [...sequenceInputs];
        newInputs[index] = value;
        setSequenceInputs(newInputs);

        // Update form sequence
        const newSequence = newInputs.map(input => {
            if (input === '') return null;
            const num = parseFloat(input);
            return isNaN(num) ? input : num;
        });
        
        // Count null values
        const nullCount = newSequence.filter(val => val === null).length;
        
        setForm(prev => ({
            ...prev,
            sequence: newSequence
        }));

        // If exactly one null, automatically set answer
        if (nullCount === 1) {
            const nullIndex = newSequence.findIndex(val => val === null);
            const pattern = detectPattern(newSequence.filter(val => val !== null));
            if (pattern) {
                const calculatedAnswer = calculateMissingValue(newSequence, pattern);
                if (calculatedAnswer !== null) {
                    setForm(prev => ({
                        ...prev,
                        answer: calculatedAnswer.toString(),
                        pattern_type: pattern.type,
                        explanation: pattern.description
                    }));
                }
            }
        }
    };

    const detectPattern = (numbers) => {
        if (numbers.length < 2) return null;
        
        // Check arithmetic
        const diff = numbers[1] - numbers[0];
        let isArithmetic = true;
        for (let i = 2; i < numbers.length; i++) {
            if (numbers[i] - numbers[i-1] !== diff) {
                isArithmetic = false;
                break;
            }
        }
        if (isArithmetic) {
            return {
                type: 'arithmetic',
                description: `Tambah ${diff > 0 ? diff : `(${diff})`} setiap langkah`
            };
        }

        // Check geometric
        const ratio = numbers[1] / numbers[0];
        let isGeometric = true;
        for (let i = 2; i < numbers.length; i++) {
            if (numbers[i] / numbers[i-1] !== ratio) {
                isGeometric = false;
                break;
            }
        }
        if (isGeometric) {
            return {
                type: 'geometric',
                description: `Kali ${ratio} setiap langkah`
            };
        }

        return null;
    };

    const calculateMissingValue = (sequence, pattern) => {
        const nullIndex = sequence.findIndex(val => val === null);
        const knownNumbers = sequence.filter(val => val !== null).map(Number);
        
        if (pattern.type === 'arithmetic') {
            if (knownNumbers.length >= 2) {
                const diff = knownNumbers[1] - knownNumbers[0];
                if (nullIndex === 0) return knownNumbers[0] - diff;
                if (nullIndex === sequence.length - 1) return knownNumbers[knownNumbers.length - 1] + diff;
                return knownNumbers[0] + (nullIndex * diff);
            }
        } else if (pattern.type === 'geometric') {
            if (knownNumbers.length >= 2) {
                const ratio = knownNumbers[1] / knownNumbers[0];
                if (nullIndex === 0) return knownNumbers[0] / ratio;
                if (nullIndex === sequence.length - 1) return knownNumbers[knownNumbers.length - 1] * ratio;
                return knownNumbers[0] * Math.pow(ratio, nullIndex);
            }
        }
        
        return null;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['.csv', '.txt', '.xlsx', '.xls'];
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validTypes.includes(fileExt)) {
                alert('Format file tidak didukung. Gunakan CSV, TXT, XLSX, atau XLS.');
                e.target.value = '';
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                alert('File terlalu besar. Maksimal 2MB.');
                e.target.value = '';
                return;
            }
            
            setExcelFile(file);
        }
    };

    const handleSingleSubmit = (e) => {
    e.preventDefault();
    
    console.log('Form data being submitted:', form); // Debug log
    
    // Validate that exactly one position is null
    const nullCount = form.sequence.filter(val => val === null).length;
    if (nullCount !== 1) {
        alert('Deret harus memiliki tepat satu angka yang hilang (diwakili oleh null/kosong)');
        return;
    }
    
    // Ensure answer is a number
    const submitData = {
        ...form,
        answer: parseInt(form.answer) || 0
    };
    
    console.log('Data being sent to server:', submitData); // Debug log
    
    router.post(route('admin.deret.questions.store'), submitData, {
        onSuccess: () => {
            setForm({
                sequence: [null, null, null, null, null],
                answer: '',
                pattern_type: 'arithmetic',
                is_active: true,
                difficulty_level: 1,
                explanation: ''
            });
            setSequenceInputs(['', '', '', '', '']);
        },
        onError: (errors) => {
            console.error('Form errors:', errors); // Debug log
        }
    });
};

    const handleExcelSubmit = (e) => {
        e.preventDefault();
        if (!excelFile) {
            alert('Pilih file Excel/CSV terlebih dahulu');
            return;
        }

        const formData = new FormData();
        formData.append('excel_file', excelFile);

        setImportProgress('Mengunggah file...');
        
        router.post(route('admin.deret.questions.import'), formData, {
            preserveScroll: true,
            onProgress: (event) => {
                if (event?.detail?.progress?.percentage) {
                    setImportProgress(`Mengunggah: ${event.detail.progress.percentage}%`);
                } else if (event?.detail?.progress) {
                    const progress = event.detail.progress;
                    if (typeof progress === 'number') {
                        setImportProgress(`Mengunggah: ${progress}%`);
                    }
                }
            },
            onSuccess: () => {
                setExcelFile(null);
                setImportProgress(null);
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
            },
            onError: (errors) => {
                setImportProgress(null);
                if (errors.excel_file) {
                    alert(errors.excel_file);
                }
            }
        });
    };

    const downloadTemplate = () => {
        window.location.href = route('admin.deret.questions.download-template');
    };

    const generateExample = () => {
        const examples = [
            {
                sequence: [2, 4, null, 8, 10],
                answer: '6',
                pattern_type: 'arithmetic',
                explanation: 'Tambah 2 setiap langkah',
                difficulty_level: 1
            },
            {
                sequence: [1, 3, 9, null, 81],
                answer: '27',
                pattern_type: 'geometric',
                explanation: 'Kali 3 setiap langkah',
                difficulty_level: 2
            },
            {
                sequence: [1, 4, 9, null, 25],
                answer: '16',
                pattern_type: 'square',
                explanation: 'Bilangan kuadrat',
                difficulty_level: 3
            }
        ];
        
        const example = examples[Math.floor(Math.random() * examples.length)];
        setForm(prev => ({
            ...prev,
            sequence: example.sequence,
            answer: example.answer,
            pattern_type: example.pattern_type,
            explanation: example.explanation,
            difficulty_level: example.difficulty_level
        }));
        
        setSequenceInputs(example.sequence.map(val => val === null ? '' : val.toString()));
    };

    const clearForm = () => {
        setForm({
            sequence: [null, null, null, null, null],
            answer: '',
            pattern_type: 'arithmetic',
            is_active: true,
            difficulty_level: 1,
            explanation: ''
        });
        setSequenceInputs(['', '', '', '', '']);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Tambah Soal Deret Angka
                    </h2>
                    <button
                        onClick={() => router.visit(route('admin.deret.questions.index'))}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                        Kembali
                    </button>
                </div>
            }
        >
            <Head title="Tambah Soal Deret Angka" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {/* Toggle between single and bulk import */}
                    <div className="mb-6">
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setImportMode(false)}
                                className={`py-2 px-4 font-medium text-sm ${!importMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Tambah Satu Soal
                            </button>
                            <button
                                onClick={() => setImportMode(true)}
                                className={`py-2 px-4 font-medium text-sm ${importMode ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Import dari Excel/CSV
                            </button>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            {!importMode ? (
                                /* Single Question Form */
                                <form onSubmit={handleSingleSubmit}>
                                    <div className="space-y-6">
                                        {/* Sequence Input */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Deret Angka *
                                            </label>
                                            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                                                <div className="text-sm text-gray-600 mb-3">
                                                    Masukkan 5 angka. Gunakan satu kotak kosong untuk angka yang hilang.
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    {[0, 1, 2, 3, 4].map((index) => (
                                                        <div key={index} className="flex flex-col items-center">
                                                            <div className="text-xs text-gray-500 mb-1">Angka {index + 1}</div>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={sequenceInputs[index]}
                                                                onChange={(e) => handleSequenceChange(index, e.target.value)}
                                                                placeholder={form.sequence[index] === null ? "Kosong (?)" : "Angka"}
                                                                className="w-20 border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-center"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {errors.sequence && (
                                                <p className="mt-1 text-sm text-red-600">{errors.sequence}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Answer */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Jawaban Benar *
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="answer"
                                                    value={form.answer}
                                                    onChange={handleChange}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                    placeholder="Angka yang hilang"
                                                />
                                                {errors.answer && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.answer}</p>
                                                )}
                                            </div>

                                            {/* Pattern Type */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Jenis Pola
                                                </label>
                                                <select
                                                    name="pattern_type"
                                                    value={form.pattern_type}
                                                    onChange={handleChange}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                >
                                                    <option value="arithmetic">Aritmatika</option>
                                                    <option value="geometric">Geometri</option>
                                                    <option value="fibonacci">Fibonacci</option>
                                                    <option value="square">Kuadrat</option>
                                                    <option value="prime">Bilangan Prima</option>
                                                    <option value="custom">Lainnya</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Penjelasan Pola
                                            </label>
                                            <textarea
                                                name="explanation"
                                                value={form.explanation}
                                                onChange={handleChange}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                rows="2"
                                                placeholder="Contoh: Tambah 2 setiap langkah, Kali 3 setiap langkah, dll."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Difficulty Level */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tingkat Kesulitan *
                                                </label>
                                                <select
                                                    name="difficulty_level"
                                                    value={form.difficulty_level}
                                                    onChange={handleChange}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                >
                                                    <option value="1">Mudah</option>
                                                    <option value="2">Sedang</option>
                                                    <option value="3">Sulit</option>
                                                </select>
                                                {errors.difficulty_level && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.difficulty_level}</p>
                                                )}
                                            </div>

                                            {/* Status Active */}
                                            <div className="flex items-center pt-6">
                                                <input
                                                    type="checkbox"
                                                    name="is_active"
                                                    checked={form.is_active}
                                                    onChange={handleChange}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <label className="ml-2 text-sm text-gray-700">
                                                    Soal aktif (akan muncul dalam tes)
                                                </label>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="p-4 bg-gray-50 rounded-lg border">
                                            <h4 className="font-medium text-gray-900 mb-3">Pratinjau Soal:</h4>
                                            <div className="p-4 bg-white border rounded mb-3">
                                                <div className="text-sm text-gray-500 mb-2">Deret Angka:</div>
                                                <div className="flex items-center justify-center space-x-4">
                                                    {form.sequence.map((num, idx) => (
                                                        <div key={idx} className="flex flex-col items-center">
                                                            <div className={`w-10 h-10 rounded border flex items-center justify-center font-bold ${num === null ? 'border-dashed border-gray-400 bg-gray-100' : 'border-gray-300 bg-white'}`}>
                                                                {num === null ? '?' : num}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">Angka {idx + 1}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <div className="flex items-center space-x-4">
                                                    <div>
                                                        <span className="text-gray-600">Jawaban benar: </span>
                                                        <span className="font-bold text-green-600 text-lg">
                                                            {form.answer || '(belum diisi)'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Pola: </span>
                                                        <span className="font-medium">{form.pattern_type}</span>
                                                    </div>
                                                </div>
                                                {form.explanation && (
                                                    <div className="mt-2 text-gray-600">
                                                        Penjelasan: {form.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex justify-between">
                                            <div className="space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={generateExample}
                                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                                >
                                                    Contoh Soal
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={clearForm}
                                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                                >
                                                    Bersihkan
                                                </button>
                                            </div>
                                            <div className="space-x-4">
                                                <button
                                                    type="button"
                                                    onClick={() => router.visit(route('admin.deret.questions.index'))}
                                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                                >
                                                    Simpan Soal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                /* Excel Import Form */
                                <div>
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="font-medium text-blue-800 mb-2">📋 Petunjuk Import Excel/CSV:</h4>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>• Gunakan template yang sudah disediakan</li>
                                            <li>• Format file: CSV, XLSX, atau XLS</li>
                                            <li>• Maksimal ukuran file: 2MB</li>
                                            <li>• Kolom harus berurutan: sequence, answer, pattern_type, difficulty_level, explanation, is_active</li>
                                            <li>• sequence: format seperti [2,4,6,null,10] (satu null untuk angka hilang)</li>
                                            <li>• answer: angka untuk jawaban yang benar</li>
                                            <li>• pattern_type: arithmetic, geometric, fibonacci, square, prime, custom</li>
                                            <li>• difficulty_level: 1 (Mudah), 2 (Sedang), 3 (Sulit)</li>
                                            <li>• is_active: 1 (Aktif), 0 (Nonaktif)</li>
                                        </ul>
                                    </div>

                                    <form onSubmit={handleExcelSubmit}>
                                        <div className="space-y-6">
                                            {/* Download Template */}
                                            <div className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={downloadTemplate}
                                                    className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Download Template Excel
                                                </button>
                                            </div>

                                            {/* File Upload */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Pilih File Excel/CSV *
                                                </label>
                                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                                    <div className="space-y-1 text-center">
                                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <div className="flex text-sm text-gray-600">
                                                            <label htmlFor="excel_file" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                                <span>Upload file</span>
                                                                <input
                                                                    id="excel_file"
                                                                    name="excel_file"
                                                                    type="file"
                                                                    accept=".csv,.txt,.xlsx,.xls"
                                                                    onChange={handleFileChange}
                                                                    className="sr-only"
                                                                    required
                                                                />
                                                            </label>
                                                            <p className="pl-1">atau drag & drop</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            CSV, XLSX, XLS up to 2MB
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {excelFile && (
                                                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                                                        <div className="flex items-center">
                                                            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="font-medium">{excelFile.name}</span>
                                                            <span className="ml-2 text-sm text-gray-500">
                                                                ({(excelFile.size / 1024).toFixed(1)} KB)
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {errors.excel_file && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.excel_file}</p>
                                                )}
                                            </div>

                                            {importProgress && (
                                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-center">
                                                        <svg className="animate-spin h-5 w-5 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="text-blue-700">{importProgress}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sample Data Preview */}
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                                <h4 className="font-medium text-gray-900 mb-3">Contoh Format Data:</h4>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">sequence</th>
                                                                <th className="px-3 py-2 text-left">answer</th>
                                                                <th className="px-3 py-2 text-left">pattern_type</th>
                                                                <th className="px-3 py-2 text-left">difficulty_level</th>
                                                                <th className="px-3 py-2 text-left">explanation</th>
                                                                <th className="px-3 py-2 text-left">is_active</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="px-3 py-2 border">[2,4,6,null,10]</td>
                                                                <td className="px-3 py-2 border">8</td>
                                                                <td className="px-3 py-2 border">arithmetic</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                                <td className="px-3 py-2 border">Tambah 2 setiap langkah</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 border">[1,3,9,null,81]</td>
                                                                <td className="px-3 py-2 border">27</td>
                                                                <td className="px-3 py-2 border">geometric</td>
                                                                <td className="px-3 py-2 border">2</td>
                                                                <td className="px-3 py-2 border">Kali 3 setiap langkah</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 border">[1,4,9,null,25]</td>
                                                                <td className="px-3 py-2 border">16</td>
                                                                <td className="px-3 py-2 border">square</td>
                                                                <td className="px-3 py-2 border">3</td>
                                                                <td className="px-3 py-2 border">Bilangan kuadrat</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Buttons */}
                                            <div className="flex justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => setImportMode(false)}
                                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                                >
                                                    Kembali ke Form Manual
                                                </button>
                                                <div className="space-x-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.visit(route('admin.deret.questions.index'))}
                                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                                    >
                                                        Batal
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={importProgress || !excelFile}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {importProgress ? 'Mengimport...' : 'Import Soal'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}