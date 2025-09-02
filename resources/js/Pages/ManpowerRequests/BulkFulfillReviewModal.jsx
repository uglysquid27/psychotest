// BulkFulfillReviewModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BulkFulfillReviewModal = ({
  open,
  onClose,
  strategy,
  selectedRequests,
  onConfirm,
  loading
}) => {
  const [assignmentPreview, setAssignmentPreview] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && selectedRequests.length > 0) {
      fetchAssignmentPreview();
    } else {
      setAssignmentPreview({});
    }
  }, [open, strategy, selectedRequests]);

  const fetchAssignmentPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    
    try {
      const response = await axios.post(route('manpower-requests.bulk-preview'), {
        request_ids: selectedRequests,
        strategy: strategy
      });
      
      // FIX: Use response.data.results instead of response.data.preview
      setAssignmentPreview(response.data.results || {});
    } catch (error) {
      console.error('Failed to fetch assignment preview:', error);
      setError(error.response?.data?.message || 'Failed to load assignment preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const getStatusClasses = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      fulfilled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
      already_fulfilled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300',
    };
    return statusClasses[status?.toLowerCase()] || 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
  };

  // Calculate totals for summary
  const calculateTotals = () => {
    let totalRequests = 0;
    let totalEmployees = 0;
    let totalMale = 0;
    let totalFemale = 0;

    Object.values(assignmentPreview).forEach(data => {
      totalRequests++;
      if (data.employees && Array.isArray(data.employees)) {
        totalEmployees += data.employees.length;
        data.employees.forEach(employee => {
          if (employee.gender === 'male') totalMale++;
          if (employee.gender === 'female') totalFemale++;
        });
      }
    });

    return { totalRequests, totalEmployees, totalMale, totalFemale };
  };

  const totals = calculateTotals();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Review Bulk Fulfillment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loadingPreview ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading assignment preview...</span>
            </div>
          ) : error ? (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.totalRequests}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">Requests</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {totals.totalEmployees}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400">Employees</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {totals.totalMale}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">Male</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-500">
                      {totals.totalFemale}
                    </div>
                    <div className="text-sm text-pink-700 dark:text-pink-400">Female</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-700 dark:text-blue-400">
                  Strategy: {strategy === 'optimal' ? 'Optimal Match' : 
                           strategy === 'same_section' ? 'Same Section First' : 
                           'Balanced Distribution'}
                </div>
              </div>

              {Object.entries(assignmentPreview).map(([requestId, data]) => (
                <div key={requestId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Request #{requestId}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {data.request?.date ? new Date(data.request.date).toLocaleDateString('id-ID') : 'Unknown date'} • 
                        Needed: {data.request?.requested_amount || 0} employees
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(data.status)}`}>
                      {data.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>

                  {data.status === 'already_fulfilled' ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      This request is already fulfilled
                    </div>
                  ) : data.employees && data.employees.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.employees.map(employee => (
                        <div key={employee.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">NIK: {employee.nik}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Type: {employee.type}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              employee.gender === 'female' 
                                ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                            }`}>
                              {employee.gender === 'female' ? '♀' : '♂'}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Score: {employee.total_score?.toFixed(2) || '0.00'} • 
                            Workload: {employee.working_day_weight || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No employees available for this request
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || loadingPreview || error}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Confirm (${selectedRequests.length} requests)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkFulfillReviewModal;