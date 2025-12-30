import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function BankAccountChangeIndex({ auth, changes, filters, statusOptions }) {
    const [selectedChanges, setSelectedChanges] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Search and filter functions
    const handleSearch = (e) => {
        const value = e.target.value;
        router.get(route('employee.bank-account-change.index'), 
            { search: value, status: filters.status }, 
            { preserveState: true }
        );
    };

    const handleStatusFilter = (status) => {
        router.get(route('employee.bank-account-change.index'), 
            { search: filters.search, status: status }, 
            { preserveState: true }
        );
    };

    const handleBulkApprove = () => {
        if (selectedChanges.length === 0) return;
        if (confirm(`Apakah Anda yakin ingin menyetujui ${selectedChanges.length} permohonan?`)) {
            selectedChanges.forEach(id => {
                router.post(route('employee.bank-account-change.update-status', id), {
                    status: 'approved',
                    remarks: 'Disetujui secara massal'
                }, {
                    preserveState: true,
                    onSuccess: () => {
                        setSelectedChanges([]);
                        setShowBulkActions(false);
                    }
                });
            });
        }
    };

    const handleBulkReject = () => {
        if (selectedChanges.length === 0) return;
        const remarks = prompt('Masukkan alasan penolakan untuk semua permohonan terpilih:');
        if (remarks !== null) {
            selectedChanges.forEach(id => {
                router.post(route('employee.bank-account-change.update-status', id), {
                    status: 'rejected',
                    remarks: remarks
                }, {
                    preserveState: true,
                    onSuccess: () => {
                        setSelectedChanges([]);
                        setShowBulkActions(false);
                    }
                });
            });
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = changes.data.map(change => change.id);
            setSelectedChanges(allIds);
            setShowBulkActions(true);
        } else {
            setSelectedChanges([]);
            setShowBulkActions(false);
        }
    };

    const toggleSelectChange = (id) => {
        setSelectedChanges(prev => {
            const newSelection = prev.includes(id) 
                ? prev.filter(changeId => changeId !== id)
                : [...prev, id];
            
            setShowBulkActions(newSelection.length > 0);
            return newSelection;
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Menunggu';
            case 'approved': return 'Disetujui';
            case 'rejected': return 'Ditolak';
            default: return status;
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Daftar Permohonan Ganti Rekening
                </h2>
            }
        >
            <Head title="Daftar Permohonan Ganti Rekening" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {/* Header with filters */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Semua Permohonan Ganti Rekening</h3>
                                    <p className="text-sm text-gray-600">
                                        Total: {changes.total} permohonan
                                    </p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    {/* Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Cari NIK/Nama..."
                                            defaultValue={filters.search || ''}
                                            onChange={handleSearch}
                                            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    {/* Status filter */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStatusFilter('all')}
                                            className={`px-3 py-2 rounded-md text-sm ${!filters.status || filters.status === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                        >
                                            Semua
                                        </button>
                                        {Object.entries(statusOptions).map(([value, label]) => (
                                            <button
                                                key={value}
                                                onClick={() => handleStatusFilter(value)}
                                                className={`px-3 py-2 rounded-md text-sm ${filters.status === value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {showBulkActions && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm font-medium text-blue-800">
                                                {selectedChanges.length} permohonan dipilih
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleBulkApprove}
                                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center gap-1"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Setujui Massal
                                            </button>
                                            <button
                                                onClick={handleBulkReject}
                                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center gap-1"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Tolak Massal
                                            </button>
                                            <button
                                                onClick={() => setSelectedChanges([])}
                                                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleSelectAll}
                                                    checked={selectedChanges.length === changes.data.length && changes.data.length > 0}
                                                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                />
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                NIK
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nama Karyawan
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rekening Lama
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rekening Baru
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tanggal Pengajuan
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {changes.data.map((change) => (
                                            <tr key={change.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChanges.includes(change.id)}
                                                        onChange={() => toggleSelectChange(change.id)}
                                                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {change.nik}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {change.employee?.name || 'N/A'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {change.employee?.section || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {change.old_account_number || '-'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {change.old_bank || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {change.new_account_number}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {change.new_bank}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(change.status)}`}>
                                                        {getStatusText(change.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(change.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {/* View Details Button */}
                                                        <Link
                                                            href={route('employee.bank-account-change.show', change.id)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Lihat Detail"
                                                        >
                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </Link>
                                                        
                                                        {/* Download PDF Button (only for approved) */}
                                                        {change.status === 'approved' && (
                                                            <a
                                                                href={route('employee.bank-account-change.generate-pdf', change.id)}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Download PDF"
                                                                target="_blank"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Empty State */}
                            {changes.data.length === 0 && (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada permohonan</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {filters.search || filters.status !== 'all' 
                                            ? 'Tidak ada permohonan yang sesuai dengan filter' 
                                            : 'Belum ada permohonan perubahan rekening'}
                                    </p>
                                </div>
                            )}

                            {/* Pagination */}
                            {changes.data.length > 0 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        Menampilkan <span className="font-medium">{changes.from}</span> sampai <span className="font-medium">{changes.to}</span> dari <span className="font-medium">{changes.total}</span> permohonan
                                    </div>
                                    <div className="flex space-x-2">
                                        {changes.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                                className={`px-3 py-1 text-sm rounded-md ${
                                                    link.active 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}