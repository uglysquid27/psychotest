import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useState, useEffect } from 'react';
import React from 'react';

dayjs.locale('id');

export default function EmployeeDashboard() {
    const { auth, mySchedules } = usePage().props;

    // Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentScheduleId, setCurrentScheduleId] = useState(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [rejectMode, setRejectMode] = useState('reject'); // "reject" | "cancel"

    // Alert state
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('error');

    // Coworkers state
    const [coworkersData, setCoworkersData] = useState(null);
    const [loadingCoworkers, setLoadingCoworkers] = useState(false);

    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => setShowAlert(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    const showCustomAlert = (message, type = 'error') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
    };

    const fetchSameDayEmployees = async (scheduleId) => {
        if (coworkersData?.current_schedule?.id === scheduleId) {
            setCoworkersData(null);
            return;
        }
        setLoadingCoworkers(true);
        try {
            const response = await fetch(route('employee.schedule.same-day', scheduleId));
            const data = await response.json();
            setCoworkersData(data);
        } catch (error) {
            console.error('Failed to fetch coworkers:', error);
            showCustomAlert('Gagal memuat rekan kerja. Silakan coba lagi.', 'error');
        } finally {
            setLoadingCoworkers(false);
        }
    };

    const openRejectModal = (scheduleId, mode = 'reject') => {
        setCurrentScheduleId(scheduleId);
        setRejectionReasonInput('');
        setRejectMode(mode);
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setCurrentScheduleId(null);
        setRejectionReasonInput('');
    };

    const respond = (scheduleId, status, reason = '') => {
        if (status === 'rejected' && (!reason || reason.trim() === '')) {
            showCustomAlert('Alasan tidak boleh kosong!', 'error');
            return;
        }

        router.post(
            route('employee.schedule.respond', scheduleId),
            {
                status: status,
                rejection_reason: reason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showCustomAlert('Status berhasil diperbarui.', 'success');
                    router.reload({ preserveScroll: true });
                    closeRejectModal();
                },
                onError: (errors) => {
                    let errorMessage = 'Gagal merespon jadwal. Silakan coba lagi.';
                    if (errors && Object.keys(errors).length > 0) {
                        errorMessage += '\nDetail: ' + Object.values(errors).join('\n');
                    }
                    showCustomAlert(errorMessage, 'error');
                },
            }
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('dddd, DD MMMM YYYY');
    };

    const employeeName = auth?.user?.name || 'Pegawai';
    const employeeNik = auth?.user?.nik || 'N/A';

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Dashboard
                </h2>
            }
        >
            <Head title="Employee Dashboard" />

            <div className="min-h-screen dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto py-6">
                    {/* Alert */}
                    {showAlert && (
                        <div className={`mb-6 px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl border
                            ${alertType === 'success'
                                ? 'border-green-400 text-green-700 dark:text-green-200'
                                : 'border-red-400 text-red-700 dark:text-red-200'}`}>
                            {alertMessage}
                            <button
                                onClick={() => setShowAlert(false)}
                                className="ml-4 float-right font-bold"
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    {/* Welcome */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 tracking-wide text-indigo-900 dark:text-indigo-200">
                            Selamat Datang, {employeeName}!
                        </h3>
                        <p className="text-base sm:text-lg md:text-xl font-light opacity-90 text-gray-600 dark:text-gray-300">
                            NIK Anda: <span className="font-semibold tracking-wider">{employeeNik}</span>
                        </p>
                    </div>

                    {/* Schedule */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
                        <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">
                            Penjadwalan Anda
                        </h4>

                        {mySchedules && mySchedules.length > 0 ? (
                            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner bg-gray-50 dark:bg-gray-900">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-white">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Tanggal
                                            </th>
                                            <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Shift
                                            </th>
                                            <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Waktu
                                            </th>
                                            <th scope="col" className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Sub Bagian
                                            </th>
                                            <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Section
                                            </th>
                                            <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Alasan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {mySchedules.map((schedule) => (
                                            <React.Fragment key={schedule.id}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 text-center">
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-100">
                                                        {formatDate(schedule.date)}
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                                                        {schedule.man_power_request?.shift?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                                                        {schedule.man_power_request?.start_time?.substring(0, 5) || 'N/A'} - {schedule.man_power_request?.end_time?.substring(0, 5) || 'N/A'}
                                                    </td>
                                                    <td className="hidden sm:table-cell px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                                                        {schedule.sub_section?.name || 'N/A'}
                                                    </td>
                                                    <td className="hidden md:table-cell px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                                                        {schedule.sub_section?.section?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                        {schedule.status === 'accepted' ? (
                                                            <div className="flex flex-col gap-1 sm:gap-2">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-md">
                                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                                    Diterima
                                                                </span>
                                                                <button
                                                                    onClick={() => openRejectModal(schedule.id, 'cancel')}
                                                                    className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    Batal
                                                                </button>
                                                            </div>
                                                        ) : schedule.status === 'rejected' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-md">
                                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                                                                Ditolak
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 sm:gap-2">
                                                                <button
                                                                    onClick={() => respond(schedule.id, 'accepted')}
                                                                    className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Terima
                                                                </button>

                                                                <button
                                                                    onClick={() => openRejectModal(schedule.id, 'reject')}
                                                                    className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                        {schedule.status === 'rejected' ? (
                                                            <p className="text-xs text-red-500 italic">"{schedule.rejection_reason || 'Tidak ada alasan'}"</p>
                                                        ) : schedule.status === 'accepted' ? (
                                                            <span className="inline-block text-xs sm:text-sm text-gray-500 italic">Tidak ada alasan</span>
                                                        ) : (
                                                            <span className="inline-block text-xs sm:text-sm text-gray-500 italic">Menunggu Respon</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 text-center text-gray-600 dark:text-gray-300 italic shadow-md border border-gray-200 dark:border-gray-600">
                                <p>Anda belum memiliki penjadwalan yang ditugaskan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject/Cancel Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 w-full max-w-md mx-auto shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-300">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
                            {rejectMode === 'cancel' ? 'Batalkan Penjadwalan' : 'Tolak Penjadwalan'}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-6 text-xs sm:text-sm">
                            {rejectMode === 'cancel'
                                ? 'Mohon masukkan alasan pembatalan setelah menerima jadwal ini. Alasan yang jelas akan membantu proses selanjutnya.'
                                : 'Mohon masukkan alasan mengapa Anda tidak dapat menghadiri penjadwalan ini. Alasan yang jelas akan membantu proses selanjutnya.'}
                        </p>
                        <div className="mb-6">
                            <label htmlFor="rejection-reason" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Alasan {rejectMode === 'cancel' ? 'Pembatalan' : 'Penolakan'} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="rejection-reason"
                                rows="4"
                                className="block w-full px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 resize-y text-xs sm:text-sm"
                                placeholder={`Misalnya: Saya sedang sakit, ada keperluan mendesak, dll.`}
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-2 sm:gap-3">
                            <button
                                onClick={closeRejectModal}
                                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => respond(currentScheduleId, 'rejected', rejectionReasonInput)}
                                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent rounded-xl shadow-sm text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
                            >
                                Kirim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}