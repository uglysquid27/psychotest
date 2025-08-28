import React from 'react';
import { Link } from '@inertiajs/react';

const EmployeeActions = ({ employee, isUser, isMobile = false }) => {
    if (isMobile) {
        return (
            <>
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

            {/* {employee.sub_sections?.some(ss => ss.section?.name === 'Operator Forklift') && ( */}
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

            {/* )} */}
        </div>
    );
};

export default EmployeeActions;