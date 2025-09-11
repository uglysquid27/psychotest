import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CronjobSettings({ auth }) {
    const { cronJobs } = usePage().props;
    const [settings, setSettings] = useState(cronJobs);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state when props change
    useEffect(() => {
        setSettings(cronJobs);
    }, [cronJobs]);

    const handleToggle = async (id, newValue) => {
        const originalSettings = [...settings];
        const updatedSettings = settings.map(setting =>
            setting.id === id ? { ...setting, is_enabled: newValue } : setting
        );
        setSettings(updatedSettings);

        try {
            setIsSaving(true);
            await router.put(route('cronjob-settings.update', id), {
                is_enabled: newValue
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowSuccessToast(true);
                    setTimeout(() => setShowSuccessToast(false), 3000);
                },
                onError: () => {
                    setShowErrorToast(true);
                    setSettings(originalSettings);
                    setTimeout(() => setShowErrorToast(false), 3000);
                }
            });
        } catch (error) {
            console.error('Error updating setting:', error);
            setShowErrorToast(true);
            setSettings(originalSettings);
            setTimeout(() => setShowErrorToast(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAll = async () => {
        const originalSettings = [...settings];
        
        try {
            setIsSaving(true);
            await router.post(route('cronjob-settings.update-multiple'), {
                settings: settings.map(setting => ({
                    id: setting.id,
                    is_enabled: setting.is_enabled
                }))
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowSuccessToast(true);
                    setTimeout(() => setShowSuccessToast(false), 3000);
                },
                onError: () => {
                    setShowErrorToast(true);
                    setSettings(originalSettings);
                    setTimeout(() => setShowErrorToast(false), 3000);
                }
            });
        } catch (error) {
            console.error('Error updating settings:', error);
            setShowErrorToast(true);
            setSettings(originalSettings);
            setTimeout(() => setShowErrorToast(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusBadge = (isEnabled) => {
        return isEnabled ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Aktif
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Nonaktif
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Pengaturan Cron Job</h2>}
        >
            <Head title="Pengaturan Cron Job" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            <div className="mb-8">
                                <div className="flex items-start space-x-2">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        Kelola Cron Job
                                    </h3>
                                    <div className="group relative inline-flex">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-indigo-500 cursor-help mt-0.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        {/* Tooltip appears below the info icon */}
                                        <div className="absolute left-1/2 translate-x-[-50%] top-full mt-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-sm rounded-md shadow-lg z-50">
                                            <div className="relative">
                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-gray-900 border-b-gray-900 border-t-transparent border-r-transparent border-l-transparent"></div>
                                                <p className="font-medium mb-1">Apa itu Cron Job?</p>
                                                <p>
                                                    Cron Job adalah tugas terjadwal yang berjalan otomatis di server pada interval waktu tertentu. Fitur ini memungkinkan sistem melakukan tugas seperti pembersihan data, pengiriman notifikasi, atau pembaruan status secara berkala.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    Aktifkan atau nonaktifkan cron job sesuai kebutuhan. Perubahan akan diterapkan setelah disimpan.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {settings.map((setting) => (
                                    <div key={setting.id} className="flex items-center justify-between p-5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {setting.job_name}
                                                </h4>
                                                {getStatusBadge(setting.is_enabled)}
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                {setting.description}
                                            </p>
                                            {setting.command && (
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                                                    {setting.command}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center ml-4">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={setting.is_enabled}
                                                    onChange={(e) => handleToggle(setting.id, e.target.checked)}
                                                    disabled={isSaving}
                                                />
                                                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => router.reload()}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium text-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                    disabled={isSaving}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAll}
                                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-sm text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Toast Notification */}
            {showSuccessToast && (
                <div className="fixed top-4 right-4 z-50 transition-transform duration-300 transform">
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-md" role="alert">
                        <div className="flex">
                            <div className="py-1">
                                <svg className="h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">Berhasil</p>
                                <p>Pengaturan berhasil disimpan</p>
                            </div>
                            <button className="ml-8" onClick={() => setShowSuccessToast(false)}>
                                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast Notification */}
            {showErrorToast && (
                <div className="fixed top-4 right-4 z-50 transition-transform duration-300 transform">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md" role="alert">
                        <div className="flex">
                            <div className="py-1">
                                <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">Gagal</p>
                                <p>Terjadi kesalahan saat menyimpan pengaturan</p>
                            </div>
                            <button className="ml-8" onClick={() => setShowErrorToast(false)}>
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}