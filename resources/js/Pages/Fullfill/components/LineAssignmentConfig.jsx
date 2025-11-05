import React, { useState, useEffect } from 'react';

const LineAssignmentConfig = ({ 
    requestId, 
    request, 
    lineAssignmentConfig, 
    handleLineConfigChange, 
    handleLineEmployeeCountChange,
    handleDragStart,
    handleDragOver,
    handleDrop,
    bulkSelectedEmployees,
    selectedIds,
    getEmployeeDetails,
    bulkMode = false
}) => {
    const config = lineAssignmentConfig[requestId] || { enabled: false, lineCount: 2, lineCounts: [] };
    const [localLineCounts, setLocalLineCounts] = useState([]);

    // Initialize line counts based on request
    useEffect(() => {
        if (config.enabled) {
            if (!config.lineCounts || config.lineCounts.length === 0 || config.lineCounts.length !== config.lineCount) {
                const defaultLineCount = config.lineCount || 2;
                const defaultCounts = Array.from({ length: defaultLineCount }, (_, i) => 
                    Math.ceil(request.requested_amount / defaultLineCount)
                );
                
                // Adjust to match total exactly
                adjustLineCounts(defaultCounts, request.requested_amount);
                setLocalLineCounts(defaultCounts);
                
                // Update parent config
                handleLineConfigChange(requestId, 'lineCounts', defaultCounts);
            } else if (config.lineCounts && config.lineCounts.length > 0) {
                setLocalLineCounts([...config.lineCounts]);
            }
        }
    }, [config.enabled, config.lineCount, config.lineCounts, request.requested_amount, requestId]);

    const adjustLineCounts = (counts, total) => {
        let currentTotal = counts.reduce((sum, count) => sum + count, 0);
        let index = 0;
        
        while (currentTotal !== total && counts.length > 0) {
            if (currentTotal > total && counts[index] > 1) {
                counts[index]--;
                currentTotal--;
            } else if (currentTotal < total) {
                counts[index]++;
                currentTotal++;
            }
            index = (index + 1) % counts.length;
        }
    };

    const handleLineCountChange = (newLineCount) => {
    const lineCount = parseInt(newLineCount);
    const currentLineCount = localLineCounts.length || config.lineCount || 2;
    
    console.log('🔄 Changing line count:', {
        from: currentLineCount,
        to: lineCount,
        currentLineCounts: localLineCounts,
        totalEmployees: request.requested_amount
    });
    
    if (lineCount > currentLineCount) {
        // Add new lines
        const linesToAdd = lineCount - currentLineCount;
        const newCounts = [...localLineCounts];
        const avgPerNewLine = Math.max(1, Math.floor(request.requested_amount / lineCount));
        
        for (let i = 0; i < linesToAdd; i++) {
            newCounts.push(avgPerNewLine);
        }
        
        // Adjust to match total
        adjustLineCounts(newCounts, request.requested_amount);
        
        console.log('➕ Added lines:', {
            newCounts,
            totalAllocated: newCounts.reduce((sum, count) => sum + count, 0)
        });
        
        setLocalLineCounts(newCounts);
        
        // IMPORTANT: Update both lineCount AND lineCounts in parent
        handleLineConfigChange(requestId, 'lineCount', lineCount);
        handleLineConfigChange(requestId, 'lineCounts', newCounts);
    } else if (lineCount < currentLineCount) {
        // Remove lines
        const newCounts = localLineCounts.slice(0, lineCount);
        // Adjust to match total
        adjustLineCounts(newCounts, request.requested_amount);
        
        console.log('➖ Removed lines:', {
            newCounts,
            totalAllocated: newCounts.reduce((sum, count) => sum + count, 0)
        });
        
        setLocalLineCounts(newCounts);
        
        // IMPORTANT: Update both lineCount AND lineCounts in parent
        handleLineConfigChange(requestId, 'lineCount', lineCount);
        handleLineConfigChange(requestId, 'lineCounts', newCounts);
    }
};

// And also fix the handleEmployeeCountChange:
const handleEmployeeCountChange = (lineIndex, newCount) => {
    const count = parseInt(newCount) || 1;
    if (count < 1) return;
    
    const newCounts = [...localLineCounts];
    newCounts[lineIndex] = count;
    
    console.log('📝 Changed employee count for line', {
        lineIndex: lineIndex + 1,
        from: localLineCounts[lineIndex],
        to: count,
        newCounts,
        totalAllocated: newCounts.reduce((sum, c) => sum + c, 0)
    });
    
    setLocalLineCounts(newCounts);
    
    // IMPORTANT: Update lineCounts in parent immediately
    handleLineConfigChange(requestId, 'lineCounts', newCounts);
};

    // Line assignment logic
    const getAssignedLine = (employeeIndex) => {
        if (!config.enabled || localLineCounts.length === 0) return null;
        
        let cumulative = 0;
        for (let i = 0; i < localLineCounts.length; i++) {
            cumulative += localLineCounts[i];
            if (employeeIndex < cumulative) {
                return (i + 1).toString();
            }
        }
        return localLineCounts.length.toString();
    };

    const employeesForLine = bulkMode 
        ? (bulkSelectedEmployees[requestId] || [])
        : (selectedIds || []);

    const totalAssigned = employeesForLine.filter(id => id).length;
    const totalAllocated = localLineCounts.reduce((sum, count) => sum + count, 0);

    const currentLineCount = config.lineCount || 2;
    const displayLineCounts = localLineCounts.length > 0 ? localLineCounts : 
        Array.from({ length: currentLineCount }, (_, i) => Math.ceil(request.requested_amount / currentLineCount));

    // Group employees by line for display
    const employeesByLine = {};
    Array.from({ length: currentLineCount }).forEach((_, lineIndex) => {
        employeesByLine[lineIndex + 1] = [];
    });

    employeesForLine.forEach((id, index) => {
        const lineNumber = getAssignedLine(index);
        if (lineNumber && employeesByLine[lineNumber]) {
            employeesByLine[lineNumber].push({ 
                id, 
                originalIndex: index,
                positionInLine: employeesByLine[lineNumber].length + 1
            });
        }
    });

    return (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-800">Konfigurasi Penugasan Line</span>
                </div>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={config.enabled || false}
                        onChange={(e) => handleLineConfigChange(requestId, 'enabled', e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-700">Aktifkan Penugasan Line</span>
                </label>
            </div>

            {config.enabled && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="text-sm text-purple-700">
                            Jumlah Line:
                        </label>
                        <select
                            value={config.lineCount || 2}
                            onChange={(e) => handleLineCountChange(e.target.value)}
                            className="px-3 py-1 border border-purple-300 rounded text-sm"
                        >
                            {[1, 2, 3, 4, 5, 6].map(num => (
                                <option key={num} value={num}>{num} Line{num > 1 ? 's' : ''}</option>
                            ))}
                        </select>
                        <div className="flex flex-col text-xs text-purple-600">
                            <span>Total: {request.requested_amount} karyawan diminta</span>
                            <span>Terisi: {totalAssigned} • Dialokasikan: {totalAllocated}</span>
                            {totalAllocated > request.requested_amount && (
                                <span className="text-orange-600 font-medium">
                                    ⚠️ Extra {totalAllocated - request.requested_amount} posisi
                                </span>
                            )}
                            {totalAllocated < request.requested_amount && (
                                <span className="text-red-600 font-medium">
                                    ⚠️ Kurang {request.requested_amount - totalAllocated} posisi
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: currentLineCount }).map((_, lineIndex) => {
                            const lineCount = displayLineCounts[lineIndex] || 1;
                            const startPosition = displayLineCounts.slice(0, lineIndex).reduce((sum, count) => sum + count, 0) + 1;
                            const endPosition = startPosition + lineCount - 1;
                            
                            return (
                                <div key={lineIndex} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-purple-700 text-sm mb-2">
                                        Line {lineIndex + 1}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <label className="text-xs text-purple-600">Karyawan:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={lineCount}
                                            onChange={(e) => handleEmployeeCountChange(lineIndex, e.target.value)}
                                            className="w-16 px-2 py-1 border border-purple-300 rounded text-sm"
                                        />
                                    </div>
                                    <div className="text-xs text-purple-500 mt-1">
                                        {lineCount} posisi
                                    </div>
                                    <div className="text-xs text-purple-400 mt-1">
                                        Posisi: {startPosition} - {endPosition}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Line Assignment Display */}
                    <div className="mt-6">
                        <h5 className="text-sm font-medium text-purple-700 mb-4">
                            Informasi Penugasan Line ({currentLineCount} Lines)
                        </h5>
                        
                        <div className="mb-4 p-3 bg-purple-100 rounded">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="text-purple-700 font-medium">Diminta</div>
                                    <div className="text-lg font-bold text-purple-800">{request.requested_amount}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-purple-700 font-medium">Terisi</div>
                                    <div className="text-lg font-bold text-purple-800">{totalAssigned}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-purple-700 font-medium">Dialokasikan</div>
                                    <div className="text-lg font-bold text-purple-800">{totalAllocated}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-purple-700 font-medium">Status</div>
                                    <div className={`text-sm font-bold ${
                                        totalAllocated > request.requested_amount 
                                            ? 'text-orange-600'
                                            : totalAssigned >= request.requested_amount
                                            ? 'text-green-600'
                                            : 'text-yellow-600'
                                    }`}>
                                        {totalAllocated > request.requested_amount 
                                            ? `+${totalAllocated - request.requested_amount} Extra`
                                            : totalAssigned >= request.requested_amount
                                            ? '✓ Lengkap'
                                            : '⏳ Progress'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`gap-4 grid ${currentLineCount <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                            {Object.entries(employeesByLine).map(([lineNumber, employees]) => {
                                const allocated = displayLineCounts[lineNumber - 1] || 0;
                                const filled = employees.length;
                                
                                return (
                                    <div key={lineNumber} className="bg-white p-4 rounded border border-purple-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-medium text-purple-800">
                                                Line {lineNumber}
                                            </h4>
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
                                            {employees.map(({ id, originalIndex, positionInLine }) => {
                                                const emp = getEmployeeDetails(id);
                                                return emp ? (
                                                    <div
                                                        key={id}
                                                        className="bg-purple-50 p-3 rounded border border-purple-100"
                                                    >
                                                        <div className="font-medium text-purple-800 text-sm">
                                                            {positionInLine}. {emp.name}
                                                        </div>
                                                        <div className="text-purple-600 text-xs mt-1">
                                                            <div>{emp.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'} • {emp.type}</div>
                                                            <div>Score: {(emp.final_score || 0).toFixed(2)}</div>
                                                            <div className="text-purple-500">
                                                                Posisi Global: {originalIndex + 1}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={`empty-${originalIndex}`} className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
                                                        <div className="text-gray-500 text-xs italic">
                                                            {positionInLine}. Belum dipilih
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            
                                            {/* Show empty slots if line is not full */}
                                            {Array.from({ length: allocated - filled }).map((_, emptyIndex) => (
                                                <div key={`empty-${emptyIndex}`} className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
                                                    <div className="text-gray-500 text-xs italic">
                                                        {filled + emptyIndex + 1}. Posisi kosong
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Assignment Summary */}
                        <div className="mt-4 pt-4 border-t border-purple-200">
                            <h5 className="font-medium text-purple-700 text-sm mb-2">
                                Ringkasan Penugasan per Line:
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {Object.entries(employeesByLine).map(([lineNumber, employees]) => {
                                    const allocated = displayLineCounts[lineNumber - 1] || 0;
                                    const filled = employees.length;
                                    
                                    return (
                                        <div key={lineNumber} className={`p-2 rounded text-center ${
                                            filled === allocated 
                                                ? 'bg-green-100 border border-green-200'
                                                : filled > 0
                                                ? 'bg-yellow-100 border border-yellow-200'
                                                : 'bg-gray-100 border border-gray-200'
                                        }`}>
                                            <div className="font-medium text-purple-800">
                                                Line {lineNumber}
                                            </div>
                                            <div className="text-purple-600">
                                                {filled} / {allocated} karyawan
                                            </div>
                                            <div className={`text-xs font-medium ${
                                                filled === allocated 
                                                    ? 'text-green-600'
                                                    : filled > 0
                                                    ? 'text-yellow-600'
                                                    : 'text-gray-600'
                                            }`}>
                                                {filled === allocated ? '✓ Penuh' : filled > 0 ? '⏳ Sebagian' : '○ Kosong'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LineAssignmentConfig;