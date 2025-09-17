import React, { useState, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

dayjs.extend(localizedFormat);
dayjs.locale('id');

const LunchCouponsIndex = () => {
    const { schedules, filters, totalCoupons, lunchCoupons = {}, links } = usePage().props;
    const [date, setDate] = useState(filters.date || dayjs().format('YYYY-MM-DD'));
    const [isLoading, setIsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedCoupons, setSelectedCoupons] = useState({});

    useEffect(() => {
        setDate(filters.date || dayjs().format('YYYY-MM-DD'));

        // Initialize selected coupons from existing lunch coupons
        const initialSelected = {};
        if (lunchCoupons) {
            Object.keys(lunchCoupons).forEach(scheduleId => {
                initialSelected[scheduleId] = true;
            });
        }
        setSelectedCoupons(initialSelected);
    }, [filters, lunchCoupons]);

    const applyFilters = async () => {
        setIsLoading(true);
        try {
            await router.get(route('lunch-coupons.index'), {
                date: date,
            }, {
                preserveState: true,
                preserveScroll: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const clearFilters = () => {
        setDate(dayjs().format('YYYY-MM-DD'));
        router.get(route('lunch-coupons.index'), {
            date: '',
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleCheckboxChange = (scheduleId) => {
        setSelectedCoupons(prev => ({
            ...prev,
            [scheduleId]: !prev[scheduleId]
        }));
    };

    const saveCoupons = async (dateGroup) => {
        setSaving(true);
        try {
            const selectedScheduleIds = Object.keys(selectedCoupons)
                .filter(id => selectedCoupons[id])
                .map(id => parseInt(id));

            await router.post(route('lunch-coupons.store'), {
                date: dateGroup.date,
                schedule_ids: selectedScheduleIds
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    // Show success message
                    alert('Coupons saved successfully!');
                }
            });
        } finally {
            setSaving(false);
        }
    };

    // Pagination handler
    const handlePagination = (url) => {
        if (url) {
            setIsLoading(true);
            router.visit(url, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsLoading(false)
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Lunch Coupon Management
                </h2>
            }
        >
            <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="mb-6 text-center text-2xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-3xl">
                    Lunch Coupon Tracking
                </h1>

                <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
                    <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
                        <div className="flex-1">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Date:
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                        <div className="flex items-end space-x-2">
                            <button
                                onClick={applyFilters}
                                disabled={isLoading}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-700 dark:focus:ring-offset-gray-800"
                            >
                                {isLoading ? 'Loading...' : 'Filter'}
                            </button>
                            <button
                                onClick={clearFilters}
                                className="rounded-md bg-gray-500 px-4 py-2 text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 hover:bg-gray-600 dark:focus:ring-offset-gray-800"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-8 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
                    <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 sm:text-xl">
                            Total Lunch Coupons Needed
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {totalCoupons}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">coupons</span>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                )}

                {schedules.data && schedules.data.length === 0 ? (
                    <div className="rounded-md border-l-4 border-blue-500 bg-blue-100 p-4 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200" role="alert">
                        <p className="font-bold">Information:</p>
                        <p>No scheduled employees found for the selected date.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {(schedules.data ? schedules.data : schedules).map((dateGroup) => (
                            <div key={dateGroup.date} className="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
                                <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                        {dateGroup.display_date}
                                    </h2>
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                        {dateGroup.employee_count} employees
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 sm:px-6">
                                                    Select
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 sm:px-6">
                                                    Name
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 sm:px-6">
                                                    NIK
                                                </th>
                                                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 sm:table-cell sm:px-6">
                                                    Shift
                                                </th>
                                                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 md:table-cell sm:px-6">
                                                    Sub-Section
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {dateGroup.schedules.map((schedule) => (
                                                <tr key={schedule.id}>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 sm:px-6">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedCoupons[schedule.id]}
                                                            onChange={() => handleCheckboxChange(schedule.id)}
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 sm:px-6">
                                                        {schedule.employee?.name || 'N/A'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300 sm:px-6">
                                                        {schedule.employee?.nik || 'N/A'}
                                                    </td>
                                                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300 sm:table-cell sm:px-6">
                                                        {schedule.man_power_request?.shift?.name || 'N/A'}
                                                    </td>
                                                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300 md:table-cell sm:px-6">
                                                        {schedule.sub_section?.name || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            Total for this day:
                                        </span>
                                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                            {dateGroup.employee_count}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => saveCoupons(dateGroup)}
                                        disabled={saving}
                                        className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 hover:bg-green-700 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                                    >
                                        {saving ? 'Saving...' : 'Save Coupons'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination Component */}
                {schedules.data && links && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Showing <span className="font-medium">{schedules.from}</span> to <span className="font-medium">{schedules.to}</span> of{' '}
                            <span className="font-medium">{schedules.total}</span> results
                        </div>
                        <div className="flex space-x-2">
                            {links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePagination(link.url)}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                                        link.active
                                            ? 'bg-indigo-600 text-white'
                                            : link.url
                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
};

export default LunchCouponsIndex;