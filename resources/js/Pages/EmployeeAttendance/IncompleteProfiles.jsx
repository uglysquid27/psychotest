import React, { useState } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function IncompleteProfiles() {
    const { employees: paginationData, filters, auth, uniqueSections, uniqueSubSections } = usePage().props;
    const employees = paginationData.data;
    const paginationLinks = paginationData.links;
    
    // State for filters
    const [selectedSection, setSelectedSection] = useState(filters.section || 'All');
    const [selectedSubSection, setSelectedSubSection] = useState(filters.sub_section || 'All');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // Available options for dropdowns
    const availableSections = ['All', ...(uniqueSections ? uniqueSections.filter(s => s !== 'All') : [])];
    const availableSubSections = ['All', ...(uniqueSubSections ? uniqueSubSections.filter(s => s !== 'All') : [])];

    // Function to update filters and fetch data from server
    const updateFilters = (newFilters = {}) => {
        const params = {
            section: newFilters.section !== undefined ? newFilters.section : selectedSection,
            sub_section: newFilters.sub_section !== undefined ? newFilters.sub_section : selectedSubSection,
            search: newFilters.search !== undefined ? newFilters.search : searchTerm,
        };

        // Remove 'All' values and empty strings
        Object.keys(params).forEach(key => {
            if (params[key] === 'All' || params[key] === '' || params[key] === null) {
                delete params[key];
            }
        });
        
        // Use Inertia's router to fetch new data from server
        router.get(route('employee-attendance.incomplete-profiles'), params, {
            preserveState: false, // Don't preserve state to get fresh data
            replace: true,
        });
    };

    // Handle section change
    const handleSectionChange = (e) => {
        const section = e.target.value;
        setSelectedSection(section);
        setSelectedSubSection('All'); // Reset subsection when section changes
        updateFilters({ 
            section: section,
            sub_section: 'All'
        });
    };

    // Handle subsection change
    const handleSubSectionChange = (e) => {
        const subSection = e.target.value;
        setSelectedSubSection(subSection);
        updateFilters({ 
            sub_section: subSection 
        });
    };

    // Handle search
    const handleSearch = (e) => {
        e.preventDefault();
        updateFilters({ search: searchTerm });
    };

    const handleSearchInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
        updateFilters({ search: '' });
    };

    // Handle pagination
    const handlePagination = (url) => {
        if (!url) return;
        
        // Extract page parameter from URL
        const urlObj = new URL(url);
        const page = urlObj.searchParams.get('page');
        
        // Preserve current filters and add page parameter
        const params = {
            page: page,
            section: selectedSection !== 'All' ? selectedSection : undefined,
            sub_section: selectedSubSection !== 'All' ? selectedSubSection : undefined,
            search: searchTerm || undefined,
        };

        // Remove undefined values
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
        
        router.get(route('employee-attendance.incomplete-profiles'), params, {
            preserveState: false,
            replace: true,
        });
    };

    // Function to get section names from employee data
    const getSectionNames = (employee) => {
        if (employee.sub_sections && employee.sub_sections.length > 0) {
            const sections = new Set();
            employee.sub_sections.forEach(subSection => {
                if (subSection.section && subSection.section.name) {
                    sections.add(subSection.section.name);
                }
            });
            return Array.from(sections).join(', ');
        }
        return 'Tidak ada section';
    };

    // Function to get subsection names from employee data
    const getSubSectionNames = (employee) => {
        if (employee.sub_sections && employee.sub_sections.length > 0) {
            return employee.sub_sections.map(ss => ss.name).join(', ');
        }
        return 'Tidak ada subsection';
    };

    // Function to get missing profile fields
    const getMissingFields = (employee) => {
        const missing = [];
        if (!employee.kecamatan) missing.push('Kecamatan');
        if (!employee.kelurahan) missing.push('Kelurahan');
        return missing;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
                    Profil Karyawan Tidak Lengkap
                </h2>
            }
        >
            <div className="py-4 sm:py-8">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
                        <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
                            <div className="flex flex-col justify-between gap-4 mb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
                                        Karyawan dengan Profil Tidak Lengkap
                                    </h1>

                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                        <Link
                                            href={route('employee-attendance.index')}
                                            className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 px-3 py-2 sm:px-4 rounded-md font-medium text-white text-sm transition-colors duration-200 w-full sm:w-auto"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            <span className="whitespace-nowrap">Kembali ke Daftar Utama</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* Search */}
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cari Nama atau NIK:
                                    </label>
                                    <div className="relative">
                                        <form onSubmit={handleSearch} className="flex">
                                            <input
                                                type="text"
                                                id="search"
                                                value={searchTerm}
                                                onChange={handleSearchInputChange}
                                                placeholder="Masukkan nama atau NIK..."
                                                className="w-full bg-white dark:bg-gray-700 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                            />
                                            <button
                                                type="submit"
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-md transition-colors duration-200"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </button>
                                            {searchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={clearSearch}
                                                    className="ml-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </form>
                                    </div>
                                </div>

                                {/* Section Filter */}
                                <div>
                                    <label htmlFor="sectionFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Pilih Section:
                                    </label>
                                    <select
                                        id="sectionFilter"
                                        value={selectedSection}
                                        onChange={handleSectionChange}
                                        className="w-full bg-white dark:bg-gray-700 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                    >
                                        {availableSections.map(section => (
                                            <option key={section} value={section}>
                                                {section}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subsection Filter */}
                                <div>
                                    <label htmlFor="subSectionFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Pilih Subsection:
                                    </label>
                                    <select
                                        id="subSectionFilter"
                                        value={selectedSubSection}
                                        onChange={handleSubSectionChange}
                                        className="w-full bg-white dark:bg-gray-700 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                    >
                                        {availableSubSections.map(subSection => (
                                            <option key={subSection} value={subSection}>
                                                {subSection}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Results Info */}
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Menampilkan {paginationData.from || 0}-{paginationData.to || 0} dari {paginationData.total || 0} karyawan
                                    {selectedSection !== 'All' ? ` dari section ${selectedSection}` : ''}
                                    {selectedSubSection !== 'All' ? ` dan subsection ${selectedSubSection}` : ''}
                                    {searchTerm ? ` dengan pencarian "${searchTerm}"` : ''}
                                </p>
                            </div>

                            {/* Employee List */}
                            {employees.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-500 dark:text-gray-400 mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        {searchTerm || selectedSection !== 'All' || selectedSubSection !== 'All'
                                            ? 'Tidak ada karyawan yang sesuai dengan filter yang dipilih'
                                            : 'Tidak ada karyawan dengan profil tidak lengkap'
                                        }
                                    </p>
                                    {(searchTerm || selectedSection !== 'All' || selectedSubSection !== 'All') && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setSelectedSection('All');
                                                setSelectedSubSection('All');
                                                updateFilters({ search: '', section: 'All', sub_section: 'All' });
                                            }}
                                            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors duration-200"
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {employees.map((employee) => (
                                        <div key={employee.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1 grid grid-cols-2">
                                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                                                                {employee.name}
                                                            </h3>
                                                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                                NIK: {employee.nik}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="text-sm space-y-1">
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                <span className="font-medium">Section:</span> {getSectionNames(employee)}
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                <span className="font-medium">Subsection:</span> {getSubSectionNames(employee)}
                                                            </p>
                                                        </div>
                                                        
                                                       
                                                    </div>
                                                     <div className="text-sm text-right">
                                                            <p className="text-red-600 dark:text-red-400 font-medium">
                                                                Data belum lengkap
                                                            </p>
                                                            {/* <p className="text-red-500 dark:text-red-300">
                                                                {getMissingFields(employee).join(', ')}
                                                            </p> */}
                                                        </div>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    {/* <Link
                                                        href={route('employee.employees.edit', employee.id)}
                                                        className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit Profil
                                                    </Link> */}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {paginationLinks.length > 3 && (
                                <div className="flex flex-wrap justify-center sm:justify-end gap-2 mt-6">
                                    {paginationLinks.map((link, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handlePagination(link.url)}
                                            disabled={!link.url}
                                            className={`px-3 py-1 rounded-md text-sm ${link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                } ${!link.url && 'pointer-events-none opacity-50'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}