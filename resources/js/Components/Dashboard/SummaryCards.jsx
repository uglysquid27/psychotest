import React from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/Animations';
import { router } from '@inertiajs/react';

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

    return (
        <motion.div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
            {cardData.map((card, index) => (
                <motion.div
                    key={index}
                    variants={cardVariants}
                    onClick={card.onClick}
                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                        bg-white/90 dark:bg-gray-800/90 
                        backdrop-blur-md 
                        rounded-2xl 
                        shadow-lg 
                        border border-white/30 dark:border-gray-600/30 
                        p-6 
                        cursor-pointer 
                        transition-all 
                        duration-300 
                        ${card.color === 'indigo' ? 'border-t-indigo-500 border-t-4' :
                          card.color === 'yellow' ? 'border-t-yellow-500 border-t-4' :
                          card.color === 'green' ? 'border-t-green-500 border-t-4' :
                          card.color === 'blue' ? 'border-t-blue-500 border-t-4' : ''}
                    `}
                >
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{card.title}</h3>
                    <div className="mt-2 flex items-baseline">
                        <div className="w-20 sm:w-24">
                            <span className={`text-2xl sm:text-3xl font-bold ${
                                card.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                                card.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                                card.color === 'green' ? 'text-green-600 dark:text-green-400' :
                                card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : ''
                            }`}>
                                {typeof card.value === 'number' ? card.value.toLocaleString() : 'N/A'}
                            </span>
                        </div>
                        {card.hasOwnProperty('total') && (
                            <span className="ml-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                / {typeof card.total === 'number' ? card.total.toLocaleString() : 'N/A'}
                            </span>
                        )}
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default SummaryCards;