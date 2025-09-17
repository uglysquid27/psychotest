import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useState } from 'react';

dayjs.locale('id');

export default function SuratResignIndex({ auth, resignations, authenticatedEmployee }) {
    const isEmployeeLoggedIn = !!authenticatedEmployee;

    const formatDateForMobile = (date) => {
        return dayjs(date).format('DD/MM');
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    {isEmployeeLoggedIn ? 'Surat Resign Saya' : 'Daftar Surat Resign'}
                </h2>
            }
        >
            <Head title={isEmployeeLoggedIn ? 'Surat Resign Saya' : 'Daftar Surat Resign'} />

            <div className="py-4 sm:py-8 lg:py-12">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-4 sm:p-6 text-gray-900">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                <h3 className="text-lg font-bold">
                                    {isEmployeeLoggedIn ? 'Daftar Pengajuan Resign Saya' : 'Daftar Pengajuan Resign Karyawan'}
                                </h3>
                                <Link
                                    href={route('employee.resign.create')}
                                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-center text-sm sm:text-base"
                                >
                                    Ajukan Resign Baru
                                </Link>
                            </div>

            {resignations.data.length > 0 ? (
                <div className="overflow-x-auto">
                    {/* Mobile Cards View */}
                    <div className="sm:hidden space-y-3">
                        {resignations.data.map((resign) => (
                            <div key={resign.id} className="border rounded-lg p-3 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-sm">ID: {resign.id}</p>
                                        {!isEmployeeLoggedIn && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                {resign.employee ? `${resign.employee.name} (${resign.employee.nik})` : 'N/A'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Tanggal Resign</p>
                                        <p className="text-sm">
                                            {formatDateForMobile(resign.resign_date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Tanggal Pengajuan</p>
                                        <p className="text-sm">
                                            {formatDateForMobile(resign.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <p className="text-xs text-gray-500">Alasan Resign</p>
                                    <p className="text-sm line-clamp-2">{resign.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <table className="hidden sm:table min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                {!isEmployeeLoggedIn && (
                                    <th scope="col" className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Karyawan
                                    </th>
                                )}
                                <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tanggal Resign
                                </th>
                                <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tanggal Pengajuan
                                </th>
                                <th scope="col" className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Alasan Resign
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {resignations.data.map((resign) => (
                                <tr key={resign.id}>
                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                        {resign.id}
                                    </td>
                                    {!isEmployeeLoggedIn && (
                                        <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {resign.employee ? `${resign.employee.name} (${resign.employee.nik})` : 'N/A'}
                                        </td>
                                    )}
                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                        {dayjs(resign.resign_date).format('DD MMM YYYY')}
                                    </td>
                                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                        {dayjs(resign.created_at).format('DD MMM YYYY')}
                                    </td>
                                    <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                        <div className="max-w-xs truncate">{resign.reason}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600 text-center py-4">Belum ada pengajuan resign.</p>
            )}

            {/* Pagination Links */}
            <div className="mt-4 flex flex-wrap justify-center">
                {resignations.links.map((link, index) => (
                    <Link
                        key={index}
                        href={link.url || '#'}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        className={`px-2 py-1 mx-0.5 sm:px-3 sm:py-1 sm:mx-1 rounded-md text-xs sm:text-sm
                            ${link.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                            ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    />
                ))}
            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}