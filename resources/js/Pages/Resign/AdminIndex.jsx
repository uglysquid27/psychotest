import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import moment from 'moment';

export default function AdminResignIndex({ auth, resignations, filters }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        status: '',
        admin_notes: '',
    });

    const [showRespondModal, setShowRespondModal] = useState(false);
    const [selectedResign, setSelectedResign] = useState(null);

    const handleFilterChange = (newStatus) => {
        window.location.href = route('#', { status: newStatus });
    };

    const openRespondModal = (resign) => {
        setSelectedResign(resign);
        setData({
            status: resign.status,
            admin_notes: resign.admin_notes || '',
        });
        setShowRespondModal(true);
    };

    const closeRespondModal = () => {
        setShowRespondModal(false);
        setSelectedResign(null);
        reset();
    };

    const submitResponse = (e) => {
        e.preventDefault();
        if (selectedResign) {
            post(route('employee.resign.update', selectedResign.id), {
                onSuccess: () => closeRespondModal(),
                onError: () => console.error('Error submitting response')
            });
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
            case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
            case 'cancelled': return 'bg-gray-400 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const formatDateForMobile = (date) => {
        return moment(date).format('DD/MM');
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Admin Resign Management</h2>}
        >
            <Head title="Admin Resign" />

            <div className="py-4 sm:py-8 lg:py-12">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-4 sm:p-6 text-gray-900 dark:text-gray-100">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                <h3 className="text-lg font-bold">Pengajuan Resign Karyawan</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleFilterChange('all')}
                                        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${filters.status === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('pending')}
                                        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${filters.status === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('approved')}
                                        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${filters.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Diterima
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('rejected')}
                                        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${filters.status === 'rejected' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Ditolak
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('cancelled')}
                                        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${filters.status === 'cancelled' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Dibatalkan
                                    </button>
                                </div>
                            </div>

                            {resignations.data.length > 0 ? (
                                <div className="overflow-x-auto">
                                    {/* Mobile Cards View */}
                                    <div className="sm:hidden space-y-3">
                                        {resignations.data.map((resign) => (
                                            <div key={resign.id} className="border rounded-lg p-3 shadow-sm dark:border-gray-700 dark:bg-gray-700">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-sm dark:text-gray-100">
                                                            {resign.employee ? resign.employee.name : 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                            {resign.employee ? resign.employee.nik : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusClasses(resign.status)}`}>
                                                        {resign.status.charAt(0).toUpperCase() + resign.status.slice(1)}
                                                    </span>
                                                </div>

                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal Resign</p>
                                                        <p className="text-sm dark:text-gray-100">
                                                            {formatDateForMobile(resign.tanggal)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Diajukan Pada</p>
                                                        <p className="text-sm dark:text-gray-100">
                                                            {formatDateForMobile(resign.created_at)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Alasan Resign</p>
                                                    <p className="text-sm dark:text-gray-100 line-clamp-2">{resign.reason || '-'}</p>
                                                </div>

                                                <div className="mt-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Catatan Admin</p>
                                                    <p className="text-sm dark:text-gray-100 line-clamp-1">{resign.admin_notes || '-'}</p>
                                                </div>

                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        onClick={() => openRespondModal(resign)}
                                                        className="text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1 border border-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    >
                                                        Kelola
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
                                                    Tanggal Resign
                                                </th>
                                                <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Alasan
                                                </th>
                                                <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Catatan Admin
                                                </th>
                                                <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {resignations.data.map((resign) => (
                                                <tr key={resign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {resign.employee ? resign.employee.name : 'N/A'}
                                                    </td>
                                                    <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                        {resign.employee ? resign.employee.nik : 'N/A'}
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                        {moment(resign.tanggal).format('DD MMM YYYY')}
                                                    </td>
                                                    <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                        <div className="max-w-xs truncate">{resign.reason || '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(resign.status)}`}>
                                                            {resign.status.charAt(0).toUpperCase() + resign.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                        <div className="max-w-xs truncate">{resign.admin_notes || '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => openRespondModal(resign)}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-600 text-xs sm:text-sm px-3 py-1 border border-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                        >
                                                            Kelola
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-600 dark:text-gray-300 text-center py-4">Belum ada pengajuan resign ditemukan.</p>
                            )}

                            {/* Pagination */}
                            <div className="mt-4 flex flex-wrap justify-center">
                                {resignations.links.map((link, index) => (
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Respond Resign Modal */}
            {showRespondModal && selectedResign && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="relative p-4 sm:p-8 bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-lg shadow-lg">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Kelola Pengajuan Resign</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Karyawan: {selectedResign.employee ? selectedResign.employee.name : 'N/A'}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">NIK: {selectedResign.employee ? selectedResign.employee.nik : 'N/A'}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Tanggal Resign: {moment(selectedResign.tanggal).format('DD MMMM YYYY')}</p>
                        
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Resign:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedResign.reason}</p>
                        </div>

                        <form onSubmit={submitResponse}>
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
        </AuthenticatedLayout>
    );
}