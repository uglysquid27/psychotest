import React, { useState } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import EmployeeFilters from './components/EmployeeFilters';
import EmployeeTable from './components/EmployeeTable';
import EmployeeCards from './components/EmployeeCards';
import ResetStatusModal from './components/ResetStatusModal';
import UpdateWorkloadModal from './components/UpdateWorkloadModal';

export default function Index() {
  const { employees: paginationData, filters, uniqueStatuses, uniqueSections, uniqueSubSections, auth } = usePage().props;
  const employees = paginationData.data.filter(employee => employee.status.toLowerCase() !== 'deactivated');
  const paginationLinks = paginationData.links;
  const isUser = auth.user?.role === 'user';

  // State for filters
  const [filterStatus, setFilterStatus] = useState(filters.status || 'All');
  const [filterSection, setFilterSection] = useState(filters.section || 'All');
  const [filterSubSection, setFilterSubSection] = useState(filters.sub_section || 'All');
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [processing, setProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);

  // Apply filters
  const applyFilters = (newFilters) => {
    router.get(window.location.pathname, {
      status: newFilters.status !== 'All' ? newFilters.status : undefined,
      section: newFilters.section !== 'All' ? newFilters.section : undefined,
      sub_section: newFilters.sub_section !== 'All' ? newFilters.sub_section : undefined,
      search: newFilters.search || undefined,
      page: 1,
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  // Handle filter changes
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFilterStatus(newStatus);
    applyFilters({ status: newStatus, section: filterSection, sub_section: filterSubSection, search: searchTerm });
  };

  const handleSectionChange = (e) => {
    const newSection = e.target.value;
    setFilterSection(newSection);
    setFilterSubSection('All');
    applyFilters({ status: filterStatus, section: newSection, sub_section: 'All', search: searchTerm });
  };

  const handleSubSectionChange = (e) => {
    const newSubSection = e.target.value;
    setFilterSubSection(newSubSection);
    applyFilters({ status: filterStatus, section: filterSection, sub_section: newSubSection, search: searchTerm });
  };

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    applyFilters({ status: filterStatus, section: filterSection, sub_section: filterSubSection, search: newSearchTerm });
  };

  // Handle update workloads
  const handleUpdateWorkloads = async () => {
    setShowWorkloadModal(false);
    setProcessing(true);
    try {
      await router.post(route('employee-attendance.update-workloads'), {}, {
        onSuccess: () => {
          alert('Workload data updated successfully!');
          router.reload({ preserveState: false });
        },
        onError: (errors) => {
          alert('Failed to update workload data. Please try again.');
        },
      });
    } catch (error) {
      alert('An unexpected error occurred. Check console for details.');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate totals from database
  const totalWorkCount = employees.reduce((sum, employee) => sum + (employee.total_work_count || 0), 0);
  const totalWeeklyWorkCount = employees.reduce((sum, employee) => sum + (employee.weekly_work_count || 0), 0);

  // Handle reset all statuses
  const handleResetAllStatuses = () => {
    setShowResetModal(false);
    router.post(route('employee-attendance.reset-all-statuses'), {}, {
      onSuccess: () => {
        alert('Semua status karyawan berhasil direset.');
        router.reload({ preserveState: false, preserveScroll: false });
      },
      onError: (errors) => {
        console.error('Gagal mereset status karyawan:', errors);
        alert('Terjadi kesalahan saat mereset status karyawan. Silakan coba lagi.');
      },
    });
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Ringkasan Kehadiran Pegawai
        </h2>
      }
    >
      <Modal show={showResetModal} onClose={() => setShowResetModal(false)}>
        <ResetStatusModal
          show={showResetModal}
          onClose={() => setShowResetModal(false)}
          onConfirm={handleResetAllStatuses}
        />
      </Modal>

      <Modal show={showWorkloadModal} onClose={() => setShowWorkloadModal(false)}>
        <UpdateWorkloadModal
          show={showWorkloadModal}
          onClose={() => setShowWorkloadModal(false)}
          onConfirm={handleUpdateWorkloads}
          processing={processing}
        />
      </Modal>

      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
            <div className="flex flex-col justify-between gap-4 mb-6">
  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
    <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
      Ringkasan Penugasan Pegawai
    </h1>

    {!isUser && (
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {/* Add Employee */}
        <Link
          href={route('employee-attendance.create')}
          className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200"
          title="Add Employee"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Add Employee</span>
          <span className="sm:hidden">Add</span>
        </Link>

        {/* Inactive Employees */}
        <Link
          href={route('employee-attendance.inactive')}
          className="flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200"
          title="Inactive Employees"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m10 6l6-6m-6-6l6 6" />
          </svg>
          <span className="hidden sm:inline">Inactive</span>
        </Link>

        {/* Reset All Statuses */}
        <button
          onClick={() => setShowResetModal(true)}
          className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200"
          title="Reset All Statuses"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Update Workloads */}
        <button
          onClick={() => setShowWorkloadModal(true)}
          disabled={processing}
          className={`flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200 ${
            processing ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
          }`}
          title="Update Workloads"
        >
          {processing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden sm:inline">Processing...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Update</span>
            </>
          )}
        </button>

        {/* Incomplete Profiles */}
        <Link
          href={route('employee-attendance.incomplete-profiles')}
          className="flex items-center justify-center gap-1 bg-orange-600 hover:bg-orange-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200"
          title="Incomplete Profiles"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="hidden sm:inline">Incomplete</span>
        </Link>
      </div>
    )}
  </div>
</div>

              <EmployeeFilters
                filterStatus={filterStatus}
                filterSection={filterSection}
                filterSubSection={filterSubSection}
                searchTerm={searchTerm}
                uniqueStatuses={uniqueStatuses}
                uniqueSections={uniqueSections}
                uniqueSubSections={uniqueSubSections}
                handleStatusChange={handleStatusChange}
                handleSectionChange={handleSectionChange}
                handleSubSectionChange={handleSubSectionChange}
                handleSearchChange={handleSearchChange}
                isMobile
              />

              <EmployeeFilters
                filterStatus={filterStatus}
                filterSection={filterSection}
                filterSubSection={filterSubSection}
                searchTerm={searchTerm}
                uniqueStatuses={uniqueStatuses}
                uniqueSections={uniqueSections}
                uniqueSubSections={uniqueSubSections}
                handleStatusChange={handleStatusChange}
                handleSectionChange={handleSectionChange}
                handleSubSectionChange={handleSubSectionChange}
                handleSearchChange={handleSearchChange}
              />

              <EmployeeCards employees={employees} isUser={isUser} />
              <EmployeeTable employees={employees} totalWorkCount={totalWorkCount} totalWeeklyWorkCount={totalWeeklyWorkCount} isUser={isUser} />

              {paginationLinks.length > 3 && (
                <div className="flex flex-wrap justify-center sm:justify-end gap-2 mt-6">
                  {paginationLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.url || '#'}
                      className={`px-3 py-1 rounded-md text-sm ${link.active
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        } ${!link.url && 'pointer-events-none opacity-50'}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                      preserveScroll
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