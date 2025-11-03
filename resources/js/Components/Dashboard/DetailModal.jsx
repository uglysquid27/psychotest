// DetailModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DetailModal = ({
    isOpen,
    onClose,
    title,
    data = null,
    columns = [],
    formatDate,
    onFilterOrPaginate
}) => {
    const items = data?.data || [];
    const paginationLinks = data?.links || [];
    const isPaginated = paginationLinks.length > 0;

    const [filterValues, setFilterValues] = useState({});

    useEffect(() => {
        if (isOpen && data?.path) {
            try {
                const url = new URL(data.path);
                const params = new URLSearchParams(url.search);
                const newFilterValues = {};

                columns.forEach(col => {
                    if (!col.filterable) return;

                    const filterKey = col.filterField || col.field;
                    if (col.filterType === 'date_range') {
                        if (params.has(`filter_${filterKey}_from`)) {
                            newFilterValues[`${filterKey}_from`] = params.get(`filter_${filterKey}_from`);
                        }
                        if (params.has(`filter_${filterKey}_to`)) {
                            newFilterValues[`${filterKey}_to`] = params.get(`filter_${filterKey}_to`);
                        }
                    } else if (params.has(`filter_${filterKey}`)) {
                        newFilterValues[filterKey] = params.get(`filter_${filterKey}`);
                    }
                });
                setFilterValues(newFilterValues);
            } catch (e) {
                console.error('Error parsing URL:', e);
            }
        }
    }, [isOpen, data, columns]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-all duration-300"
                >
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 dark:border-gray-600/30 w-full max-w-7xl max-h-[95vh] flex flex-col transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-t-2xl">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 sm:p-6 overflow-auto flex-grow">
                                <div className="overflow-x-auto">
                                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 min-w-[600px]">
                                        <thead className="bg-gray-50/80 dark:bg-gray-700/80 backdrop-blur-sm">
                                            <tr>
                                                {columns.map((column, idx) => (
                                                    <th
                                                        key={idx}
                                                        className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                                                    >
                                                        {column.header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                                            {items.length > 0 ? (
                                                items.map((item, itemIdx) => (
                                                    <tr 
                                                        key={itemIdx} 
                                                        className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors duration-150"
                                                    >
                                                        {columns.map((column, colIdx) => (
                                                            <td 
                                                                key={colIdx} 
                                                                className="px-3 py-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap"
                                                            >
                                                                {column.render ? column.render(item) : item[column.field]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            No data available
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {isPaginated && (
                                <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm">
                                    <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                                        {paginationLinks.map((link, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => link.url && onFilterOrPaginate(link.url, null)}
                                                disabled={!link.url || link.active}
                                                className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-[2rem] ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white shadow-md scale-105'
                                                        : 'bg-white text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                } ${!link.url ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DetailModal;