// resources/js/Pages/Psychotest/TestAssignments/Edit.jsx

import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Icons
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

const UserIcon = () => (
    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export default function TestAssignmentEdit({ auth, assignment, testTypes, statuses }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        test_type: assignment?.test_type || '',
        test_name: assignment?.test_name || '',
        status: assignment?.status || 'assigned',
        due_date: assignment?.due_date ? assignment.due_date.split(' ')[0] : '',
        score: assignment?.score || '',
        percentage: assignment?.percentage || '',
        notes: assignment?.notes || '',
    });

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        
        put(route('admin.test-assignments.update', assignment.id), {
            onSuccess: () => {
                // Optionally show success message
            },
            onError: (errors) => {
                console.error('Update failed:', errors);
            },
        });
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get employee initials
    const getInitials = (name) => {
        if (!name) return 'EE';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
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
                            Back to Assignments
                        </Link>
                        <AssignmentIcon />
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Edit Test Assignment
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title="Edit Assignment" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Employee Information Card */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Information</h3>
                                <div className="flex items-center space-x-4">
                                    {assignment.employee?.photo ? (
                                        <img
                                            src={`/storage/${assignment.employee.photo}`}
                                            alt={assignment.employee.name}
                                            className="h-16 w-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="text-indigo-800 font-bold text-xl">
                                                {getInitials(assignment.employee?.name)}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xl font-semibold text-gray-900">
                                            {assignment.employee?.name || 'Unknown Employee'}
                                        </div>
                                        <div className="text-gray-600 flex items-center">
                                            <UserIcon />
                                            NIK: {assignment.nik}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">
                                            Assignment ID: {assignment.id}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assignment Timeline */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Timeline</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                                            <span className="text-gray-700">Created</span>
                                        </div>
                                        <span className="text-gray-600">{formatDate(assignment.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-3"></div>
                                            <span className="text-gray-700">Last Updated</span>
                                        </div>
                                        <span className="text-gray-600">{formatDate(assignment.updated_at)}</span>
                                    </div>
                                    {assignment.completed_at && (
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                                <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                                                <span className="text-gray-700">Completed</span>
                                            </div>
                                            <span className="text-gray-600">{formatDate(assignment.completed_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="space-y-6">
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
                                            Test Name
                                        </label>
                                        <input
                                            type="text"
                                            value={data.test_name}
                                            onChange={e => setData('test_name', e.target.value)}
                                            placeholder="Custom test name"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        />
                                        {errors.test_name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.test_name}</p>
                                        )}
                                    </div>

                                    {/* Status */}
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
                                        {errors.status && (
                                            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                                        )}
                                    </div>

                                    {/* Due Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Due Date
                                        </label>
                                        <div className="flex items-center">
                                            <CalendarIcon />
                                            <input
                                                type="date"
                                                value={data.due_date}
                                                onChange={e => setData('due_date', e.target.value)}
                                                className="ml-2 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                        </div>
                                        {errors.due_date && (
                                            <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                                        )}
                                    </div>

                                    {/* Score and Percentage */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Score
                                            </label>
                                            <input
                                                type="number"
                                                value={data.score}
                                                onChange={e => setData('score', e.target.value)}
                                                min="0"
                                                placeholder="Enter score"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                            {errors.score && (
                                                <p className="mt-1 text-sm text-red-600">{errors.score}</p>
                                            )}
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
                                                placeholder="0-100"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                            />
                                            {errors.percentage && (
                                                <p className="mt-1 text-sm text-red-600">{errors.percentage}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Notes
                                        </label>
                                        <textarea
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                            rows={4}
                                            placeholder="Additional notes or instructions..."
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        />
                                        {errors.notes && (
                                            <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
                                        )}
                                    </div>

                                    {/* Read-only Fields */}
                                    <div className="border-t border-gray-200 pt-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Attempts
                                                </label>
                                                <div className="text-sm text-gray-900">
                                                    {assignment.attempts || 0} time(s)
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Last Attempt
                                                </label>
                                                <div className="text-sm text-gray-900">
                                                    {assignment.last_attempt_at ? formatDate(assignment.last_attempt_at) : 'Never'}
                                                </div>
                                            </div>
                                        </div>
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
                                            disabled={processing || !data.test_type || !data.status}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? (
                                                <span className="flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Updating...
                                                </span>
                                            ) : (
                                                'Update Assignment'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-red-200">
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-red-700 mb-4">Danger Zone</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Delete this assignment</h4>
                                        <p className="text-sm text-gray-600">
                                            Once deleted, this assignment cannot be recovered. The employee will no longer have access to this test.
                                        </p>
                                    </div>
                                    <Link
                                        href={route('admin.test-assignments.destroy', assignment.id)}
                                        method="delete"
                                        as="button"
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                        onClick={(e) => {
                                            if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        Delete Assignment
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}