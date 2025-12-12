import React, { useState, useEffect, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
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

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-90">
      <div className="text-center">
        <motion.div
          className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          className="text-lg font-medium text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        >
          Memuat Jadwal...
        </motion.p>
      </div>
    </div>
  );
};

const ContentLoadingSkeleton = () => {
  return (
    <div className="min-h-screen dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto py-6">
        {/* Welcome Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Filter Section Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, index) => (
              <div key={index}>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index}>
              {/* Date Header Skeleton */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 mb-6">
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mx-auto animate-pulse"></div>
              </div>

              {/* Section Skeleton */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
                  </div>
                </div>

                {/* Shifts Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, shiftIndex) => (
                    <div key={shiftIndex} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="mb-3 space-y-2">
                        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div>
                        <div className="flex justify-center gap-2">
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, rowIndex) => (
                          <div key={rowIndex} className="flex justify-between">
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScheduleTableSection = ({ title, shifts, date, sectionId, currentVisibility, user, onToggleVisibility, isAnyExpanded, onExpand, lastUpdate }) => {
    const [expandedSection, setExpandedSection] = useState(false);
    const [coworkersData, setCoworkersData] = useState(null);
    const [loadingCoworkers, setLoadingCoworkers] = useState(false);

    const formatTime = (timeString) => {
        if (!timeString || timeString === 'NULL' || timeString === 'null') return 'N/A';
        try {
            const timeParts = timeString.split(':');
            if (timeParts.length >= 2) {
                const hours = timeParts[0].padStart(2, '0');
                const minutes = timeParts[1].padStart(2, '0');
                return `${hours}:${minutes}`;
            }
            return 'N/A';
        } catch (error) {
            return 'N/A';
        }
    };

    const getStatusBadge = (status, rejectionReason) => {
        switch (status) {
            case 'accepted':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-md">Diterima</span>;
            case 'rejected':
                return (
                    <div className="flex flex-col">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-md">Ditolak</span>
                        {rejectionReason && (
                            <span className="text-xs text-red-500 italic mt-1">"{rejectionReason}"</span>
                        )}
                    </div>
                );
            case 'pending':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500 text-white shadow-md">Menunggu</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-md">Unknown</span>;
        }
    };

    const fetchSameDayEmployees = async () => {
        // Close other expanded sections first
        if (isAnyExpanded && onExpand) {
            onExpand();
        }

        if (expandedSection) {
            setExpandedSection(false);
            setCoworkersData(null);
            return;
        }

        setLoadingCoworkers(true);
        setExpandedSection(true);
        
        try {
        // Combine all shifts data for this section
        const allTimeGroups = {};
        
        Object.values(shifts).forEach(shiftData => {
            shiftData.schedules.forEach(schedule => {
                const startTime = schedule.man_power_request?.start_time || 'N/A';
                const endTime = schedule.man_power_request?.end_time || 'N/A';
                const shiftName = schedule.man_power_request?.shift?.name || 'N/A';
                const timeKey = `${shiftName}-${startTime}-${endTime}`;
                
                if (!allTimeGroups[timeKey]) {
                    allTimeGroups[timeKey] = {
                        shift_name: shiftName,
                        start_time: startTime,
                        end_time: endTime,
                        employees: [],
                        shift_order: getShiftOrder(shiftName) // Add order for sorting
                    };
                }
                
                allTimeGroups[timeKey].employees.push({
                    id: schedule.id,
                    employee: schedule.employee,
                    // FIX: Get sub_section from man_power_request.sub_section
                    sub_section: schedule.man_power_request?.sub_section?.name || 'N/A',
                    line: schedule.line,
                    status: schedule.status,
                    rejection_reason: schedule.rejection_reason
                });
            });
        });

        // Sort time groups by shift order (pagi -> siang -> malam)
        const sortedTimeGroups = Object.entries(allTimeGroups)
            .sort(([,a], [,b]) => {
                // First sort by shift order
                if (a.shift_order !== b.shift_order) {
                    return a.shift_order - b.shift_order;
                }
                
                // Then by shift name
                const shiftCompare = a.shift_name.localeCompare(b.shift_name);
                if (shiftCompare !== 0) return shiftCompare;
                
                // Then by start time
                if (a.start_time === 'N/A') return 1;
                if (b.start_time === 'N/A') return -1;
                return a.start_time.localeCompare(b.start_time);
            })
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});

        const mockCoworkersData = {
            section_name: title,
            timeGroups: sortedTimeGroups,
            last_updated: Date.now()
        };
        
        setCoworkersData(mockCoworkersData);
    } catch (error) {
        console.error('Failed to fetch coworkers:', error);
    } finally {
        setLoadingCoworkers(false);
    }
    };

    // Helper to get shift order
    const getShiftOrder = (shiftName) => {
    const lowerShiftName = shiftName.toLowerCase();
    if (lowerShiftName.includes('pagi')) return 1;
    if (lowerShiftName.includes('siang')) return 2;
    if (lowerShiftName.includes('malam')) return 3;
    return 4; 
};

   useEffect(() => {
    if (expandedSection && coworkersData) {
        // Re-fetch the same day employees with updated data
        const allTimeGroups = {};
        
        Object.values(shifts).forEach(shiftData => {
            shiftData.schedules.forEach(schedule => {
                const startTime = schedule.man_power_request?.start_time || 'N/A';
                const endTime = schedule.man_power_request?.end_time || 'N/A';
                const shiftName = schedule.man_power_request?.shift?.name || 'N/A';
                const timeKey = `${shiftName}-${startTime}-${endTime}`;
                
                if (!allTimeGroups[timeKey]) {
                    allTimeGroups[timeKey] = {
                        shift_name: shiftName,
                        start_time: startTime,
                        end_time: endTime,
                        employees: [],
                        shift_order: getShiftOrder(shiftName)
                    };
                }
                
                allTimeGroups[timeKey].employees.push({
                    id: schedule.id,
                    employee: schedule.employee,
                    // FIX: Get sub_section from man_power_request.sub_section
                    sub_section: schedule.man_power_request?.sub_section?.name || 'N/A',
                    line: schedule.line,
                    status: schedule.status,
                    rejection_reason: schedule.rejection_reason
                });
            });
        });

        // Sort by shift order (pagi -> siang -> malam)
        const sortedTimeGroups = Object.entries(allTimeGroups)
            .sort(([,a], [,b]) => {
                if (a.shift_order !== b.shift_order) {
                    return a.shift_order - b.shift_order;
                }
                
                const shiftCompare = a.shift_name.localeCompare(b.shift_name);
                if (shiftCompare !== 0) return shiftCompare;
                
                if (a.start_time === 'N/A') return 1;
                if (b.start_time === 'N/A') return -1;
                return a.start_time.localeCompare(b.start_time);
            })
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});

        setCoworkersData({
            section_name: title,
            timeGroups: sortedTimeGroups,
            last_updated: Date.now()
        });
    }
}, [shifts, lastUpdate, expandedSection]);

    // Calculate summary for each shift
    const getShiftSummary = (shiftData) => {
        const totalEmployees = shiftData.schedules.length;
        const acceptedCount = shiftData.schedules.filter(s => s.status === 'accepted').length;
        const rejectedCount = shiftData.schedules.filter(s => s.status === 'rejected').length;
        const pendingCount = shiftData.schedules.filter(s => s.status === 'pending').length;

        return {
            totalEmployees,
            acceptedCount,
            rejectedCount,
            pendingCount
        };
    };

    // Calculate total for entire section
    const getSectionSummary = () => {
        let totalEmployees = 0;
        let acceptedCount = 0;
        let rejectedCount = 0;
        let pendingCount = 0;

        Object.values(shifts).forEach(shiftData => {
            totalEmployees += shiftData.schedules.length;
            acceptedCount += shiftData.schedules.filter(s => s.status === 'accepted').length;
            rejectedCount += shiftData.schedules.filter(s => s.status === 'rejected').length;
            pendingCount += shiftData.schedules.filter(s => s.status === 'pending').length;
        });

        return {
            totalEmployees,
            acceptedCount,
            rejectedCount,
            pendingCount
        };
    };

    const sectionSummary = getSectionSummary();
    const shiftEntries = Object.entries(shifts);
    const shiftCount = shiftEntries.length;

    // Dynamic grid classes based on shift count
    const getGridClasses = () => {
        switch (shiftCount) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-1 md:grid-cols-2';
            case 3:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
            case 4:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
            default:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 mb-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Total Section: {sectionSummary.totalEmployees} orang • 
                        Diterima: {sectionSummary.acceptedCount} • 
                        Ditolak: {sectionSummary.rejectedCount} • 
                        Menunggu: {sectionSummary.pendingCount}
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Same Day Button */}
                    <button
                        onClick={fetchSameDayEmployees}
                        disabled={loadingCoworkers}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-colors"
                    >
                        {loadingCoworkers ? (
                            <span className="flex items-center gap-1">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </span>
                        ) : (
                            expandedSection ? 'Tutup' : 'List Karyawan'
                        )}
                    </button>

                    {/* Visibility Toggle - Admin Only */}
                    {user?.role === 'admin' && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Visibility: <strong className="text-gray-900 dark:text-white">{currentVisibility}</strong>
                            </span>
                            <button
                                onClick={onToggleVisibility}
                                className="bg-indigo-600 hover:indigo-700 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-md transition-colors"
                            >
                                {currentVisibility === 'public' ? 'Set Private' : 'Set Public'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {shiftEntries.length === 0 ? (
                <p className="italic text-gray-600 dark:text-gray-400 text-center py-4">
                    Tidak ada penjadwalan di bagian ini.
                </p>
            ) : (
                <div className={`grid ${getGridClasses()} gap-4`}>
                    {shiftEntries.map(([shiftName, shiftData]) => {
                        const summary = getShiftSummary(shiftData);

                        return (
                            <div key={shiftName} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-700">
                                {/* Shift Header */}
                                <div className="mb-3">
                                    <h3 className="text-md font-semibold text-blue-700 dark:text-blue-400 text-center">
                                        {shiftName}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-1">
                                        {summary.totalEmployees} orang
                                    </p>
                                    <div className="flex justify-center gap-2 mt-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white">
                                            {summary.acceptedCount}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white">
                                            {summary.rejectedCount}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500 text-white">
                                            {summary.pendingCount}
                                        </span>
                                    </div>
                                </div>

                                {/* Shift Summary Table */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-white">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                    Sub Bagian
                                                </th>
                                                <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {(() => {
                                                // Group by sub-section from man_power_request
                                                const subSectionGroups = shiftData.schedules.reduce((acc, schedule) => {
                                                    // FIX: Get sub_section from man_power_request.sub_section
                                                    const subSection = schedule.man_power_request?.sub_section?.name || 'N/A';
                                                    if (!acc[subSection]) {
                                                        acc[subSection] = 0;
                                                    }
                                                    acc[subSection]++;
                                                    return acc;
                                                }, {});

                                                return Object.entries(subSectionGroups)
                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                    .map(([subSection, total]) => (
                                                        <tr key={subSection} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                {subSection}
                                                            </td>
                                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-center font-semibold text-gray-900 dark:text-white">
                                                                {total}
                                                            </td>
                                                        </tr>
                                                    ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Expanded Coworkers View - All Shifts Combined */}
            {expandedSection && coworkersData && (
                <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-700 overflow-hidden">
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-blue-600 dark:bg-blue-700 p-4 z-10 shadow-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-lg font-semibold text-white">
                                    Karyawan - {title} - Total: {sectionSummary.totalEmployees} orang
                                </h4>
                                <p className="text-blue-200 text-sm mt-1">
                                    Auto-update terakhir: {dayjs(coworkersData.last_updated).format('HH:mm:ss')}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setExpandedSection(false);
                                    setCoworkersData(null);
                                }}
                                className="bg-white hover:bg-gray-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                    
                    {/* Content with padding */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 max-h-96 overflow-y-auto">
                        {/* Time Groups (by shift and time) */}
                        {Object.entries(coworkersData.timeGroups).map(([timeKey, timeData]) => (
                            <div key={timeKey} className="mb-6 last:mb-0">
                                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 text-sm border-b border-blue-200 dark:border-blue-700 pb-2">
                                    {timeData.shift_name} - {formatTime(timeData.start_time)} - {formatTime(timeData.end_time)} 
                                    <span className="text-blue-600 dark:text-blue-400 ml-2">
                                        ({timeData.employees.length} orang)
                                    </span>
                                </h5>
                                
                                {/* All employees in one table for this time group */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Nama</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">NIK</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Sub Bagian</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Line</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {timeData.employees.map((emp, index) => (
                                                <tr key={emp.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                        {emp.employee?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                        {emp.employee?.nik || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                        {emp.sub_section || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                        {emp.sub_section === 'Shrink' && emp.line ? `Shrink ${emp.line}` : emp.line || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        {getStatusBadge(emp.status, emp.rejection_reason)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Index = () => {
    const { filters, sections, subSections, auth, defaults } = usePage().props;
    const user = auth?.user;
    
    const [schedules, setSchedules] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    // Set initial state based on filters or defaults
    const [startDate, setStartDate] = useState(filters.start_date || defaults?.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || defaults?.end_date || '');
    const [selectedSection, setSelectedSection] = useState(filters.section || '');
    const [selectedSubSection, setSelectedSubSection] = useState(filters.sub_section || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSectionId, setExpandedSectionId] = useState(null);

    const itemsPerPage = 3;

    // Load schedule data after component mounts
useEffect(() => {
    const loadScheduleData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: startDate || '',
                end_date: endDate || '',
                section: selectedSection || '',
                sub_section: selectedSubSection || ''
            });
            
            const response = await fetch(`/schedules/data?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('Initial data loaded:', {
                filter: { startDate, endDate, selectedSection, selectedSubSection },
                scheduleCount: data.schedules?.length || 0,
                success: data.success
            });
            
            if (data.success) {
                setSchedules(data.schedules || []);
                setLastUpdate(data.last_updated);
            } else {
                console.error('API returned error:', data.error);
            }
        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setIsDataLoaded(true);
            setIsLoading(false);
        }
    };

    loadScheduleData();
}, []); // Empty dependency array - only run once on mount

     useEffect(() => {
        if (!isDataLoaded) return; // Don't run on initial load

        const loadFilteredData = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    start_date: startDate || '',
                    end_date: endDate || '',
                    section: selectedSection || '',
                    sub_section: selectedSubSection || ''
                });
                
                const response = await fetch(`/schedules/data?${params}`);
                const data = await response.json();
                
                if (data.success) {
                    setSchedules(data.schedules);
                    setLastUpdate(data.last_updated);
                    setCurrentPage(1); // Reset to first page
                }
            } catch (error) {
                console.error('Failed to load filtered schedule data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFilteredData();
    }, [startDate, endDate, selectedSection, selectedSubSection]);

useEffect(() => {
    if (!isDataLoaded || isLoading) return;

    const pollInterval = 15000; // 15 seconds
    
    const fetchUpdates = async () => {
        try {
            const params = new URLSearchParams({
                last_update: lastUpdate || '',
                start_date: startDate || '',
                end_date: endDate || '',
                section: selectedSection || '',
                sub_section: selectedSubSection || ''
            });
            
            console.log('Polling with params:', {
                lastUpdate,
                startDate,
                endDate,
                selectedSection,
                selectedSubSection
            });
            
            const response = await fetch(`/schedules/updates?${params}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            
            if (!response.ok) {
                console.error('Polling failed with status:', response.status);
                return;
            }
            
            const data = await response.json();
            
            console.log('Polling response:', {
                unchanged: data.unchanged,
                scheduleCount: data.schedules?.length || 0,
                success: data.success,
                error: data.error
            });
            
            // Only update if data actually changed
            if (data.success && !data.unchanged && data.last_updated !== lastUpdate) {
                setSchedules(data.schedules || []);
                setLastUpdate(data.last_updated);
                console.log('Schedule data updated with current filters');
            }
        } catch (error) {
            console.log('Background update failed:', error);
        }
    };

    const intervalId = setInterval(fetchUpdates, pollInterval);
    return () => clearInterval(intervalId);
}, [isDataLoaded, isLoading, lastUpdate, startDate, endDate, selectedSection, selectedSubSection]);

    // Define role-based section access
    const getAccessibleSections = () => {
        if (!user) return [];

        const userRole = user.role;
        
        // Admin can access all sections
        if (userRole === 'admin') {
            return sections;
        }

        // Define role-based section access
        const roleAccess = {
            'logistic': ['Finished goods', 'Delivery', 'Loader', 'Operator Forklift', 'Inspeksi', 'Produksi'],
            'rm/pm': ['RM/PM'],
            'fsb': ['Food & Snackbar'],
            'user': sections.map(section => section.name)
        };

        if (roleAccess[userRole]) {
            return sections.filter(section => 
                roleAccess[userRole].includes(section.name)
            );
        }

        return [];
    };

    const accessibleSections = getAccessibleSections();
    const isAdmin = user?.role === 'admin';

    const filteredSubSections = useMemo(() => {
        if (!selectedSection) return subSections;
        return subSections.filter(sub => sub.section_id == selectedSection);
    }, [selectedSection, subSections]);

    // Apply filters only for display - but polling always gets ALL data
    const filteredAndGroupedSchedules = useMemo(() => {
        if (!isDataLoaded) return {};

        let filteredSchedules = [...schedules];

        // Apply section filter for display only
        if (selectedSection) {
            filteredSchedules = filteredSchedules.filter(schedule => 
                schedule.man_power_request?.sub_section?.section_id == selectedSection
            );
        }

        // Apply sub-section filter for display only
        if (selectedSubSection) {
            filteredSchedules = filteredSchedules.filter(schedule => 
                schedule.man_power_request?.sub_section_id == selectedSubSection
            );
        }

        // Apply date filter for display only - FIXED: Simple date comparison
        if (startDate && endDate) {
            filteredSchedules = filteredSchedules.filter(schedule => {
                const scheduleDate = dayjs(schedule.date).format('YYYY-MM-DD');
                const filterStart = dayjs(startDate).format('YYYY-MM-DD');
                const filterEnd = dayjs(endDate).format('YYYY-MM-DD');
                
                return scheduleDate >= filterStart && scheduleDate <= filterEnd;
            });
        }

        // Group the filtered schedules for display
        return filteredSchedules.reduce((acc, schedule) => {
            const dateKey = dayjs(schedule.date).format('YYYY-MM-DD');
            const displayDate = dayjs(schedule.date).format('dddd, DD MMMM YYYY');
            const sectionName = schedule.man_power_request.sub_section.section.name;
            const sectionId = schedule.man_power_request.sub_section.section.id;
            const shiftName = schedule.man_power_request.shift.name;
            const visibility = schedule.visibility;

            // Filter schedules based on accessible sections
            const isSectionAccessible = accessibleSections.some(section => section.name === sectionName);
            if (!isSectionAccessible) return acc;

            if (!acc[dateKey]) {
                acc[dateKey] = { displayDate, sections: {} };
            }
            if (!acc[dateKey].sections[sectionName]) {
                acc[dateKey].sections[sectionName] = {
                    sectionId,
                    shifts: {},
                    visibility: visibility,
                };
            }
            if (!acc[dateKey].sections[sectionName].shifts[shiftName]) {
                acc[dateKey].sections[sectionName].shifts[shiftName] = {
                    schedules: [],
                };
            }
            acc[dateKey].sections[sectionName].shifts[shiftName].schedules.push(schedule);

            return acc;
        }, {});
    }, [schedules, selectedSection, selectedSubSection, startDate, endDate, accessibleSections, isDataLoaded]);

    const sortedDates = useMemo(() =>
    Object.keys(filteredAndGroupedSchedules).sort((a, b) =>
        dayjs(b).valueOf() - dayjs(a).valueOf()
    ), [filteredAndGroupedSchedules]);

    const totalPages = Math.ceil(sortedDates.length / itemsPerPage);
    const paginatedDates = sortedDates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const applyFilters = async () => {
        // No 30-day limit - users can select any date range
        setIsLoading(true);
        try {
            await router.get(route('schedules.index'), {
                start_date: startDate,
                end_date: endDate,
                section: selectedSection,
                sub_section: selectedSubSection
            }, {
                preserveState: true, 
                preserveScroll: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const clearFilters = () => {
    // Reset to default values: today-1month to today+2days
    const defaultStartDate = defaults?.start_date || dayjs().subtract(1, 'month').format('YYYY-MM-DD');
    const defaultEndDate = defaults?.end_date || dayjs().add(2, 'days').format('YYYY-MM-DD');
    
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedSection('');
    setSelectedSubSection('');
    
    setIsLoading(true);
    
    // Use router to update URL with default filters
    router.get(route('schedules.index'), {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        section: '',
        sub_section: ''
    }, { 
        preserveState: true, 
        preserveScroll: true,
        onStart: () => setIsLoading(true),
        onFinish: () => setIsLoading(false),
    });
};

    const handleToggleVisibility = async (date, sectionId, currentVisibility) => {
        try {
            await router.post(
                route("schedules.toggle-visibility-group"),
                {
                    date: date,
                    section_id: sectionId,
                    visibility: currentVisibility === "public" ? "private" : "public",
                    send_wa_notification: currentVisibility !== "public"
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                }
            );
        } catch (error) {
            console.error("Error toggling visibility:", error);
            alert("Gagal mengubah visibility");
        }
    };

    // Show loading skeleton while data is loading
    if (!isDataLoaded) {
        return (
            <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800 dark:text-white">Agenda Penjadwalan</h2>}>
                <ContentLoadingSkeleton />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800 dark:text-white">Agenda Penjadwalan</h2>}>
            <div className="min-h-screen dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto py-6">

                    {/* Welcome Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 tracking-wide text-indigo-900 dark:text-indigo-200">
                Agenda Penjadwalan
            </h3>
            <p className="text-base sm:text-lg md:text-xl font-light opacity-90 text-gray-600 dark:text-gray-300">
                {startDate && endDate ? (
                    <>
                        Menampilkan jadwal dari <span className="font-semibold">{dayjs(startDate).format('DD MMM YYYY')}</span> 
                        {' '}hingga <span className="font-semibold">{dayjs(endDate).format('DD MMM YYYY')}</span>
                        {' • '}Auto-update setiap 15 detik
                    </>
                ) : (
                    "Tampilan tabel seluruh jadwal karyawan • Auto-update setiap 15 detik"
                )}
            </p>
        </div>

                    {/* Filter Section - Only for Admin */}
                    {isAdmin && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filter Data</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dari Tanggal:</label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sampai Tanggal:</label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section:</label>
                                    <select
                                        id="section"
                                        value={selectedSection}
                                        onChange={(e) => {
                                            setSelectedSection(e.target.value);
                                            setSelectedSubSection('');
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Semua Section</option>
                                        {accessibleSections.map(section => (
                                            <option key={section.id} value={section.id}>{section.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="subSection" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sub Section:</label>
                                    <select
                                        id="subSection"
                                        value={selectedSubSection}
                                        onChange={(e) => setSelectedSubSection(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">Semua Sub Section</option>
                                        {filteredSubSections.map(subSection => (
                                            <option key={subSection.id} value={subSection.id}>{subSection.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={applyFilters}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600 w-full justify-center transition-colors"
                                    >
                                        {isLoading ? 'Loading...' : 'Terapkan'}
                                    </button>
                                    <button
                                        onClick={clearFilters}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500 w-full justify-center transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content with loading states */}
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-center py-12"
                            >
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {paginatedDates.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12"
                                    >
                                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                                            Tidak ada jadwal ditemukan untuk filter yang dipilih.
                                        </p>
                                    </motion.div>
                                ) : (
                                    paginatedDates.map((dateKey, index) => {
                                        const dateData = filteredAndGroupedSchedules[dateKey];
                                        const sectionsForDate = dateData.sections;

                                        return (
                                            <motion.div 
                                                key={dateKey}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                            >
                                                {/* Date Header */}
                                                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 mb-6">
                                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
                                                        {dateData.displayDate}
                                                    </h2>
                                                </div>

                                                {/* Sections */}
                                               {Object.entries(sectionsForDate).map(([sectionName, sectionData]) => (
    <ScheduleTableSection
        key={`${dateKey}-${sectionName}`}
        title={sectionName}
        shifts={sectionData.shifts}
        date={dateKey}
        sectionId={sectionData.sectionId}
        currentVisibility={sectionData.visibility}
        user={user}
        onToggleVisibility={() => 
            handleToggleVisibility(dateKey, sectionData.sectionId, sectionData.visibility)
        }
        isAnyExpanded={expandedSectionId !== null}
        onExpand={() => {
            // Close all other expanded sections
            setExpandedSectionId(sectionData.sectionId);
        }}
        lastUpdate={lastUpdate}
    />
))}
                                            </motion.div>
                                        );
                                    })
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-8 px-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Halaman {currentPage} dari {totalPages}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-4 py-2 rounded-md ${
                                                        currentPage === page
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
                                                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default Index;