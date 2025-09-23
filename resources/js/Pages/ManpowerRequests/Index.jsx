import { Link, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useMemo, useEffect } from 'react';
import SectionGroup from './Components/ManpowerRequests/SectionGroup';
import axios from 'axios';
import FulfillModal from './FulfillModal';
import BulkFulfillReviewModal from './BulkFulfillReviewModal';

export default function Index({ sections: initialSections, auth }) {
  const { reload } = usePage();
  const { delete: destroy } = useForm({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const itemsPerPage = 10;

  // Manage sections in local state for dynamic updates
  const [localSections, setLocalSections] = useState(initialSections);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Bulk fulfillment states
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [fulfillStrategy, setFulfillStrategy] = useState('optimal');
  const [processingRequests, setProcessingRequests] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleBulkFulfillInit = () => {
    setShowBulkModal(false);
    setShowReviewModal(true);
  };

  useEffect(() => {
    if (showDetailsModal || showBulkModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showDetailsModal, showBulkModal]);

  const user = auth?.user || null;

  const statusClasses = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    fulfilled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    revision_requested: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    fulfilling: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  };

  const getStatusClasses = (status) =>
    statusClasses[status?.toLowerCase()] || 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  // Get all requests for bulk operations - using localSections
  const allRequests = useMemo(() => {
    if (!localSections?.data) return [];
    const requests = [];
    localSections.data.forEach((section) => {
      (section.sub_sections || []).forEach((sub) => {
        (sub.man_power_requests || []).forEach((req) => {
          requests.push({
            ...req,
            sub_section: { id: sub.id, name: sub.name },
            section: { id: section.id, name: section.name }
          });
        });
      });
    });
    return requests;
  }, [localSections, refreshTrigger]);

  // Filter unfulfilled requests for bulk operations
  const unfulfilledRequests = useMemo(() => {
    return allRequests.filter(req => req.status !== 'fulfilled' && req.status !== 'fulfilling');
  }, [allRequests]);

const getDateRange = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    yesterday: yesterday.toISOString().slice(0, 10),
    today: today.toISOString().slice(0, 10),
    tomorrow: tomorrow.toISOString().slice(0, 10)
  };
};

// Add state for date filter
const [dateFilter, setDateFilter] = useState('current'); // 'current' or 'all'
const dateRange = getDateRange();

// Modify the sectionDateGroups to include date filtering
const sectionDateGroups = useMemo(() => {
  if (!localSections?.data) return [];
  const groups = [];

  localSections.data.forEach((section) => {
    const dateMap = {};
    (section.sub_sections || []).forEach((sub) => {
      (sub.man_power_requests || []).forEach((req) => {
        const dateKey = new Date(req.date).toISOString().slice(0, 10);
        
        // Apply date filter
        if (dateFilter === 'current') {
          if (dateKey !== dateRange.yesterday && 
              dateKey !== dateRange.today && 
              dateKey !== dateRange.tomorrow) {
            return; // Skip dates outside the 3-day range
          }
        }
        
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = [];
        }
        dateMap[dateKey].push({ ...req, sub_section: { id: sub.id, name: sub.name } });
      });
    });

    Object.keys(dateMap).forEach((dateKey) => {
      const reqs = dateMap[dateKey];
      groups.push({
        sectionId: section.id,
        sectionName: section.name,
        date: dateKey,
        requests: reqs,
        totalRequests: reqs.length,
        totalWorkers: reqs.reduce((sum, r) => sum + (r.requested_amount || 0), 0),
        statuses: [...new Set(reqs.map((r) => r.status))],
      });
    });
  });

  return groups;
}, [localSections, refreshTrigger, dateFilter]); 

  // Sorting
  const sortedGroups = useMemo(() => {
    const items = [...sectionDateGroups];
    if (sortConfig.key === 'name') {
      items.sort((a, b) =>
        sortConfig.direction === 'asc'
          ? a.sectionName.localeCompare(b.sectionName)
          : b.sectionName.localeCompare(a.sectionName)
      );
    } else if (sortConfig.key === 'date') {
      items.sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        return sortConfig.direction === 'asc' ? ad - bd : bd - ad;
      });
    } else if (sortConfig.key === 'total') {
      items.sort((a, b) =>
        sortConfig.direction === 'asc'
          ? a.totalRequests - b.totalRequests
          : b.totalRequests - a.totalRequests
      );
    }
    return items;
  }, [sectionDateGroups, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
  const paginatedGroups = sortedGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Quick fulfill single request
  const quickFulfill = async (requestId) => {
    try {
      setProcessingRequests(prev => [...prev, requestId]);

      const response = await axios.post(
        route('manpower-requests.quick-fulfill', { manpower_request: requestId }),
        { strategy: fulfillStrategy }
      );

      toast.success('Request fulfilled successfully');
      setRefreshTrigger(prev => prev + 1); // Refresh data

    } catch (error) {
      console.error('Quick fulfill error:', error);
      toast.error(error.response?.data?.message || 'Failed to fulfill request');
    } finally {
      setProcessingRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  // Bulk fulfill selected requests
  const bulkFulfill = async () => {
    if (selectedRequests.length === 0) {
      toast.warning('Please select requests to fulfill');
      return;
    }

    try {
      setProcessingRequests(prev => [...prev, ...selectedRequests]);
      setShowReviewModal(false);

      const response = await axios.post(route('manpower-requests.bulk-fulfill'), {
        request_ids: selectedRequests,
        strategy: fulfillStrategy
      });

      toast.success(`Successfully fulfilled ${selectedRequests.length} requests`);
      setSelectedRequests([]);
      setRefreshTrigger(prev => prev + 1); // Refresh data

    } catch (error) {
      console.error('Bulk fulfill error:', error);
      toast.error(error.response?.data?.message || 'Failed to fulfill some requests');
    } finally {
      setProcessingRequests([]);
    }
  };

  // Handle request selection for bulk operations
  const handleRequestSelect = (requestId, checked) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  // Select all requests for a date
  const handleSelectAllForDate = (requests, checked) => {
    const requestIds = requests.map(req => req.id);
    if (checked) {
      setSelectedRequests(prev => [...new Set([...prev, ...requestIds])]);
    } else {
      setSelectedRequests(prev => prev.filter(id => !requestIds.includes(id)));
    }
  };

  // Toggle individual request selection
  const toggleSelect = (id) => {
    setSelectedRequests(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Calculate selected requirements
  const selectedRequirements = useMemo(() => {
    const selected = allRequests.filter(req => selectedRequests.includes(req.id));
    return {
      totalRequests: selected.length,
      totalWorkers: selected.reduce((sum, req) => sum + (req.requested_amount || 0), 0),
      totalMale: selected.reduce((sum, req) => sum + (req.male_count || 0), 0),
      totalFemale: selected.reduce((sum, req) => sum + (req.female_count || 0), 0)
    };
  }, [selectedRequests, allRequests]);

  // Delete request function
  const requestDelete = (id) => {
    setRequestToDelete(id);
    // setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!requestToDelete) return;
    destroy(route('manpower-requests.destroy', requestToDelete), {
      preserveScroll: true,
      onSuccess: () => {
        setLocalSections(prev => {
          const updated = { ...prev };
          updated.data = updated.data.map(section => ({
            ...section,
            sub_sections: section.sub_sections.map(sub => ({
              ...sub,
              man_power_requests: sub.man_power_requests.filter(req => req.id !== requestToDelete)
            }))
          }));
          return updated;
        });

        setRefreshTrigger(prev => prev + 1); // Refresh memoized groups

        toast.success('Request deleted');
        setShowDeleteModal(false);
        setRequestToDelete(null);
      },

      onError: () => {
        toast.error('Failed to delete');
        setShowDeleteModal(false);
        setRequestToDelete(null);
      },
    });
  };

  const openDetails = (group) => {
    setSelectedGroup(group);
    setShowDetailsModal(true);
  };

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manpower Requests</h2>}
    >
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg sm:rounded-lg">

            {/* Header with bulk mode controls */}
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4 sm:mb-0">
                    Manpower Requests
                  </h1>
                  <div className="flex items-center space-x-3 mb-4 sm:mb-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-md p-1">
      <button
        onClick={() => setDateFilter('current')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          dateFilter === 'current'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        3 Days
      </button>
      <button
        onClick={() => setDateFilter('all')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          dateFilter === 'all'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        All Dates
      </button>
    </div>
  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    {/* Show bulk fulfill button when requests are selected */}
                    {selectedRequests.length > 0 && (
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                      >
                        Bulk Fulfill ({selectedRequests.length})
                      </button>
                    )}

                    <Link
                      href={route('manpower-requests.create')}
                      className="inline-flex items-center bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      New Request
                    </Link>
                  </div>
                </div>

                {/* Bulk mode controls - Always show when requests are selected */}
                {selectedRequests.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="font-medium text-blue-800 dark:text-blue-300">Bulk Fulfillment</span>
                        </div>
                        <span className="text-sm text-blue-700 dark:text-blue-400">
                          {selectedRequests.length} of {unfulfilledRequests.length} requests selected
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy:</label>
                          <select
                            value={fulfillStrategy}
                            onChange={(e) => setFulfillStrategy(e.target.value)}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="optimal">Optimal Match</option>
                            <option value="same_section">Same Section First</option>
                            <option value="balanced">Balanced Distribution</option>
                          </select>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedRequests([])}
                            className="px-3 py-1 text-sm bg-gray-500 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setShowBulkModal(true)}
                            className="px-4 py-1 text-sm bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                          >
                            Fulfill Selected ({selectedRequests.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selected requirements summary */}
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedRequirements.totalRequests}</div>
                          <div className="text-xs text-blue-700 dark:text-blue-400">Requests</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">{selectedRequirements.totalWorkers}</div>
                          <div className="text-xs text-green-700 dark:text-green-400">Workers</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-500">{selectedRequirements.totalMale}</div>
                          <div className="text-xs text-blue-700 dark:text-blue-400">Male</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-pink-500">{selectedRequirements.totalFemale}</div>
                          <div className="text-xs text-pink-700 dark:text-pink-400">Female</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {paginatedGroups.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      No manpower requests found.
                    </p>
                    <Link
                      href={route('manpower-requests.create')}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                    >
                      Create your first request
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {/* Always show the select column */}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Select
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => toggleSort('name')}
                        >
                          <div className="flex items-center">
                            Section
                            {sortConfig.key === 'name' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => toggleSort('date')}
                        >
                          <div className="flex items-center">
                            Date
                            {sortConfig.key === 'date' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statuses
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => toggleSort('total')}
                        >
                          <div className="flex items-center">
                            Total Requests
                            {sortConfig.key === 'total' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total Workers
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedGroups.map((group, idx) => (
                        <tr
                          key={`${group.sectionId}-${group.date}-${idx}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {/* Always show the checkbox */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={group.requests.every(req => selectedRequests.includes(req.id)) && group.requests.some(req => req.status !== 'fulfilled')}
                              onChange={(e) => handleSelectAllForDate(group.requests.filter(req => req.status !== 'fulfilled'), e.target.checked)}
                              className="rounded text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {group.sectionName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(group.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {group.statuses.map(status => (
                                <span
                                  key={status}
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(status)}`}
                                >
                                  {status.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {group.totalRequests}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {group.totalWorkers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openDetails(group)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-end flex-wrap gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md text-sm transition-all ${page === currentPage
                        ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedGroup && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"
            onClick={() => setShowDetailsModal(false)}
          ></div>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div
              className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6 relative z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      {selectedGroup.sectionName} Requests - {formatDate(selectedGroup.date)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-700 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setTimeout(() => {
                        window.location.reload();
                      }, 100); // Small delay to ensure modal closes first
                    }}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-4">
                  <SectionGroup
                    section={{ name: selectedGroup.sectionName }}
                    requests={selectedGroup.requests}
                    formatDate={formatDate}
                    getStatusClasses={getStatusClasses}
                    onDelete={requestDelete}
                    onRevision={() => { }}
                    isUser={!!user}
                    initialOpen
                    quickFulfill={quickFulfill}
                    processingRequests={processingRequests}
                    bulkMode={true}
                    selectedRequests={selectedRequests}
                    handleRequestSelect={handleRequestSelect}
                    canRevise={true} // Add this prop
                  />
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setTimeout(() => {
                      window.location.reload();
                    }, 100); // Small delay to ensure modal closes first
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Fulfill Modal */}
      {showBulkModal && (
        <FulfillModal
          open={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          strategy={fulfillStrategy}
          setStrategy={setFulfillStrategy}
          onConfirm={handleBulkFulfillInit}
          loading={processingRequests.length > 0}
          selectedRequests={selectedRequests}
        />
      )}

      {showReviewModal && (
        <BulkFulfillReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          strategy={fulfillStrategy}
          selectedRequests={selectedRequests}
          onConfirm={bulkFulfill}
          loading={processingRequests.length > 0}
        />
      )}
    </AuthenticatedLayout>
  );
}