import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Memoized component to prevent unnecessary re-renders
const LineAssignmentConfig = React.memo(({ 
    requestId, 
    request, 
    lineAssignmentConfig, 
    handleLineConfigChange, 
    handleLineEmployeeCountChange,
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

    // Optimized handlers
    const handleToggleEnabled = useCallback((enabled) => {
        const newConfig = {
            ...localConfig,
            enabled,
            lineCounts: enabled ? calculateLineCounts(localConfig.lineCount, request.requested_amount) : []
        };
        setLocalConfig(newConfig);
    }, [localConfig, request.requested_amount, calculateLineCounts]);

    const handleLineCountChange = useCallback((newLineCount) => {
        const lineCount = Math.max(1, Math.min(6, parseInt(newLineCount) || 2));
        const newConfig = {
            ...localConfig,
            lineCount,
            lineCounts: localConfig.enabled ? calculateLineCounts(lineCount, request.requested_amount) : []
        };
        setLocalConfig(newConfig);
    }, [localConfig, request.requested_amount, calculateLineCounts]);

    // Simplified employee assignment calculation
    const getLineAssignments = useCallback((employeeIds, lineCounts) => {
        const assignments = {};
        let currentIndex = 0;
        
        lineCounts.forEach((count, lineIndex) => {
            const lineNumber = lineIndex + 1;
            assignments[lineNumber] = employeeIds.slice(currentIndex, currentIndex + count);
            currentIndex += count;
        });
        
        return assignments;
    }, []);

    // Memoized derived data - simplified
    const employeesForLine = useMemo(() => 
        bulkMode 
            ? (bulkSelectedEmployees[requestId] || [])
            : (selectedIds || []),
        [bulkMode, bulkSelectedEmployees, requestId, selectedIds]
    );

    const lineAssignments = useMemo(() => 
        localConfig.enabled && localConfig.lineCounts.length > 0
            ? getLineAssignments(employeesForLine, localConfig.lineCounts)
            : {},
        [localConfig.enabled, localConfig.lineCounts, employeesForLine, getLineAssignments]
    );

    const totalRequested = request.requested_amount;
    const totalAllocated = localConfig.lineCounts.reduce((sum, count) => sum + count, 0);
    const totalAssigned = employeesForLine.length;

    // Simplified render - break into smaller components
    const renderLineConfig = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {localConfig.lineCounts.map((count, lineIndex) => (
                <LineConfigItem
                    key={lineIndex}
                    lineIndex={lineIndex}
                    count={count}
                    onCountChange={(newCount) => {
                        const newCounts = [...localConfig.lineCounts];
                        newCounts[lineIndex] = Math.max(1, parseInt(newCount) || 1);
                        setLocalConfig(prev => ({ ...prev, lineCounts: newCounts }));
                    }}
                    totalRequested={totalRequested}
                />
            ))}
        </div>
    );

    const renderLineAssignments = () => (
        <div className={`gap-4 grid ${localConfig.lineCount <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {Object.entries(lineAssignments).map(([lineNumber, employeeIds]) => (
                <LineAssignmentItem
                    key={lineNumber}
                    lineNumber={lineNumber}
                    employeeIds={employeeIds}
                    allocated={localConfig.lineCounts[lineNumber - 1] || 0}
                    getEmployeeDetails={getEmployeeDetails}
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
                        {[1, 2, 3, 4].map(num => (
                            <option key={num} value={num}>{num} Line{num > 1 ? 's' : ''}</option>
                        ))}
                    </select>
                </div>

                {renderLineConfig()}
                {renderLineAssignments()}
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
                className="w-16 px-2 py-1 border border-purple-300 rounded text-sm"
            />
        </div>
    </div>
));

const LineAssignmentItem = React.memo(({ lineNumber, employeeIds, allocated, getEmployeeDetails }) => {
    const filled = employeeIds.length;
    
    return (
        <div className="bg-white p-4 rounded border border-purple-200">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-purple-800">Line {lineNumber}</h4>
                <div className={`text-xs px-2 py-1 rounded ${
                    filled === allocated 
                        ? 'bg-green-100 text-green-800'
                        : filled > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                }`}>
                    {filled}/{allocated}
                </div>
            </div>
            
            <div className="space-y-2">
                {employeeIds.map((id, index) => {
                    const emp = getEmployeeDetails(id);
                    return emp ? (
                        <div key={id} className="bg-purple-50 p-3 rounded border border-purple-100">
                            <div className="font-medium text-purple-800 text-sm">
                                {index + 1}. {emp.name}
                            </div>
                        </div>
                    ) : null;
                })}
            </div>
        </div>
    );
});

export default LineAssignmentConfig;