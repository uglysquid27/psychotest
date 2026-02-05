import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';

export default function DeretQuestionList({ questions = null, filters = {} }) {
    const { flash } = usePage().props;
    
    const [search, setSearch] = useState(filters?.search || '');
    const perPage = filters?.per_page || 10;
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (flash.success) {
            alert(flash.success);
        }
    }, [flash]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.deret.questions.index'), {
            search: search,
            per_page: perPage
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleDelete = (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
            router.delete(route('admin.deret.questions.destroy', id));
        }
    };

    const getDifficultyBadge = (level) => {
        const config = {
            1: { color: 'bg-green-100 text-green-800', label: 'Mudah' },
            2: { color: 'bg-yellow-100 text-yellow-800', label: 'Sedang' },
            3: { color: 'bg-red-100 text-red-800', label: 'Sulit' }
        };
        const { color, label } = config[level] || config[1];
        return <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{label}</span>;
    };

    const formatSequence = (sequence) => {
        return sequence.map(num => num === null ? '?' : num).join(', ');
    };

    const handleBulkAction = (action) => {
        if (selectedIds.length === 0) {
            alert('Pilih soal terlebih dahulu!');
            return;
        }

        if (action === 'delete') {
            if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} soal?`)) {
                router.post(route('admin.deret.questions.bulk-delete'), {
                    ids: selectedIds
                }, {
                    onSuccess: () => setSelectedIds([])
                });
            }
        } else if (action === 'activate' || action === 'deactivate') {
            router.post(route('admin.deret.questions.bulk-toggle-active'), {
                ids: selectedIds,
                is_active: action === 'activate'
            }, {
                onSuccess: () => setSelectedIds([])
            });
        }
    };

    const toggleSelectAll = () => {
        const questionsData = questions?.data || [];
        if (selectedIds.length === questionsData.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(questionsData.map(q => q.id));
        }
    };

    const toggleSelectId = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Safe access to questions data
    const questionsData = questions?.data || [];
    const paginationLinks = questions?.links || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Kelola Soal Deret Angka
                    </h2>
                    <Link
                        href={route('admin.deret.questions.create')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                        + Tambah Soal
                    </Link>
                </div>
            }
        >
            <Head title="Kelola Soal Deret Angka" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-blue-700">
                                    <span className="font-medium">{selectedIds.length} soal</span> terpilih
                                </div>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => handleBulkAction('activate')}
                                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                                    >
                                        Aktifkan
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('deactivate')}
                                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
                                    >
                                        Nonaktifkan
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('delete')}
                                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                                    >
                                        Hapus
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari soal berdasarkan pola atau penjelasan..."
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
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.length === questionsData.length && questionsData.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Deret Angka
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Jawaban
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Pola
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
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(question.id)}
                                                        onChange={() => toggleSelectId(question.id)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                                                        {formatSequence(question.sequence)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-blue-600 text-lg">{question.answer}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="max-w-xs">
                                                        <div className="font-medium">{question.pattern_type}</div>
                                                        {question.explanation && (
                                                            <div className="text-xs text-gray-500 mt-1">{question.explanation}</div>
                                                        )}
                                                    </div>
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
                                                        href={route('admin.deret.questions.edit', question.id)}
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
                                    <div className="text-center py-12 text-gray-500">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada soal ditemukan</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Mulai dengan membuat soal baru atau import dari file.
                                        </p>
                                        <div className="mt-6">
                                            <Link
                                                href={route('admin.deret.questions.create')}
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                Tambah Soal Pertama
                                            </Link>
                                        </div>
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