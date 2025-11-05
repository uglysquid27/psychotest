// BulkFulfillInterface.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle, Users, Calendar, Building, AlertTriangle, Zap, Target, Settings, Move, X, Plus, Trash2, Grid, List } from 'lucide-react';

const BulkFulfillInterface = () => {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [bulkFulfillMode, setBulkFulfillMode] = useState(true); // Start in bulk mode
  const [autoFillStrategy, setAutoFillStrategy] = useState('optimal');
  const [previewData, setPreviewData] = useState(null);
  const [lineAssignmentConfig, setLineAssignmentConfig] = useState({});
  const [draggingEmployee, setDraggingEmployee] = useState(null);
  const [activeRequestConfig, setActiveRequestConfig] = useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState({});
  const [viewMode, setViewMode] = useState('grouped');

  // Mock data
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
    },
    {
      id: 4,
      date: '2025-09-05',
      sub_section: { name: 'shrink', id: 4 },
      requested_amount: 6,
      male_count: 3,
      female_count: 3,
      status: 'pending',
      shift: 'Morning'
    }
  ];

  // Mock employees
  const mockEmployees = [
    { id: 1, name: 'John Doe', nik: 'NIK001', gender: 'male', type: 'bulanan', total_score: 85.5, status: 'available' },
    { id: 2, name: 'Jane Smith', nik: 'NIK002', gender: 'female', type: 'harian', total_score: 82.3, status: 'available' },
    { id: 3, name: 'Bob Johnson', nik: 'NIK003', gender: 'male', type: 'bulanan', total_score: 78.9, status: 'available' },
    { id: 4, name: 'Alice Brown', nik: 'NIK004', gender: 'female', type: 'harian', total_score: 88.1, status: 'available' },
    { id: 5, name: 'Charlie Wilson', nik: 'NIK005', gender: 'male', type: 'bulanan', total_score: 76.4, status: 'available' },
    { id: 6, name: 'Diana Lee', nik: 'NIK006', gender: 'female', type: 'harian', total_score: 91.2, status: 'available' },
    { id: 7, name: 'Edward Chen', nik: 'NIK007', gender: 'male', type: 'bulanan', total_score: 79.8, status: 'available' },
    { id: 8, name: 'Fiona Wang', nik: 'NIK008', gender: 'female', type: 'harian', total_score: 84.7, status: 'available' },
    { id: 9, name: 'George Kumar', nik: 'NIK009', gender: 'male', type: 'bulanan', total_score: 81.3, status: 'available' },
    { id: 10, name: 'Helen Garcia', nik: 'NIK010', gender: 'female', type: 'harian', total_score: 87.6, status: 'available' }
  ];

  // Initialize line assignment config for putway/shrink requests
  useEffect(() => {
    const initialConfig = {};
    mockRequests.forEach(request => {
      if (needsLineAssignment(request)) {
        initialConfig[request.id] = initializeLineConfig(request);
      }
    });
    setLineAssignmentConfig(initialConfig);
  }, []);

  const needsLineAssignment = useCallback((request) => {
    const sectionName = request.sub_section?.name?.toLowerCase() || '';
    return sectionName === 'putway' || sectionName === 'shrink';
  }, []);

  const initializeLineConfig = useCallback((request) => {
    const defaultLines = needsLineAssignment(request) ? 
      (request.sub_section?.name?.toLowerCase() === 'putway' ? 2 : 4) : 2;
    
    const lineCounts = Array.from({ length: defaultLines }, (_, i) => 
      Math.ceil(request.requested_amount / defaultLines)
    );
    
    // Adjust to match total exactly
    let totalAssigned = lineCounts.reduce((sum, count) => sum + count, 0);
    let index = 0;
    while (totalAssigned > request.requested_amount && lineCounts.length > 0) {
      if (lineCounts[index] > 1) {
        lineCounts[index]--;
        totalAssigned--;
      }
      index = (index + 1) % lineCounts.length;
    }

    return {
      enabled: true, // Auto-enable for putway/shrink
      lineCount: defaultLines,
      lineCounts: lineCounts,
      employeesPerLine: Array.from({ length: defaultLines }, () => [])
    };
  }, [needsLineAssignment]);

  const getAssignedLine = useCallback((config, employeeIndex) => {
    if (!config?.enabled || !config.lineCounts) return null;
    
    let cumulative = 0;
    for (let i = 0; i < config.lineCounts.length; i++) {
      cumulative += config.lineCounts[i];
      if (employeeIndex < cumulative) {
        return (i + 1).toString();
      }
    }
    return config.lineCounts.length.toString();
  }, []);

  const getEmployeesByLine = useCallback((requestId) => {
    const config = lineAssignmentConfig[requestId];
    const assignments = employeeAssignments[requestId] || [];
    
    if (!config?.enabled) {
      return { 'all': assignments.map((id, index) => {
        const employee = mockEmployees.find(emp => emp.id === id);
        return employee ? { ...employee, globalPosition: index + 1 } : null;
      }).filter(Boolean) };
    }

    const employeesByLine = {};
    Array.from({ length: config.lineCount }).forEach((_, lineIndex) => {
      employeesByLine[lineIndex + 1] = [];
    });

    assignments.forEach((employeeId, index) => {
      const lineNumber = getAssignedLine(config, index);
      if (lineNumber && employeesByLine[lineNumber]) {
        const employee = mockEmployees.find(emp => emp.id === employeeId);
        if (employee) {
          employeesByLine[lineNumber].push({
            ...employee,
            positionInLine: employeesByLine[lineNumber].length + 1,
            globalPosition: index + 1
          });
        }
      }
    });

    return employeesByLine;
  }, [lineAssignmentConfig, employeeAssignments, getAssignedLine]);

  // FIXED: Enhanced request selection with auto line config
  const handleRequestSelect = (requestId, checked) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
      const request = mockRequests.find(req => req.id === requestId);
      
      // Auto-initialize line config for putway/shrink if not exists
      if (request && needsLineAssignment(request) && !lineAssignmentConfig[requestId]) {
        setLineAssignmentConfig(prev => ({
          ...prev,
          [requestId]: initializeLineConfig(request)
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
      
      // Initialize config for putway/shrink requests
      dateRequests.forEach(requestId => {
        const request = mockRequests.find(req => req.id === requestId);
        if (request && needsLineAssignment(request) && !lineAssignmentConfig[requestId]) {
          setLineAssignmentConfig(prev => ({
            ...prev,
            [requestId]: initializeLineConfig(request)
          }));
        }
      });
    } else {
      setSelectedRequests(prev => prev.filter(id => !dateRequests.includes(id)));
    }
  };

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

  const assignEmployee = (requestId, employeeId) => {
    setEmployeeAssignments(prev => {
      const currentAssignments = prev[requestId] || [];
      if (currentAssignments.includes(employeeId)) {
        return prev;
      }
      
      const request = mockRequests.find(req => req.id === requestId);
      if (currentAssignments.length >= request.requested_amount) {
        alert(`Maximum ${request.requested_amount} employees allowed for this request`);
        return prev;
      }
      
      return {
        ...prev,
        [requestId]: [...currentAssignments, employeeId]
      };
    });
  };

  const removeEmployee = (requestId, employeeId) => {
    setEmployeeAssignments(prev => ({
      ...prev,
      [requestId]: (prev[requestId] || []).filter(id => id !== employeeId)
    }));
  };

  const handleAutoAssign = (requestId) => {
    const request = mockRequests.find(req => req.id === requestId);
    const currentAssignments = employeeAssignments[requestId] || [];
    const remainingSlots = request.requested_amount - currentAssignments.length;
    
    if (remainingSlots <= 0) return;

    const availableEmployees = mockEmployees.filter(emp => 
      !Object.values(employeeAssignments).flat().includes(emp.id) && 
      emp.status === 'available'
    );

    const employeesToAssign = availableEmployees
      .slice(0, remainingSlots)
      .map(emp => emp.id);

    setEmployeeAssignments(prev => ({
      ...prev,
      [requestId]: [...currentAssignments, ...employeesToAssign]
    }));
  };

  // FIXED: Enhanced Line Configuration Component
  const LineAssignmentDisplay = ({ requestId }) => {
    const request = mockRequests.find(req => req.id === requestId);
    const config = lineAssignmentConfig[requestId];
    const assignments = employeeAssignments[requestId] || [];
    const employeesByLine = getEmployeesByLine(requestId);

    if (!request || !config?.enabled) return null;

    const totalAllocated = config.lineCounts?.reduce((sum, count) => sum + count, 0) || 0;

    return (
      <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-purple-800 text-lg flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Line Assignment Configuration
            </h4>
            <p className="text-purple-600 text-sm">
              {config.lineCount} lines • {totalAllocated} positions allocated
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              assignments.length >= totalAllocated 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assignments.length}/{totalAllocated} assigned
            </span>
            <button
              onClick={() => setActiveRequestConfig(requestId)}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center"
            >
              <Settings className="w-4 h-4 mr-1" />
              Configure
            </button>
          </div>
        </div>

        {/* Line Assignment Grid */}
        <div className={`grid gap-4 ${config.lineCount <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {Array.from({ length: config.lineCount }).map((_, lineIndex) => {
            const lineNumber = lineIndex + 1;
            const lineEmployees = employeesByLine[lineNumber] || [];
            const allocated = config.lineCounts[lineIndex] || 0;
            
            return (
              <div key={lineNumber} className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-bold text-purple-700 text-lg">Line {lineNumber}</h5>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    lineEmployees.length === allocated 
                      ? 'bg-green-100 text-green-800' 
                      : lineEmployees.length > 0 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lineEmployees.length}/{allocated}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {lineEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="bg-purple-50 p-3 rounded border border-purple-100"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <div className="font-semibold text-purple-800">
                            {employee.positionInLine}. {employee.name}
                          </div>
                          <div className="text-purple-600 text-xs">
                            NIK: {employee.nik} • {employee.gender === 'female' ? '♀' : '♂'}
                          </div>
                        </div>
                        <button
                          onClick={() => removeEmployee(requestId, employee.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-purple-500 text-xs">
                        Type: {employee.type} • Score: {employee.total_score}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: allocated - lineEmployees.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="bg-gray-100 p-3 rounded border border-dashed border-gray-300 text-center"
                    >
                      <div className="text-gray-500 text-sm italic">
                        Position {lineEmployees.length + index + 1}
                      </div>
                      <div className="text-gray-400 text-xs">Available</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Assignment Summary */}
        <div className="mt-4 pt-4 border-t border-purple-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {Array.from({ length: config.lineCount }).map((_, lineIndex) => {
              const lineNumber = lineIndex + 1;
              const lineEmployees = employeesByLine[lineNumber] || [];
              const allocated = config.lineCounts[lineIndex] || 0;
              
              return (
                <div key={lineNumber} className={`p-3 rounded ${
                  lineEmployees.length === allocated 
                    ? 'bg-green-50 border border-green-200' 
                    : lineEmployees.length > 0 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="font-semibold text-purple-800">Line {lineNumber}</div>
                  <div className="text-purple-600">{lineEmployees.length}/{allocated}</div>
                  <div className={`text-xs font-medium ${
                    lineEmployees.length === allocated 
                      ? 'text-green-600' 
                      : lineEmployees.length > 0 
                      ? 'text-yellow-600' 
                      : 'text-gray-600'
                  }`}>
                    {lineEmployees.length === allocated ? 'Complete' : 'In Progress'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // FIXED: Enhanced request item display
  const RequestItem = ({ request }) => {
    const isSelected = selectedRequests.includes(request.id);
    const needsLine = needsLineAssignment(request);
    const config = lineAssignmentConfig[request.id];
    const assignments = employeeAssignments[request.id] || [];

    return (
      <div className={`border rounded-lg transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}>
        {/* Request Header */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => bulkFulfillMode && handleRequestSelect(request.id, !isSelected)}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            <div className="flex items-center space-x-3">
              {bulkFulfillMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleRequestSelect(request.id, e.target.checked);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              )}
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="font-semibold text-gray-900 text-lg">{request.sub_section.name}</span>
                  {needsLine && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      <Target className="w-3 h-3 inline mr-1" />
                      Line Assignment
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
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
              <span className={`px-2 py-1 text-xs rounded ${
                assignments.length === request.requested_amount 
                  ? 'bg-green-100 text-green-800' 
                  : assignments.length > 0 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {assignments.length}/{request.requested_amount} assigned
              </span>
            </div>
          </div>

          {/* Line Config Status */}
          {needsLine && isSelected && config && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Line Assignment: {config.lineCount} lines configured
                  </span>
                </div>
                <div className="text-sm text-purple-600">
                  {config.lineCounts?.join(' + ')} = {config.lineCounts?.reduce((a, b) => a + b, 0)} positions
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Line Assignment Display */}
        {isSelected && needsLine && config?.enabled && (
          <LineAssignmentDisplay requestId={request.id} />
        )}

        {/* Employee Assignment (for non-line requests) */}
        {isSelected && (!needsLine || !config?.enabled) && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Employee Assignment</h4>
              <button
                onClick={() => handleAutoAssign(request.id)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Auto-Assign
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignments.map((employeeId, index) => {
                const employee = mockEmployees.find(emp => emp.id === employeeId);
                return employee ? (
                  <div key={employeeId} className="bg-white p-3 rounded border">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">
                      {employee.nik} • {employee.gender === 'female' ? '♀' : '♂'}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Bulk Request Fulfillment</h1>
                <p className="text-blue-100">Line assignment enabled for putway/shrink sections</p>
              </div>
            </div>
            <div className="text-white">
              <div className="text-sm">Selected: {selectedRequests.length} requests</div>
              <div className="text-xs">
                Line assignment: {selectedRequests.filter(id => needsLineAssignment(mockRequests.find(r => r.id === id))).length} requests
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Requests</h2>
            <div className="space-y-4">
              {mockRequests.map(request => (
                <RequestItem key={request.id} request={request} />
              ))}
            </div>
          </div>

          {selectedRequests.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Ready to Fulfill</h3>
              <p className="text-blue-600">
                {selectedRequests.length} requests selected with line assignment
              </p>
              <button className="mt-3 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                Process {selectedRequests.length} Requests
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkFulfillInterface;