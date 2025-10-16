// resources/js/Pages/ManpowerRequests/BulkFulfillPreviewModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import BulkEmployeeModal from './components/BulkEmployeeModal';

const BulkFulfillPreviewModal = ({
  open,
  onClose,
  strategy,
  selectedRequests,
  onConfirm,
  loading = false,
  allRequests 
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [modifiedAssignments, setModifiedAssignments] = useState({});
  const [processingRequests, setProcessingRequests] = useState([]);

  const isProcessing = processingRequests.length > 0;

  useEffect(() => {
    if (open && selectedRequests.length > 0) {
      fetchPreview();
    } else {
      setPreviewData(null);
      setModifiedAssignments({});
    }
  }, [open, strategy, selectedRequests]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    
    try {
      const response = await axios.post(route('manpower-requests.bulk-preview-multi-subsection'), {
        request_ids: selectedRequests,
        strategy: strategy
      });
      
      setPreviewData(response.data);
      
      const initialModifications = {};
      Object.entries(response.data.results).forEach(([requestId, data]) => {
        if (data.employees?.length > 0) {
          initialModifications[requestId] = data.employees.map(emp => emp.id);
        }
      });
      setModifiedAssignments(initialModifications);
      
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      setError(error.response?.data?.message || 'Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchAvailableEmployees = async (requestId) => {
    setLoadingEmployees(true);
    try {
      const response = await axios.get(route('manpower-requests.bulk-get-available-employees', { requestId }));
      
      if (response.data.success && response.data.employees) {
        setAvailableEmployees(response.data.employees);
      } else {
        setAvailableEmployees([]);
        toast.error(response.data.message || 'Failed to load available employees');
      }
    } catch (error) {
      console.error('Failed to fetch available employees:', error);
      setAvailableEmployees([]);
      toast.error('Failed to load available employees. Please try again.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const openEmployeeModal = (requestId, employeeIndex) => {
    setCurrentRequestId(requestId);
    setCurrentEmployeeIndex(employeeIndex);
    fetchAvailableEmployees(requestId);
    setShowEmployeeModal(true);
  };

  const selectNewEmployee = (employeeId) => {
    if (!currentRequestId || currentEmployeeIndex === null) return;

    setModifiedAssignments(prev => {
      const currentAssignments = prev[currentRequestId] 
        ? [...prev[currentRequestId]] 
        : [...previewData.results[currentRequestId].employees.map(emp => emp.id)];
      
      currentAssignments[currentEmployeeIndex] = employeeId;
      
      return {
        ...prev,
        [currentRequestId]: currentAssignments
      };
    });

    setShowEmployeeModal(false);
    setCurrentRequestId(null);
    setCurrentEmployeeIndex(null);
    toast.success('Employee selected successfully');
  };

  const getCurrentAssignments = () => {
    if (!previewData) return {};
    
    const assignments = {};
    Object.entries(previewData.results).forEach(([requestId, data]) => {
      if (modifiedAssignments[requestId]) {
        assignments[requestId] = modifiedAssignments[requestId].map(employeeId => {
          const availableEmployee = availableEmployees.find(emp => String(emp.id) === String(employeeId));
          if (availableEmployee) return availableEmployee;
          
          const originalEmployee = data.employees.find(emp => String(emp.id) === String(employeeId));
          if (originalEmployee) return originalEmployee;
          
          return { 
            id: employeeId, 
            name: 'Employee ' + employeeId, 
            type: 'unknown',
            gender: 'male',
            total_score: 0,
            workload_points: 0,
            blind_test_points: 0,
            average_rating: 0
          };
        });
      } else {
        assignments[requestId] = data.employees || [];
      }
    });
    
    return assignments;
  };

  const handleConfirm = async () => {
  try {
    setProcessingRequests(prev => [...prev, ...selectedRequests]);
    
    const employeeSelections = {};
    
    selectedRequests.forEach(requestId => {
      if (modifiedAssignments[requestId]) {
        employeeSelections[requestId] = modifiedAssignments[requestId].map(id => 
          typeof id === 'string' ? parseInt(id) : id
        );
      } else if (previewData?.results[requestId]?.employees) {
        employeeSelections[requestId] = previewData.results[requestId].employees.map(emp => 
          typeof emp.id === 'string' ? parseInt(emp.id) : emp.id
        );
      } else {
        employeeSelections[requestId] = [];
      }
    });

    const hasValidSelections = Object.values(employeeSelections).some(employees => 
      employees?.length > 0
    );

    if (!hasValidSelections) {
      toast.error('No valid employee assignments found. Please assign employees before confirming.');
      return;
    }

    const requestData = {
      request_ids: selectedRequests.map(id => typeof id === 'string' ? parseInt(id) : id),
      strategy: strategy,
      employee_selections: employeeSelections
    };

    let response;
    const uniqueSubsections = [...new Set(selectedRequests.map(reqId => {
      const request = allRequests.find(r => r.id === reqId);
      return request?.sub_section?.id;
    }).filter(Boolean))];

    if (uniqueSubsections.length > 1) {
      response = await axios.post(route('manpower-requests.bulk-fulfill-multi-subsection'), requestData);
    } else {
      response = await axios.post(route('manpower-requests.bulk-fulfill'), requestData);
    }
    
    if (response.data.success) {
      // Pass success data to parent
      onConfirm({
        success: true,
        data: response.data,
        message: response.data.message || `Successfully fulfilled ${selectedRequests.length} requests`,
        modifiedAssignments
      });
    } else {
      // Pass warning data to parent
      onConfirm({
        success: false,
        data: response.data,
        message: response.data.message || 'Some requests failed to fulfill',
        isWarning: true,
        modifiedAssignments
      });
    }
    
  } catch (error) {
    console.error('Bulk fulfill error:', error);
    
    let errorMessage = 'Failed to fulfill requests';
    
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData.message === 'No valid requests found to fulfill') {
        const fulfilledRequests = allRequests.filter(req => 
          selectedRequests.includes(req.id) && req.status === 'fulfilled'
        );
        
        if (fulfilledRequests.length > 0) {
          errorMessage = `Some requests are already fulfilled: ${fulfilledRequests.map(r => `#${r.id}`).join(', ')}`;
        } else {
          errorMessage = 'No valid requests found. They may be already fulfilled or invalid.';
        }
      } else {
        errorMessage = errorData.message || 'Invalid request data';
      }
    } else {
      errorMessage = error.response?.data?.message || 'Failed to fulfill requests';
    }
    
    // Pass error data to parent
    onConfirm({
      success: false,
      error: error,
      message: errorMessage,
      modifiedAssignments: {}
    });
  } finally {
    setProcessingRequests([]);
    // Don't call onClose here - let parent handle it after showing result modal
  }
};

  const currentAssignments = useMemo(() => getCurrentAssignments(), [previewData, modifiedAssignments, availableEmployees]);

  const summary = useMemo(() => {
    if (!previewData) return null;
    
    const totalEmployees = Object.values(currentAssignments).reduce((sum, employees) => sum + employees.length, 0);
    const genderBreakdown = Object.values(currentAssignments).reduce((acc, employees) => {
      employees.forEach(emp => {
        if (emp.gender === 'male') acc.male++;
        if (emp.gender === 'female') acc.female++;
      });
      return acc;
    }, { male: 0, female: 0 });

    return {
      ...previewData.summary,
      total_employees: totalEmployees,
      gender_breakdown: genderBreakdown
    };
  }, [previewData, currentAssignments]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Bulk Fulfillment Preview
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and modify employee assignments before confirming
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              disabled={isProcessing}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loadingPreview ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : previewData ? (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {summary.total_requests}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-400">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {summary.total_employees}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400">Total Employees</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {summary.gender_breakdown.male}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-400">Male</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-500">
                        {summary.gender_breakdown.female}
                      </div>
                      <div className="text-sm text-pink-700 dark:text-pink-400">Female</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-400">Subsections:</span>{' '}
                      <span className="text-blue-600 dark:text-blue-300">
                        {summary.unique_subsections.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-400">Strategy:</span>{' '}
                      <span className="text-blue-600 dark:text-blue-300">
                        {strategy === 'optimal' ? 'Optimal Match' : 
                         strategy === 'same_section' ? 'Same Section First' : 
                         'Balanced Distribution'}
                      </span>
                    </div>
                  </div>
                </div>

                {Object.entries(previewData.results).map(([requestId, data]) => {
                  const currentEmployees = currentAssignments[requestId] || [];
                  const isModified = modifiedAssignments[requestId] && 
                    JSON.stringify(modifiedAssignments[requestId]) !== 
                    JSON.stringify(data.employees.map(emp => emp.id));

                  return (
                    <div key={requestId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {data.request.shift_name} - {data.request.sub_section_name}
                            </h4>
                            {isModified && (
                              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-1 rounded-full text-xs">
                                Modified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Section: {data.request.section_name} • 
                            Date: {new Date(data.request.date).toLocaleDateString('id-ID')} • 
                            Needed: {data.request.requested_amount} employees
                            {data.request.male_count > 0 && ` • Male: ${data.request.male_count}`}
                            {data.request.female_count > 0 && ` • Female: ${data.request.female_count}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(data.status)}`}>
                            {data.status?.replace('_', ' ') || 'Unknown'}
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">
                            {currentEmployees.length}/{data.request.requested_amount}
                          </span>
                        </div>
                      </div>

                      {data.status === 'already_fulfilled' ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          This request is already fulfilled
                        </div>
                      ) : currentEmployees.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {currentEmployees.map((employee, index) => {
                            const employeeData = employee || {};
                            const employeeId = employeeData.id;
                            const employeeName = employeeData.name || 'Unknown Employee';
                            const employeeType = employeeData.type || 'unknown';
                            const employeeGender = employeeData.gender || 'male';
                            const employeeScore = employeeData.total_score || 0;
                            const workloadPoints = employeeData.workload_points || 0;
                            const blindTestPoints = employeeData.blind_test_points || 0;
                            const averageRating = employeeData.average_rating || 0;
                            const priorityTier = employeeData.priority_tier;

                            return (
                              <div 
                                key={`${employeeId}-${index}`} 
                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
                                onClick={() => !isProcessing && openEmployeeModal(requestId, index)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                      {index + 1}. {employeeName}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      NIK: {employeeId} • Type: {employeeType}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-1">
                                    {getGenderBadge(employeeGender)}
                                    {priorityTier && getPriorityTierBadge(priorityTier)}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <div>Score: {employeeScore.toFixed(2)}</div>
                                  <div>Workload: {workloadPoints}</div>
                                  <div>Blind Test: {blindTestPoints}</div>
                                  <div>Rating: {averageRating.toFixed(1)}</div>
                                </div>
                                <div className="mt-2 text-center">
                                  <span className="text-blue-600 dark:text-blue-400 text-xs group-hover:underline">
                                    {isProcessing ? 'Processing...' : 'Click to change employee'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No employees available for this request
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              💡 Click on any employee card to change the assignment
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loadingPreview || error || isProcessing}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `Confirm Bulk Fulfill (${selectedRequests.length} requests)`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEmployeeModal && (
        <BulkEmployeeModal
          showModal={showEmployeeModal}
          setShowModal={setShowEmployeeModal}
          request={previewData?.results[currentRequestId]?.request}
          allSortedEligibleEmployees={availableEmployees}
          selectNewEmployee={selectNewEmployee}
          loading={loadingEmployees}
        />
      )}
    </>
  );
};

const getPriorityTierBadge = (tier) => {
  const tierConfig = {
    'same_subsection': { label: 'Same Subsection', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    'same_section': { label: 'Same Section', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    'other_section': { label: 'Other Section', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
  };
  
  const config = tierConfig[tier] || tierConfig.other_section;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

const getGenderBadge = (gender) => {
  return gender === 'female' 
    ? <span className="bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 px-2 py-1 rounded text-xs">♀ Female</span>
    : <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs">♂ Male</span>;
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

export default BulkFulfillPreviewModal;