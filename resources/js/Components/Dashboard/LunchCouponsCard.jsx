// LunchCouponsCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);
dayjs.locale('id');

const LunchCouponsCard = ({ formatDate }) => {
    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [totalCoupons, setTotalCoupons] = useState(0);
    const [pendingCoupons, setPendingCoupons] = useState(0);
    const [claimedCoupons, setClaimedCoupons] = useState(0);
    const [todayCouponsData, setTodayCouponsData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    
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

    const filteredData = todayCouponsData.filter(coupon => {
        const matchesSection = !sectionFilter || coupon.section?.name === sectionFilter;
        const matchesSubsection = !subsectionFilter || coupon.sub_section?.name === subsectionFilter;
        return matchesSection && matchesSubsection;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const formattedDate = dayjs(date).format('dddd, D MMMM YYYY');

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30 p-4 sm:p-6 relative transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Today's Lunch Coupons</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Coupon distribution and status
                    </p>
                </div>
                <Link 
                    href={route('lunch-coupons.index')} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                >
                    View All
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-4 text-center border border-indigo-100 dark:border-indigo-800">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalCoupons}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Coupons</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 text-center border border-yellow-100 dark:border-yellow-800">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCoupons}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 text-center border border-green-100 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{claimedCoupons}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Claimed</div>
                        </div>
                    </div>

                    <div className="mb-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {formattedDate}
                    </div>

                    {/* Date Picker */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        />
                    </div>

                    {/* Filter Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Filter by Section
                            </label>
                            <select
                                value={sectionFilter}
                                onChange={(e) => {
                                    setSectionFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Sections</option>
                                {availableSections.map((section, index) => (
                                    <option key={index} value={section}>{section}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Filter by Sub-Section
                            </label>
                            <select
                                value={subsectionFilter}
                                onChange={(e) => {
                                    setSubsectionFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                <option value="">All Sub-Sections</option>
                                {availableSubsections.map((subsection, index) => (
                                    <option key={index} value={subsection}>{subsection}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Coupon Details Table */}
                    <div className="mt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100">Coupon Details</h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {paginatedData.length} of {filteredData.length} records
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px] divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50/80 dark:bg-gray-700/80">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Date</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Section</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Sub-Section</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((coupon, index) => (
                                            <tr key={index} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDate ? formatDate(coupon.date) : coupon.date}
                                                </td>
                                                <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {coupon.employee?.name || 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {coupon.section?.name || 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {coupon.sub_section?.name || 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-3 py-4 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                                    <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-sm">No lunch coupons found</p>
                                                    <p className="text-xs mt-1">Try selecting a different date or filter</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === 1
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === totalPages
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                                        }`}
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