// Updated SummaryCards.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/Animations';

const SummaryCards = ({ summary, setModalState, formatDate }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            title: isMobile ? 'Week Schedules' : 'This Week Schedules',
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

    const handleCardClick = async (title, baseUrl, columns, additionalParams = {}) => {
        try {
            const url = baseUrl;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setModalState(prev => ({
                ...prev,
                open: true,
                title: `${title}`,
                data: data,
                columns: columns,
                url: url
            }));
        } catch (error) {
            console.error("Failed to fetch modal data:", error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {isMobile ? 'Overview' : 'Overview Statistics'}
                    </h3>
                </div>
            </div>

            {/* Cards Grid - Adjust based on screen size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {cardData.map((card, index) => (
                    <motion.div
                        key={index}
                        variants={cardVariants}
                        onClick={card.onClick}
                        whileHover={{ 
                            y: isMobile ? -2 : -4, 
                            scale: isMobile ? 1.01 : 1.02,
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                            relative overflow-hidden
                            bg-gradient-to-br ${getColorClasses(card.color)}
                            rounded-2xl shadow-lg
                            border
                            p-4
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
                                    <span className="text-2xl font-bold text-white">
                                        {typeof card.value === 'number' ? card.value.toLocaleString() : 'N/A'}
                                    </span>
                                    {card.hasOwnProperty('total') && !isMobile && (
                                        <span className="text-white/70 text-sm">
                                            / {typeof card.total === 'number' ? card.total.toLocaleString() : 'N/A'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-2xl opacity-80 group-hover:scale-110 transition-transform duration-300">
                                {card.icon}
                            </div>
                        </div>
                        
                        {/* Progress bar - Hide on mobile if space is limited */}
                        {!isMobile && card.hasOwnProperty('total') && card.total > 0 && (
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

                        {/* Mobile total display */}
                        {isMobile && card.hasOwnProperty('total') && (
                            <div className="mt-2 text-white/70 text-xs">
                                Total: {typeof card.total === 'number' ? card.total.toLocaleString() : 'N/A'}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Additional Stats for Mobile */}
            {isMobile && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Today Schedules
                            </div>
                            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                {summary.todaySchedulesCount?.toLocaleString() || 0}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Lunch Coupons
                            </div>
                            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                {summary.todayLunchCoupons?.toLocaleString() || 0}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SummaryCards;