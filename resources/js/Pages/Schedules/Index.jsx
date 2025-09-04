import React, { useState, useEffect, useMemo } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isBetween from 'dayjs/plugin/isBetween';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

dayjs.extend(localizedFormat);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isBetween);
dayjs.locale('id');

const ShiftDetailModal = ({ shift, onClose }) => {
    if (!shift) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 mx-2">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    aria-label="Close"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Detail Shift: {shift.name}</h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong>Nama Shift:</strong> {shift.name}</p>
                    <p><strong>Waktu Mulai:</strong> {shift.start_time}</p>
                    <p><strong>Waktu Selesai:</strong> {shift.end_time}</p>
                    <p><strong>Total Jam:</strong> {shift.hours} jam</p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManPowerRequestDetailModal = ({ request, assignedEmployees, onClose }) => {
    if (!request) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('dddd, DD MMMM YYYY');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 mx-2">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    aria-label="Close"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Detail Man Power Request</h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong>Tanggal Dibutuhkan:</strong> {formatDate(request.date)}</p>
                    <p><strong>Sub Section:</strong> {request.sub_section?.name || 'N/A'}</p>
                    <p><strong>Section:</strong> {request.sub_section?.section?.name || 'N/A'}</p>
                    <p><strong>Shift:</strong> {request.shift?.name || 'N/A'}</p>
                    <p><strong>Jumlah Diminta:</strong> {request.requested_amount}</p>
                    <p><strong>Status:</strong> {request.status}</p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

const ScheduleSection = ({ title, schedulesByShift, date, subSectionId, currentVisibility }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'accepted':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Diterima</span>;
            case 'rejected':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Ditolak</span>;
            case 'pending':
                return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Menunggu</span>;
            default:
                return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Unknown</span>;
        }
    };

const toggleVisibility = () => {
    router.post(
        route("schedules.toggle-visibility-group"),
        {
            date: date,
            sub_section_id: subSectionId,
            visibility: currentVisibility === "public" ? "private" : "public",
        },
        {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                // You might want to add a success message or refresh the data
            },
            onError: (errors) => {
                console.error('Error toggling visibility:', errors);
            }
        }
    );
};

    const openEyeSVG = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );

    const closedEyeSVG = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-5.12M6.1 6.1A9.956 9.956 0 002 12c1.274 4.057 5.064 7 10 7 1.42 0 2.77-.296 3.96-.83M17.9 17.9A9.956 9.956 0 0022 12a9.956 9.956 0 00-4.1-5.9" />
        </svg>
    );

    return (
        <div className="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
            
            {Object.keys(schedulesByShift).length === 0 ? (
                <p className="italic text-gray-600 dark:text-gray-400">Tidak ada penjadwalan di bagian ini.</p>
            ) : (
                Object.entries(schedulesByShift).map(([shiftName, shiftData]) => (
                    <div key={shiftName} className="mb-6">
                        <h3 className="text-md font-medium text-blue-700 dark:text-blue-400 mb-2">Shift {shiftName}</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Nama</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">NIK</th>
                                        <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300 sm:table-cell">Sub-Section</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {shiftData.schedules.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.employee.name}</td>
                                            <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.employee.nik}</td>
                                            <td className="hidden px-3 py-2 text-sm text-gray-700 dark:text-gray-300 sm:table-cell">{item.sub_section?.name || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                {getStatusBadge(item.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            {Object.keys(schedulesByShift).length > 0 && (
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Visibility: <strong>{currentVisibility}</strong>
                    </span>
                    <button
                        onClick={toggleVisibility}
                        className="rounded-md p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900"
                        title="Toggle Visibility"
                    >
                        {currentVisibility === 'public' ? openEyeSVG : closedEyeSVG}
                    </button>
                </div>
            )}
        </div>
    );
};

const Index = () => {
    const { schedules, filters } = usePage().props;
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const itemsPerPage = 3;

    useEffect(() => {
        setStartDate(filters.start_date || '');
        setEndDate(filters.end_date || '');
        setCurrentPage(1);
    }, [filters]);

    const groupedSchedulesByDateDivisionShift = useMemo(() => {
        return schedules.reduce((acc, schedule) => {
            const dateKey = dayjs(schedule.date).format('YYYY-MM-DD');
            const displayDate = dayjs(schedule.date).format('dddd, DD MMMM YYYY');
            const divisionName = schedule.man_power_request.sub_section.section.name;
            const subSectionName = schedule.man_power_request.sub_section.name;
            const shiftName = schedule.man_power_request.shift.name;
            const subSectionId = schedule.man_power_request.sub_section.id;
            const visibility = schedule.visibility;

            if (!acc[dateKey]) {
                acc[dateKey] = { displayDate, divisions: {} };
            }
            if (!acc[dateKey].divisions[divisionName]) {
                acc[dateKey].divisions[divisionName] = { subSections: {} };
            }
            if (!acc[dateKey].divisions[divisionName].subSections[subSectionName]) {
                acc[dateKey].divisions[divisionName].subSections[subSectionName] = {
                    subSectionId,
                    shifts: {},
                    visibility: visibility, // Use the first schedule's visibility as the group visibility
                };
            }
            if (!acc[dateKey].divisions[divisionName].subSections[subSectionName].shifts[shiftName]) {
                acc[dateKey].divisions[divisionName].subSections[subSectionName].shifts[shiftName] = {
                    schedules: [],
                };
            }
            acc[dateKey].divisions[divisionName].subSections[subSectionName].shifts[shiftName].schedules.push(schedule);
            
            return acc;
        }, {});
    }, [schedules]);

    const sortedDates = useMemo(() =>
        Object.keys(groupedSchedulesByDateDivisionShift).sort((a, b) =>
            dayjs(b).valueOf() - dayjs(a).valueOf()
        ), [groupedSchedulesByDateDivisionShift]);

    const totalPages = Math.ceil(sortedDates.length / itemsPerPage);
    const paginatedDates = sortedDates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const applyFilters = async () => {
        if (startDate && endDate) {
            const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day');
            if (daysDiff > 30) {
                alert('Maksimal 30 hari');
                return;
            }
        }
        setIsLoading(true);
        try {
            await router.get(route('schedules.index'), { start_date: startDate, end_date: endDate }, {
                preserveState: true, preserveScroll: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('schedules.index'), {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Agenda Penjadwalan</h2>}>
            <div className="mx-auto mt-4 max-w-7xl px-4">
                <h1 className="mb-6 text-center text-2xl font-extrabold text-gray-900 dark:text-gray-100">Agenda Penjadwalan</h1>

                <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
                    <div className="flex flex-col md:flex-row md:space-x-4">
                        <div className="flex-1">
                            <label htmlFor="startDate" className="block text-sm font-medium">Dari Tanggal:</label>
                            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="endDate" className="block text-sm font-medium">Sampai Tanggal:</label>
                            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
                        </div>
                        <div className="flex space-x-2 mt-4 md:mt-6">
                            <button onClick={applyFilters} className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Filter</button>
                            <button onClick={clearFilters} className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Clear</button>
                        </div>
                    </div>
                </div>

                {isLoading && <div className="p-4">Memuat...</div>}

                {paginatedDates.map(dateKey => {
                    const dateData = groupedSchedulesByDateDivisionShift[dateKey];
                    const divisionsForDate = dateData.divisions;
                    const divisionCount = Object.keys(divisionsForDate).length;
                    
                    let gridClasses = "grid gap-6 mb-8";
                    if (divisionCount === 1) {
                        gridClasses += " grid-cols-1";
                    } else if (divisionCount === 2) {
                        gridClasses += " grid-cols-1 md:grid-cols-2";
                    } else {
                        gridClasses += " grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
                    }
                    
                    return (
                        <div key={dateKey}>
                            <h2 className="mb-4 bg-gray-100 p-3 text-xl font-bold">{dateData.displayDate}</h2>
                            <div className={gridClasses}>
                                {Object.entries(divisionsForDate).map(([divisionName, divisionData]) => (
                                    Object.entries(divisionData.subSections).map(([subSectionName, subSectionData]) => (
                                        <ScheduleSection
                                            key={`${dateKey}-${subSectionName}`}
                                            title={`${divisionName} - ${subSectionName}`}
                                            schedulesByShift={subSectionData.shifts}
                                            date={dateKey}
                                            subSectionId={subSectionData.subSectionId}
                                            currentVisibility={subSectionData.visibility}
                                        />
                                    ))
                                ))}
                            </div>
                        </div>
                    );
                })}

                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center">
                        <nav className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Previous
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                                        currentPage === page
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
};

export default Index;