import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);
dayjs.locale('id');

const LunchCouponsCard = ({ initialDate, formatDate }) => {
    const [date, setDate] = useState(initialDate || dayjs().format('YYYY-MM-DD'));
    const [totalCoupons, setTotalCoupons] = useState(0);
    const [pendingCoupons, setPendingCoupons] = useState(0);
    const [claimedCoupons, setClaimedCoupons] = useState(0);
    const [todayCouponsData, setTodayCouponsData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Filter state
    const [sectionFilter, setSectionFilter] = useState('');
    const [subsectionFilter, setSubsectionFilter] = useState('');
    const [availableSections, setAvailableSections] = useState([]);
    const [availableSubsections, setAvailableSubsections] = useState([]);

    useEffect(() => {
        fetchCouponData();
    }, [date]);

    const fetchCouponData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(route('dashboard.lunch-coupons.by-date', { date }));
            const data = await response.json();
            
            setTotalCoupons(data.total);
            setPendingCoupons(data.pending);
            setClaimedCoupons(data.claimed);
            setTodayCouponsData(data.details || []);
            
            // Extract unique sections and subsections for filters
            const sections = [...new Set(data.details.map(item => item.section?.name).filter(Boolean))];
            const subsections = [...new Set(data.details.map(item => item.sub_section?.name).filter(Boolean))];
            
            setAvailableSections(sections);
            setAvailableSubsections(subsections);
        } catch (error) {
            console.error('Error fetching lunch coupons data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Apply filters to data
    const filteredData = todayCouponsData.filter(coupon => {
        const matchesSection = !sectionFilter || coupon.section?.name === sectionFilter;
        const matchesSubsection = !subsectionFilter || coupon.sub_section?.name === subsectionFilter;
        return matchesSection && matchesSubsection;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const formattedDate = dayjs(date).format('dddd, D MMMM YYYY');

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-6 relative transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Today's Lunch Coupons</h3>
                <Link 
                    href={route('lunch-coupons.index')} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                    View All
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <>
                    <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Date:</span> {formattedDate}
                    </div>

                    <div className="mb-2 text-lg font-semibold text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Total:</span> {totalCoupons}
                    </div>

                    <div className="mt-4 mb-4">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setCurrentPage(1); // Reset to first page when date changes
                            }}
                            className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        />
                    </div>

                    {/* Filter Section */}
                    <div className="mt-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Filter by Section
                            </label>
                            <select
                                id="section-filter"
                                value={sectionFilter}
                                onChange={(e) => {
                                    setSectionFilter(e.target.value);
                                    setCurrentPage(1); // Reset to first page when filter changes
                                }}
                                className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Sections</option>
                                {availableSections.map((section, index) => (
                                    <option key={index} value={section}>{section}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="subsection-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Filter by Sub-Section
                            </label>
                            <select
                                id="subsection-filter"
                                value={subsectionFilter}
                                onChange={(e) => {
                                    setSubsectionFilter(e.target.value);
                                    setCurrentPage(1); // Reset to first page when filter changes
                                }}
                                className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Sub-Sections</option>
                                {availableSubsections.map((subsection, index) => (
                                    <option key={index} value={subsection}>{subsection}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-md font-medium text-gray-800 dark:text-gray-100">Coupon Details</h4>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {paginatedData.length} of {filteredData.length} records
                            </span>
                        </div>
                        
                        <div className="overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-white/50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Section</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sub-Section</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((coupon, index) => (
                                            <tr key={index} className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                                    {coupon.date ? formatDate(coupon.date) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                                    {coupon.employee?.name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                                    {coupon.section?.name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                                    {coupon.sub_section?.name || 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No lunch coupons match your filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-4 flex justify-between items-center">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1 text-sm rounded-md ${currentPage === 1 
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                            : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1 text-sm rounded-md ${currentPage === totalPages 
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                            : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default LunchCouponsCard;