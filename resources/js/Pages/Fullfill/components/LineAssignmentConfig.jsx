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
    selectedIds,
    lineAssignments = {} // Use parent's lineAssignments directly
}) => {
    const config = lineAssignmentConfig[requestId] || { enabled: false, lineCount: 2, lineCounts: [] };
    
    // Local state for config only
    const [localConfig, setLocalConfig] = useState({
        enabled: config.enabled,
        lineCount: config.lineCount || 2,
        lineCounts: config.lineCounts || []
    });

    // Sync with parent config
    useEffect(() => {
        setLocalConfig({
            enabled: config.enabled,
            lineCount: config.lineCount || 2,
            lineCounts: config.lineCounts || []
        });
    }, [config.enabled, config.lineCount, config.lineCounts]);

    // Calculate line counts
    const calculateLineCounts = useCallback((lineCount, requestedAmount) => {
        const baseCount = Math.floor(requestedAmount / lineCount);
        const remainder = requestedAmount % lineCount;
        
        return Array.from({ length: lineCount }, (_, i) => 
            i < remainder ? baseCount + 1 : baseCount
        );
    }, []);

    const handleToggleEnabled = useCallback((enabled) => {
        const newConfig = {
            ...localConfig,
            enabled,
            lineCounts: enabled ? calculateLineCounts(localConfig.lineCount, request.requested_amount) : []
        };
        
        setLocalConfig(newConfig);
        handleLineConfigChange(requestId, 'fullConfig', newConfig);
        
        if (enabled) {
            const employeesForLine = bulkMode 
                ? (bulkSelectedEmployees[requestId] || [])
                : (selectedIds || []);
                
            const newLineAssignments = {};
            employeesForLine.forEach((employeeId, index) => {
                newLineAssignments[employeeId] = ((index % localConfig.lineCount) + 1).toString();
            });
            
            // Update parent with all assignments
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

        // Reassign employees when line count changes
        if (localConfig.enabled) {
            const newAssignments = {};
            selectedIds.forEach((id, index) => {
                newAssignments[String(id)] = ((index % lineCount) + 1).toString();
            });
            
            // Update parent
            Object.entries(newAssignments).forEach(([employeeId, line]) => {
                handleLineConfigChange(requestId, 'line_assignment', {
                    employeeId,
                    newLine: line
                });
            });
        }
    }, [localConfig, request.requested_amount, calculateLineCounts, requestId, handleLineConfigChange, selectedIds]);

    // Get employees for display
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

    // Use parent's lineAssignments directly
    const getEmployeesByLine = useCallback(() => {
        const lines = {};
        
        if (!selectedEmployees || !Array.isArray(selectedEmployees)) {
            return lines;
        }

        // Initialize all lines
        for (let i = 1; i <= localConfig.lineCount; i++) {
            lines[i] = [];
        }

        console.log('🔄 Grouping employees by line assignments:', {
            selectedEmployees: selectedEmployees.map(emp => ({ id: emp.id, name: emp.name })),
            lineAssignments: lineAssignments,
            lineCount: localConfig.lineCount
        });

        // Group employees by their assigned line from parent's lineAssignments
        selectedEmployees.forEach(employee => {
            const assignedLine = lineAssignments[employee.id] || '1';
            
            if (lines[assignedLine]) {
                lines[assignedLine].push(employee);
            } else {
                // Fallback to line 1 if assignment is invalid
                lines['1'].push(employee);
            }
        });

        console.log('✅ Final line distribution:', Object.keys(lines).reduce((acc, line) => {
            acc[line] = lines[line].map(emp => `${emp.name} (${emp.id})`);
            return acc;
        }, {}));

        return lines;
    }, [selectedEmployees, lineAssignments, localConfig.lineCount]);

    const totalRequested = request.requested_amount;

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

    // Use parent's lineAssignments directly - update parent when moving employees
    const moveEmployee = useCallback((employeeId, fromLine, toLine) => {
        console.log('🔄 Moving employee:', {
            employeeId,
            fromLine,
            toLine,
            currentLineAssignments: lineAssignments
        });

        if (fromLine === toLine) {
            console.log('🚫 Same line, no move needed');
            return;
        }

        // Update parent component directly
        handleLineConfigChange(requestId, 'line_assignment', {
            employeeId,
            newLine: toLine
        });

        console.log('✅ Updated parent with new line assignment');

        // Recalculate line counts based on actual assignments
        const newLineAssignments = {
            ...lineAssignments,
            [employeeId]: toLine
        };

        const newLineCounts = Array(localConfig.lineCount).fill(0);
        Object.values(newLineAssignments).forEach(line => {
            const lineIndex = parseInt(line) - 1;
            if (lineIndex >= 0 && lineIndex < localConfig.lineCount) {
                newLineCounts[lineIndex]++;
            }
        });

        console.log('📊 Recalculated line counts:', newLineCounts);

        const newConfig = {
            ...localConfig,
            lineCounts: newLineCounts
        };
        
        setLocalConfig(newConfig);
        handleLineConfigChange(requestId, 'fullConfig', newConfig);
    }, [lineAssignments, localConfig, requestId, handleLineConfigChange]);

    const employeesByLine = getEmployeesByLine();

    // Log current state for debugging
    useEffect(() => {
        console.log('📊 CURRENT LINE ASSIGNMENT STATE', {
            localConfig,
            lineAssignments,
            employeesByLine: Object.keys(employeesByLine).reduce((acc, line) => {
                acc[line] = employeesByLine[line].map(emp => `${emp.name} (${emp.id})`);
                return acc;
            }, {}),
            selectedIds
        });
    }, [localConfig, lineAssignments, employeesByLine, selectedIds]);

    // Render functions
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
                                console.log('🔄 Resetting all to line 1');
                                // Reset all to line 1 - update parent directly
                                const resetAssignments = {};
                                selectedIds.forEach(id => {
                                    resetAssignments[String(id)] = '1';
                                });
                                
                                // Update parent with all reset assignments
                                Object.entries(resetAssignments).forEach(([employeeId, line]) => {
                                    handleLineConfigChange(requestId, 'line_assignment', {
                                        employeeId,
                                        newLine: line
                                    });
                                });

                                const newLineCounts = [request.requested_amount, ...Array(localConfig.lineCount - 1).fill(0)];
                                const newConfig = {
                                    ...localConfig,
                                    lineCounts: newLineCounts
                                };
                                setLocalConfig(newConfig);
                                handleLineConfigChange(requestId, 'fullConfig', newConfig);
                                
                                console.log('✅ Reset all to line 1 completed');
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Reset ke Line 1
                        </button>
                    </div>
                )}

                {/* Debug Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="text-xs text-gray-600">
                        <strong>Debug Info:</strong> {selectedIds.length} karyawan dipilih, {Object.keys(lineAssignments).length} assignment tersimpan
                    </div>
                </div>
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
                                    <div className="text-xs text-purple-500 mt-1">
                                        ID: {emp.id}
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
                                                    onClick={() => {
                                                        console.log('🖱️ Move button clicked:', {
                                                            employeeId: emp.id,
                                                            employeeName: emp.name,
                                                            fromLine: lineNumber,
                                                            toLine: targetLine
                                                        });
                                                        onMoveEmployee(emp.id, lineNumber, targetLine);
                                                    }}
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