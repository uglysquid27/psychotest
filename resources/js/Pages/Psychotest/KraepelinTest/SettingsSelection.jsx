// resources/js/Pages/Psychotest/KraepelinTest/SettingsSelection.jsx

import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function KraepelinSettingsSelection({ settings = [] }) {
    const [selectedSetting, setSelectedSetting] = useState(null);
    const [useCustom, setUseCustom] = useState(false);
    const [customConfig, setCustomConfig] = useState({
        rows: 45,
        columns: 60,
        time_per_column: 15
    });
    const [difficultyFilter, setDifficultyFilter] = useState('all');

    useEffect(() => {
        if (settings.length > 0 && !selectedSetting) {
            setSelectedSetting(settings[0]);
        }
    }, [settings]);

    const handleSettingSelect = (setting) => {
        setSelectedSetting(setting);
        setUseCustom(false);
    };

    const handleCustomConfigChange = (e) => {
        const { name, value } = e.target;
        setCustomConfig(prev => ({
            ...prev,
            [name]: parseInt(value) || 0
        }));
    };

    const handleStartTest = () => {
        if (useCustom) {
            // Validate custom configuration
            if (customConfig.rows < 20 || customConfig.rows > 100 ||
                customConfig.columns < 20 || customConfig.columns > 100 ||
                customConfig.time_per_column < 5 || customConfig.time_per_column > 60) {
                alert('Konfigurasi kustom tidak valid. Silakan periksa nilai yang dimasukkan.');
                return;
            }

            // Navigate to test page with custom configuration
            router.get(route('kraepelin.index'), {
                use_custom: true,
                custom_rows: customConfig.rows,
                custom_columns: customConfig.columns,
                custom_time_per_column: customConfig.time_per_column
            });
        } else if (selectedSetting) {
            // Navigate to test page with selected setting
            router.get(route('kraepelin.index'), {
                setting_id: selectedSetting.id
            });
        }
    };

    const calculateTotals = (rows, columns, timePerColumn) => {
        const totalQuestions = (rows - 1) * columns;
        const totalTime = columns * timePerColumn;
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        
        const formattedTime = minutes > 0 
            ? `${minutes} menit ${seconds} detik`
            : `${seconds} detik`;

        return { totalQuestions, totalTime, formattedTime };
    };

    const filteredSettings = settings.filter(setting => {
        if (difficultyFilter === 'all') return true;
        return setting.difficulty === difficultyFilter;
    });

    const customTotals = calculateTotals(
        customConfig.rows,
        customConfig.columns,
        customConfig.time_per_column
    );

    const presetConfigs = [
        { name: 'Standar', rows: 45, columns: 60, time: 15, difficulty: 'sedang' },
        { name: 'Cepat', rows: 30, columns: 50, time: 10, difficulty: 'mudah' },
        { name: 'Sulit', rows: 60, columns: 80, time: 20, difficulty: 'sulit' },
        { name: 'Latihan', rows: 20, columns: 30, time: 30, difficulty: 'mudah' },
    ];

    const applyPreset = (preset) => {
        setCustomConfig({
            rows: preset.rows,
            columns: preset.columns,
            time_per_column: preset.time
        });
        setUseCustom(true);
        setSelectedSetting(null);
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'mudah': return 'bg-green-100 text-green-800 border-green-200';
            case 'sedang': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'sulit': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Tes Kraepelin - Pilih Konfigurasi
                </h2>
            }
        >
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 md:py-12">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@600;700;800&display=swap');
                    
                    .soft-beige-shadow {
                        box-shadow: 0 4px 6px -1px rgba(251, 191, 36, 0.15), 0 2px 4px -1px rgba(251, 191, 36, 0.1);
                    }
                    
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .fade-in-up {
                        animation: fadeInUp 0.6s ease-out forwards;
                        opacity: 0;
                    }
                `}</style>

                <div className="max-w-6xl mx-auto px-4 md:px-6">
                    <div className="fade-in-up soft-beige-shadow bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-100">
                        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 p-6 md:p-10">
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4" style={{fontFamily: "'Raleway', sans-serif"}}>
                                Pilih Konfigurasi Tes Kraepelin
                            </h1>
                            <p className="text-base md:text-xl text-amber-50 font-medium" style={{fontFamily: "'Inter', sans-serif"}}>
                                Pilih pengaturan tes yang sesuai atau buat konfigurasi kustom
                            </p>
                        </div>

                        <div className="p-6 md:p-10 space-y-8">
                            {/* Filter */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Filter berdasarkan kesulitan:</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setDifficultyFilter('all')}
                                        className={`px-4 py-2 rounded-lg transition-colors ${difficultyFilter === 'all' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        onClick={() => setDifficultyFilter('mudah')}
                                        className={`px-4 py-2 rounded-lg transition-colors ${difficultyFilter === 'mudah' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        Mudah
                                    </button>
                                    <button
                                        onClick={() => setDifficultyFilter('sedang')}
                                        className={`px-4 py-2 rounded-lg transition-colors ${difficultyFilter === 'sedang' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        Sedang
                                    </button>
                                    <button
                                        onClick={() => setDifficultyFilter('sulit')}
                                        className={`px-4 py-2 rounded-lg transition-colors ${difficultyFilter === 'sulit' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        Sulit
                                    </button>
                                </div>
                            </div>

                            {/* Preset Settings */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Pengaturan Tersedia
                                    <span className="text-sm font-normal text-gray-600 ml-2">
                                        ({filteredSettings.length} konfigurasi)
                                    </span>
                                </h3>
                                
                                {filteredSettings.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                                        <p className="text-gray-600">Tidak ada pengaturan tersedia untuk tingkat kesulitan ini.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredSettings.map((setting) => {
                                            const totals = calculateTotals(
                                                setting.rows,
                                                setting.columns,
                                                setting.time_per_column
                                            );
                                            
                                            return (
                                                <div
                                                    key={setting.id}
                                                    onClick={() => handleSettingSelect(setting)}
                                                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg ${
                                                        selectedSetting?.id === setting.id && !useCustom
                                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                            : 'border-gray-300 hover:border-amber-300 hover:bg-amber-50/30'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-900" style={{fontFamily: "'Raleway', sans-serif"}}>
                                                            {setting.name}
                                                        </h4>
                                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getDifficultyColor(setting.difficulty)}`}>
                                                            {setting.difficulty}
                                                        </span>
                                                    </div>
                                                    
                                                    {setting.description && (
                                                        <p className="text-sm text-gray-600 mb-3" style={{fontFamily: "'Inter', sans-serif"}}>
                                                            {setting.description}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                                        <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                                            <div className="font-bold text-amber-700 text-lg">{setting.rows}×{setting.columns}</div>
                                                            <div className="text-xs text-amber-600 font-medium">Ukuran Matrix</div>
                                                        </div>
                                                        <div className="text-center p-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                                            <div className="font-bold text-amber-700 text-lg">{setting.time_per_column}s</div>
                                                            <div className="text-xs text-amber-600 font-medium">Waktu per Kolom</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="text-center p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                                                            <div className="font-bold text-emerald-700 text-lg">{totals.totalQuestions}</div>
                                                            <div className="text-xs text-emerald-600 font-medium">Total Soal</div>
                                                        </div>
                                                        <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                                                            <div className="font-bold text-indigo-700 text-lg">{totals.formattedTime}</div>
                                                            <div className="text-xs text-indigo-600 font-medium">Total Waktu</div>
                                                        </div>
                                                    </div>
                                                    
                                                    {selectedSetting?.id === setting.id && !useCustom && (
                                                        <div className="mt-3 pt-3 border-t border-green-200">
                                                            <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Dipilih
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Custom Configuration */}
                            <div className="border-t pt-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Konfigurasi Kustom</h3>
                                        <p className="text-sm text-gray-600">Buat pengaturan tes sesuai kebutuhan Anda</p>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="useCustom"
                                            checked={useCustom}
                                            onChange={(e) => {
                                                setUseCustom(e.target.checked);
                                                if (e.target.checked) {
                                                    setSelectedSetting(null);
                                                }
                                            }}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="useCustom" className="ml-2 font-medium text-gray-900">
                                            Gunakan Konfigurasi Kustom
                                        </label>
                                    </div>
                                </div>

                                {useCustom && (
                                    <>
                                        {/* Quick Presets */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">Konfigurasi Cepat:</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {presetConfigs.map((preset, index) => {
                                                    const presetTotals = calculateTotals(preset.rows, preset.columns, preset.time);
                                                    
                                                    return (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => applyPreset(preset)}
                                                            className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-left transition-all hover:border-amber-300"
                                                        >
                                                            <div className="font-medium text-gray-900">{preset.name}</div>
                                                            <div className="text-sm text-gray-600 mt-1">
                                                                {preset.rows}×{preset.columns} • {preset.time}s/kolom
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {presetTotals.totalQuestions} soal • {presetTotals.formattedTime}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Custom Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Jumlah Baris *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="rows"
                                                        value={customConfig.rows}
                                                        onChange={handleCustomConfigChange}
                                                        min="20"
                                                        max="100"
                                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50 py-3 pl-4 pr-12"
                                                        required
                                                    />
                                                    <div className="absolute right-3 top-3 text-gray-500 font-medium">baris</div>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">Min: 20, Max: 100 baris</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Jumlah Kolom *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="columns"
                                                        value={customConfig.columns}
                                                        onChange={handleCustomConfigChange}
                                                        min="20"
                                                        max="100"
                                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50 py-3 pl-4 pr-12"
                                                        required
                                                    />
                                                    <div className="absolute right-3 top-3 text-gray-500 font-medium">kolom</div>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">Min: 20, Max: 100 kolom</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Waktu per Kolom *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="time_per_column"
                                                        value={customConfig.time_per_column}
                                                        onChange={handleCustomConfigChange}
                                                        min="5"
                                                        max="60"
                                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-amber-300 focus:ring focus:ring-amber-200 focus:ring-opacity-50 py-3 pl-4 pr-12"
                                                        required
                                                    />
                                                    <div className="absolute right-3 top-3 text-gray-500 font-medium">detik</div>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">Min: 5, Max: 60 detik</p>
                                            </div>
                                        </div>

                                        {/* Custom Configuration Summary */}
                                        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                                            <h4 className="font-medium text-indigo-900 mb-3">Ringkasan Konfigurasi Kustom:</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100">
                                                    <div className="text-sm text-indigo-600 mb-1">Ukuran Matrix</div>
                                                    <div className="text-xl font-bold text-indigo-700">
                                                        {customConfig.rows}×{customConfig.columns}
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100">
                                                    <div className="text-sm text-indigo-600 mb-1">Waktu per Kolom</div>
                                                    <div className="text-xl font-bold text-indigo-700">
                                                        {customConfig.time_per_column}s
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100">
                                                    <div className="text-sm text-indigo-600 mb-1">Total Soal</div>
                                                    <div className="text-xl font-bold text-indigo-700">
                                                        {customTotals.totalQuestions}
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100">
                                                    <div className="text-sm text-indigo-600 mb-1">Total Waktu</div>
                                                    <div className="text-xl font-bold text-indigo-700">
                                                        {customTotals.formattedTime}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Start Button */}
                            <div className="pt-6 border-t">
                                <button
                                    onClick={handleStartTest}
                                    disabled={!selectedSetting && !useCustom}
                                    className="w-full py-5 md:py-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:from-amber-700 hover:via-orange-700 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{fontFamily: "'Raleway', sans-serif"}}
                                >
                                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    {useCustom ? 'Mulai Tes dengan Konfigurasi Kustom' : 'Mulai Tes dengan Pengaturan Dipilih'}
                                </button>
                                
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-gray-600">
                                        {useCustom ? 
                                            `Konfigurasi: ${customConfig.rows} baris × ${customConfig.columns} kolom, ${customConfig.time_per_column} detik per kolom` :
                                            selectedSetting ? 
                                            `Pengaturan dipilih: ${selectedSetting.name}` :
                                            'Silakan pilih pengaturan atau buat konfigurasi kustom'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}