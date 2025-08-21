import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Edit() {
    const { employee, sections: allSections } = usePage().props;
    const [selectedSection, setSelectedSection] = useState(null);
    const [showSubSectionModal, setShowSubSectionModal] = useState(false);
    const [tempSelectedSubSections, setTempSelectedSubSections] = useState([]);

    // Prepare sections data with sub_sections
    const sections = allSections.map(section => ({
        ...section,
        sub_sections: section.sub_sections || []
    }));

    const { data, setData, put, processing, errors } = useForm({
        name: employee.name || '',
        nik: employee.nik || '',
        password: '',
        password_confirmation: '',
        type: employee.type || 'harian',
        status: employee.status || 'available',
        cuti: employee.cuti || 'no',
        gender: employee.gender || 'male',
        sub_sections: employee.sub_sections || [],
    });

    const handleSectionSelect = (section) => {
        setSelectedSection(section);
        // Pre-select any subsections that are already selected for this section
        const currentSectionSubs = data.sub_sections.filter(subName => 
            section.sub_sections.some(sub => sub.name === subName)
        );
        setTempSelectedSubSections(currentSectionSubs);
        setShowSubSectionModal(true);
    };

    const handleSubSectionCheckboxChange = (subSectionName) => {
        setTempSelectedSubSections(prev => {
            if (prev.includes(subSectionName)) {
                return prev.filter(name => name !== subSectionName);
            } else {
                return [...prev, subSectionName];
            }
        });
    };

    const handleSelectAll = () => {
        if (!selectedSection) return;
        
        if (tempSelectedSubSections.length === selectedSection.sub_sections.length) {
            // If all are selected, deselect all
            setTempSelectedSubSections([]);
        } else {
            // Select all subsections
            setTempSelectedSubSections(selectedSection.sub_sections.map(sub => sub.name));
        }
    };

    const applySubSectionSelection = () => {
        if (!selectedSection) return;
        
        // Merge with existing selections from other sections
        const otherSectionsSubs = data.sub_sections.filter(
            name => !selectedSection.sub_sections.some(sub => sub.name === name)
        );
        const updated = [...otherSectionsSubs, ...tempSelectedSubSections];
        setData('sub_sections', updated);
        setShowSubSectionModal(false);
    };

    const handleRemoveSubSection = (subSectionName) => {
        const updated = data.sub_sections.filter(name => name !== subSectionName);
        setData('sub_sections', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('employee-attendance.update', employee.id), {
            onError: (errors) => {
                if (errors.password) {
                    setData('password', '');
                    setData('password_confirmation', '');
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
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
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
                                                value={data.nik}
                                                onChange={(e) => setData('nik', e.target.value)}
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
                                                value={data.gender}
                                                onChange={(e) => setData('gender', e.target.value)}
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
                                                value={data.type}
                                                onChange={(e) => setData('type', e.target.value)}
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
                                                value={data.status}
                                                onChange={(e) => setData('status', e.target.value)}
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
                                                value={data.cuti}
                                                onChange={(e) => setData('cuti', e.target.value)}
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
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
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
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
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

                                {/* Section + Subsection */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                                        Section and Sub Section Assignment
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Section Selection */}
                                        <div>
                                            <h4 className="text-md font-medium mb-3">Select Section</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {sections.map((section) => (
                                                    <button
                                                        key={section.id}
                                                        type="button"
                                                        onClick={() => handleSectionSelect(section)}
                                                        className="p-4 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-left transition-colors duration-200"
                                                    >
                                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                            {section.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {data.sub_sections.filter(name => 
                                                                section.sub_sections.some(sub => sub.name === name)
                                                            ).length} of {section.sub_sections.length} sub sections selected
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Selected SubSections */}
                                        <div>
                                            <h4 className="text-md font-medium mb-3">Selected Sub Sections</h4>
                                            {data.sub_sections.length === 0 ? (
                                                <p className="text-sm text-gray-500">No sub sections selected yet</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {data.sub_sections.map((name) => (
                                                        <div key={name} className="flex items-center bg-indigo-100 dark:bg-gray-600 px-3 py-1 rounded-full text-sm">
                                                            <span className="text-indigo-800 dark:text-gray-100">{name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSubSection(name)}
                                                                className="ml-2 text-indigo-600 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-gray-100"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {errors.sub_sections && <p className="mt-2 text-red-500 text-sm">{errors.sub_sections}</p>}
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub Section Modal */}
            {showSubSectionModal && selectedSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
                    <div 
                        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                        onClick={() => setShowSubSectionModal(false)}
                    ></div>
                    
                    <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
                        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Select Sub Sections from {selectedSection.name}
                            </h3>
                            
                            <div className="mb-4 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                                >
                                    {tempSelectedSubSections.length === selectedSection.sub_sections.length 
                                        ? 'Deselect All' 
                                        : 'Select All'}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {tempSelectedSubSections.length} selected
                                </span>
                            </div>
                            
                            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
                                    {selectedSection.sub_sections.map((subSection) => (
                                        <label 
                                            key={subSection.id}
                                            className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                tempSelectedSubSections.includes(subSection.name) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={tempSelectedSubSections.includes(subSection.name)}
                                                onChange={() => handleSubSectionCheckboxChange(subSection.name)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                {subSection.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                onClick={applySubSectionSelection}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSubSectionModal(false)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}