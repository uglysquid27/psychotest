// SummaryCards.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/Animations';

const SummaryCards = ({ summary, setModalState, formatDate }) => {
    const handleCardClick = async (title, url, columns) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setModalState(prev => ({
                ...prev,
                open: true,
                title: title,
                data: data,
                columns: columns,
                url: url
            }));
        } catch (error) {
            console.error("Failed to fetch modal data:", error);
        }
    };

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
                    { header: 'Status', field: 'status' }
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
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.shift?.name || 'N/A' },
                    { header: 'Amount', field: 'requested_amount' }
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
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.shift?.name || 'N/A' },
                    { header: 'Amount', field: 'requested_amount' }
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
                    { header: 'Sub Section', field: 'sub_section', render: (item) => item.sub_section?.name || 'N/A' },
                    { header: 'Shift', field: 'shift', render: (item) => item.man_power_request?.shift?.name || 'N/A' }
                ]
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
                </motion.div>
            ))}
        </div>
    );
};

export default SummaryCards;