// resources/js/Pages/Psychotest/TestAssignments/Create.jsx
// resources/js/Pages/Psychotest/TestAssignments/Edit.jsx

import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Icons (reuse from Index)
const AssignmentIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

export default function TestAssignmentForm({ auth, assignment, testTypes, statuses, isEdit = false }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        nik: assignment?.nik || '',
        test_type: assignment?.test_type || '',
        test_name: assignment?.test_name || '',
        status: assignment?.status || 'assigned',
        due_date: assignment?.due_date ? assignment.due_date.split(' ')[0] : '',
        score: assignment?.score || '',
        percentage: assignment?.percentage || '',
        notes: assignment?.notes || '',
    });

    const [employeeSearch, setEmployeeSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);

    // If editing and assignment has employee, load employee data
    useEffect(() => {
        if (isEdit && assignment?.employee) {
            setSelectedEmployee({
                nik: assignment.employee.nik,
                name: assignment.employee.name,
                photo: assignment.employee.photo,
            });
        }
    }, [isEdit, assignment]);

    // Search employees
    const searchEmployees = async () => {
        if (!employeeSearch.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(route('admin.test-assignments.search-employees', { search: employeeSearch }));
            const result = await response.json();
            if (result.success) {
                setSearchResults(result.data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Select employee
    const selectEmployee = (employee) => {
        setSelectedEmployee(employee);
        setData('nik', employee.nik);
        setEmployeeSearch('');
        setSearchResults([]);
    };

    // Remove selected employee
    const removeSelectedEmployee = () => {
        setSelectedEmployee(null);
        setData('nik', '');
    };

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isEdit) {
            put(route('admin.test-assignments.update', assignment.id), {
                onSuccess: () => reset(),
            });
        } else {
            post(route('admin.test-assignments.store'), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Link
                            href={route('admin.test-assignments.index')}
                            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                        >
                            <ArrowLeftIcon />
                            Back
                        </Link>
                        <AssignmentIcon />
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            {isEdit ? 'Edit Test Assignment' : 'Create New Test Assignment'}
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title={isEdit ? 'Edit Assignment' : 'New Assignment'} />

            <div className="py-6">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Employee Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Employee *
                                    </label>
                                    
                                    {selectedEmployee ? (
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center">
                                                {selectedEmployee.photo ? (
                                                    <img
                                                        src={`/storage/${selectedEmployee.photo}`}
                                                        alt={selectedEmployee.name}
                                                        className="h-10 w-10 rounded-full object-cover mr-3"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                                        <span className="text-indigo-800 font-bold">
                                                            {selectedEmployee.name.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {selectedEmployee.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        NIK: {selectedEmployee.nik}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeSelectedEmployee}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={employeeSearch}
                                                    onChange={(e) => {
                                                        setEmployeeSearch(e.target.value);
                                                        searchEmployees();
                                                    }}
                                                    placeholder="Search employee by NIK or name..."
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                />
                                                {loading && (
                                                    <div className="absolute right-3 top-3">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                                    </div>
                                                )}
                                            </div>
                                            {errors.nik && (
                                                <p className="mt-1 text-sm text-red-600">{errors.nik}</p>
                                            )}
                                            
                                            {/* Search Results */}
                                            {searchResults.length > 0 && (
                                                <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                                                    {searchResults.map(employee => (
                                                        <div
                                                            key={employee.nik}
                                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                            onClick={() => selectEmployee(employee)}
                                                        >
                                                            <div className="font-medium">{employee.name}</div>
                                                            <div className="text-sm text-gray-500">NIK: {employee.nik}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Test Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Test Type *
                                    </label>
                                    <select
                                        value={data.test_type}
                                        onChange={e => setData('test_type', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        required
                                    >
                                        <option value="">Select Test Type</option>
                                        {Object.entries(testTypes).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    {errors.test_type && (
                                        <p className="mt-1 text-sm text-red-600">{errors.test_type}</p>
                                    )}
                                </div>

                                {/* Test Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Test Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.test_name}
                                        onChange={e => setData('test_name', e.target.value)}
                                        placeholder="Custom test name (defaults to test type)"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                </div>

                                {/* Status (only for edit) */}
                                {isEdit && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status *
                                        </label>
                                        <select
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            required
                                        >
                                            {Object.entries(statuses).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Due Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Due Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={data.due_date}
                                        onChange={e => setData('due_date', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                </div>

                                {/* Score and Percentage (only for edit) */}
                                {isEdit && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Score
                                            </label>
                                            <input
                                                type="number"
                                                value={data.score}
                                                onChange={e => setData('score', e.target.value)}
                                                min="0"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Percentage (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.percentage}
                                                onChange={e => setData('percentage', e.target.value)}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        rows={4}
                                        placeholder="Additional notes or instructions..."
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                    <Link
                                        href={route('admin.test-assignments.index')}
                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing || !data.nik || !data.test_type}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <span className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                {isEdit ? 'Updating...' : 'Creating...'}
                                            </span>
                                        ) : (
                                            isEdit ? 'Update Assignment' : 'Create Assignment'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}