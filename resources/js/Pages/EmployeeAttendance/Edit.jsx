import React, { useState, useEffect } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Edit() {
    const { employee, sections, groupedSubSections, errors } = usePage().props;

    // Ensure sections and sub_sections are always arrays
    const initialSections = Array.isArray(employee.sections) ? employee.sections :
        (employee.sections ? [employee.sections] : []);
    const initialSubSections = Array.isArray(employee.sub_sections) ? employee.sub_sections :
        (employee.sub_sections ? [employee.sub_sections] : []);

    const [formData, setFormData] = useState({
        name: employee.name || '',
        nik: employee.nik || '',
        password: '',
        password_confirmation: '',
        type: employee.type || 'harian',
        status: employee.status || 'available',
        cuti: employee.cuti || 'no',
        gender: employee.gender || 'male',
        sections: initialSections,
        sub_sections: initialSubSections,
    });

    const [availableSubSections, setAvailableSubSections] = useState([]);
    const [sectionSubSectionMap, setSectionSubSectionMap] = useState({});

    // Build mapping of subsections to their parent sections
    useEffect(() => {
        const map = {};
        Object.entries(groupedSubSections).forEach(([section, subSections]) => {
            subSections.forEach(subSection => {
                if (!map[subSection]) map[subSection] = [];
                map[subSection].push(section);
            });
        });
        setSectionSubSectionMap(map);
    }, [groupedSubSections]);

    // Update available subsections when sections change
    useEffect(() => {
        if (formData.sections && formData.sections.length > 0) {
            const subs = formData.sections.flatMap(section =>
                groupedSubSections[section] || []
            );
            setAvailableSubSections([...new Set(subs)]);

            // Filter subsections to only keep those that belong to selected sections
            setFormData(prev => ({
                ...prev,
                sub_sections: prev.sub_sections.filter(sub =>
                    subs.includes(sub) &&
                    sectionSubSectionMap[sub]?.some(s => formData.sections.includes(s))
                )
            }));
        } else {
            setAvailableSubSections([]);
            setFormData(prev => ({ ...prev, sub_sections: [] }));
        }
    }, [formData.sections, groupedSubSections, sectionSubSectionMap]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSectionChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const newSections = checked
                ? [...prev.sections, value]
                : prev.sections.filter(s => s !== value);

            return {
                ...prev,
                sections: newSections,
                // Reset subsections that don't belong to the new sections
                sub_sections: prev.sub_sections.filter(sub =>
                    newSections.some(section =>
                        sectionSubSectionMap[sub]?.includes(section)
                    )
                )
            };
        });
    };

    const handleSubSectionChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const newSubSections = checked
                ? [...prev.sub_sections, value]
                : prev.sub_sections.filter(ss => ss !== value);
            return { ...prev, sub_sections: newSubSections };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.put(route('employee-attendance.update', employee.id), formData, {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.password) {
                    setFormData(prev => ({
                        ...prev,
                        password: '',
                        password_confirmation: ''
                    }));
                }
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Edit Employee: {employee.name}
                </h2>
            }
        >
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-2xl font-bold">Edit Employee Data</h1>
                                <Link
                                    href={route('employee-attendance.index')}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                                >
                                    Back to List
                                </Link>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>

                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium mb-1">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="nik" className="block text-sm font-medium mb-1">
                                                Employee ID (NIK)
                                            </label>
                                            <input
                                                type="text"
                                                id="nik"
                                                name="nik"
                                                value={formData.nik}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                            {errors.nik && <p className="text-red-500 text-sm mt-1">{errors.nik}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="gender" className="block text-sm font-medium mb-1">
                                                Gender
                                            </label>
                                            <select
                                                id="gender"
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="type" className="block text-sm font-medium mb-1">
                                                Employee Type
                                            </label>
                                            <select
                                                id="type"
                                                name="type"
                                                value={formData.type}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="harian">Daily Worker</option>
                                                <option value="bulanan">Monthly Worker</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Status & Security */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium border-b pb-2">Status & Security</h3>

                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium mb-1">
                                                Status
                                            </label>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="available">Available</option>
                                                <option value="assigned">Assigned</option>
                                                <option value="on leave">On Leave</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="cuti" className="block text-sm font-medium mb-1">
                                                Leave Status
                                            </label>
                                            <select
                                                id="cuti"
                                                name="cuti"
                                                value={formData.cuti}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="no">Not on Leave</option>
                                                <option value="yes">On Leave</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium mb-1">
                                                New Password (leave blank to keep current)
                                            </label>
                                            <input
                                                type="password"
                                                id="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="password_confirmation" className="block text-sm font-medium mb-1">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                value={formData.password_confirmation}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* License Button */}
                                        <div className="pt-2">
                                            {route().has('employee-license.show') && (
                                                <Link
                                                    href={route('employee-license.show', employee.id)}
                                                    className="inline-flex items-center px-3 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                    View/Edit License
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section Assignment */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium border-b pb-2">Section Assignment</h3>

                                    {/* Sections Checkbox Group */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2">
                                            Sections (Select at least one)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {sections.map(sectionName => (
                                                <div key={sectionName} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`section-${sectionName}`}
                                                        name="sections"
                                                        value={sectionName}
                                                        checked={formData.sections.includes(sectionName)}
                                                        onChange={handleSectionChange}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                                    />
                                                    <label
                                                        htmlFor={`section-${sectionName}`}
                                                        className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                                                    >
                                                        {sectionName}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.sections && (
                                            <p className="text-red-500 text-sm mt-1">{errors.sections}</p>
                                        )}
                                    </div>

                                    {/* Sub-sections Grouped by Section */}
                                    {formData.sections.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Sub Sections</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {formData.sections.map(sectionName => {
                                                    const sectionSubs = groupedSubSections[sectionName] || [];
                                                    return (
                                                        <div
                                                            key={sectionName}
                                                            className="border border-gray-200 dark:border-gray-700 rounded-md p-3"
                                                        >
                                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                                                                {/* Ensure sectionName is a string by converting it */}
                                                                {String(sectionName)}
                                                            </h4>
                                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                {sectionSubs.length > 0 ? (
                                                                    sectionSubs.map(subName => (
                                                                        <div key={subName} className="flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`sub-section-${sectionName}-${subName}`}
                                                                                name="sub_sections"
                                                                                value={subName}
                                                                                checked={formData.sub_sections.includes(subName)}
                                                                                onChange={handleSubSectionChange}
                                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                                                            />
                                                                            <label
                                                                                htmlFor={`sub-section-${sectionName}-${subName}`}
                                                                                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                                                                            >
                                                                                {subName}
                                                                            </label>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        No sub-sections available
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {errors.sub_sections && (
                                                <p className="text-red-500 text-sm mt-1">{errors.sub_sections}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Save Changes
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