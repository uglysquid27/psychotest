import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';

export default function History({ changes }) {
    const getStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        
        const labels = {
            pending: 'Menunggu',
            approved: 'Disetujui',
            rejected: 'Ditolak',
        };
        
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Riwayat Perubahan Rekening
                    </h2>
                    <Link
                        href={route('employee.bank-account-change.create')}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Ajukan Perubahan Baru
                    </Link>
                </div>
            }
        >
            <Head title="Riwayat Perubahan Rekening" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            {/* Info Card */}
                            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-700">
                                            Berikut adalah riwayat permohonan perubahan rekening bank Anda. Status akan diperbarui setelah admin menyetujui atau menolak permohonan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tanggal
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rekening Lama
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rekening Baru
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Keterangan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {changes.data.map((change) => (
                                            <tr key={change.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(change.created_at)}</div>
                                                    {change.approved_at && (
                                                        <div className="text-xs text-gray-500">
                                                            Disetujui: {formatDate(change.approved_at)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {change.old_account_number || '-'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {change.old_bank || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 font-medium">
                                                        {change.new_account_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {change.new_bank}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(change.status)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {change.remarks || '-'}
                                                    </div>
                                                    {change.status === 'approved' && (
                                                        <a
                                                            href={route('admin.bank-account-changes.pdf', change.id)}
                                                            className="inline-flex items-center mt-1 text-xs text-green-600 hover:text-green-900"
                                                            target="_blank"
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Unduh Pernyataan
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <Pagination links={changes.links} className="mt-6" />

                            {/* Empty State */}
                            {changes.data.length === 0 && (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada riwayat</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Anda belum pernah mengajukan perubahan rekening.
                                    </p>
                                    <div className="mt-6">
                                        <Link
                                            href={route('employee.bank-account-change.create')}
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            Ajukan Perubahan Pertama
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {changes.total}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Permohonan
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-semibold text-green-900">
                                        {changes.data.filter(c => c.status === 'approved').length}
                                    </div>
                                    <div className="text-sm text-green-600">
                                        Disetujui
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-semibold text-yellow-900">
                                        {changes.data.filter(c => c.status === 'pending').length}
                                    </div>
                                    <div className="text-sm text-yellow-600">
                                        Menunggu
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}