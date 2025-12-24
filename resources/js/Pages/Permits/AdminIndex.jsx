import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import moment from 'moment';

export default function AdminIndex({ auth, permits, scheduleChangeRequests, filters, totalPendingCount }) {
    // Initialize with default empty arrays if props are undefined
    const safePermits = permits || { data: [], links: [] };
    const safeScheduleChangeRequests = scheduleChangeRequests || { data: [], links: [] };
    const safeFilters = filters || { status: 'all' };
    const safeTotalPendingCount = totalPendingCount || { permits: 0, schedule_changes: 0 };

    const { data, setData, post, processing, errors, reset } = useForm({
        status: '',
        admin_notes: '',
        approval_status: '',
        approval_notes: '',
    });

    const [showRespondModal, setShowRespondModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestType, setRequestType] = useState('permit'); // 'permit' or 'schedule_change'
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'permits', 'schedule_changes'

    const handleFilterChange = (newStatus) => {
        router.get(route('admin.permits.index'), { status: newStatus }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const openRespondModal = (request, type) => {
        setSelectedRequest(request);
        setRequestType(type);
        
        if (type === 'permit') {
            setData({
                status: request.status,
                admin_notes: request.admin_notes || '',
            });
        } else {
            setData({
                approval_status: request.approval_status,
                approval_notes: request.approval_notes || '',
            });
        }
        
        setShowRespondModal(true);
    };

    const closeRespondModal = () => {
        setShowRespondModal(false);
        setSelectedRequest(null);
        setRequestType('permit');
        reset();
    };

    const openPhotoModal = (photoUrl) => {
        setCurrentPhotoUrl(photoUrl);
        setShowPhotoModal(true);
    };

    const closePhotoModal = () => {
        setShowPhotoModal(false);
        setCurrentPhotoUrl('');
    };

    const submitResponse = (e) => {
        e.preventDefault();
        
        if (!selectedRequest) return;
        
        if (requestType === 'permit') {
            post(route('admin.permits.respond', selectedRequest.id), {
                onSuccess: () => {
                    closeRespondModal();
                    router.reload({ preserveScroll: true });
                },
                onError: () => console.error('Error submitting response')
            });
        } else {
            post(route('admin.permits.schedule-change.respond', selectedRequest.id), {
                onSuccess: () => {
                    closeRespondModal();
                    router.reload({ preserveScroll: true });
                },
                onError: () => console.error('Error submitting response')
            });
        }
    };

    const getStatusClasses = (status, type = 'permit') => {
        if (type === 'schedule_change') {
            switch (status) {
                case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
                case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
                case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
                default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            }
        } else {
            switch (status) {
                case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
                case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
                case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
                case 'cancelled': return 'bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
                default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            }
        }
    };

    const formatDateForMobile = (date) => {
        if (!date) return '-';
        return moment(date).format('DD/MM');
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        return moment(date).format('DD MMM YYYY HH:mm');
    };

    const formatDateFull = (date) => {
        if (!date) return '-';
        return moment(date).format('DD MMM YYYY');
    };

    // Calculate total pending requests for badge
    const totalPendingAll = (safeTotalPendingCount.permits || 0) + (safeTotalPendingCount.schedule_changes || 0);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Admin Request Management</h2>}
        >
            <Head title="Admin Permits & Schedule Changes" />

            <div className="py-4 sm:py-8 lg:py-12">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-4 sm:p-6 text-gray-900 dark:text-gray-100">
                            {/* Tabs */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setActiveTab('all')}
                                        className={`px-4 py-2 rounded-md font-medium relative ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                                    >
                                        Semua Request
                                        {totalPendingAll > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {totalPendingAll}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('permits')}
                                        className={`px-4 py-2 rounded-md font-medium relative ${activeTab === 'permits' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                                    >
                                        Izin
                                        {safeTotalPendingCount.permits > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {safeTotalPendingCount.permits}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('schedule_changes')}
                                        className={`px-4 py-2 rounded-md font-medium relative ${activeTab === 'schedule_changes' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                                    >
                                        Perubahan Jadwal
                                        {safeTotalPendingCount.schedule_changes > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {safeTotalPendingCount.schedule_changes}
                                            </span>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Filter buttons - only for permits tab */}
                                {activeTab === 'all' || activeTab === 'permits' ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleFilterChange('all')}
                                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${safeFilters.status === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                        >
                                            Semua
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('pending')}
                                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${safeFilters.status === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('approved')}
                                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${safeFilters.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                        >
                                            Diterima
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('rejected')}
                                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${safeFilters.status === 'rejected' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                        >
                                            Ditolak
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('cancelled')}
                                            className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${safeFilters.status === 'cancelled' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                        >
                                            Dibatalkan
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {safeScheduleChangeRequests.data?.length || 0} permintaan perubahan jadwal
                                    </div>
                                )}
                            </div>

                            {/* Permits Section */}
                            {(activeTab === 'all' || activeTab === 'permits') && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold mb-4">Permintaan Izin Karyawan</h3>
                                    
                                    {safePermits.data?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            {/* Mobile Cards View */}
                                            <div className="sm:hidden space-y-3">
                                                {safePermits.data.map((permit) => (
                                                    <div key={permit.id} className="border rounded-lg p-3 shadow-sm dark:border-gray-700 dark:bg-gray-700">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-sm dark:text-gray-100">
                                                                    {permit.employee ? permit.employee.name : 'N/A'}
                                                                </p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                                    {permit.permit_type}
                                                                </p>
                                                            </div>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusClasses(permit.status)}`}>
                                                                {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal</p>
                                                                <p className="text-sm dark:text-gray-100">
                                                                    {formatDateForMobile(permit.start_date)}
                                                                    {permit.end_date && ` - ${formatDateForMobile(permit.end_date)}`}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Alasan</p>
                                                                <p className="text-sm dark:text-gray-100 line-clamp-1">{permit.reason || '-'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Catatan Admin</p>
                                                            <p className="text-sm dark:text-gray-100 line-clamp-1">{permit.admin_notes || '-'}</p>
                                                        </div>

                                                        <div className="mt-2 flex justify-between items-center">
                                                            {permit.photo && (
                                                                <button
                                                                    onClick={() => openPhotoModal(`/storage/${permit.photo}`)}
                                                                    className="text-blue-600 dark:text-blue-400 text-xs flex items-center"
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    Lihat Bukti
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openRespondModal(permit, 'permit')}
                                                                className="text-indigo-600 dark:text-indigo-400 text-xs"
                                                            >
                                                                Respon
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop Table View */}
                                            <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Karyawan
                                                        </th>
                                                        <th scope="col" className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            NIK
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Jenis Izin
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Tanggal
                                                        </th>
                                                        <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Alasan
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Bukti
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Catatan
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Aksi
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {safePermits.data.map((permit) => (
                                                        <tr key={permit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {permit.employee ? permit.employee.name : 'N/A'}
                                                            </td>
                                                            <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {permit.employee ? permit.employee.nik : 'N/A'}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {permit.permit_type || 'Tidak Tersedia'}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="flex flex-col">
                                                                    <span>{moment(permit.start_date).format('DD MMM')}</span>
                                                                    {permit.end_date && (
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                            s/d {moment(permit.end_date).format('DD MMM')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="max-w-xs truncate">{permit.reason || '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {permit.photo && (
                                                                    <button
                                                                        onClick={() => openPhotoModal(`/storage/${permit.photo}`)}
                                                                        className="text-blue-600 dark:text-blue-400 text-xs flex items-center"
                                                                    >
                                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                        Lihat Bukti
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(permit.status)}`}>
                                                                    {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="max-w-xs truncate">{permit.admin_notes || '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => openRespondModal(permit, 'permit')}
                                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-600 text-xs sm:text-sm"
                                                                >
                                                                    Respon
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-300 text-center py-4">Belum ada permintaan izin ditemukan.</p>
                                    )}

                                    {/* Pagination for permits */}
                                    {safePermits.links && safePermits.links.length > 1 && (
                                        <div className="mt-4 flex flex-wrap justify-center">
                                            {safePermits.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    className={`px-2 py-1 mx-0.5 sm:px-3 sm:py-1 sm:mx-1 rounded-md text-xs sm:text-sm
                                                        ${link.active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}
                                                        ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Schedule Change Requests Section */}
                            {(activeTab === 'all' || activeTab === 'schedule_changes') && (
                                <div>
                                    <h3 className="text-lg font-bold mb-4">Permintaan Perubahan Jadwal</h3>
                                    
                                    {safeScheduleChangeRequests.data?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            {/* Mobile Cards View for Schedule Changes */}
                                            <div className="sm:hidden space-y-3">
                                                {safeScheduleChangeRequests.data.map((request) => (
                                                    <div key={`schedule-${request.id}`} className="border rounded-lg p-3 shadow-sm dark:border-gray-700 dark:bg-gray-700">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-sm dark:text-gray-100">
                                                                    {request.employee?.name || request.schedule?.employee?.name || 'N/A'}
                                                                </p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                                    {request.requested_status === 'accepted' ? 'Permintaan Diterima' : 'Permintaan Ditolak'}
                                                                </p>
                                                            </div>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusClasses(request.approval_status, 'schedule_change')}`}>
                                                                {request.approval_status.charAt(0).toUpperCase() + request.approval_status.slice(1)}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal</p>
                                                                <p className="text-sm dark:text-gray-100">
                                                                    {formatDateForMobile(request.schedule?.date)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Jadwal</p>
                                                                <p className="text-sm dark:text-gray-100 line-clamp-1">
                                                                    {request.schedule?.subSection?.section?.name || '-'} - {request.schedule?.subSection?.name || '-'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Alasan</p>
                                                            <p className="text-sm dark:text-gray-100 line-clamp-1">{request.reason || '-'}</p>
                                                        </div>

                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Diajukan</p>
                                                            <p className="text-sm dark:text-gray-100">{formatDateTime(request.created_at)}</p>
                                                        </div>

                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Status Sebelumnya</p>
                                                            <p className="text-sm dark:text-gray-100">{request.current_status || '-'}</p>
                                                        </div>

                                                        <div className="mt-2 flex justify-end">
                                                            <button
                                                                onClick={() => openRespondModal(request, 'schedule_change')}
                                                                className="text-indigo-600 dark:text-indigo-400 text-xs"
                                                            >
                                                                Respon
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop Table View for Schedule Changes */}
                                            <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Karyawan
                                                        </th>
                                                        <th scope="col" className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            NIK
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Tanggal Jadwal
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Section
                                                        </th>
                                                        <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Permintaan
                                                        </th>
                                                        <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Alasan
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Diajukan
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Aksi
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {safeScheduleChangeRequests.data.map((request) => (
                                                        <tr key={`schedule-${request.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {request.employee?.name || request.schedule?.employee?.name || 'N/A'}
                                                            </td>
                                                            <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {request.employee?.nik || request.schedule?.employee?.nik || 'N/A'}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {formatDateFull(request.schedule?.date)}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {request.schedule?.subSection?.section?.name || '-'} / {request.schedule?.subSection?.name || '-'}
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                                        request.requested_status === 'accepted' 
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                                                    }`}>
                                                                        {request.requested_status === 'accepted' ? 'Diterima' : 'Ditolak'}
                                                                    </span>
                                                                    <div className="text-xs text-gray-500">
                                                                        Sebelumnya: {request.current_status || '-'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="max-w-xs truncate">{request.reason || '-'}</div>
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(request.approval_status, 'schedule_change')}`}>
                                                                    {request.approval_status.charAt(0).toUpperCase() + request.approval_status.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                                {formatDateTime(request.created_at)}
                                                            </td>
                                                            <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => openRespondModal(request, 'schedule_change')}
                                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-600 text-xs sm:text-sm"
                                                                >
                                                                    Respon
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-300 text-center py-4">Belum ada permintaan perubahan jadwal ditemukan.</p>
                                    )}

                                    {/* Pagination for schedule change requests */}
                                    {safeScheduleChangeRequests.links && safeScheduleChangeRequests.links.length > 1 && (
                                        <div className="mt-4 flex flex-wrap justify-center">
                                            {safeScheduleChangeRequests.links.map((link, index) => (
                                                <Link
                                                    key={`schedule-${index}`}
                                                    href={link.url || '#'}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    className={`px-2 py-1 mx-0.5 sm:px-3 sm:py-1 sm:mx-1 rounded-md text-xs sm:text-sm
                                                        ${link.active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}
                                                        ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Respond Modal */}
            {showRespondModal && selectedRequest && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="relative p-4 sm:p-8 bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-lg shadow-lg">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            {requestType === 'permit' ? 'Respon Permintaan Izin' : 'Respon Perubahan Jadwal'}
                        </h3>
                        
                        {requestType === 'permit' ? (
                            <>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Karyawan: {selectedRequest.employee ? selectedRequest.employee.name : 'N/A'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                    Jenis Izin: {selectedRequest.permit_type || 'Tidak Tersedia'}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Karyawan: {selectedRequest.employee?.name || selectedRequest.schedule?.employee?.name || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Tanggal: {formatDateFull(selectedRequest.schedule?.date)}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Section: {selectedRequest.schedule?.subSection?.section?.name || '-'} / {selectedRequest.schedule?.subSection?.name || '-'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Permintaan: {selectedRequest.requested_status === 'accepted' ? 'Diterima' : 'Ditolak'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                    Status Sebelumnya: {selectedRequest.current_status || '-'}
                                </p>
                            </>
                        )}

                        <form onSubmit={submitResponse}>
                            {requestType === 'permit' ? (
                                <>
                                    <div className="mb-4">
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Status
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Terima</option>
                                            <option value="rejected">Tolak</option>
                                            <option value="cancelled">Dibatalkan</option>
                                        </select>
                                        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="admin_notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Catatan Admin
                                        </label>
                                        <textarea
                                            id="admin_notes"
                                            name="admin_notes"
                                            rows="3"
                                            value={data.admin_notes}
                                            onChange={(e) => setData('admin_notes', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            placeholder="Masukkan catatan untuk admin..."
                                        ></textarea>
                                        {errors.admin_notes && <p className="text-red-500 text-xs mt-1">{errors.admin_notes}</p>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <label htmlFor="approval_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Status Persetujuan
                                        </label>
                                        <select
                                            id="approval_status"
                                            name="approval_status"
                                            value={data.approval_status}
                                            onChange={(e) => setData('approval_status', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Setujui</option>
                                            <option value="rejected">Tolak</option>
                                        </select>
                                        {errors.approval_status && <p className="text-red-500 text-xs mt-1">{errors.approval_status}</p>}
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={closeRespondModal}
                                    className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs sm:text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-3 py-1 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                                >
                                    {processing ? 'Memproses...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50"
                    onClick={closePhotoModal}
                >
                    <div
                        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-full max-h-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closePhotoModal}
                            className="absolute top-1 right-1 sm:top-2 sm:right-2 text-white bg-red-600 hover:bg-red-700 rounded-full p-1 sm:p-2 text-sm sm:text-lg font-bold"
                            aria-label="Tutup"
                        >
                            &times;
                        </button>
                        <img
                            src={currentPhotoUrl}
                            alt="Bukti Izin"
                            className="max-w-full max-h-[80vh] sm:max-h-[90vh] object-contain rounded-lg"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/400x300/CCCCCC/000000?text=Gambar+Tidak+Ditemukan";
                            }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-2 text-sm">
                            Geser untuk memperbesar
                        </div>
                    </div>
                </div>   
            )}
        </AuthenticatedLayout>
    );
}