import React, { useState, useMemo } from 'react';
import { CheckCircle, Users, Calendar, Building, AlertTriangle, Zap, Target, Move } from 'lucide-react';

const BulkFulfillInterface = () => {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [bulkFulfillMode, setBulkFulfillMode] = useState(false);
  const [autoFillStrategy, setAutoFillStrategy] = useState('optimal');
  const [previewData, setPreviewData] = useState(null);
  const [lineAssignments, setLineAssignments] = useState({});
  const [enableLineAssignment, setEnableLineAssignment] = useState({});

  // Mock data - replace with your actual data
  const mockRequests = [
    {
      id: 1,
      date: '2025-09-05',
      sub_section: { name: 'Production A', id: 1 },
      requested_amount: 5,
      male_count: 3,
      female_count: 2,
      status: 'pending',
      shift: 'Morning'
    },
    {
      id: 2,
      date: '2025-09-05',
      sub_section: { name: 'putway', id: 2 },
      requested_amount: 4,
      male_count: 2,
      female_count: 2,
      status: 'pending',
      shift: 'Evening'
    },
    {
      id: 3,
      date: '2025-09-06',
      sub_section: { name: 'Production B', id: 3 },
      requested_amount: 3,
      male_count: 2,
      female_count: 1,
      status: 'pending',
      shift: 'Night'
    }
  ];

  const groupedRequests = useMemo(() => {
    const groups = {};
    mockRequests.forEach(req => {
      const key = req.date;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(req);
    });
    return groups;
  }, []);

  const handleRequestSelect = (requestId, checked) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
      // Initialize line assignment for this request
      if (!lineAssignments[requestId]) {
        const request = mockRequests.find(r => r.id === requestId);
        const initialAssignments = {};
        for (let i = 0; i < request.requested_amount; i++) {
          initialAssignments[`emp_${requestId}_${i}`] = '1'; // Default to line 1
        }
        setLineAssignments(prev => ({
          ...prev,
          [requestId]: initialAssignments
        }));
        setEnableLineAssignment(prev => ({
          ...prev,
          [requestId]: false
        }));
      }
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleSelectAllForDate = (date, checked) => {
    const dateRequests = groupedRequests[date].map(req => req.id);
    if (checked) {
      setSelectedRequests(prev => [...new Set([...prev, ...dateRequests])]);
      // Initialize line assignments for all selected requests
      const newLineAssignments = { ...lineAssignments };
      const newEnableLineAssignment = { ...enableLineAssignment };
      dateRequests.forEach(requestId => {
        if (!newLineAssignments[requestId]) {
          const request = mockRequests.find(r => r.id === requestId);
          const initialAssignments = {};
          for (let i = 0; i < request.requested_amount; i++) {
            initialAssignments[`emp_${requestId}_${i}`] = '1';
          }
          newLineAssignments[requestId] = initialAssignments;
          newEnableLineAssignment[requestId] = false;
        }
      });
      setLineAssignments(newLineAssignments);
      setEnableLineAssignment(newEnableLineAssignment);
    } else {
      setSelectedRequests(prev => prev.filter(id => !dateRequests.includes(id)));
    }
  };

  const getSelectedRequestsData = () => {
    return mockRequests.filter(req => selectedRequests.includes(req.id));
  };

  const getTotalRequirements = () => {
    const selected = getSelectedRequestsData();
    return {
      totalRequests: selected.length,
      totalWorkers: selected.reduce((sum, req) => sum + req.requested_amount, 0),
      totalMale: selected.reduce((sum, req) => sum + (req.male_count || 0), 0),
      totalFemale: selected.reduce((sum, req) => sum + (req.female_count || 0), 0),
      putwayRequests: selected.filter(req => req.sub_section.name.toLowerCase() === 'putway').length
    };
  };

  const handleLineAssignmentChange = (requestId, employeeId, newLine) => {
    setLineAssignments(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [employeeId]: newLine
      }
    }));
  };

  const handleEnableLineAssignment = (requestId, enabled) => {
    setEnableLineAssignment(prev => ({
      ...prev,
      [requestId]: enabled
    }));
  };

  const handlePreview = async () => {
    // Mock preview API call
    const mockPreviewData = {
      success: true,
      results: selectedRequests.reduce((acc, id) => {
        const request = mockRequests.find(r => r.id === id);
        const isPutway = request.sub_section.name.toLowerCase() === 'putway';

        // Mock employee data
        const mockEmployees = Array.from({ length: request.requested_amount }, (_, index) => ({
          id: `emp_${id}_${index}`,
          nik: `NIK${1000 + index}`,
          name: `Employee ${index + 1}`,
          gender: index % 2 === 0 ? 'male' : 'female',
          type: index % 3 === 0 ? 'bulanan' : 'harian',
          total_score: 85.5 - (index * 5),
          assigned_line: enableLineAssignment[id] ? (lineAssignments[id]?.[`emp_${id}_${index}`] || '1') : null
        }));

        acc[id] = {
          status: 'preview',
          request: request,
          employees: mockEmployees,
          available_count: request.requested_amount + 2,
          selected_count: request.requested_amount,
          is_putway: isPutway,
          enable_line_assignment: enableLineAssignment[id] || false
        };
        return acc;
      }, {})
    };

    setPreviewData(mockPreviewData);
  };

  const handleBulkFulfill = async () => {
    // Mock bulk fulfill API call with line assignments
    const fulfillmentData = {
      requests: selectedRequests.map(id => ({
        requestId: id,
        employees: Array.from({ length: mockRequests.find(r => r.id === id).requested_amount }, (_, index) => ({
          id: `emp_${id}_${index}`,
          line: enableLineAssignment[id] ? (lineAssignments[id]?.[`emp_${id}_${index}`] || '1') : null
        })),
        enable_line_assignment: enableLineAssignment[id] || false
      }))
    };
    
    console.log('Bulk fulfillment data:', fulfillmentData);
    alert('Bulk fulfillment initiated with line assignments!');
    setPreviewData(null);
    setSelectedRequests([]);
  };

  const requirements = getTotalRequirements();

  // Group employees by line for display
  const getEmployeesByLine = (requestId, employees) => {
    if (!enableLineAssignment[requestId]) {
      return { '1': employees }; // All in line 1 if not enabled
    }

    const lines = {};
    employees.forEach(emp => {
      const line = lineAssignments[requestId]?.[emp.id] || '1';
      if (!lines[line]) {
        lines[line] = [];
      }
      lines[line].push(emp);
    });
    return lines;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Manpower Request Management</h1>
                <p className="text-blue-100">Streamlined bulk fulfillment interface with line assignment</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setBulkFulfillMode(!bulkFulfillMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${bulkFulfillMode
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                  }`}
              >
                {bulkFulfillMode ? (
                  <>
                    <Zap className="w-4 h-4 inline mr-2" />
                    Bulk Mode Active
                  </>
                ) : (
                  'Enable Bulk Mode'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Mode Controls */}
        {bulkFulfillMode && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Bulk Fulfillment Mode - Select multiple requests to fulfill at once
                </span>
              </div>
              <div className="text-sm text-green-700">
                {selectedRequests.length} request(s) selected
              </div>
            </div>

            {/* Auto-fill Strategy */}
            <div className="flex items-center space-x-6">
              <label className="text-sm font-medium text-gray-700">Auto-fill Strategy:</label>
              <div className="flex space-x-4">
                {[
                  { value: 'optimal', label: 'Optimal Match' },
                  { value: 'same_section', label: 'Same Section First' },
                  { value: 'balanced', label: 'Balanced Distribution' }
                ].map(option => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={option.value}
                      checked={autoFillStrategy === option.value}
                      onChange={(e) => setAutoFillStrategy(e.target.value)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Panel */}
        {selectedRequests.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <h3 className="font-semibold text-blue-800 mb-3">Selected Requests Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{requirements.totalRequests}</div>
                <div className="text-sm text-blue-700">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{requirements.totalWorkers}</div>
                <div className="text-sm text-green-700">Total Workers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{requirements.totalMale}</div>
                <div className="text-sm text-blue-700">Male Required</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">{requirements.totalFemale}</div>
                <div className="text-sm text-pink-700">Female Required</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{requirements.putwayRequests}</div>
                <div className="text-sm text-purple-700">Putway Requests</div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Results */}
        {previewData && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h3 className="font-semibold text-gray-800 mb-4">Fulfillment Preview</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(previewData.results).map(([requestId, result]) => {
                const employeesByLine = getEmployeesByLine(requestId, result.employees);
                
                return (
                  <div key={requestId} className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{result.request.sub_section.name}</span>
                        {result.enable_line_assignment && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            <Target className="w-3 h-3 inline mr-1" />
                            Line Assignment Enabled
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {result.selected_count}/{result.request.requested_amount} assigned
                      </span>
                    </div>

                    {result.enable_line_assignment ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(employeesByLine).map(([lineNumber, employees]) => (
                          <div key={lineNumber} className="bg-purple-50 p-3 rounded">
                            <h4 className="font-medium text-purple-800 text-sm mb-2">Line {lineNumber}</h4>
                            <div className="space-y-1">
                              {employees.map(emp => (
                                <div key={emp.id} className="text-xs text-purple-700">
                                  {emp.name} ({emp.nik}) – {emp.type}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {result.employees.map(emp => (
                          <div key={emp.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {emp.name} ({emp.nik}) - {emp.gender} - Score: {emp.total_score}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="p-6">
          {Object.entries(groupedRequests).map(([date, requests]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h2>
                </div>
                {bulkFulfillMode && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={requests.every(req => selectedRequests.includes(req.id))}
                      onChange={(e) => handleSelectAllForDate(date, e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Select all for this date</span>
                  </label>
                )}
              </div>

              <div className="grid gap-4">
                {requests.map(request => {
                  const isSelected = selectedRequests.includes(request.id);
                  const enableLine = enableLineAssignment[request.id] || false;
                  
                  return (
                    <div
                      key={request.id}
                      className={`border rounded-lg p-4 transition-all ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {bulkFulfillMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleRequestSelect(request.id, e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                          )}
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{request.sub_section.name}</span>
                            {enableLine && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                <Target className="w-3 h-3 inline mr-1" />
                                Line Assignment
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{request.requested_amount}</span> workers needed
                          </div>
                          {(request.male_count > 0 || request.female_count > 0) && (
                            <div className="flex space-x-2">
                              {request.male_count > 0 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {request.male_count}M
                                </span>
                              )}
                              {request.female_count > 0 && (
                                <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded">
                                  {request.female_count}F
                                </span>
                              )}
                            </div>
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {request.shift}
                          </span>

                          {!bulkFulfillMode && (
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                Quick Fill
                              </button>
                              <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                                Custom
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Line Assignment Configuration */}
                      {isSelected && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-800">Line Assignment Configuration</span>
                            </div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={enableLine}
                                onChange={(e) => handleEnableLineAssignment(request.id, e.target.checked)}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-purple-700">Enable Line Assignment</span>
                            </label>
                          </div>

                          {enableLine && (
                            <div className="space-y-3">
                              <div className="text-xs text-purple-600 mb-2">
                                Assign employees to different lines by selecting their line number
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map(line => (
                                  <div key={line} className="bg-white p-3 rounded border">
                                    <h5 className="font-medium text-purple-700 text-sm mb-2">Line {line}</h5>
                                    <div className="space-y-2">
                                      {Array.from({ length: request.requested_amount }, (_, index) => {
                                        const empId = `emp_${request.id}_${index}`;
                                        const currentLine = lineAssignments[request.id]?.[empId] || '1';
                                        
                                        return (
                                          <div key={empId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-xs text-gray-700">Employee {index + 1}</span>
                                            <select
                                              value={currentLine}
                                              onChange={(e) => handleLineAssignmentChange(request.id, empId, e.target.value)}
                                              className="text-xs border border-gray-300 rounded px-2 py-1"
                                            >
                                              {[1, 2].map(lineNum => (
                                                <option key={lineNum} value={lineNum.toString()}>
                                                  Line {lineNum}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Action Footer */}
        {bulkFulfillMode && selectedRequests.length > 0 && (
          <div className="bg-gray-50 border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div className="text-sm text-gray-600">
                  <div>
                    This will attempt to automatically fulfill {selectedRequests.length} requests using the {autoFillStrategy.replace('_', ' ')} strategy
                  </div>
                  {Object.values(enableLineAssignment).some(enabled => enabled) && (
                    <div className="text-purple-600 mt-1">
                      Line assignment will be applied to {Object.values(enableLineAssignment).filter(Boolean).length} request(s)
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedRequests([])}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear Selection
                </button>
                {!previewData ? (
                  <button
                    onClick={handlePreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Preview Assignment ({selectedRequests.length})
                  </button>
                ) : (
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close Preview
                  </button>
                )}
                <button
                  onClick={handleBulkFulfill}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  disabled={!previewData}
                >
                  Auto-Fulfill Selected ({selectedRequests.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkFulfillInterface;