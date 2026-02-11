// resources/js/Pages/Psychotest/TestAssignments/Index.jsx

import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
const AssignmentIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const FilterIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export default function TestAssignmentsIndex({ assignments, filters, testTypes, statuses, auth }) {
    const { data, setData, get, processing, reset } = useForm({
        search: filters.search || '',
        status: filters.status || '',
        test_type: filters.test_type || '',
        per_page: filters.per_page || 10,
    });

    const [selectedAssignments, setSelectedAssignments] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkAssignData, setBulkAssignData] = useState({
        test_type: '',
        test_name: '',
        due_date: '',
        notes: '',
        niks: [],
    });
    
    // State for assignments to enable real-time updates
    const [localAssignments, setLocalAssignments] = useState(assignments.data);

    // Update local assignments when prop changes
    useEffect(() => {
        setLocalAssignments(assignments.data);
    }, [assignments.data]);

    // Apply filters
    const applyFilters = () => {
        get(route('admin.test-assignments.index'), {
            preserveState: true,
            preserveScroll: true,
            data: data,
        });
    };

    // Reset filters
    const resetFilters = () => {
        setData({
            search: '',
            status: '',
            test_type: '',
            per_page: 10,
        });
        get(route('admin.test-assignments.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle selection
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedAssignments(localAssignments.map(item => item.id));
        } else {
            setSelectedAssignments([]);
        }
    };

    const handleSelect = (id) => {
        setSelectedAssignments(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    // Bulk delete - Fixed version
    const handleBulkDelete = () => {
        if (selectedAssignments.length === 0) return;
        
        // Create form data
        const formData = new FormData();
        formData.append('ids', JSON.stringify(selectedAssignments));
        
        // Use fetch API instead of router.post to handle JSON response
        fetch(route('admin.test-assignments.bulk-delete'), {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ ids: selectedAssignments }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Assignments deleted successfully') {
                // Remove deleted assignments from local state
                setLocalAssignments(prev => 
                    prev.filter(assignment => !selectedAssignments.includes(assignment.id))
                );
                
                // Update pagination info
                assignments.total = assignments.total - selectedAssignments.length;
                assignments.from = Math.max(1, assignments.from - selectedAssignments.length);
                assignments.to = Math.max(0, assignments.to - selectedAssignments.length);
                
                // Clear selection and close modal
                setSelectedAssignments([]);
                setShowDeleteModal(false);
                
                // Show success message (you might want to add a toast notification)
                console.log(data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting assignments:', error);
        });
    };

    // Single delete
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this assignment?')) {
            // Use fetch API for single delete too
            fetch(route('admin.test-assignments.destroy', id), {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            })
            .then(response => {
                if (response.ok) {
                    // Remove from local state
                    setLocalAssignments(prev => 
                        prev.filter(assignment => assignment.id !== id)
                    );
                    
                    // Update pagination info
                    assignments.total = assignments.total - 1;
                    
                    console.log('Assignment deleted successfully');
                }
            })
            .catch(error => {
                console.error('Error deleting assignment:', error);
            });
        }
    };

    // Update bulk assign data
    const updateBulkAssignData = (field, value) => {
        setBulkAssignData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Bulk assign
    const handleBulkAssign = () => {
        if (!bulkAssignData.test_type || bulkAssignData.niks.length === 0) {
            alert('Please select test type and at least one employee');
            return;
        }

        router.post(route('admin.test-assignments.bulk-assign'), bulkAssignData, {
            onSuccess: () => {
                setShowBulkAssignModal(false);
                setBulkAssignData({
                    test_type: '',
                    test_name: '',
                    due_date: '',
                    notes: '',
                    niks: [],
                });
                // Refresh the page to show new assignments
                get(route('admin.test-assignments.index'), {
                    preserveState: true,
                    preserveScroll: true,
                });
            },
            onError: (errors) => {
                console.error('Bulk assign failed:', errors);
            },
        });
    };

    // Status badge
    const getStatusBadge = (status) => {
        const colors = {
            'assigned': 'bg-blue-100 text-blue-800',
            'in_progress': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'expired': 'bg-red-100 text-red-800',
        };
        
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {statuses[status] || status}
            </span>
        );
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
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
                        <AssignmentIcon />
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Test Assignments Management
                        </h2>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowBulkAssignModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:border-indigo-800 focus:ring-2 focus:ring-indigo-300 transition ease-in-out duration-150"
                        >
                            <PlusIcon />
                            <span className="ml-2">Bulk Assign</span>
                        </button>
                        <Link
                            href={route('admin.test-assignments.create')}
                            className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 active:bg-green-800 focus:outline-none focus:border-green-800 focus:ring-2 focus:ring-green-300 transition ease-in-out duration-150"
                        >
                            <PlusIcon />
                            <span className="ml-2">New Assignment</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Test Assignments" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Search */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon />
                                    </div>
                                    <input
                                        type="text"
                                        value={data.search}
                                        onChange={e => setData('search', e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && applyFilters()}
                                        placeholder="Search NIK or Name..."
                                        className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FilterIcon />
                                    </div>
                                    <select
                                        value={data.status}
                                        onChange={e => setData('status', e.target.value)}
                                        className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    >
                                        <option value="">All Status</option>
                                        {Object.entries(statuses).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Test Type Filter */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FilterIcon />
                                    </div>
                                    <select
                                        value={data.test_type}
                                        onChange={e => setData('test_type', e.target.value)}
                                        className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    >
                                        <option value="">All Test Types</option>
                                        {Object.entries(testTypes).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Per Page */}
                                <div className="flex space-x-2">
                                    <select
                                        value={data.per_page}
                                        onChange={e => setData('per_page', e.target.value)}
                                        className="border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    >
                                        <option value="10">10 per page</option>
                                        <option value="25">25 per page</option>
                                        <option value="50">50 per page</option>
                                        <option value="100">100 per page</option>
                                    </select>
                                    <button
                                        onClick={applyFilters}
                                        disabled={processing}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={resetFilters}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bulk Actions Bar */}
                    {selectedAssignments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <CheckIcon className="text-yellow-600 mr-2" />
                                    <span className="text-yellow-800 font-medium">
                                        {selectedAssignments.length} assignment(s) selected
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                                    >
                                        <TrashIcon className="mr-1" />
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Assignments Table */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div className="p-0">
                            {localAssignments.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <AssignmentIcon className="w-16 h-16 mx-auto opacity-50" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No assignments found
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        {filters.search || filters.status || filters.test_type
                                            ? 'Try adjusting your filters'
                                            : 'Get started by creating a new assignment'}
                                    </p>
                                    <Link
                                        href={route('admin.test-assignments.create')}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700"
                                    >
                                        <PlusIcon className="mr-2" />
                                        Create First Assignment
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssignments.length === localAssignments.length && localAssignments.length > 0}
                                                        onChange={handleSelectAll}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Employee
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Test Details
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Dates
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Score
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {localAssignments.map((assignment) => (
                                                <motion.tr
                                                    key={assignment.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAssignments.includes(assignment.id)}
                                                            onChange={() => handleSelect(assignment.id)}
                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {assignment.employee?.photo ? (
                                                                <img
                                                                    src={`/storage/${assignment.employee.photo}`}
                                                                    alt={assignment.employee.name}
                                                                    className="h-8 w-8 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                                    <span className="text-indigo-800 font-bold text-sm">
                                                                        {getInitials(assignment.employee?.name)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {assignment.employee?.name || 'Unknown Employee'}
                                                                </div>
                                                                <div className="text-sm text-gray-500 flex items-center">
                                                                    <UserIcon className="w-3 h-3 mr-1" />
                                                                    {assignment.nik}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {testTypes[assignment.test_type] || assignment.test_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {assignment.test_type}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(assignment.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            <div className="flex items-center">
                                                                <ClockIcon className="w-3 h-3 mr-1 text-gray-400" />
                                                                Assigned: {formatDate(assignment.created_at)}
                                                            </div>
                                                            {assignment.due_date && (
                                                                <div className={`flex items-center mt-1 ${new Date(assignment.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                                                                    <ClockIcon className="w-3 h-3 mr-1" />
                                                                    Due: {formatDate(assignment.due_date)}
                                                                </div>
                                                            )}
                                                            {assignment.completed_at && (
                                                                <div className="flex items-center mt-1 text-green-600">
                                                                    <CheckIcon className="w-3 h-3 mr-1" />
                                                                    Completed: {formatDate(assignment.completed_at)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {assignment.score !== null ? (
                                                            <div className="text-sm">
                                                                <div className="font-medium text-gray-900">
                                                                    Score: {assignment.score}
                                                                </div>
                                                                <div className={`font-medium ${assignment.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {assignment.percentage}%
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">Not taken</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <Link
                                                                href={route('admin.test-assignments.edit', assignment.id)}
                                                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                                            >
                                                                <EditIcon className="mr-1" />
                                                                Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(assignment.id)}
                                                                className="text-red-600 hover:text-red-900 flex items-center"
                                                            >
                                                                <TrashIcon className="mr-1" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination - Use the original assignments prop for pagination info */}
                            {assignments.data.length > 0 && (
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{assignments.from}</span> to{' '}
                                            <span className="font-medium">{assignments.to}</span> of{' '}
                                            <span className="font-medium">{assignments.total}</span> results
                                        </div>
                                        <div className="flex space-x-2">
                                            {assignments.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    className={`px-3 py-1 rounded-md ${
                                                        link.active
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center mb-4">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                    <TrashIcon className="h-5 w-5 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Delete Assignment{selectedAssignments.length > 1 ? 's' : ''}
                                </h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete {selectedAssignments.length} assignment{selectedAssignments.length > 1 ? 's' : ''}?
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Assign Modal */}
            <AnimatePresence>
                {showBulkAssignModal && (
                    <BulkAssignModal
                        show={showBulkAssignModal}
                        onClose={() => setShowBulkAssignModal(false)}
                        onSubmit={handleBulkAssign}
                        data={bulkAssignData}
                        updateData={updateBulkAssignData}
                        testTypes={testTypes}
                    />
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}

// Bulk Assign Modal Component
function BulkAssignModal({ show, onClose, onSubmit, data, updateData, testTypes }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Make sure data.niks is always an array
    const niks = data.niks || [];

    const searchEmployees = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(route('admin.test-assignments.search-employees', { search: searchTerm }));
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

    const addEmployee = (employee) => {
        if (!niks.includes(employee.nik)) {
            updateData('niks', [...niks, employee.nik]);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeEmployee = (nik) => {
        updateData('niks', niks.filter(n => n !== nik));
    };

    const handleInputChange = (field, value) => {
        updateData(field, value);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Bulk Assign Tests</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Test Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Test Type *
                        </label>
                        <select
                            value={data.test_type || ''}
                            onChange={e => handleInputChange('test_type', e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            required
                        >
                            <option value="">Select Test Type</option>
                            {Object.entries(testTypes).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Test Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Test Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={data.test_name || ''}
                            onChange={e => handleInputChange('test_name', e.target.value)}
                            placeholder="Custom test name"
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={data.due_date || ''}
                            onChange={e => handleInputChange('due_date', e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={data.notes || ''}
                            onChange={e => handleInputChange('notes', e.target.value)}
                            rows={3}
                            placeholder="Additional notes..."
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>

                    {/* Employee Search and Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Employees *
                        </label>
                        
                        {/* Search Input */}
                        <div className="relative mb-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyUp={searchEmployees}
                                placeholder="Search employees by NIK or name..."
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            {loading && (
                                <div className="absolute right-3 top-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                                {searchResults.map(employee => (
                                    <div
                                        key={employee.nik}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => addEmployee(employee)}
                                    >
                                        <div className="font-medium">{employee.name}</div>
                                        <div className="text-sm text-gray-500">NIK: {employee.nik}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selected Employees */}
                        {niks.length > 0 && (
                            <div className="mt-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                    Selected Employees ({niks.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {niks.map((nik, index) => (
                                        <div
                                            key={index}
                                            className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full flex items-center"
                                        >
                                            <span className="mr-2">{nik}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeEmployee(nik)}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!data.test_type || niks.length === 0}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Assign to {niks.length} Employee{niks.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}