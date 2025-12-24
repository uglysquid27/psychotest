import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useState, useEffect } from 'react';
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
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [currentScheduleId, setCurrentScheduleId] = useState(null);
    const [requestReasonInput, setRequestReasonInput] = useState('');
    const [requestMode, setRequestMode] = useState('accept'); // "accept" | "reject"

    // Coworkers state
    const [coworkersData, setCoworkersData] = useState(null);
    const [loadingCoworkers, setLoadingCoworkers] = useState(false);
    const [expandedSchedule, setExpandedSchedule] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Change request state
    const [pendingRequests, setPendingRequests] = useState({});
    const [loadingRequests, setLoadingRequests] = useState({});

    // Date filter state - 1 week range ending with tomorrow's date
    const [dateRange, setDateRange] = useState({
        start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
        end: dayjs().add(1, 'day').format('YYYY-MM-DD')
    });

    // Filter schedules by date range
    const filteredSchedules = mySchedules?.filter(schedule => {
        if (!schedule.date) return false;
        const scheduleDate = dayjs(schedule.date);
        return scheduleDate.isAfter(dayjs(dateRange.start).subtract(1, 'day')) &&
            scheduleDate.isBefore(dayjs(dateRange.end).add(1, 'day'));
    }) || [];

    // Get current schedules for pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSchedules = filteredSchedules.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);

    // Reset to first page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [dateRange]);

    // Check request status for all schedules
    useEffect(() => {
        if (mySchedules) {
            mySchedules.forEach(schedule => {
                if (!isPastDate(schedule.date)) {
                    checkRequestStatus(schedule.id);
                }
            });
        }
    }, [mySchedules]);

    const openRequestModal = (scheduleId, mode = 'accept') => {
        setCurrentScheduleId(scheduleId);
        setRequestReasonInput('');
        setRequestMode(mode);
        setShowRequestModal(true);
    };

    const closeRequestModal = () => {
        setShowRequestModal(false);
        setCurrentScheduleId(null);
        setRequestReasonInput('');
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

    // Helper function to determine if schedule has no status (new schedule)
    // Also check if it's "pending" but has no pending request
    const isFirstResponse = (schedule) => {
        // If schedule has "pending" status but no pending request, treat it as first response
        if (schedule.status === 'pending' && !pendingRequests[schedule.id]) {
            return true;
        }
        return !schedule.status || schedule.status === '' || schedule.status === null;
    };

    // Function to check change request status
    const checkRequestStatus = async (scheduleId) => {
        if (loadingRequests[scheduleId]) return;
        
        setLoadingRequests(prev => ({ ...prev, [scheduleId]: true }));
        
        try {
            const response = await fetch(route('employee.schedule.change-request-status', scheduleId));
            const data = await response.json();
            
            setPendingRequests(prev => ({
                ...prev,
                [scheduleId]: data.has_pending_request ? data.pending_request : null
            }));
        } catch (error) {
            console.error('Failed to check request status:', error);
        } finally {
            setLoadingRequests(prev => ({ ...prev, [scheduleId]: false }));
        }
    };

    // Handle submit request based on schedule status
    const submitRequest = async (scheduleId, status, reason = '') => {
        // Find the schedule
        const schedule = mySchedules.find(s => s.id === scheduleId);
        
        if (!schedule) {
            alert('Schedule not found!');
            return;
        }

        // Check if schedule is in the past
        if (isPastDate(schedule.date)) {
            alert('Tidak dapat merespon jadwal yang sudah lewat.');
            return;
        }

        // Check if this is first response (including pending status without pending request)
        if (isFirstResponse(schedule)) {
            if (status === 'rejected' && (!reason || reason.trim() === '')) {
                alert('Alasan tidak boleh kosong untuk penolakan!');
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
                        closeRequestModal();
                        // NO ALERT FOR FIRST RESPONSE - just close modal and refresh
                        // Refresh the page to show updated schedule status
                        setTimeout(() => {
                            router.reload({ preserveScroll: true });
                        }, 100);
                    },
                    onError: (errors) => {
                        if (errors.message) {
                            alert(errors.message);
                        } else {
                            alert('Gagal mengajukan permintaan perubahan. Silakan coba lagi.');
                        }
                    },
                }
            );
        } else {
            // For non-first response (changing existing accepted/rejected status), needs approval
            
            // Check for pending requests
            if (pendingRequests[scheduleId]) {
                alert('Anda sudah memiliki permintaan perubahan yang menunggu persetujuan.');
                return;
            }

            if (!reason || reason.trim() === '') {
                alert('Alasan harus diisi untuk mengajukan perubahan!');
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
                        closeRequestModal();
                        
                        // Show pending status
                        setPendingRequests(prev => ({
                            ...prev,
                            [scheduleId]: {
                                schedule_id: scheduleId,
                                requested_status: status,
                                reason: reason
                            }
                        }));
                        
                        alert('Permintaan perubahan status telah diajukan. Status berubah menjadi Menunggu Persetujuan.');
                        
                        // Refresh the page to show updated schedule status
                        setTimeout(() => {
                            router.reload({ preserveScroll: true });
                        }, 100);
                    },
                    onError: (errors) => {
                        if (errors.message) {
                            alert(errors.message);
                        } else {
                            alert('Gagal mengajukan permintaan perubahan. Silakan coba lagi.');
                        }
                    },
                }
            );
        }
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

    const formatTime = (timeString) => {
        if (!timeString || timeString === 'NULL' || timeString === 'null') return 'N/A';

        try {
            // Handle different time formats
            if (typeof timeString === 'string') {
                // Extract HH:MM from time string
                const timeParts = timeString.split(':');
                if (timeParts.length >= 2) {
                    const hours = timeParts[0].padStart(2, '0');
                    const minutes = timeParts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                }
            }

            return 'N/A';
        } catch (error) {
            console.error('Error formatting time:', error, timeString);
            return 'N/A';
        }
    };

    // Main function to get status display
    const getStatusDisplay = (schedule) => {
        if (isPastDate(schedule.date)) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-md">
                    Selesai
                </span>
            );
        }

        // If there's a pending request in the state, show ONLY the pending status
        if (pendingRequests[schedule.id]) {
            const request = pendingRequests[schedule.id];
            const isAcceptRequest = request?.requested_status === 'accepted';
            
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500 text-white shadow-md">
                        ⏳ Menunggu Persetujuan
                    </span>
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                        Permintaan: {isAcceptRequest ? 'Diterima' : 'Ditolak'}
                    </span>
                </div>
            );
        }

        // If loading request status, show loading
        if (loadingRequests[schedule.id]) {
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-400 text-white shadow-md">
                        Memuat...
                    </span>
                </div>
            );
        }

        // CRITICAL FIX: If schedule has "pending" status but NO pending request
        // This should be treated as first response and show accept/reject buttons
        if (schedule.status === 'pending' && !pendingRequests[schedule.id]) {
            return (
                <div className="flex flex-col gap-1 sm:gap-2">
                    <button
                        onClick={() => openRequestModal(schedule.id, 'accept')}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Terima
                    </button>
                    <button
                        onClick={() => openRequestModal(schedule.id, 'reject')}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Tolak
                    </button>
                </div>
            );
        }

        // If schedule has no status yet (brand new schedule) - show first response buttons
        if (!schedule.status || schedule.status === '' || schedule.status === null) {
            return (
                <div className="flex flex-col gap-1 sm:gap-2">
                    <button
                        onClick={() => openRequestModal(schedule.id, 'accept')}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Terima
                    </button>
                    <button
                        onClick={() => openRequestModal(schedule.id, 'reject')}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Tolak
                    </button>
                </div>
            );
        }

        // If schedule is already accepted - show status and change button
        if (schedule.status === 'accepted') {
            return (
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-md">
                        ✔ Diterima
                    </span>
                    <button
                        onClick={() => openRequestModal(schedule.id, 'reject')}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Ajukan Perubahan ke Ditolak
                    </button>
                </div>
            );
        }

        // If schedule is already rejected - show status and change button
        if (schedule.status === 'rejected') {
            return (
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-md">
                        ✘ Ditolak
                    </span>
                    <button
                        onClick={() => openRequestModal(schedule.id, 'accept')}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-md"
                    >
                        Ajukan Perubahan ke Diterima
                    </button>
                </div>
            );
        }

        // If schedule status is pending AND has a pending request (should already be handled above)
        if (schedule.status === 'pending') {
            return (
                <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500 text-white shadow-md">
                        ⏳ Menunggu Persetujuan
                    </span>
                </div>
            );
        }

        // Default fallback
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-400 text-white shadow-md">
                Tidak Diketahui
            </span>
        );
    };

    const getReasonDisplay = (schedule) => {
        // If there's a pending request, show the request reason
        if (pendingRequests[schedule.id]) {
            const request = pendingRequests[schedule.id];
            return (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                    "{request?.reason || 'Menunggu persetujuan...'}"
                </p>
            );
        }
        
        // If loading request status
        if (loadingRequests[schedule.id]) {
            return (
                <span className="inline-block text-xs text-gray-500 italic">Memuat...</span>
            );
        }
        
        // Show reason for rejected schedules
        if (schedule.status === 'rejected') {
            return (
                <p className="text-xs text-red-500 italic">
                    "{schedule.rejection_reason || 'Tidak ada alasan'}"
                </p>
            );
        }
        
        // For brand new schedule (no status yet) or pending without request
        if (!schedule.status || schedule.status === '' || schedule.status === null || 
            (schedule.status === 'pending' && !pendingRequests[schedule.id])) {
            return (
                <span className="inline-block text-xs text-gray-500 italic">Belum direspon</span>
            );
        }
        
        // No reason for accepted schedules
        if (schedule.status === 'accepted') {
            return (
                <span className="inline-block text-xs text-gray-500 italic">Tidak ada alasan</span>
            );
        }
        
        return (
            <span className="inline-block text-xs text-gray-500 italic">-</span>
        );
    };

    // Function to check if current modal is for first response
    const isModalForFirstResponse = () => {
        const schedule = mySchedules.find(s => s.id === currentScheduleId);
        if (!schedule) return false;
        
        // Check if schedule has "pending" status but no pending request
        if (schedule.status === 'pending' && !pendingRequests[schedule.id]) {
            return true;
        }
        
        return !schedule.status || schedule.status === '' || schedule.status === null;
    };

    // Function to get button text in modal
    const getModalButtonText = () => {
        const schedule = mySchedules.find(s => s.id === currentScheduleId);
        if (!schedule) return '';
        
        if (isModalForFirstResponse()) {
            return requestMode === 'accept' ? 'Terima' : 'Tolak';
        } else {
            return 'Ajukan Perubahan';
        }
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
                        
                        {/* Notification about approval system */}
                        <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
                            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span>
                                    <span className="font-semibold">Respon pertama</span> (terima/tolak) akan langsung memperbarui status jadwal. <br />
                                    <span className="font-semibold">Perubahan status</span> selanjutnya membutuhkan persetujuan supervisor.
                                </span>
                            </p>
                        </div>
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
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                                        Penjadwalan Anda
                                    </h4>

                                    {/* Date Range Filter */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                        <label htmlFor="dateRange" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Rentang Tanggal:
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange(prev => ({
                                                    ...prev,
                                                    start: e.target.value
                                                }))}
                                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm w-32"
                                            />
                                            <span className="text-gray-600 dark:text-gray-400">s/d</span>
                                            <input
                                                type="date"
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange(prev => ({
                                                    ...prev,
                                                    end: e.target.value
                                                }))}
                                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm w-32"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setDateRange({
                                                start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
                                                end: dayjs().add(1, 'day').format('YYYY-MM-DD')
                                            })}
                                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded"
                                        >
                                            1 Minggu
                                        </button>
                                    </div>
                                </div>

                                {mySchedules && mySchedules.length > 0 ? (
                                    <>
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
                                                    {currentSchedules.filter(schedule => schedule.visibility === 'public').map((schedule) => (
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
                                                                    {getStatusDisplay(schedule)}
                                                                </td>
                                                                <td className="hidden lg:table-cell px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                                    {getReasonDisplay(schedule)}
                                                                </td>
                                                                <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                                    {/* Show Same Day button for schedules that are not pending and don't have pending requests */}
                                                                    {shouldShowSameDayButton(schedule.date) && 
                                                                     !pendingRequests[schedule.id] && 
                                                                     schedule.status !== 'pending' && (
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
                                                                                <div key={shiftId} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700 mb-4">
                                                                                    <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-3 text-sm">
                                                                                        Shift: {shiftData.shift_name || 'N/A'}
                                                                                    </h6>
                                                                                    
                                                                                    {Object.entries(shiftData.timeGroups).map(([timeKey, timeData]) => {
                                                                                        const startTime = formatTime(timeData.start_time);
                                                                                        const endTime = formatTime(timeData.end_time);
                                                                                        
                                                                                        return (
                                                                                            <div key={timeKey} className="mb-4 last:mb-0">
                                                                                                <div className="flex items-center mb-2">
                                                                                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                                                                        Waktu: {startTime} - {endTime} ({timeData.employees.length} orang)
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                                   {timeData.employees.map((emp, index) => {
                                                                                                        const isCurrentUser =
                                                                                                            String(emp.employee?.id) === String(auth.user.id) ||
                                                                                                            Number(emp.employee?.id) === Number(auth.user.id);

                                                                                                        const shouldShowLine = emp.sub_section === 'Putway' && emp.line;
                                                                                                        const shouldShowShrink = emp.sub_section === 'Shrink' && emp.line;

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
                                                                                                                    {shouldShowLine ? ` Line ${emp.line}` : ''}
                                                                                                                    {shouldShowShrink ? `  ${emp.line}` : ''}
                                                                                                                </div>

                                                                                                                <div className="mt-2">
                                                                                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                                                                        emp.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                                                                                        emp.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                                                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                                                                                                        }`}>
                                                                                                                        {emp.status === 'accepted' ? 'Diterima' :
                                                                                                                        emp.status === 'rejected' ? 'Ijin' :
                                                                                                                        emp.status === 'pending' ? 'Menunggu Persetujuan' : 'Menunggu'}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
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

                                        {/* Pagination Controls */}
                                        {filteredSchedules.length > itemsPerPage && (
                                            <div className="flex justify-between items-center mt-4 px-2">
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSchedules.length)} dari {filteredSchedules.length} jadwal
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                                    >
                                                        Previous
                                                    </button>
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`px-3 py-1 rounded-md ${currentPage === page
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                        disabled={currentPage === totalPages}
                                                        className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 text-center text-gray-600 dark:text-gray-300 italic shadow-md border border-gray-200 dark:border-gray-600">
                                        <p>Anda belum memiliki penjadwalan.</p>
                                    </div>
                                )}
                            </div>

                            {/* Request Modal */}
                            {showRequestModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 w-full max-w-md mx-auto shadow-2xl border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                            {isModalForFirstResponse() ? 
                                                (requestMode === 'accept' ? 'Terima Jadwal' : 'Tolak Jadwal') :
                                                (requestMode === 'accept' ? 'Ajukan Perubahan ke Diterima' : 'Ajukan Perubahan ke Ditolak')
                                            }
                                        </h3>
                                        
                                        {/* Show different descriptions based on whether it's first response or change request */}
                                        {isModalForFirstResponse() ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                Status jadwal akan langsung diperbarui tanpa memerlukan persetujuan.
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                Permintaan perubahan status memerlukan persetujuan supervisor.
                                            </p>
                                        )}
                                        
                                        {/* Show reason requirement */}
                                        {requestMode === 'reject' || !isModalForFirstResponse() ? (
                                            <p className="text-xs text-red-500 mb-2">
                                                * Alasan wajib diisi
                                            </p>
                                        ) : null}
                                        
                                        {/* Show textarea for reject or change requests */}
                                        {requestMode === 'reject' || !isModalForFirstResponse() ? (
                                            <textarea
                                                rows="4"
                                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm mb-3"
                                                placeholder={
                                                    isModalForFirstResponse() && requestMode === 'reject' 
                                                        ? 'Tuliskan alasan penolakan...' 
                                                        : !isModalForFirstResponse() && requestMode === 'accept'
                                                        ? 'Tuliskan alasan perubahan ke Diterima...'
                                                        : 'Tuliskan alasan...'
                                                }
                                                value={requestReasonInput}
                                                onChange={(e) => setRequestReasonInput(e.target.value)}
                                                required
                                            ></textarea>
                                        ) : null}
                                        
                                        <div className="flex justify-end gap-2 mt-4">
                                            <button
                                                onClick={closeRequestModal}
                                                className="px-3 py-1.5 border rounded-xl text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const status = requestMode === 'accept' ? 'accepted' : 'rejected';
                                                    submitRequest(currentScheduleId, status, requestReasonInput);
                                                }}
                                                disabled={(requestMode === 'reject' || !isModalForFirstResponse()) && !requestReasonInput.trim()}
                                                className="px-3 py-1.5 rounded-xl text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {getModalButtonText()}
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