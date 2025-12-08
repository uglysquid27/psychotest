// resources/js/Pages/EmployeePriorities/Create.jsx
import React, { useState, useEffect } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Create() {
    const { employees } = usePage().props;
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Pagination state
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [paginatedEmployees, setPaginatedEmployees] = useState([]);
    const [totalPages, setTotalPages] = useState(1);

    const { data, setData, post, processing, errors } = useForm({
        employee_id: '',
    });

    // Initialize filtered employees
    useEffect(() => {
        const filtered = employees.filter(emp => {
            if (!searchTerm.trim()) return true;
            
            const search = searchTerm.toLowerCase();
            return (
                emp.name.toLowerCase().includes(search) ||
                emp.nik.toLowerCase().includes(search)
            );
        });
        
        setFilteredEmployees(filtered);
        setCurrentPage(1); // Reset to first page when search changes
    }, [employees, searchTerm]);

    // Paginate employees
    useEffect(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginated = filteredEmployees.slice(startIndex, endIndex);
        
        setPaginatedEmployees(paginated);
        setTotalPages(Math.ceil(filteredEmployees.length / itemsPerPage));
    }, [filteredEmployees, currentPage, itemsPerPage]);

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setData('employee_id', employee.id);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('employee-picking-priorities.store'), {
            onSuccess: () => {
                setSelectedEmployee(null);
                setSearchTerm('');
                setData({ employee_id: '' });
            },
        });
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleItemsPerPageChange = (e) => {
        const value = parseInt(e.target.value);
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to first page
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        
        return pages;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Add Picking Priority
                </h2>
            }
        >
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-2xl font-bold">Add Priority to Employee</h1>
                                <Link
                                    href={route('employee-picking-priorities.index')}
                                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-medium text-white text-sm"
                                >
                                    Back to List
                                </Link>
                            </div>

                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            <strong>How it works:</strong> Select an employee to give them priority in scheduling. 
                                            Employees with priority will get higher scores in ML recommendations.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Search Section */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium mb-4">Search Employee</h3>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Type name or NIK to search..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center">
                                                <label htmlFor="itemsPerPage" className="text-sm text-gray-600 dark:text-gray-300 mr-2">
                                                    Show:
                                                </label>
                                                <select
                                                    id="itemsPerPage"
                                                    value={itemsPerPage}
                                                    onChange={handleItemsPerPageChange}
                                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                                                >
                                                    <option value="5">5</option>
                                                    <option value="10">10</option>
                                                    <option value="20">20</option>
                                                    <option value="50">50</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Showing {paginatedEmployees.length} of {filteredEmployees.length} employee(s)
                                            {searchTerm && ` for "${searchTerm}"`}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Selection */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium mb-4">Select Employee</h3>
                                    
                                    {paginatedEmployees.length === 0 ? (
                                        <div className="text-center py-8">
                                            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="mt-2 text-gray-600 dark:text-gray-300">
                                                {searchTerm ? 'No employees found matching your search' : 'No employees available for priority assignment'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                                {paginatedEmployees.map((employee) => (
                                                    <div
                                                        key={employee.id}
                                                        onClick={() => handleEmployeeSelect(employee)}
                                                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                                            selectedEmployee?.id === employee.id 
                                                            ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 transform scale-[1.02]' 
                                                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                                    {employee.name}
                                                                </h4>
                                                                <div className="mt-2 space-y-1">
                                                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                                        <span className="font-medium mr-1">NIK:</span>
                                                                        {employee.nik}
                                                                    </div>
                                                                    <div className="flex items-center space-x-2 text-sm">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                            employee.type === 'bulanan' 
                                                                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300' 
                                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                                        }`}>
                                                                            {employee.type}
                                                                        </span>
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                            employee.status === 'available' 
                                                                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' 
                                                                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                                                                        }`}>
                                                                            {employee.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Subsection Information */}
                                                                {employee.sub_sections.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                                            ASSIGNED TO:
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {employee.sub_sections.map((subSection) => (
                                                                                <span 
                                                                                    key={subSection.id}
                                                                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                                                                                >
                                                                                    {subSection.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {selectedEmployee?.id === employee.id && (
                                                                <div className="ml-2">
                                                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Pagination Controls */}
                                            {totalPages > 1 && (
                                                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => goToPage(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                                                currentPage === 1
                                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                                    : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            Previous
                                                        </button>
                                                        
                                                        <div className="flex space-x-1">
                                                            {getPageNumbers().map((page, index) => (
                                                                page === '...' ? (
                                                                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                                                                        ...
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        key={page}
                                                                        type="button"
                                                                        onClick={() => goToPage(page)}
                                                                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                                                                            currentPage === page
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                        }`}
                                                                    >
                                                                        {page}
                                                                    </button>
                                                                )
                                                            ))}
                                                        </div>
                                                        
                                                        <button
                                                            type="button"
                                                            onClick={() => goToPage(currentPage + 1)}
                                                            disabled={currentPage === totalPages}
                                                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                                                currentPage === totalPages
                                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                                    : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {errors.employee_id && (
                                        <p className="mt-2 text-sm text-red-600">{errors.employee_id}</p>
                                    )}
                                </div>

                                {/* Selected Employee Summary */}
                                {selectedEmployee && (
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center">
                                                    <span className="text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                                                        {selectedEmployee.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                        {selectedEmployee.name}
                                                    </h4>
                                                    <p className="text-gray-600 dark:text-gray-300">
                                                        NIK: {selectedEmployee.nik} • {selectedEmployee.type} • {selectedEmployee.gender === 'male' ? 'Male' : 'Female'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedEmployee(null);
                                                    setData('employee_id', '');
                                                }}
                                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                            >
                                                Change Selection
                                            </button>
                                        </div>
                                        
                                        {/* Priority Benefit Info */}
                                        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                                            <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
                                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-semibold">Priority Benefits:</span>
                                            </div>
                                            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 ml-7">
                                                <li>• Higher score in ML recommendations</li>
                                                <li>• Priority in scheduling assignments</li>
                                                <li>• Automatic 1.5x boost multiplier</li>
                                                <li>• Higher chance of assignment to preferred sections</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        href={route('employee-picking-priorities.index')}
                                        className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium text-white"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing || !selectedEmployee}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium text-white shadow-lg transform transition-all duration-200 hover:scale-[1.02]"
                                    >
                                        {processing ? (
                                            <div className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Adding Priority...
                                            </div>
                                        ) : (
                                            `Add Priority to ${selectedEmployee ? selectedEmployee.name.split(' ')[0] : 'Employee'}`
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}