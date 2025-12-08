// resources/js/Pages/EmployeePriorities/Index.jsx
import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index({ employees, categoryStats, filters }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('employee-picking-priorities.index'), {
            search,
            category,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setSearch('');
        setCategory('');
        router.get(route('employee-picking-priorities.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const removePriority = (employeeId, priorityCategory, priorityId = null) => {
        if (confirm('Are you sure you want to remove this priority?')) {
            router.delete(route('employee-picking-priorities.destroy', priorityId || employeeId), {
                data: { category: priorityCategory },
                preserveScroll: true,
                onSuccess: () => {
                    // Optional: show toast notification
                },
            });
        }
    };

    const getCategoryColor = (categoryKey) => {
        const colors = {
            'skill_certified': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            'senior': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            'special_project': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'training': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'performance': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'operational': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
            'quality_control': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
            'machine_operator': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            'general_priority': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        };
        return colors[categoryKey] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    };

    const getWeightColor = (weight) => {
        if (weight >= 2.0) return 'text-red-600 dark:text-red-400';
        if (weight >= 1.5) return 'text-orange-600 dark:text-orange-400';
        if (weight >= 1.2) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-green-600 dark:text-green-400';
    };

    // Calculate total employees with priority
    const totalWithPriority = employees.data.filter(emp => emp.picking_priorities.length > 0).length;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                        Employee Picking Priorities
                    </h2>
                    <Link
                        href={route('employee-picking-priorities.create')}
                        className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md font-medium text-white text-sm"
                    >
                        + Add Priority
                    </Link>
                </div>
            }
        >
            <Head title="Employee Picking Priorities" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {flash?.success && (
    <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 dark:text-green-300">{flash.success}</span>
        </div>
    </div>
)}

{flash?.error && (
    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 dark:text-red-300">{flash.error}</span>
        </div>
    </div>
)}

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Search Employee
                                    </label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name or NIK..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Filter by Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">All Categories</option>
                                        {Object.entries(categoryStats).map(([key, cat]) => (
                                            <option key={key} value={key}>
                                                {cat.name} ({cat.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Reset Filters
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium text-white"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Employees Table */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Type & Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Sub Sections
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Priorities
                                        </th>
                                       
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {employees.data.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="text-gray-500 dark:text-gray-400">
                                                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-lg">No employees with priority found</p>
                                                    <p className="mt-1">Try adjusting your search filters or add new priorities</p>
                                                    <Link
                                                        href={route('employee-picking-priorities.create')}
                                                        className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-white text-sm"
                                                    >
                                                        Add First Priority
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        employees.data.map((employee) => (
                                            <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                                            <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                                                                {employee.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {employee.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                NIK: {employee.nik}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            employee.type === 'bulanan'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                                        }`}>
                                                            {employee.type}
                                                        </span>
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            employee.status === 'available'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                                : employee.status === 'assigned'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                        }`}>
                                                            {employee.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {employee.sub_sections?.map((subSection) => (
                                                            <span
                                                                key={subSection.id}
                                                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded"
                                                            >
                                                                {subSection.name}
                                                                {subSection.section?.name && ` (${subSection.section.name})`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {employee.picking_priorities?.map((priority) => (
                                                            <span
                                                                key={priority.id}
                                                                className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(priority.category)}`}
                                                            >
                                                                {priority.category_name || priority.category.replace('_', ' ')}
                                                            </span>
                                                        ))}
                                                        {employee.picking_priorities?.length === 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                No priorities
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {employees.data.length > 0 && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {employees.from} to {employees.to} of {employees.total} employees with priority
                                    </div>
                                    <div className="flex space-x-2">
                                        {employees.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => link.url && router.get(link.url)}
                                                disabled={!link.url}
                                                className={`px-3 py-1 rounded-md text-sm font-medium ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white'
                                                        : link.url
                                                        ? 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 flex justify-between items-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {employees.total} employees with priority
                        </div>
                        <div className="flex space-x-3">
                            <Link
                                href={route('employee-picking-priorities.create')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium text-white"
                            >
                                + Add New Priority
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}