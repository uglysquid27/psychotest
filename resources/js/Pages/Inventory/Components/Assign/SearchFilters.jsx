import React from "react";

export default function SearchFilters({ 
    search, 
    setSearch, 
    selectedSection, 
    setSelectedSection, 
    selectedSubSection, 
    setSelectedSubSection, 
    sections, 
    filteredSubSections, 
    onSearch, 
    onClear 
}) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-6 rounded-xl">
            <form onSubmit={onSearch} className="space-y-4">
                <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
                    {/* Search Input */}
                    <div className="md:col-span-1">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Search
                        </label>
                        <div className="relative">
                            <svg
                                className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search employees by name or NIK..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="dark:bg-gray-700 py-3 pr-4 pl-10 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors"
                            />
                        </div>
                    </div>

                    {/* Section Filter */}
                    <div>
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Section
                        </label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="dark:bg-gray-700 px-3 py-3 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors"
                        >
                            <option value="">All Sections</option>
                            {sections.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subsection Filter */}
                    <div>
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Subsection
                        </label>
                        <select
                            value={selectedSubSection}
                            onChange={(e) => setSelectedSubSection(e.target.value)}
                            disabled={!selectedSection}
                            className="disabled:bg-gray-100 dark:bg-gray-700 dark:disabled:bg-gray-800 px-3 py-3 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors disabled:cursor-not-allowed"
                        >
                            <option value="">All Subsections</option>
                            {filteredSubSections.map((subsection) => (
                                <option key={subsection.id} value={subsection.id}>
                                    {subsection.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-6 py-3 rounded-lg font-medium text-white transition-colors"
                        >
                            Search
                        </button>
                        {(search || selectedSection || selectedSubSection) && (
                            <button
                                type="button"
                                onClick={onClear}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-6 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}