// resources/js/Pages/Psychotest/HitunganTest/Index.jsx
import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';

export default function HitunganQuestionList({ questions = null, filters = {} }) {
    const { flash } = usePage().props;
    
    const [search, setSearch] = useState(filters?.search || '');
    const perPage = filters?.per_page || 10;

    useEffect(() => {
        if (flash.success) {
            alert(flash.success);
        }
    }, [flash]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.hitungan.questions.index'), {
            search: search,
            per_page: perPage
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this question?')) {
            router.delete(route('admin.hitungan.questions.destroy', id));
        }
    };

    const getDifficultyBadge = (level) => {
        const config = {
            1: { color: 'bg-green-100 text-green-800', label: 'Easy' },
            2: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
            3: { color: 'bg-red-100 text-red-800', label: 'Hard' }
        };
        const { color, label } = config[level] || config[1];
        return <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{label}</span>;
    };

    // Safe access to questions data
    const questionsData = questions?.data || [];
    const paginationLinks = questions?.links || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Kelola Soal Hitungan
                    </h2>
                    <Link
                        href={route('admin.hitungan.questions.create')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                        + Tambah Soal
                    </Link>
                </div>
            }
        >
            <Head title="Kelola Soal Hitungan" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            {/* Search */}
                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari soal..."
                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                    >
                                        Cari
                                    </button>
                                </div>
                            </form>

                            {/* Questions Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Pertanyaan
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Jawaban
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Tingkat
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {questionsData.map((question) => (
                                            <tr key={question.id}>
                                                <td className="px-4 py-3">
                                                    <div className="max-w-md font-medium">{question.question}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-blue-600">{question.answer}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getDifficultyBadge(question.difficulty_level)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${question.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {question.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 space-x-2">
                                                    <Link
                                                        href={route('admin.hitungan.questions.edit', question.id)}
                                                        className="text-blue-600 hover:text-blue-900 text-sm"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(question.id)}
                                                        className="text-red-600 hover:text-red-900 text-sm"
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {questionsData.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        Tidak ada soal ditemukan.
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {paginationLinks.length > 0 && (
                                <div className="mt-6">
                                    <Pagination links={paginationLinks} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}