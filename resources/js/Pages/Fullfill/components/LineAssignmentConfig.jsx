import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Move } from 'lucide-react';

// Memoized component to prevent unnecessary re-renders
const LineAssignmentConfig = React.memo(({ 
    requestId, 
    request, 
    lineAssignmentConfig, 
    handleLineConfigChange, 
    getEmployeeDetails,
    bulkMode = false,
    bulkSelectedEmployees,
    selectedIds
}) => {
    const config = lineAssignmentConfig[requestId] || { enabled: false, lineCount: 2, lineCounts: [] };
    
    // Simplified state - only track what's necessary
    const [localConfig, setLocalConfig] = useState({
        enabled: config.enabled,
        lineCount: config.lineCount || 2,
        lineCounts: config.lineCounts || []
    });

    // Single effect to sync with parent config
    useEffect(() => {
        setLocalConfig({
            enabled: config.enabled,
            lineCount: config.lineCount || 2,
            lineCounts: config.lineCounts || []
        });
    }, [config.enabled, config.lineCount, config.lineCounts]);

    // Debounced config updates to prevent rapid re-renders
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (JSON.stringify(localConfig) !== JSON.stringify(config)) {
                handleLineConfigChange(requestId, 'fullConfig', localConfig);
            }
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [localConfig, config, requestId, handleLineConfigChange]);

    // Simplified line count calculation
    const calculateLineCounts = useCallback((lineCount, requestedAmount) => {
        const baseCount = Math.floor(requestedAmount / lineCount);
        const remainder = requestedAmount % lineCount;
        
        return Array.from({ length: lineCount }, (_, i) => 
            i < remainder ? baseCount + 1 : baseCount
        );
    }, []);

const handleToggleEnabled = useCallback((enabled) => {
    // console.log('🎯 Toggle line assignment enabled:', enabled);
    
    const newConfig = {
        ...localConfig,
        enabled,
        lineCounts: enabled ? calculateLineCounts(localConfig.lineCount, request.requested_amount) : []
    };
    
    setLocalConfig(newConfig);
    
    // Immediately update the parent with the new enabled state
    handleLineConfigChange(requestId, 'fullConfig', newConfig);
    
    // Also update line assignments when enabling
    if (enabled) {
        const employeesForLine = bulkMode 
            ? (bulkSelectedEmployees[requestId] || [])
            : (selectedIds || []);
            
        const newLineAssignments = {};
        employeesForLine.forEach((employeeId, index) => {
            newLineAssignments[employeeId] = ((index % localConfig.lineCount) + 1).toString();
        });
        
        // Update line assignments in parent
        Object.entries(newLineAssignments).forEach(([employeeId, line]) => {
            handleLineConfigChange(requestId, 'line_assignment', {
                employeeId,
                newLine: line
            });
        });
    }
}, [localConfig, request.requested_amount, calculateLineCounts, requestId, handleLineConfigChange, bulkMode, bulkSelectedEmployees, selectedIds]);

    const handleLineCountChange = useCallback((newLineCount) => {
        const lineCount = Math.max(1, Math.min(6, parseInt(newLineCount) || 2));
        const newConfig = {
            ...localConfig,
            lineCount,
            lineCounts: localConfig.enabled ? calculateLineCounts(lineCount, request.requested_amount) : []
        };
        setLocalConfig(newConfig);
        handleLineConfigChange(requestId, 'fullConfig', newConfig);
    }, [localConfig, request.requested_amount, calculateLineCounts, requestId, handleLineConfigChange]);

    // Memoized derived data - simplified
    const employeesForLine = useMemo(() => {
        if (!selectedIds) return [];
        return bulkMode 
            ? (bulkSelectedEmployees[requestId] || [])
            : (selectedIds || []);
    }, [bulkMode, bulkSelectedEmployees, requestId, selectedIds]);

    const selectedEmployees = useMemo(() => {
        if (!employeesForLine || !getEmployeeDetails) return [];
        return employeesForLine
            .map(id => getEmployeeDetails(id))
            .filter(Boolean);
    }, [employeesForLine, getEmployeeDetails]);

    // This is the key function - get current line assignments for display
    const getEmployeesByLine = useCallback(() => {
        const lines = {};
        
        if (!selectedEmployees || !Array.isArray(selectedEmployees)) {
            return lines;
        }

        // Initialize all lines
        for (let i = 1; i <= localConfig.lineCount; i++) {
            lines[i] = [];
        }

        // Distribute employees to lines based on lineCounts
        let employeeIndex = 0;
        localConfig.lineCounts.forEach((lineCapacity, lineIndex) => {
            const lineNumber = lineIndex + 1;
            const lineEmployees = selectedEmployees.slice(employeeIndex, employeeIndex + lineCapacity);
            lines[lineNumber] = lineEmployees;
            employeeIndex += lineCapacity;
        });
        
        return lines;
    }, [selectedEmployees, localConfig.lineCounts, localConfig.lineCount]);

    const totalRequested = request.requested_amount;
    const totalAllocated = localConfig.lineCounts.reduce((sum, count) => sum + count, 0);
    const totalAssigned = employeesForLine.length;

    const handleLineCountChangeForLine = (lineIndex, newCount) => {
        const newLineCounts = [...localConfig.lineCounts];
        newLineCounts[lineIndex] = Math.max(1, parseInt(newCount) || 1);
        
        const totalAssigned = newLineCounts.reduce((sum, count) => sum + count, 0);
        if (totalAssigned <= request.requested_amount) {
            const newConfig = {
                ...localConfig,
                lineCounts: newLineCounts
            };
            setLocalConfig(newConfig);
            handleLineConfigChange(requestId, 'fullConfig', newConfig);
        }
    };

    const moveEmployee = (employeeId, fromLine, toLine) => {
        if (fromLine !== toLine) {
            const fromCount = localConfig.lineCounts[parseInt(fromLine) - 1] || 0;
            const toCount = localConfig.lineCounts[parseInt(toLine) - 1] || 0;
            
            // Check if move is allowed based on line capacity
            if (toCount > 0) {
                // Update line assignments in parent component
                handleLineConfigChange(requestId, 'line_assignment', {
                    employeeId,
                    newLine: toLine
                });
                
                // Update line counts
                const newLineCounts = [...localConfig.lineCounts];
                newLineCounts[parseInt(fromLine) - 1] = fromCount - 1;
                newLineCounts[parseInt(toLine) - 1] = toCount + 1;
                
                const newConfig = {
                    ...localConfig,
                    lineCounts: newLineCounts
                };
                setLocalConfig(newConfig);
                handleLineConfigChange(requestId, 'fullConfig', newConfig);
            }
        }
    };

    const employeesByLine = getEmployeesByLine();

    // Simplified render - break into smaller components
    const renderLineConfig = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {localConfig.lineCounts.map((count, lineIndex) => (
                <LineConfigItem
                    key={lineIndex}
                    lineIndex={lineIndex}
                    count={count}
                    onCountChange={(newCount) => handleLineCountChangeForLine(lineIndex, newCount)}
                    totalRequested={totalRequested}
                />
            ))}
        </div>
    );

    const renderLineAssignments = () => (
        <div className={`gap-4 grid ${
            localConfig.lineCount <= 2 ? 'grid-cols-2' : 
            localConfig.lineCount <= 4 ? 'grid-cols-2 md:grid-cols-4' : 
            'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
        }`}>
            {Object.entries(employeesByLine).map(([lineNumber, employees]) => (
                <LineAssignmentItem
                    key={lineNumber}
                    lineNumber={lineNumber}
                    employees={employees}
                    allocated={localConfig.lineCounts[lineNumber - 1] || 0}
                    getEmployeeDetails={getEmployeeDetails}
                    onMoveEmployee={moveEmployee}
                    lineCount={localConfig.lineCount}
                />
            ))}
        </div>
    );

    if (!localConfig.enabled) {
        return (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-800">
                        Konfigurasi Penugasan Line
                    </span>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={localConfig.enabled}
                            onChange={(e) => handleToggleEnabled(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-purple-700">Aktifkan Penugasan Line</span>
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-purple-800">
                    Konfigurasi Penugasan Line
                </span>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={localConfig.enabled}
                        onChange={(e) => handleToggleEnabled(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-700">Aktifkan Penugasan Line</span>
                </label>
            </div>

            <div className="space-y-4">
                <div className="flex items-center space-x-4">
                    <label className="text-sm text-purple-700">Jumlah Line:</label>
                    <select
                        value={localConfig.lineCount}
                        onChange={(e) => handleLineCountChange(e.target.value)}
                        className="px-3 py-1 border border-purple-300 rounded text-sm"
                    >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                            <option key={num} value={num}>{num} Line{num > 1 ? 's' : ''}</option>
                        ))}
                    </select>
                </div>

                {renderLineConfig()}
                {renderLineAssignments()}

                {/* Quick Actions */}
                {localConfig.lineCount > 1 && (
                    <div className="flex justify-center space-x-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                // Distribute evenly
                                handleLineCountChange(localConfig.lineCount);
                            }}
                            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                            Distribusikan Merata
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                // Reset all to line 1
                                const newLineCounts = [request.requested_amount, ...Array(localConfig.lineCount - 1).fill(0)];
                                const newConfig = {
                                    ...localConfig,
                                    lineCounts: newLineCounts
                                };
                                setLocalConfig(newConfig);
                                handleLineConfigChange(requestId, 'fullConfig', newConfig);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Reset ke Line 1
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

// Extract smaller components to reduce re-renders
const LineConfigItem = React.memo(({ lineIndex, count, onCountChange, totalRequested }) => (
    <div className="bg-white p-3 rounded border">
        <div className="font-medium text-purple-700 text-sm mb-2">
            Line {lineIndex + 1}
        </div>
        <div className="flex items-center space-x-2">
            <label className="text-xs text-purple-600">Karyawan:</label>
            <input
                type="number"
                min="1"
                max={totalRequested}
                value={count}
                onChange={(e) => onCountChange(e.target.value)}
                className="w-16 px-2 py-1 border border-purple-300 rounded text-sm text-center"
            />
        </div>
    </div>
));

const LineAssignmentItem = React.memo(({ lineNumber, employees, allocated, getEmployeeDetails, onMoveEmployee, lineCount }) => {
    const filled = employees ? employees.length : 0;
    
    return (
        <div className="bg-white p-4 rounded border border-purple-200">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-purple-800">Line {lineNumber}</h4>
                <div className={`text-xs px-2 py-1 rounded ${filled === allocated 
                        ? 'bg-green-100 text-green-800'
                        : filled > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                    {filled}/{allocated}
                </div>
            </div>
            
            <div className="space-y-2">
                {employees && employees.map((emp, index) => {
                    if (!emp) return null;
                    
                    return (
                        <div key={emp.id || index} className="bg-purple-50 p-3 rounded border border-purple-100">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-purple-800 text-sm">
                                        {index + 1}. {emp.name}
                                    </div>
                                    <div className="text-xs text-purple-600">
                                        {emp.nik} • {emp.type}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Move buttons - placed under the name */}
                            {lineCount > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {Array.from({ length: lineCount }, (_, targetIndex) => {
                                        const targetLine = (targetIndex + 1).toString();
                                        if (targetLine !== lineNumber) {
                                            return (
                                                <button
                                                    key={targetLine}
                                                    type="button"
                                                    onClick={() => onMoveEmployee(emp.id, lineNumber, targetLine)}
                                                    className="px-2 py-1 text-xs bg-white border border-purple-300 text-purple-700 rounded hover:bg-purple-50 transition-colors"
                                                    title={`Pindah ke Line ${targetLine}`}
                                                >
                                                    → {targetLine}
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {(!employees || employees.length === 0) && (
                    <div className="text-center text-xs text-gray-500 py-4">
                        Tidak ada karyawan ditugaskan
                    </div>
                )}
            </div>
        </div>
    );
});

export default LineAssignmentConfig;