// SummaryCards.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/Animations';

const SummaryCards = ({ summary, setModalState, formatDate }) => {
    const [filters, setFilters] = useState({
        dateRange: {
            from: '',
            to: ''
        },
        section: '',
        shift: ''
    });

    const [showFilters, setShowFilters] = useState(false);
    const [availableSections, setAvailableSections] = useState([]);
    const [availableShifts, setAvailableShifts] = useState([]);

    useEffect(() => {
        // In a real app, you would fetch these from your API
        setAvailableSections([
            { id: '1', name: 'Production' },
            { id: '2', name: 'Quality Control' },
            { id: '3', name: 'Maintenance' },
            { id: '4', name: 'Logistics' }
        ]);
        
        setAvailableShifts([
            { id: '1', name: 'Morning' },
            { id: '2', name: 'Afternoon' },
            { id: '3', name: 'Night' }
        ]);
    }, []);

    const buildFilterUrl = (baseUrl, additionalParams = {}) => {
        const params = new URLSearchParams();
        
        if (filters.dateRange.from) {
            params.append('filter_date_from', filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            params.append('filter_date_to', filters.dateRange.to);
        }
        if (filters.section) {
            params.append('filter_section', filters.section);
        }
        if (filters.shift) {
            params.append('filter_shift', filters.shift);
        }
        
        // Add any additional parameters
        Object.entries(additionalParams).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });
        
        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    };

    const handleCardClick = async (title, baseUrl, columns, additionalParams = {}) => {
        try {
            const url = buildFilterUrl(baseUrl, additionalParams);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setModalState(prev => ({
                ...prev,
                open: true,
                title: `${title}${getFilterTitleSuffix()}`,
                data: data,
                columns: columns,
                url: url
            }));
        } catch (error) {
            console.error("Failed to fetch modal data:", error);
        }
    };

    const getFilterTitleSuffix = () => {
        const filterParts = [];
        
        if (filters.dateRange.from && filters.dateRange.to) {
            filterParts.push(`${filters.dateRange.from} to ${filters.dateRange.to}`);
        }
        
        if (filters.section) {
            const section = availableSections.find(s => s.id === filters.section);
            if (section) {
                filterParts.push(section.name);
            }
        }
        
        if (filters.shift) {
            const shift = availableShifts.find(s => s.id === filters.shift);
            if (shift) {
                filterParts.push(shift.name);
            }
        }
        
        return filterParts.length > 0 ? ` (${filterParts.join(' • ')})` : '';
    };

    const clearFilters = () => {
        setFilters({
            dateRange: { from: '', to: '' },
            section: '',
            shift: ''
        });
    };

    const hasActiveFilters = filters.dateRange.from || filters.dateRange.to || filters.section || filters.shift;

    const cardData = [
        {
            title: 'Active Employees',
            value: summary.activeEmployeesCount,
            total: summary.totalEmployeesCount,
            color: 'indigo',
            icon: '👥',
            onClick: () => handleCardClick(
                'Active Employees',
                route('dashboard.employees.active'),
                [
                    { header: 'NIK', field: 'nik' },
                    { header: 'Name', field: 'name' },
                    { header: 'Type', field: 'type' },
                    { header: 'Status', field: 'status' },
                    { header: 'Section', field: 'section', render: (item) => item.section?.name || 'N/A' },
                    { header: 'Join Date', field: 'join_date', render: (item) => formatDate(item.join_date) }
                ]
            )
        },
        {
            title: 'Pending Requests',
            value: summary.pendingRequestsCount,
            total: summary.totalRequestsCount,
            color: 'yellow',
            icon: '⏳',
            onClick: () => handleCardClick(
                'Pending Requests',
                route('dashboard.requests.pending'),
                [
                    { header: 'Date', field: 'date', render: (item) => formatDate(item.date) },
                    { header: 'Section', field: 'section', render: (item) => item.section?.name || 'N/A' },
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.shift?.name || 'N/A' },
                    { header: 'Amount', field: 'requested_amount' },
                    { header: 'Status', field: 'status' }
                ]
            )
        },
        {
            title: 'Fulfilled Requests',
            value: summary.fulfilledRequestsCount,
            total: summary.totalRequestsCount,
            color: 'green',
            icon: '✅',
            onClick: () => handleCardClick(
                'Fulfilled Requests',
                route('dashboard.requests.fulfilled'),
                [
                    { header: 'Date', field: 'date', render: (item) => formatDate(item.date) },
                    { header: 'Section', field: 'section', render: (item) => item.section?.name || 'N/A' },
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.shift?.name || 'N/A' },
                    { header: 'Amount', field: 'requested_amount' },
                    { header: 'Fulfilled Date', field: 'fulfilled_date', render: (item) => formatDate(item.fulfilled_date) }
                ]
            )
        },
        {
            title: 'This Week Schedules',
            value: summary.thisWeekSchedulesCount,
            total: summary.totalSchedulesCount,
            color: 'blue',
            icon: '📅',
            onClick: () => handleCardClick(
                'Upcoming Schedules',
                route('dashboard.schedules.upcoming'),
                [
                    { header: 'Date', field: 'date', render: (item) => formatDate(item.date) },
                    { header: 'Employee', field: 'employee', render: (item) => item.employee?.name || 'N/A' },
                    { header: 'Section', field: 'section', render: (item) => item.section?.name || 'N/A' },
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.man_power_request?.shift?.name || 'N/A' },
                    { header: 'Status', field: 'status' }
                ],
                { timeframe: 'week' }
            )
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            indigo: 'from-indigo-500 to-purple-600 border-indigo-200 dark:border-indigo-800',
            yellow: 'from-yellow-500 to-amber-600 border-yellow-200 dark:border-yellow-800',
            green: 'from-green-500 to-emerald-600 border-green-200 dark:border-green-800',
            blue: 'from-blue-500 to-cyan-600 border-blue-200 dark:border-blue-800'
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Overview Statistics
                    </h3>
                    {hasActiveFilters && (
                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                            Filters Active
                        </span>
                    )}
                </div>
                
                <div className="flex gap-2">
                    {hasActiveFilters && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={clearFilters}
                            className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200 font-medium"
                        >
                            Clear Filters
                        </motion.button>
                    )}
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                        </svg>
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </motion.button>
                </div>
            </div>

            {/* Filter Form */}
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date From */}
                        <div>
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
                                className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            />
                        </div>

                        {/* Date To */}
                        <div>
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
                                className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            />
                        </div>

                        {/* Section Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Section
                            </label>
                            <select
                                value={filters.section}
                                onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                                className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Sections</option>
                                {availableSections.map(section => (
                                    <option key={section.id} value={section.id}>
                                        {section.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Shift Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Shift
                            </label>
                            <select
                                value={filters.shift}
                                onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                                className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Shifts</option>
                                {availableShifts.map(shift => (
                                    <option key={shift.id} value={shift.id}>
                                        {shift.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Date Presets */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quick Date Presets:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'Today', days: 0 },
                                { label: 'Last 7 Days', days: 7 },
                                { label: 'Last 30 Days', days: 30 },
                                { label: 'This Month', months: 0 },
                                { label: 'Last Month', months: 1 }
                            ].map((preset, index) => (
                                <motion.button
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        const today = new Date();
                                        let fromDate, toDate;

                                        if (preset.days !== undefined) {
                                            fromDate = new Date(today);
                                            fromDate.setDate(today.getDate() - preset.days);
                                            toDate = today;
                                        } else {
                                            // Month-based presets
                                            if (preset.months === 0) {
                                                // This month
                                                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                                                toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                            } else {
                                                // Last month
                                                fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                                toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                                            }
                                        }

                                        setFilters(prev => ({
                                            ...prev,
                                            dateRange: {
                                                from: fromDate.toISOString().split('T')[0],
                                                to: toDate.toISOString().split('T')[0]
                                            }
                                        }));
                                    }}
                                    className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-200"
                                >
                                    {preset.label}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {cardData.map((card, index) => (
                    <motion.div
                        key={index}
                        variants={cardVariants}
                        onClick={card.onClick}
                        whileHover={{ 
                            y: -4, 
                            scale: 1.02,
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                            relative overflow-hidden
                            bg-gradient-to-br ${getColorClasses(card.color)}
                            rounded-2xl shadow-lg
                            border
                            p-4 sm:p-5
                            cursor-pointer 
                            transition-all 
                            duration-300
                            group
                        `}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="text-white/80 text-sm font-medium mb-1">
                                    {card.title}
                                </div>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-2xl sm:text-3xl font-bold text-white">
                                        {typeof card.value === 'number' ? card.value.toLocaleString() : 'N/A'}
                                    </span>
                                    {card.hasOwnProperty('total') && (
                                        <span className="text-white/70 text-sm">
                                            / {typeof card.total === 'number' ? card.total.toLocaleString() : 'N/A'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl opacity-80 group-hover:scale-110 transition-transform duration-300">
                                {card.icon}
                            </div>
                        </div>
                        
                        {/* Progress bar */}
                        {card.hasOwnProperty('total') && card.total > 0 && (
                            <div className="mt-3">
                                <div className="w-full bg-white/30 rounded-full h-1.5">
                                    <div 
                                        className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
                                        style={{ 
                                            width: `${Math.min(100, (card.value / card.total) * 100)}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Filter Indicator */}
                        {hasActiveFilters && (
                            <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                            </svg>
                            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                                Active Filters:
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {filters.dateRange.from && filters.dateRange.to && (
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                                        Date: {filters.dateRange.from} to {filters.dateRange.to}
                                    </span>
                                )}
                                {filters.section && (
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                                        Section: {availableSections.find(s => s.id === filters.section)?.name}
                                    </span>
                                )}
                                {filters.shift && (
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                                        Shift: {availableShifts.find(s => s.id === filters.shift)?.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default SummaryCards;