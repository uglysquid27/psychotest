// resources/js/Pages/EmployeePriorities/Categories.jsx
import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Categories({ categories, employeesByCategory }) {
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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                        Priority Categories
                    </h2>
                    <div className="flex space-x-2">
                        <Link
                            href={route('employee-picking-priorities.index')}
                            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-medium text-white text-sm"
                        >
                            Back to List
                        </Link>
                        <Link
                            href={route('employee-picking-priorities.create')}
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md font-medium text-white text-sm"
                        >
                            + Add Priority
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Priority Categories" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Categories Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {Object.entries(categories).map(([key, category]) => (
                            <div key={key} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(key)}`}>
                                        {category.name}
                                    </div>
                                    <span className={`text-lg font-bold ${getWeightColor(category.weight)}`}>
                                        {category.weight}x
                                    </span>
                                </div>
                                
                                <div className="text-center mb-4">
                                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                        {category.count}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        employees
                                    </div>
                                </div>
                                
                                {employeesByCategory[key] && employeesByCategory[key].length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Recent Employees:
                                        </div>
                                        <div className="space-y-2">
                                            {employeesByCategory[key].slice(0, 3).map(employee => (
                                                <div key={employee.id} className="flex items-center text-sm">
                                                    <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-2">
                                                        <span className="text-indigo-600 dark:text-indigo-300 text-xs font-medium">
                                                            {employee.name.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-900 dark:text-gray-100 truncate">
                                                        {employee.name}
                                                    </span>
                                                </div>
                                            ))}
                                            {employeesByCategory[key].length > 3 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    +{employeesByCategory[key].length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Category Details */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        {Object.entries(categories).map(([key, category]) => (
                            <div key={key} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center">
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium mr-3 ${getCategoryColor(key)}`}>
                                                {category.name}
                                            </div>
                                            <span className={`text-sm font-medium ${getWeightColor(category.weight)}`}>
                                                {category.weight}x boost multiplier
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {category.count} employees
                                        </span>
                                    </div>

                                    {employeesByCategory[key] && employeesByCategory[key].length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                            Employee
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                            NIK
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                            Type & Status
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                            Sub Sections
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {employeesByCategory[key].map(employee => (
                                                        <tr key={employee.id}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center">
                                                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-3">
                                                                        <span className="text-indigo-600 dark:text-indigo-300 text-sm font-medium">
                                                                            {employee.name.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                        {employee.name}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                                {employee.nik}
                                                            </td>
                                                            <td className="px-4 py-3">
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
                                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                                    }`}>
                                                                        {employee.status}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {employee.sub_sections?.map(subSection => (
                                                                        <span
                                                                            key={subSection.id}
                                                                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded"
                                                                        >
                                                                            {subSection.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No employees in this category
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}