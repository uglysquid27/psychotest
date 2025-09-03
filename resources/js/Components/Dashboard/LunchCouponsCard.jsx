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
        } catch (error) {
            console.error('Error fetching lunch coupons data:', error);
        } finally {
            setIsLoading(false);
        }
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
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        />
                    </div>

                    <div className="mt-6">
                        <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-100">Coupon Details</h4>
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
                                    {todayCouponsData.length > 0 ? (
                                        todayCouponsData.map((coupon, index) => (
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
                                            <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No lunch coupons for selected date
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LunchCouponsCard;