// UpcomingSchedulesTables.jsx
import React from 'react';
import { motion } from 'framer-motion';

const UpcomingSchedulesTable = ({ data, height, handleResize, formatDate }) => {
    return (
        <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-4 sm:p-6 relative transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Upcoming Schedules</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Employee assignments for the coming days
                    </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                    {data.length} scheduled
                </div>
            </div>
            <div 
                className="overflow-auto relative"
                style={{ height: `${height}px` }}
            >
                <table className="w-full min-w-[600px] divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50/80 dark:bg-gray-700/80 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sub Section</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Shift</th>
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                        {data.length > 0 ? (
                            data.map((schedule, index) => (
                                <motion.tr
                                    key={schedule.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-150 group"
                                >
                                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {formatDate(schedule.date)}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {schedule.employee?.name || 'N/A'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {schedule.sub_section?.name || 'N/A'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                                            {schedule.man_power_request?.shift?.name || 'N/A'}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-3 py-8 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                        <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm">No upcoming schedules</p>
                                        <p className="text-xs mt-1">Check back later for new assignments</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Adjust Table Height</label>
                <input
                    type="range"
                    min="200"
                    max="800"
                    value={height}
                    onChange={handleResize}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
                />
            </div>
        </div>
    );
};

export default UpcomingSchedulesTable;