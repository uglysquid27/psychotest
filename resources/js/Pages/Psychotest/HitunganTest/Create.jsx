// resources/js/Pages/Psychotest/HitunganTest/Create.jsx
import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CreateHitunganQuestion() {
    const { errors, flash } = usePage().props;
    const [form, setForm] = useState({
        question: '',
        answer: '',
        is_active: true,
        difficulty_level: 1
    });
    
    const [excelFile, setExcelFile] = useState(null);
    const [importMode, setImportMode] = useState(false);
    const [importProgress, setImportProgress] = useState(null);

    useEffect(() => {
        if (flash.success) {
            alert(flash.success);
        }
        if (flash.error) {
            alert(flash.error);
        }
    }, [flash]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? e.target.checked : value
        }));
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
        router.post(route('admin.hitungan.questions.store'), form, {
            onSuccess: () => {
                setForm({
                    question: '',
                    answer: '',
                    is_active: true,
                    difficulty_level: 1
                });
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
        
        router.post(route('admin.hitungan.questions.import'), formData, {
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
        window.location.href = route('admin.hitungan.questions.download-template');
    };

    const generateExample = () => {
        const examples = [
            { question: "5 + 3 x 2", answer: "11" },
            { question: "10 / 2 + 7", answer: "12" },
            { question: "(4 + 6) x 2", answer: "20" }
        ];
        
        const example = examples[Math.floor(Math.random() * examples.length)];
        setForm(prev => ({
            ...prev,
            question: example.question,
            answer: example.answer
        }));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Tambah Soal Hitungan
                    </h2>
                    <button
                        onClick={() => router.visit(route('admin.hitungan.questions.index'))}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                        Kembali
                    </button>
                </div>
            }
        >
            <Head title="Tambah Soal Hitungan" />

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
                                        {/* Question */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Pertanyaan *
                                            </label>
                                            <textarea
                                                name="question"
                                                value={form.question}
                                                onChange={handleChange}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                rows="2"
                                                required
                                                placeholder="Contoh: 5 + 3 x 2"
                                            />
                                            {errors.question && (
                                                <p className="mt-1 text-sm text-red-600">{errors.question}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Answer */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Jawaban *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="answer"
                                                    value={form.answer}
                                                    onChange={handleChange}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                    placeholder="Contoh: 11"
                                                />
                                                {errors.answer && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.answer}</p>
                                                )}
                                            </div>

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
                                        </div>

                                        {/* Status Active */}
                                        <div className="flex items-center">
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

                                        {/* Preview */}
                                        <div className="p-4 bg-gray-50 rounded-lg border">
                                            <h4 className="font-medium text-gray-900 mb-3">Pratinjau Soal:</h4>
                                            <div className="p-3 bg-white border rounded mb-3">
                                                <div className="text-sm text-gray-500 mb-1">Pertanyaan:</div>
                                                <div className="font-medium text-lg">{form.question || '(kosong)'}</div>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600">Jawaban benar: </span>
                                                <span className="font-medium text-green-600">
                                                    {form.answer || '(kosong)'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex justify-between">
                                            <button
                                                type="button"
                                                onClick={generateExample}
                                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                            >
                                                Contoh Soal
                                            </button>
                                            <div className="space-x-4">
                                                <button
                                                    type="button"
                                                    onClick={() => router.visit(route('admin.hitungan.questions.index'))}
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
                                            <li>• Kolom harus berurutan: question, answer, difficulty_level, is_active</li>
                                            <li>• answer: angka atau ekspresi matematika (misal: 14, 5+3*2)</li>
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

                                            {flash?.success && (
                                                <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center">
                                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-green-700">{flash.success}</span>
                                                    </div>
                                                    {flash.import_errors && flash.import_errors.length > 0 && (
                                                        <div className="mt-2 text-sm">
                                                            <div className="font-medium text-yellow-700">Beberapa error ditemukan:</div>
                                                            <ul className="mt-1 text-yellow-600 list-disc list-inside">
                                                                {flash.import_errors.slice(0, 5).map((error, index) => (
                                                                    <li key={index} className="text-xs">{error}</li>
                                                                ))}
                                                                {flash.import_errors.length > 5 && (
                                                                    <li className="text-xs">... dan {flash.import_errors.length - 5} error lainnya</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {flash?.error && (
                                                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center">
                                                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-red-700">{flash.error}</span>
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
                                                                <th className="px-3 py-2 text-left">question</th>
                                                                <th className="px-3 py-2 text-left">answer</th>
                                                                <th className="px-3 py-2 text-left">difficulty_level</th>
                                                                <th className="px-3 py-2 text-left">is_active</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="px-3 py-2 border">8 + 1 + 5</td>
                                                                <td className="px-3 py-2 border">14</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 border">(12 + 28 + 4 + 4) : 4</td>
                                                                <td className="px-3 py-2 border">12</td>
                                                                <td className="px-3 py-2 border">2</td>
                                                                <td className="px-3 py-2 border">1</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 border">0.125 x 8 + 3</td>
                                                                <td className="px-3 py-2 border">4</td>
                                                                <td className="px-3 py-2 border">3</td>
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
                                                        onClick={() => router.visit(route('admin.hitungan.questions.index'))}
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