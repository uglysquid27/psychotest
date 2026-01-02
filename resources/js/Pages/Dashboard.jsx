// Dashboard.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/Animations';
import ErrorBoundary from '@/Components/Dashboard/ErrorBoundary';
import SummaryCards from '@/Components/Dashboard/SummaryCards';
import DateFilter from '@/Components/Dashboard/DateFilter';
import ManpowerChart from '@/Components/Dashboard/ManpowerChart';
import EmployeeChart from '@/Components/Dashboard/EmployeeChart';
import PendingRequestsTable from '@/Components/Dashboard/PendingRequestsTable';
import UpcomingSchedulesTable from '@/Components/Dashboard/UpcomingSchedulesTables';
import DetailModal from '@/Components/Dashboard/DetailModal';
import LunchCouponsCard from '@/Components/Dashboard/LunchCouponsCard';
import dayjs from 'dayjs';

export default function Dashboard() {
    const { props } = usePage();
    const {
        summary = {},
        manpowerRequestChartData: initialManpowerRequestChartData = { labels: [], datasets: [] },
        employeeAssignmentChartData: initialEmployeeAssignmentChartData = { labels: [], datasets: [] },
        recentPendingRequests = [],
        upcomingSchedules = [],
        sections = []
    } = props;

    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [componentHeights, setComponentHeights] = useState({
        chart1: 400,
        chart2: 400,
        table1: 400,
        table2: 400
    });

    // Check screen size on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Set default date range to last 5 months
    const [filters, setFilters] = useState({
        dateRange: {
            from: dayjs().subtract(4, 'month').startOf('month').format('YYYY-MM-DD'),
            to: dayjs().endOf('month').format('YYYY-MM-DD')
        },
        section: null,
        subSection: null,
        shift: null
    });

    const [manpowerRequestChartData, setManpowerRequestChartData] = useState(initialManpowerRequestChartData);
    const [employeeAssignmentChartData, setEmployeeAssignmentChartData] = useState(initialEmployeeAssignmentChartData);
    const [modalState, setModalState] = useState({
        open: false,
        title: '',
        data: null,
        columns: [],
        url: ''
    });
    const [chartModalState, setChartModalState] = useState({
        open: false,
        title: '',
        data: null,
        columns: [],
        url: ''
    });

    const resetFilters = () => {
        setFilters({
            dateRange: {
                from: dayjs().subtract(4, 'month').startOf('month').format('YYYY-MM-DD'),
                to: dayjs().endOf('month').format('YYYY-MM-DD')
            },
            section: null,
            subSection: null,
            shift: null
        });

        setManpowerRequestChartData(initialManpowerRequestChartData);
        setEmployeeAssignmentChartData(initialEmployeeAssignmentChartData);
    };

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        const date = dayjs(dateString);
        return date.isValid() ? date.format('DD MMMM YYYY') : 'N/A';
    }, []);

    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        const date = dayjs(dateString);
        return date.isValid() ? date.format('DD MMMM HH:mm') : 'N/A';
    }, []);

    const fetchModalData = async (url, query = '') => {
        try {
            const response = await fetch(query ? `${url}?${query}` : url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return { data: [], links: [] };
        }
    };

    const applyFilters = async (chartType) => {
        try {
            let url;
            const params = new URLSearchParams();

            params.append('from_date', filters.dateRange.from);
            params.append('to_date', filters.dateRange.to);

            if (chartType === 'manpowerRequests') {
                url = route('dashboard.manpower.requests.filtered');
                const response = await fetch(`${url}?${params.toString()}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setManpowerRequestChartData({
                    labels: data.labels,
                    datasets: data.datasets.map(dataset => ({
                        ...dataset,
                        data: dataset.data.map(value => Math.round(value))
                    }))
                });
            } else {
                url = route('dashboard.employee.assignments.filtered');
                params.append('section_id', filters.section || '');
                const response = await fetch(`${url}?${params.toString()}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setEmployeeAssignmentChartData({
                    labels: data.labels,
                    datasets: data.datasets.map(dataset => ({
                        ...dataset,
                        data: dataset.data.map(value => Math.round(value))
                    })),
                    subSectionIds: data.subSectionIds
                });
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            if (chartType === 'manpowerRequests') {
                setManpowerRequestChartData(initialManpowerRequestChartData);
            } else {
                setEmployeeAssignmentChartData(initialEmployeeAssignmentChartData);
            }
        }
    };

    const handleResize = (component) => (e) => {
        const newHeight = Math.max(200, e.target.value);
        setComponentHeights(prev => ({
            ...prev,
            [component]: newHeight
        }));
    };

    const cardStyle = "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-3 sm:p-4 lg:p-6 transition-all duration-300 hover:shadow-xl";

    return (
        <ErrorBoundary>
            <AuthenticatedLayout 
                header={
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                        <div className="flex items-center gap-3">
                            {isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                    </svg>
                                </button>
                            )}
                            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                                Dashboard Overview
                            </h2>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            Last updated: {dayjs().format('DD MMM HH:mm')}
                        </div>
                    </div>
                }
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            >
                <Head title="Dashboard" />

                {/* Overlay for mobile sidebar */}
                {isMobile && sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={staggerContainer}
                    className="py-3 sm:py-4 lg:py-6 px-2 sm:px-3 lg:px-6 space-y-3 sm:space-y-4 lg:space-y-6"
                >
                    {/* Summary Cards */}
                    <div className={cardStyle}>
                        <SummaryCards
                            summary={summary}
                            setModalState={setModalState}
                            formatDate={formatDate}
                        />
                    </div>

                    {/* Date Filter */}
                    <div className={cardStyle}>
                        <DateFilter
                            filters={filters}
                            setFilters={setFilters}
                            applyFilters={applyFilters}
                            resetFilters={resetFilters}
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-6">
                        <div className={`flex-1 ${cardStyle} min-w-0`}>
                            <ManpowerChart
                                data={manpowerRequestChartData}
                                height={isMobile ? Math.min(componentHeights.chart1, 350) : componentHeights.chart1}
                                handleResize={handleResize('chart1')}
                                setChartModalState={setChartModalState}
                                formatDate={formatDate}
                                fetchModalData={fetchModalData}
                                sections={sections}
                                filters={filters}
                                setFilters={setFilters}
                                applyFilters={applyFilters}
                            />
                        </div>

                        <div className={`flex-1 ${cardStyle} min-w-0`}>
                            <EmployeeChart
                                data={employeeAssignmentChartData}
                                height={isMobile ? Math.min(componentHeights.chart2, 350) : componentHeights.chart2}
                                handleResize={handleResize('chart2')}
                                setChartModalState={setChartModalState}
                                sections={sections}
                                filters={filters}
                                setFilters={setFilters}
                                formatDate={formatDate}
                                fetchModalData={fetchModalData}
                                applyFilters={applyFilters}
                            />
                        </div>
                    </div>

                    {/* Tables Section */}
                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
                        <div className={`flex-1 ${cardStyle} min-w-0`}>
                            <PendingRequestsTable
                                data={recentPendingRequests}
                                height={isMobile ? Math.min(componentHeights.table1, 300) : componentHeights.table1}
                                handleResize={handleResize('table1')}
                                formatDate={formatDate}
                            />
                        </div>

                        <div className={`flex-1 ${cardStyle} min-w-0`}>
                            <UpcomingSchedulesTable
                                data={upcomingSchedules}
                                height={isMobile ? Math.min(componentHeights.table2, 300) : componentHeights.table2}
                                handleResize={handleResize('table2')}
                                formatDate={formatDate}
                            />
                        </div>
                    </div>

                    {/* Lunch Coupons - Full width on mobile, half width on desktop */}
                    <div className={`${cardStyle} w-full`}>
                        <LunchCouponsCard
                            formatDate={formatDate}
                        />
                    </div>

                    {/* Modals */}
                    <DetailModal
                        isOpen={modalState.open}
                        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
                        title={modalState.title}
                        data={modalState.data}
                        columns={modalState.columns}
                        formatDate={formatDateTime}
                        onFilterOrPaginate={(url, query) => {
                            return fetchModalData(url, query).then(data => {
                                setModalState(prev => ({ ...prev, data }));
                            });
                        }}
                    />

                    <DetailModal
                        isOpen={chartModalState.open}
                        onClose={() => setChartModalState(prev => ({ ...prev, open: false }))}
                        title={chartModalState.title}
                        data={chartModalState.data}
                        columns={chartModalState.columns}
                        formatDate={formatDateTime}
                        onFilterOrPaginate={(url, query) => {
                            return fetchModalData(url, query).then(data => {
                                setChartModalState(prev => ({ ...prev, data }));
                            });
                        }}
                    />
                </motion.div>
            </AuthenticatedLayout>
        </ErrorBoundary>
    );
}