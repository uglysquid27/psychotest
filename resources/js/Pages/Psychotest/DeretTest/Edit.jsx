import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function EditDeretQuestion({ question }) {
    const { errors } = usePage().props;
    const [form, setForm] = useState({
        sequence: question.sequence || [null, null, null, null, null],
        answer: question.answer || '',
        pattern_type: question.pattern_type || 'arithmetic',
        is_active: question.is_active || true,
        difficulty_level: question.difficulty_level || 1,
        explanation: question.explanation || ''
    });
    
    const [sequenceInputs, setSequenceInputs] = useState(['', '', '', '', '']);

    useEffect(() => {
        const inputs = form.sequence.map(val => val === null ? '' : val.toString());
        setSequenceInputs(inputs);
    }, [form.sequence]);

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

        const newSequence = newInputs.map(input => {
            if (input === '') return null;
            const num = parseFloat(input);
            return isNaN(num) ? input : num;
        });
        
        setForm(prev => ({
            ...prev,
            sequence: newSequence
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate that exactly one position is null
        const nullCount = form.sequence.filter(val => val === null).length;
        if (nullCount !== 1) {
            alert('Deret harus memiliki tepat satu angka yang hilang (diwakili oleh null/kosong)');
            return;
        }
        
        router.put(route('admin.deret.questions.update', question.id), form);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Edit Soal Deret Angka
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
            <Head title="Edit Soal Deret Angka" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <form onSubmit={handleSubmit}>
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
                                                            placeholder="Angka atau kosong"
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

                                    {/* Info */}
                                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-gray-500">Dibuat</div>
                                                <div>{new Date(question.created_at).toLocaleDateString('id-ID')}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Terakhir diubah</div>
                                                <div>{new Date(question.updated_at).toLocaleDateString('id-ID')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
                                                    router.delete(route('admin.deret.questions.destroy', question.id));
                                                }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                                        >
                                            Hapus Soal
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
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                            >
                                                Update Soal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}