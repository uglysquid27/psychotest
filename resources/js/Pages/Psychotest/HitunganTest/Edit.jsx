// resources/js/Pages/Psychotest/HitunganTest/Edit.jsx
import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function EditHitunganQuestion({ question }) {
    const { errors } = usePage().props;
    const [form, setForm] = useState({
        question: question.question,
        answer: question.answer,
        is_active: question.is_active,
        difficulty_level: question.difficulty_level
    });

    useEffect(() => {
        setForm({
            question: question.question,
            answer: question.answer,
            is_active: question.is_active,
            difficulty_level: question.difficulty_level
        });
    }, [question]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? e.target.checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.put(route('admin.hitungan.questions.update', question.id), form);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Edit Soal Hitungan
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
            <Head title="Edit Soal Hitungan" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <form onSubmit={handleSubmit}>
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
                                                if (confirm('Yakin menghapus soal ini?')) {
                                                    router.delete(route('admin.hitungan.questions.destroy', question.id));
                                                }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                                        >
                                            Hapus Soal
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