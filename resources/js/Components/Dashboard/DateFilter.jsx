import React from 'react';
import { motion } from 'framer-motion';

const DateFilter = ({ filters, setFilters, applyFilters, resetFilters }) => {
    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-6 mb-8 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium whitespace-nowrap text-gray-800 dark:text-gray-100">Date Range Filter</h3>
                <div className="flex flex-wrap md:flex-nowrap gap-4 items-center w-full sm:w-auto">
                    <div className="flex items-center gap-2 min-w-[150px]">
                        <label className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">From:</label>
                        <input
                            type="date"
                            value={filters.dateRange.from}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, from: e.target.value }
                            }))}
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 min-w-[150px]">
                        <label className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">To:</label>
                        <input
                            type="date"
                            value={filters.dateRange.to}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, to: e.target.value }
                            }))}
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 w-full"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            applyFilters('manpowerRequests');
                            applyFilters('employeeAssignments');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-200"
                    >
                        Apply Filters
                    </motion.button>
                    {/* <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={resetFilters}
                        className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-200"
                    >
                        Reset to Last 5 Months
                    </motion.button> */}
                </div>
            </div>
        </div>
    );
};

export default DateFilter;