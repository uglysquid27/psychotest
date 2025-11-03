// EmployeeChart.jsx
import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const EmployeeChart = ({
    data,
    height,
    handleResize,
    setChartModalState,
    sections,
    filters,
    setFilters,
    formatDate,
    fetchModalData,
    applyFilters
}) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getBarChartOptions = (onClick) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    usePointStyle: true,
                    color: 'rgba(55, 65, 81, 1)',
                    font: {
                        size: isMobile ? 10 : 12
                    }
                },
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${Math.round(context.raw)}`;
                    }
                },
                padding: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    size: isMobile ? 10 : 12
                },
                bodyFont: {
                    size: isMobile ? 10 : 12
                }
            }
        },
        scales: {
            x: {
                grid: { 
                    display: false,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    maxRotation: isMobile ? 90 : 45,
                    minRotation: isMobile ? 90 : 45,
                    color: 'rgba(107, 114, 128, 1)',
                    font: {
                        size: isMobile ? 9 : 11
                    }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    color: 'rgba(107, 114, 128, 1)',
                    font: {
                        size: isMobile ? 9 : 11
                    },
                    callback: function(value) {
                        return Math.round(value);
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        onClick,
        responsiveAnimationDuration: 0,
        layout: {
            padding: { 
                top: 10, 
                right: 10, 
                bottom: 10, 
                left: 10 
            }
        }
    });

    const getDoughnutChartOptions = (onClick) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 10,
                    padding: 15,
                    usePointStyle: true,
                    color: 'rgba(55, 65, 81, 1)',
                    font: {
                        size: isMobile ? 9 : 11
                    }
                },
                align: 'center',
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = Math.round(context.raw);
                        const total = context.chart.data.datasets[0].data.reduce((acc, curr) => acc + curr, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                    },
                },
                padding: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    size: isMobile ? 10 : 12
                },
                bodyFont: {
                    size: isMobile ? 10 : 12
                }
            }
        },
        onClick,
        animation: {
            animateScale: true,
            animateRotate: true
        }
    });
    
    const getDoughnutData = () => {
        if (!data || !data.datasets || data.datasets.length === 0) {
            return { labels: [], datasets: [] };
        }

        const labels = sections.map(s => s.name);
        const counts = sections.map(s => {
            const sectionJobs = data.labels.filter(label => label.includes(s.name));
            return sectionJobs.reduce((sum, label) => {
                const index = data.labels.indexOf(label);
                return sum + (data.datasets[0]?.data[index] || 0);
            }, 0);
        });

        const backgroundColors = [
            'rgba(99, 102, 241, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(14, 165, 233, 0.8)',
        ];

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Assigned Employees',
                    data: counts.map(count => Math.round(count)),
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: 'rgba(255, 255, 255, 1)',
                    borderWidth: 2,
                    hoverOffset: 8
                }
            ]
        };
    };

    const handleChartClick = async (elements) => {
        if (elements.length > 0) {
            const elementIndex = elements[0].index;
            const label = isMobile ? getDoughnutData().labels[elementIndex] : data.labels[elementIndex];

            if (isMobile) {
                const sectionId = sections.find(s => s.name === label)?.id;
                if (sectionId) {
                    const params = new URLSearchParams();
                    params.append('filter_date_from', filters.dateRange.from);
                    params.append('filter_date_to', filters.dateRange.to);
                    params.append('filter_section', sectionId);

                    const url = `${route('dashboard.schedules.bySection', { sectionId })}?${params.toString()}`;
                    const fetchedData = await fetchModalData(url);

                    setChartModalState(prev => ({
                        ...prev,
                        open: true,
                        title: `Employee Assignments - ${label}`,
                        url: url,
                        data: fetchedData,
                        columns: [
                            { header: 'Date', field: 'date', render: formatDate },
                            { header: 'Employee', field: 'employee', render: (item) => item.employee?.name || 'N/A' },
                            { header: 'Section', field: 'subSection', render: (item) => item.subSection?.section?.name || 'N/A' },
                            { header: 'Sub Section', field: 'subSection', render: (item) => item.subSection?.name || 'N/A' },
                            { header: 'Shift', field: 'shift', render: (item) => item.man_power_request?.shift?.name || 'N/A' }
                        ]
                    }));
                }
            } else {
                const subSectionId = data.subSectionIds?.[elementIndex];
                const subSectionName = data.labels[elementIndex];
                const params = new URLSearchParams();
                params.append('filter_date_from', filters.dateRange.from);
                params.append('filter_date_to', filters.dateRange.to);
                const url = `${route('dashboard.schedules.bySubSection', { subSectionId })}?${params.toString()}`;
                const fetchedData = await fetchModalData(url);

                setChartModalState(prev => ({
                    ...prev,
                    open: true,
                    title: `Employee Assignments - ${subSectionName}`,
                    url: url,
                    data: fetchedData,
                    columns: [
                        { header: 'Date', field: 'date', render: formatDate },
                        { header: 'Employee', field: 'employee', render: (item) => item.employee?.name || 'N/A' },
                        { header: 'Section', field: 'subSection', render: (item) => item.subSection?.section?.name || 'N/A' },
                        { header: 'Sub Section', field: 'subSection', render: (item) => item.subSection?.name || 'N/A' },
                        { header: 'Shift', field: 'shift', render: (item) => item.man_power_request?.shift?.name || 'N/A' }
                    ]
                }));
            }
        }
    };

    const chartData = isMobile ? getDoughnutData() : data;

    return (
        <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-4 sm:p-6 relative transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold whitespace-nowrap text-gray-800 dark:text-gray-100">
                    Employee Assignments
                </h3>
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                    {!isMobile && (
                        <select
                            value={filters.section || ''}
                            onChange={(e) => {
                                const newSection = e.target.value || null;
                                setFilters(prev => ({
                                    ...prev,
                                    section: newSection
                                }));
                                applyFilters('employeeAssignments');
                            }}
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 w-full md:w-auto"
                        >
                            <option value="">All Sections</option>
                            {sections?.map(section => (
                                <option key={section.id} value={section.id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
            
            <div
                className="relative"
                style={{
                    height: `${height}px`,
                    minHeight: isMobile ? '350px' : '300px'
                }}
            >
                {chartData.labels.length > 0 && chartData.datasets.some(dataset => dataset.data.length > 0) ? (
                    isMobile ? (
                        <Doughnut
                            data={chartData}
                            options={getDoughnutChartOptions((e, elements) => {
                                if (elements.length) {
                                    handleChartClick(elements);
                                }
                            })}
                        />
                    ) : (
                        <Bar
                            data={chartData}
                            options={getBarChartOptions((e, elements) => {
                                if (elements.length) {
                                    handleChartClick(elements);
                                }
                            })}
                            redraw={true}
                        />
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-4">
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-center text-sm">No data available for selected filters</p>
                    </div>
                )}
            </div>
            
            <div className="mt-4">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Adjust Chart Height</label>
                <input
                    type="range"
                    min="300"
                    max="800"
                    value={height}
                    onChange={handleResize}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
                />
            </div>
        </div>
    );
};

export default EmployeeChart;   