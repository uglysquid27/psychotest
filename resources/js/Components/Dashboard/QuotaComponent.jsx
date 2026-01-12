// Updated QuotaComponent.jsx - using dashboard route
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const QuotaComponent = () => {
    const [quotaData, setQuotaData] = useState({
        sections: [],
        subsections: [],
        overall: {
            total: 0,
            available: 0,
            assigned: 0,
            onLeave: 0
        },
        date: new Date().toISOString().split('T')[0],
        last_updated: null
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        fetchQuotaData();
    }, [selectedDate]);

    const fetchQuotaData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use the dashboard quota route
            const response = await axios.get(route('dashboard.quota'), {
                params: { date: selectedDate }
            });
            
            if (response.data && response.data.success) {
                setQuotaData(response.data);
                // Auto-expand sections that have data
                const expanded = {};
                response.data.sections.forEach(section => {
                    expanded[section.id] = true;
                });
                setExpandedSections(expanded);
            } else {
                setError(response.data?.error || 'Failed to load quota data');
            }
        } catch (err) {
            console.error('Error fetching quota data:', err);
            setError('Failed to load quota data. Please try again.');
            
            // Show specific error message if route doesn't exist
            if (err.response && err.response.status === 404) {
                setError('Dashboard quota endpoint not found. Please check your routes.');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const formatNumber = (num) => {
        return num?.toLocaleString('en-US') || '0';
    };

    const getPercentage = (part, total) => {
        if (!total || total === 0) return 0;
        return Math.round(((part || 0) / total) * 100);
    };

    const getColorForStatus = (status, value, total) => {
        const percentage = getPercentage(value, total);
        if (status === 'available') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        if (status === 'assigned') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        if (status === 'onLeave') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return 'bg-red-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getIconForStatus = (status) => {
        switch(status) {
            case 'available': return '✅';
            case 'assigned': return '📅';
            case 'onLeave': return '🏖️';
            default: return '👥';
        }
    };

    const StatCard = ({ title, value, total, percentage, status }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${getColorForStatus(status, value, total)} border border-current border-opacity-20`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{getIconForStatus(status)}</span>
                    <span className="font-medium text-sm">{title}</span>
                </div>
                <span className="text-2xl font-bold">{formatNumber(value)}</span>
            </div>
            {total > 0 && (
                <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                        <span>{percentage}% of total</span>
                        <span>{formatNumber(value)}/{formatNumber(total)}</span>
                    </div>
                    <div className="h-2 bg-current bg-opacity-20 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1 }}
                            className={`h-full ${getProgressColor(percentage)}`}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );

    // Group subsections by their section
    const getSubsectionsBySection = () => {
        const grouped = {};
        
        quotaData.subsections.forEach(subsection => {
            if (!grouped[subsection.section_id]) {
                grouped[subsection.section_id] = [];
            }
            grouped[subsection.section_id].push(subsection);
        });
        
        return grouped;
    };

    const subsectionsBySection = getSubsectionsBySection();

    if (loading) {
        return (
            <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading quota data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-6">
                <div className="text-center text-red-500 dark:text-red-400 p-4">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="font-medium mb-2">{error}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Route: dashboard.quota
                    </p>
                    <button
                        onClick={fetchQuotaData}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-4 sm:p-6 transition-all duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Employee Quota & Availability
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Real-time workforce distribution for {selectedDate}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            View for Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full sm:w-48 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    
                    <button
                        onClick={fetchQuotaData}
                        className="mt-6 sm:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Last Updated */}
            {quotaData.last_updated && (
                <div className="mb-6 text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(quotaData.last_updated).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </div>
            )}

            {/* Overall Stats */}
            <div className="mb-8">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Overall Workforce Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Employees"
                        value={quotaData.overall?.total || 0}
                        total={quotaData.overall?.total || 0}
                        percentage={100}
                        status="total"
                    />
                    <StatCard
                        title="Available"
                        value={quotaData.overall?.available || 0}
                        total={quotaData.overall?.total || 0}
                        percentage={getPercentage(quotaData.overall?.available, quotaData.overall?.total)}
                        status="available"
                    />
                    <StatCard
                        title="Assigned"
                        value={quotaData.overall?.assigned || 0}
                        total={quotaData.overall?.total || 0}
                        percentage={getPercentage(quotaData.overall?.assigned, quotaData.overall?.total)}
                        status="assigned"
                    />
                    <StatCard
                        title="On Leave"
                        value={quotaData.overall?.onLeave || 0}
                        total={quotaData.overall?.total || 0}
                        percentage={getPercentage(quotaData.overall?.onLeave, quotaData.overall?.total)}
                        status="onLeave"
                    />
                </div>
            </div>

            {/* Section Breakdown */}
            <div>
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Section Breakdown
                </h4>
                
                {quotaData.sections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No section data available for {selectedDate}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quotaData.sections.map((section) => {
                            const sectionSubsections = subsectionsBySection[section.id] || [];
                            
                            return (
                                <motion.div
                                    key={section.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                                >
                                    {/* Section Header */}
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className={`transform transition-transform ${expandedSections[section.id] ? 'rotate-90' : ''}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                            <div className="text-left">
                                                <span className="font-medium text-gray-800 dark:text-gray-200 block">
                                                    {section.name}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {sectionSubsections.length} subsection(s)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="hidden sm:flex space-x-2">
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    {section.available || 0} available
                                                </span>
                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {section.assigned || 0} assigned
                                                </span>
                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                    {section.onLeave || 0} on leave
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-gray-800 dark:text-gray-200 block">
                                                    {section.total || 0}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    total
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Mobile stats summary */}
                                    <div className="sm:hidden mt-3 grid grid-cols-4 gap-2">
                                        <div className="text-center p-2 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                            <div className="font-bold">{section.total || 0}</div>
                                            <div className="text-xs">Total</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            <div className="font-bold">{section.available || 0}</div>
                                            <div className="text-xs">Available</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            <div className="font-bold">{section.assigned || 0}</div>
                                            <div className="text-xs">Assigned</div>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                            <div className="font-bold">{section.onLeave || 0}</div>
                                            <div className="text-xs">On Leave</div>
                                        </div>
                                    </div>

                                    {/* Section Details */}
                                    <AnimatePresence>
                                        {expandedSections[section.id] && sectionSubsections.length > 0 && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                        Subsections
                                                    </h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {sectionSubsections.map((subsection) => (
                                                            <motion.div
                                                                key={subsection.id}
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">
                                                                        {subsection.name}
                                                                    </span>
                                                                    <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                                                        {subsection.total || 0}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-green-600 dark:text-green-400">Available</span>
                                                                        <span>{subsection.available || 0}</span>
                                                                    </div>
                                                                    <div className="h-1 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-green-500"
                                                                            style={{ width: `${getPercentage(subsection.available || 0, subsection.total || 1)}%` }}
                                                                        />
                                                                    </div>
                                                                    
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-blue-600 dark:text-blue-400">Assigned</span>
                                                                        <span>{subsection.assigned || 0}</span>
                                                                    </div>
                                                                    <div className="h-1 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-blue-500"
                                                                            style={{ width: `${getPercentage(subsection.assigned || 0, subsection.total || 1)}%` }}
                                                                        />
                                                                    </div>
                                                                    
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-yellow-600 dark:text-yellow-400">On Leave</span>
                                                                        <span>{subsection.onLeave || 0}</span>
                                                                    </div>
                                                                    <div className="h-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-yellow-500"
                                                                            style={{ width: `${getPercentage(subsection.onLeave || 0, subsection.total || 1)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                            <div className="text-xs font-medium text-green-700 dark:text-green-400">Available</div>
                            <div className="text-xs text-green-600 dark:text-green-500">Ready for assignment</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-400">Assigned</div>
                            <div className="text-xs text-blue-600 dark:text-blue-500">Currently scheduled</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div>
                            <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400">On Leave</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-500">Vacation/Time off</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotaComponent;