import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useState } from 'react';
import React from 'react';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.locale('id');
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);

export default function EmployeeDashboard() {
    const { auth, mySchedules, incompleteProfile } = usePage().props;

    // Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentScheduleId, setCurrentScheduleId] = useState(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [rejectMode, setRejectMode] = useState('reject'); // "reject" | "cancel"

    // Coworkers state
    const [coworkersData, setCoworkersData] = useState(null);
    const [loadingCoworkers, setLoadingCoworkers] = useState(false);
    const [expandedSchedule, setExpandedSchedule] = useState(null);

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

    // Check if date is in the past
    const isPastDate = (dateString) => {
        if (!dateString) return false;
        return dayjs(dateString).isBefore(dayjs(), 'day');
    };

    // Check if should show Same Day button (only for today and future dates)
    const shouldShowSameDayButton = (dateString) => {
        if (!dateString) return false;
        const date = dayjs(dateString);
        return date.isSame(dayjs(), 'day') || date.isAfter(dayjs(), 'day');
    };

    const respond = (scheduleId, status, reason = '') => {
        // Find the schedule
        const schedule = mySchedules.find(s => s.id === scheduleId);
        
        // Check if schedule is in the past
        if (schedule && isPastDate(schedule.date)) {
            alert('Tidak dapat merespon jadwal yang sudah lewat.');
            return;
        }

        if (status === 'rejected' && (!reason || reason.trim() === '')) {
            alert('Alasan tidak boleh kosong!');
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
                    closeRejectModal();
                    router.reload({ preserveScroll: true });
                },
                onError: () => {
                    alert('Gagal merespon jadwal. Silakan coba lagi.');
                },
            }
        );
    };

    const fetchSameDayEmployees = async (scheduleId) => {
        if (coworkersData?.current_schedule?.id === scheduleId) {
            setCoworkersData(null);
            setExpandedSchedule(null);
            return;
        }
        setLoadingCoworkers(true);
        setExpandedSchedule(scheduleId);
        try {
            const response = await fetch(route('employee.schedule.same-day', scheduleId));
            const data = await response.json();
            setCoworkersData(data);
        } catch (error) {
            console.error('Failed to fetch coworkers:', error);
            alert('Gagal memuat rekan kerja. Silakan coba lagi.');
        } finally {
            setLoadingCoworkers(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = dayjs(dateString);
        
        if (date.isToday()) {
            return 'Hari Ini, ' + date.format('DD MMMM YYYY');
        } else if (date.isTomorrow()) {
            return 'Besok, ' + date.format('DD MMMM YYYY');
        } else if (date.isYesterday()) {
            return 'Kemarin, ' + date.format('DD MMMM YYYY');
        } else {
            return date.format('dddd, DD MMMM YYYY');
        }
    };

    const getDateBadge = (dateString) => {
        if (!dateString) return null;
        const date = dayjs(dateString);
        
        if (date.isToday()) {
            return <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Hari Ini</span>;
        } else if (date.isTomorrow()) {
            return <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Besok</span>;
        } else if (date.isYesterday()) {
            return <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">Kemarin</span>;
        } else if (date.isBefore(dayjs(), 'day')) {
            return <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">Selesai</span>;
        }
        return null;
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
            hideSidebar={incompleteProfile}
        >
            <Head title="Employee Dashboard" />

            <div className="min-h-screen dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto py-6">

                    {/* Welcome */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 tracking-wide text-indigo-900 dark:text-indigo-200">
                            Selamat Datang, {employeeName}!
                        </h3>
                        <p className="text-base sm:text-lg md:text-xl font-light opacity-90 text-gray-600 dark:text-gray-300">
                            NIK Anda: <span className="font-semibold tracking-wider">{employeeNik}</span>
                        </p>
                    </div>

                    {/* Jika belum isi data diri */}
                    {incompleteProfile ? (
                        <div className="bg-yellow-100 dark:bg-yellow-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-yellow-300 dark:border-yellow-700 text-center">
                            <h4 className="text-lg sm:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">
                                Tolong isi data diri terlebih dahulu
                            </h4>
                            <p className="text-sm sm:text-base text-yellow-700 dark:text-yellow-300 mb-6">
                                Anda harus melengkapi <strong>data diri</strong> sebelum dapat melihat penjadwalan.
                            </p>
                            <Link
                                href={route('employee.employees.edit', { employee: auth.user.id })}
                                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow transition"
                            >
                                Lengkapi Data Diri
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Penjadwalan Anda */}
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
                                                    <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Aksi
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {mySchedules.filter(schedule => schedule.visibility === 'public').map((schedule) => (
                                                    <React.Fragment key={schedule.id}>
                                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 text-center">
                                                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-100">
                                                                <div className="flex flex-col items-center">
                                                                    <span>{formatDate(schedule.date)}</span>
                                                                    {getDateBadge(schedule.date)}
                                                                </div>
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
                                                                {isPastDate(schedule.date) ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-md">
                                                                        Selesai
                                                                    </span>
                                                                ) : schedule.status === 'accepted' ? (
                                                                    <div className="flex flex-col gap-1 sm:gap-2">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-md">
                                                                            ✔ Diterima
                                                                        </span>
                                                                        <button
                                                                            onClick={() => openRejectModal(schedule.id, 'cancel')}
                                                                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                                                                        >
                                                                            Batal
                                                                        </button>
                                                                    </div>
                                                                ) : schedule.status === 'rejected' ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-md">
                                                                        ✘ Ditolak
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex flex-col gap-1 sm:gap-2">
                                                                        <button
                                                                            onClick={() => respond(schedule.id, 'accepted')}
                                                                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                                                                        >
                                                                            Terima
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openRejectModal(schedule.id, 'reject')}
                                                                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                                                                        >
                                                                            Tolak
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                                {schedule.status === 'rejected' ? (
                                                                    <p className="text-xs text-red-500 italic">"{schedule.rejection_reason || 'Tidak ada alasan'}"</p>
                                                                ) : schedule.status === 'accepted' ? (
                                                                    <span className="inline-block text-xs text-gray-500 italic">Tidak ada alasan</span>
                                                                ) : (
                                                                    <span className="inline-block text-xs text-gray-500 italic">Menunggu Respon</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                                {shouldShowSameDayButton(schedule.date) && (
                                                                    <button
                                                                        onClick={() => fetchSameDayEmployees(schedule.id)}
                                                                        disabled={loadingCoworkers}
                                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md transition-colors duration-150"
                                                                    >
                                                                        {loadingCoworkers && expandedSchedule === schedule.id ? (
                                                                            <span className="flex items-center gap-1">
                                                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Loading...
                                                                            </span>
                                                                        ) : (
                                                                            expandedSchedule === schedule.id ? 'Tutup' : 'Same Day'
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {/* Coworkers Row */}
                                                        {expandedSchedule === schedule.id && coworkersData && (
                                                            <tr>
                                                                <td colSpan="8" className="px-3 py-4 sm:px-4 sm:py-6 bg-blue-50 dark:bg-blue-900/20">
                                                                    <div className="space-y-4">
                                                                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
                                                                            Rekan Kerja Hari yang Sama ({formatDate(schedule.date)}) - Section: {coworkersData.current_schedule?.section_name}
                                                                        </h5>

                                                                        {coworkersData.shiftGroups && Object.keys(coworkersData.shiftGroups).length > 0 ? (
                                                                            Object.entries(coworkersData.shiftGroups).map(([shiftId, shiftData]) => (
                                                                                <div key={shiftId} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                                                                                    <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-3 text-sm">
                                                                                        Shift: {shiftData.shift_name} ({shiftData.start_time?.substring(0, 5)} - {shiftData.end_time?.substring(0, 5)}) - {shiftData.employees.length} orang
                                                                                    </h6>
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                        {shiftData.employees.map((emp, index) => {
                                                                                            // Handle both string and number ID comparisons
                                                                                            const isCurrentUser =
                                                                                                String(emp.employee?.id) === String(auth.user.id) ||
                                                                                                Number(emp.employee?.id) === Number(auth.user.id);

                                                                                            return (
                                                                                                <div
                                                                                                    key={emp.id || index}
                                                                                                    className={`rounded-lg p-3 text-xs ${isCurrentUser
                                                                                                            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-400'
                                                                                                            : 'bg-gray-50 dark:bg-gray-700'
                                                                                                        }`}
                                                                                                >
                                                                                                    <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                                                                                        {emp.employee?.name || 'N/A'}
                                                                                                        {isCurrentUser && (
                                                                                                            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                                                                                Anda
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                                                                                                        NIK: {emp.employee?.nik || 'N/A'}
                                                                                                    </div>
                                                                                                    <div className="text-gray-600 dark:text-gray-400">
                                                                                                        Sub Bagian: {emp.sub_section || 'N/A'}
                                                                                                    </div>
                                                                                                    <div className="mt-2">
                                                                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                                                                emp.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                                                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                                                                            }`}>
                                                                                                            {emp.status === 'accepted' ? 'Diterima' :
                                                                                                                emp.status === 'rejected' ? 'Ijin' : 'Menunggu'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    {/* Debug info - remove in production */}
                                                                                                    {process.env.NODE_ENV === 'development' && (
                                                                                                        <div className="mt-1 text-xs text-gray-400">
                                                                                                            Emp ID: {emp.employee?.id} (Type: {typeof emp.employee?.id}) |
                                                                                                            Auth ID: {auth.user.id} (Type: {typeof auth.user.id})
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                                                Tidak ada rekan kerja lain pada hari yang sama di section ini.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 text-center text-gray-600 dark:text-gray-300 italic shadow-md border border-gray-200 dark:border-gray-600">
                                        <p>Anda belum memiliki penjadwalan.</p>
                                    </div>
                                )}
                            </div>

                            {/* Reject/Cancel Modal */}
                            {showRejectModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 w-full max-w-md mx-auto shadow-2xl border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                            {rejectMode === 'cancel' ? 'Batalkan Penjadwalan' : 'Tolak Penjadwalan'}
                                        </h3>
                                        <textarea
                                            rows="4"
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm"
                                            placeholder={`Tuliskan alasan ${rejectMode === 'cancel' ? 'pembatalan' : 'penolakan'}...`}
                                            value={rejectionReasonInput}
                                            onChange={(e) => setRejectionReasonInput(e.target.value)}
                                        ></textarea>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <button
                                                onClick={closeRejectModal}
                                                className="px-3 py-1.5 border rounded-xl text-sm bg-gray-100 dark:bg-gray-700"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={() => respond(currentScheduleId, 'rejected', rejectionReasonInput)}
                                                className="px-3 py-1.5 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700"
                                            >
                                                Kirim
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}