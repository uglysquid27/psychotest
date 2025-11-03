// DateFilter.jsx
import React from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const DateFilter = ({ filters, setFilters, applyFilters, resetFilters }) => {
    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-4 sm:p-6 transition-all duration-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                        Date Range Filter
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Filter data by specific date range
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateRange.from}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    dateRange: { ...prev.dateRange, from: e.target.value }
                                }))}
                                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            />
                        </div>
                        
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateRange.to}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    dateRange: { ...prev.dateRange, to: e.target.value }
                                }))}
                                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2 sm:gap-3 items-end">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                applyFilters('manpowerRequests');
                                applyFilters('employeeAssignments');
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 shadow-md"
                        >
                            Apply Filters
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={resetFilters}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200"
                        >
                            Reset
                        </motion.button>
                    </div>
                </div>
            </div>
            
            {/* Quick Date Presets */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Last 7 Days', days: 7 },
                        { label: 'Last 30 Days', days: 30 },
                        { label: 'Last 3 Months', months: 3 },
                        { label: 'Last 6 Months', months: 6 }
                    ].map((preset, index) => (
                        <motion.button
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const newFilters = {
                                    ...filters,
                                    dateRange: {
                                        from: preset.days 
                                            ? dayjs().subtract(preset.days, 'day').format('YYYY-MM-DD')
                                            : dayjs().subtract(preset.months, 'month').startOf('month').format('YYYY-MM-DD'),
                                        to: dayjs().format('YYYY-MM-DD')
                                    }
                                };
                                setFilters(newFilters);
                            }}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
                        >
                            {preset.label}
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DateFilter;