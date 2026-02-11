import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';

export default function KraepelinSettingsList({ settings = null, filters = {}, difficultyOptions = {} }) {
    const { flash } = usePage().props;
    
    const [search, setSearch] = useState(filters?.search || '');
    const [selectedDifficulty, setSelectedDifficulty] = useState(filters?.difficulty || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || '');
    const [selectedSettings, setSelectedSettings] = useState([]);
    const perPage = filters?.per_page || 10;

    useEffect(() => {
        if (flash.success) {
            alert(flash.success);
        }
    }, [flash]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.kraepelin.settings.index'), {
            search: search,
            difficulty: selectedDifficulty,
            status: selectedStatus,
            per_page: perPage
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleReset = () => {
        setSearch('');
        setSelectedDifficulty('');
        setSelectedStatus('');
        router.get(route('admin.kraepelin.settings.index'), {}, {
            preserveState: true,
            replace: true
        });
    };

    const handleDelete = (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus pengaturan ini?')) {
            router.delete(route('admin.kraepelin.settings.destroy', id));
        }
    };

    const handleBulkToggleActive = (isActive) => {
        if (selectedSettings.length === 0) {
            alert('Pilih setidaknya satu pengaturan terlebih dahulu');
            return;
        }

        if (confirm(`Apakah Anda yakin ingin ${isActive ? 'mengaktifkan' : 'menonaktifkan'} ${selectedSettings.length} pengaturan?`)) {
            router.post(route('admin.kraepelin.settings.bulk-toggle-active'), {
                ids: selectedSettings,
                is_active: isActive
            }, {
                onSuccess: () => {
                    setSelectedSettings([]);
                    window.location.reload();
                }
            });
        }
    };

    const handleBulkDelete = () => {
        if (selectedSettings.length === 0) {
            alert('Pilih setidaknya satu pengaturan terlebih dahulu');
            return;
        }

        if (confirm(`Apakah Anda yakin ingin menghapus ${selectedSettings.length} pengaturan?`)) {
            router.post(route('admin.kraepelin.settings.bulk-delete'), {
                ids: selectedSettings
            }, {
                onSuccess: () => {
                    setSelectedSettings([]);
                    window.location.reload();
                }
            });
        }
    };

    const getDifficultyBadge = (difficulty) => {
        const config = {
            'mudah': { color: 'bg-green-100 text-green-800', label: 'Mudah' },
            'sedang': { color: 'bg-yellow-100 text-yellow-800', label: 'Sedang' },
            'sulit': { color: 'bg-red-100 text-red-800', label: 'Sulit' }
        };
        const { color, label } = config[difficulty] || config['sedang'];
        return <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{label}</span>;
    };

    const calculateTotalTime = (columns, timePerColumn) => {
        const totalSeconds = columns * timePerColumn;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    };

    const settingsData = settings?.data || [];
    const paginationLinks = settings?.links || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Kelola Pengaturan Tes Kraepelin
                    </h2>
                    <div className="space-x-2">
                        {selectedSettings.length > 0 && (
                            <>
                                <button
                                    onClick={() => handleBulkToggleActive(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Aktifkan ({selectedSettings.length})
                                </button>
                                <button
                                    onClick={() => handleBulkToggleActive(false)}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Nonaktifkan ({selectedSettings.length})
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Hapus ({selectedSettings.length})
                                </button>
                            </>
                        )}
                        <Link
                            href={route('admin.kraepelin.settings.create')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                            + Tambah Pengaturan
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Kelola Pengaturan Tes Kraepelin" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            {/* Search and Filters */}
                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cari Nama/Deskripsi
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Cari pengaturan..."
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tingkat Kesulitan
                                        </label>
                                        <select
                                            value={selectedDifficulty}
                                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        >
                                            <option value="">Semua</option>
                                            {Object.entries(difficultyOptions).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        >
                                            <option value="">Semua</option>
                                            <option value="active">Aktif</option>
                                            <option value="inactive">Nonaktif</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-end space-x-2">
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex-1"
                                        >
                                            Terapkan Filter
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Settings Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSettings.length === settingsData.length && settingsData.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSettings(settingsData.map(s => s.id));
                                                        } else {
                                                            setSelectedSettings([]);
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Nama
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Ukuran Matrix
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Waktu/Kolom
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Total
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
                                        {settingsData.map((setting) => (
                                            <tr key={setting.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSettings.includes(setting.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedSettings([...selectedSettings, setting.id]);
                                                            } else {
                                                                setSelectedSettings(selectedSettings.filter(id => id !== setting.id));
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{setting.name}</div>
                                                    {setting.description && (
                                                        <div className="text-sm text-gray-500 mt-1">{setting.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{setting.rows} baris × {setting.columns} kolom</div>
                                                    <div className="text-sm text-gray-500">{(setting.rows - 1) * setting.columns} soal</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium">{setting.time_per_column} detik</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{calculateTotalTime(setting.columns, setting.time_per_column)}</div>
                                                    <div className="text-sm text-gray-500">total waktu</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getDifficultyBadge(setting.difficulty)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${setting.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {setting.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 space-x-2">
                                                    <Link
                                                        href={route('admin.kraepelin.settings.edit', setting.id)}
                                                        className="text-blue-600 hover:text-blue-900 text-sm"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(setting.id)}
                                                        className="text-red-600 hover:text-red-900 text-sm"
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {settingsData.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        Tidak ada pengaturan ditemukan.
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