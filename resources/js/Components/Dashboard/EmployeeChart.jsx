// Updated EmployeeChart.jsx (without chartjs-plugin-datalabels)
import React, { useState, useEffect, useRef } from 'react';
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
    const chartRef = useRef(null);

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
                position: isMobile ? 'bottom' : 'top',
                labels: {
                    boxWidth: isMobile ? 10 : 12,
                    padding: isMobile ? 10 : 15,
                    usePointStyle: true,
                    color: 'rgba(55, 65, 81, 1)',
                    font: {
                        size: isMobile ? 9 : 12
                    }
                },
            },
            tooltip: {
                enabled: true,
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
                        size: isMobile ? 8 : 11
                    },
                    callback: function(value) {
                        const label = this.getLabelForValue(value);
                        if (isMobile) {
                            const parts = label.split(' - ');
                            return parts.length > 1 ? parts[1].substring(0, 8) + '...' : label.substring(0, 10);
                        }
                        return label;
                    }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    color: 'rgba(107, 114, 128, 1)',
                    font: {
                        size: isMobile ? 8 : 11
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
                top: isMobile ? 5 : 10, 
                right: isMobile ? 5 : 10, 
                bottom: isMobile ? 20 : 10, 
                left: isMobile ? 5 : 10 
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    });

    const getDoughnutChartOptions = (onClick) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: isMobile ? 8 : 10,
                    padding: isMobile ? 10 : 15,
                    usePointStyle: true,
                    color: 'rgba(55, 65, 81, 1)',
                    font: {
                        size: isMobile ? 8 : 11
                    }
                },
                align: 'center',
            },
            tooltip: {
                enabled: true,
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
        },
        cutout: isMobile ? '50%' : '60%',
        radius: '90%'
    });
    
    const getDoughnutData = () => {
        if (!data || !data.datasets || data.datasets.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Group by section for mobile view
        const sectionMap = {};
        sections.forEach(section => {
            const sectionRequests = data.labels.filter(label => label.includes(section.name));
            const total = sectionRequests.reduce((sum, label) => {
                const index = data.labels.indexOf(label);
                return sum + (data.datasets[0]?.data[index] || 0);
            }, 0);
            sectionMap[section.name] = total;
        });

        const sectionNames = Object.keys(sectionMap).slice(0, 6); // Limit to 6 sections for mobile
        const sectionTotals = sectionNames.map(name => sectionMap[name]);

        const backgroundColors = [
            'rgba(99, 102, 241, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(14, 165, 233, 0.8)',
        ];

        return {
            labels: sectionNames.map(name => name.length > 15 ? name.substring(0, 12) + '...' : name),
            datasets: [
                {
                    label: 'Assigned Employees',
                    data: sectionTotals.map(total => Math.round(total)),
                    backgroundColor: backgroundColors.slice(0, sectionNames.length),
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

            if (isMobile) {
                const sectionName = sections[elementIndex]?.name;
                if (sectionName) {
                    const section = sections.find(s => s.name === sectionName);
                    if (section) {
                        const params = new URLSearchParams();
                        params.append('filter_date_from', filters.dateRange.from);
                        params.append('filter_date_to', filters.dateRange.to);
                        params.append('filter_section', section.id);

                        const url = `${route('dashboard.schedules.bySection', { sectionId: section.id })}?${params.toString()}`;
                        const fetchedData = await fetchModalData(url);

                        setChartModalState(prev => ({
                            ...prev,
                            open: true,
                            title: `Assignments - ${sectionName}`,
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
                    title: `Assignments - ${subSectionName}`,
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
        <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-3 sm:p-6 relative transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-3">
                <h3 className="text-base sm:text-lg font-semibold whitespace-nowrap text-gray-800 dark:text-gray-100">
                    {isMobile ? 'Assignments' : 'Employee Assignments'}
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
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 w-full md:w-auto"
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
                    height: `${isMobile ? Math.min(height, 300) : height}px`,
                    minHeight: isMobile ? '250px' : '300px'
                }}
            >
                {chartData.labels.length > 0 && chartData.datasets.some(dataset => dataset.data.length > 0) ? (
                    isMobile ? (
                        <Doughnut
                            ref={chartRef}
                            data={chartData}
                            options={getDoughnutChartOptions((e, elements) => {
                                if (elements.length) {
                                    handleChartClick(elements);
                                }
                            })}
                        />
                    ) : (
                        <Bar
                            ref={chartRef}
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
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-center text-xs sm:text-sm">No data available</p>
                    </div>
                )}
            </div>
            
            <div className="mt-3 sm:mt-4">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 block">Adjust Height</label>
                <input
                    type="range"
                    min="250"
                    max="800"
                    value={height}
                    onChange={handleResize}
                    className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Small</span>
                    <span>Large</span>
                </div>
            </div>
            
            {/* Mobile Summary */}
            {isMobile && chartData.labels.length > 0 && (
                <div className="mt-4">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {chartData.datasets[0]?.data.slice(0, 4).map((value, index) => (
                            <div 
                                key={index}
                                className="p-2 rounded-lg text-center bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200"
                            >
                                <div className="font-bold text-sm">{value}</div>
                                <div className="text-xs truncate">{chartData.labels[index]}</div>
                            </div>
                        ))}
                    </div>
                    {chartData.labels.length > 4 && (
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                            + {chartData.labels.length - 4} more sections
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeChart;