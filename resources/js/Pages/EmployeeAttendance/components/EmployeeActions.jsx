import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import ResetCutiModal from './ResetCutiModal'; // Import the modal

const EmployeeActions = ({ employee, isUser, isMobile = false }) => {
    const [showResetCutiModal, setShowResetCutiModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleResetCuti = () => {
        setShowResetCutiModal(true);
    };

    const confirmResetCuti = () => {
        setProcessing(true);
        router.post(route('employee-attendance.reset-cuti', employee.id), {}, {
            onSuccess: () => {
                setShowResetCutiModal(false);
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
                alert('Failed to reset cuti status. Please try again.');
            },
        });
    };

    if (isMobile) {
        return (
            <>
                <ResetCutiModal
                    show={showResetCutiModal}
                    onClose={() => setShowResetCutiModal(false)}
                    onConfirm={confirmResetCuti}
                    employee={employee}
                    processing={processing}
                />

                {employee.sub_sections?.some(ss => ss.section?.name === 'Operator Forklift') && (
                    <Link
                        href={route('employees.license.show', employee.id)}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                    >
                        View License
                    </Link>
                )}
                {!isUser && (
                    <>
                        <Link
                            href={route('employee-attendance.edit', employee.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                            Edit
                        </Link>
                        {/* Add Reset Cuti button for mobile */}
                        {employee.cuti === 'yes' && (
                            <button
                                onClick={handleResetCuti}
                                className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 text-sm"
                            >
                                Reset Cuti
                            </button>
                        )}
                        <Link
                            href={route('employee-attendance.deactivate', employee.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                            Deactivate
                        </Link>
                    </>
                )}
            </>
        );
    }

    return (
        <>
            <ResetCutiModal
                show={showResetCutiModal}
                onClose={() => setShowResetCutiModal(false)}
                onConfirm={confirmResetCuti}
                employee={employee}
                processing={processing}
            />

            <div className="flex space-x-2">
                {!isUser && (
                    <>
                        <Link
                            href={route('employee-attendance.edit', employee.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </Link>

                            <button
                                onClick={handleResetCuti}
                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                title="Reset Cuti"
                                disabled={processing}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                        <Link
                            href={route('employee-attendance.deactivate', employee.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Deactivate"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2" />
                            </svg>
                        </Link>
                    </>
                )}

                <Link
                    href={route('employees.license.show', employee.id)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    title="View License"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 8h6M9 12h6M7 16h10"
                        />
                    </svg>
                </Link>
            </div>
        </>
    );
};

export default EmployeeActions;