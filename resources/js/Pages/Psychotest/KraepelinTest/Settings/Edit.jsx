// resources/js/Pages/Psychotest/KraepelinTest/Settings/Edit.jsx

import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function EditKraepelinSetting({ setting, difficultyOptions }) {
    const { errors } = usePage().props;
    const [form, setForm] = useState({
        name: setting.name,
        rows: setting.rows,
        columns: setting.columns,
        time_per_column: setting.time_per_column,
        difficulty: setting.difficulty,
        is_active: setting.is_active,
        description: setting.description || ''
    });

    useEffect(() => {
        setForm({
            name: setting.name,
            rows: setting.rows,
            columns: setting.columns,
            time_per_column: setting.time_per_column,
            difficulty: setting.difficulty,
            is_active: setting.is_active,
            description: setting.description || ''
        });
    }, [setting]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.put(route('admin.kraepelin.settings.update', setting.id), form);
    };

    const calculateTotal = () => {
        const totalQuestions = (parseInt(form.rows) - 1) * parseInt(form.columns);
        const totalTime = parseInt(form.columns) * parseInt(form.time_per_column);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        
        return {
            totalQuestions,
            totalTime: totalTime,
            formattedTime: minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`
        };
    };

    const totals = calculateTotal();

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Edit Pengaturan Tes Kraepelin
                    </h2>
                    <button
                        onClick={() => router.visit(route('admin.kraepelin.settings.index'))}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                        Kembali
                    </button>
                </div>
            }
        >
            <Head title="Edit Pengaturan Tes Kraepelin" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nama Pengaturan *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Matrix Configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Jumlah Baris *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="rows"
                                                    value={form.rows}
                                                    onChange={handleChange}
                                                    min="20"
                                                    max="100"
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                />
                                                <div className="absolute right-3 top-2.5 text-gray-500">baris</div>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Min: 20, Max: 100</p>
                                            {errors.rows && (
                                                <p className="mt-1 text-sm text-red-600">{errors.rows}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Jumlah Kolom *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="columns"
                                                    value={form.columns}
                                                    onChange={handleChange}
                                                    min="20"
                                                    max="100"
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                />
                                                <div className="absolute right-3 top-2.5 text-gray-500">kolom</div>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Min: 20, Max: 100</p>
                                            {errors.columns && (
                                                <p className="mt-1 text-sm text-red-600">{errors.columns}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Waktu per Kolom *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="time_per_column"
                                                    value={form.time_per_column}
                                                    onChange={handleChange}
                                                    min="5"
                                                    max="60"
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                    required
                                                />
                                                <div className="absolute right-3 top-2.5 text-gray-500">detik</div>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Min: 5, Max: 60 detik</p>
                                            {errors.time_per_column && (
                                                <p className="mt-1 text-sm text-red-600">{errors.time_per_column}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Difficulty Level */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tingkat Kesulitan *
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {Object.entries(difficultyOptions).map(([value, label]) => (
                                                <div key={value} className="relative">
                                                    <input
                                                        type="radio"
                                                        name="difficulty"
                                                        value={value}
                                                        checked={form.difficulty === value}
                                                        onChange={handleChange}
                                                        className="sr-only"
                                                        id={`difficulty-${value}`}
                                                        required
                                                    />
                                                    <label
                                                        htmlFor={`difficulty-${value}`}
                                                        className={`block p-3 border rounded-lg cursor-pointer text-center transition-all ${
                                                            form.difficulty === value
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                                                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        <div className="font-medium">{label}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {value === 'mudah' && 'Untuk pemula'}
                                                            {value === 'sedang' && 'Standar'}
                                                            {value === 'sulit' && 'Tantangan'}
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.difficulty && (
                                            <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Deskripsi
                                        </label>
                                        <textarea
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            rows="2"
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Active Status */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={form.is_active}
                                            onChange={handleChange}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            id="is_active"
                                        />
                                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                            Pengaturan aktif (akan tersedia untuk tes)
                                        </label>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-gray-500">Dibuat</div>
                                                <div>{new Date(setting.created_at).toLocaleDateString('id-ID')}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Terakhir diubah</div>
                                                <div>{new Date(setting.updated_at).toLocaleDateString('id-ID')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Preview */}
                                    <div className="p-4 bg-gray-50 rounded-lg border">
                                        <h4 className="font-medium text-gray-900 mb-3">Ringkasan Pengaturan:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-3 bg-white border rounded">
                                                <div className="text-sm text-gray-500 mb-1">Ukuran Matrix:</div>
                                                <div className="font-medium text-lg">
                                                    {form.rows} baris × {form.columns} kolom
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white border rounded">
                                                <div className="text-sm text-gray-500 mb-1">Total Soal:</div>
                                                <div className="font-medium text-lg">{totals.totalQuestions} soal</div>
                                            </div>
                                            <div className="p-3 bg-white border rounded">
                                                <div className="text-sm text-gray-500 mb-1">Waktu per Kolom:</div>
                                                <div className="font-medium text-lg">{form.time_per_column} detik</div>
                                            </div>
                                            <div className="p-3 bg-white border rounded">
                                                <div className="text-sm text-gray-500 mb-1">Total Waktu:</div>
                                                <div className="font-medium text-lg">{totals.formattedTime}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Apakah Anda yakin ingin menghapus pengaturan ini?')) {
                                                    router.delete(route('admin.kraepelin.settings.destroy', setting.id));
                                                }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                                        >
                                            Hapus Pengaturan
                                        </button>
                                        <div className="space-x-4">
                                            <button
                                                type="button"
                                                onClick={() => router.visit(route('admin.kraepelin.settings.index'))}
                                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                            >
                                                Update Pengaturan
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