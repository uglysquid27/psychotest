import React from 'react';

const EmployeeFilters = ({
  filterStatus,
  filterSection,
  filterSubSection,
  searchTerm,
  uniqueStatuses,
  uniqueSections,
  uniqueSubSections,
  handleStatusChange,
  handleSectionChange,
  handleSubSectionChange,
  handleSearchChange
}) => {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Status Filter */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <select
          id="status"
          value={filterStatus}
          onChange={handleStatusChange}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="All">All Statuses</option>
          {uniqueStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Section Filter */}
      <div>
        <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Section
        </label>
        <select
          id="section"
          value={filterSection}
          onChange={handleSectionChange}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="All">All Sections</option>
          {uniqueSections.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </div>

      {/* Sub Section Filter */}
      <div>
        <label htmlFor="subSection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sub Section
        </label>
        <select
          id="subSection"
          value={filterSubSection}
          onChange={handleSubSectionChange}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="All">All Sub Sections</option>
          {uniqueSubSections.map((subSection) => (
            <option key={subSection} value={subSection}>
              {subSection}
            </option>
          ))}
        </select>
      </div>

      {/* Search Filter */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search
        </label>
        <input
          type="text"
          id="search"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};

export default EmployeeFilters;