import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useState, useEffect } from 'react';
import React from 'react';

dayjs.locale('id');

export default function EmployeeDashboard() {
    const { auth, mySchedules, incompleteProfile } = usePage().props;

    // Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentScheduleId, setCurrentScheduleId] = useState(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [rejectMode, setRejectMode] = useState('reject'); // "reject" | "cancel"

    // Alert state
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('error');

    const showCustomAlert = (message, type = 'error') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
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

                    {/* Welcome */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 tracking-wide text-indigo-900 dark:text-indigo-200">
                            Selamat Datang, {employeeName}!
                        </h3>
                        <p className="text-base sm:text-lg md:text-xl font-light opacity-90 text-gray-600 dark:text-gray-300">
                            NIK Anda: <span className="font-semibold tracking-wider">{employeeNik}</span>
                        </p>
                    </div>

                    {/* Schedule or Incomplete Profile */}
                    {incompleteProfile ? (
                        <div className="bg-yellow-100 dark:bg-yellow-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-yellow-300 dark:border-yellow-700 text-center">
                            <h4 className="text-lg sm:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">
                                Tolong isi data diri terlebih dahulu
                            </h4>
                            <p className="text-sm sm:text-base text-yellow-700 dark:text-yellow-300 mb-6">
                                Anda harus melengkapi data <strong>Kelurahan</strong> dan <strong>Kecamatan</strong> sebelum dapat melihat penjadwalan.
                            </p>
                            <Link
                                href={route('employee.employees.edit', { employee: auth.user.id })}
                                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow transition"
                            >
                                Lengkapi Data Diri
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">
                                Penjadwalan Anda
                            </h4>

                            {mySchedules && mySchedules.length > 0 ? (
                                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner bg-gray-50 dark:bg-gray-900">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-white">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase text-center">Tanggal</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase text-center">Shift</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase text-center">Waktu</th>
                                                <th className="hidden sm:table-cell px-3 py-2 text-xs font-semibold uppercase text-center">Sub Bagian</th>
                                                <th className="hidden md:table-cell px-3 py-2 text-xs font-semibold uppercase text-center">Section</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase text-center">Status</th>
                                                <th className="hidden lg:table-cell px-3 py-2 text-xs font-semibold uppercase text-center">Alasan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {mySchedules.map((schedule) => (
                                                <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 text-center">
                                                    <td>{formatDate(schedule.date)}</td>
                                                    <td>{schedule.man_power_request?.shift?.name || 'N/A'}</td>
                                                    <td>
                                                        {schedule.man_power_request?.start_time?.substring(0, 5)} - {schedule.man_power_request?.end_time?.substring(0, 5)}
                                                    </td>
                                                    <td className="hidden sm:table-cell">{schedule.sub_section?.name || 'N/A'}</td>
                                                    <td className="hidden md:table-cell">{schedule.sub_section?.section?.name || 'N/A'}</td>
                                                    <td>
                                                        {schedule.status === 'accepted' ? (
                                                            <span className="px-2 py-1 rounded bg-green-600 text-white text-xs">Diterima</span>
                                                        ) : schedule.status === 'rejected' ? (
                                                            <span className="px-2 py-1 rounded bg-red-600 text-white text-xs">Ditolak</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded bg-yellow-600 text-white text-xs">Menunggu</span>
                                                        )}
                                                    </td>
                                                    <td className="hidden lg:table-cell">
                                                        {schedule.status === 'rejected'
                                                            ? <span className="italic text-red-400">{schedule.rejection_reason || '-'}</span>
                                                            : <span className="italic text-gray-400">-</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 text-center text-gray-600 dark:text-gray-300 italic">
                                    Anda belum memiliki penjadwalan yang ditugaskan.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
