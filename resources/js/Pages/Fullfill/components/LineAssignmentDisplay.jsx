import React from 'react';

const LineAssignmentDisplay = ({ 
    request, 
    selectedIds, 
    getEmployeeDetails, 
    lineAssignmentConfig
}) => {
    const config = lineAssignmentConfig[request.id];
    const hasLineAssignment = config?.enabled;
    
    if (!hasLineAssignment) {
        // No line assignment - show simple assignment
        return (
            <div className="bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 shadow-md mb-6 p-4 border rounded-lg">
                <h3 className="mb-3 font-bold text-gray-800 dark:text-gray-200 text-lg">
                    Informasi Penugasan
                </h3>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                    Penugasan line tidak diaktifkan untuk request ini.
                </p>
                <div className="mt-3">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Karyawan Terpilih ({selectedIds.filter(id => id).length} dari {request.requested_amount}):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedIds.map((id, index) => {
                            const emp = getEmployeeDetails(id);
                            return emp ? (
                                <div key={id} className="bg-white dark:bg-gray-800 p-2 rounded border text-sm">
                                    <div className="font-medium">{index + 1}. {emp.name}</div>
                                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                                        {emp.gender === 'female' ? '♀' : '♂'} • {emp.type} • Score: {(emp.final_score || 0).toFixed(2)}
                                    </div>
                                </div>
                            ) : (
                                <div key={index} className="bg-gray-100 dark:bg-gray-700 p-2 rounded border text-sm text-gray-500 dark:text-gray-400 italic">
                                    {index + 1}. Belum dipilih
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Custom line assignment
    const lineCount = config.lineCount || 2;
    const lineCounts = config.lineCounts || Array.from({ length: lineCount }, () => Math.ceil(request.requested_amount / lineCount));

    // FIXED: Proper line assignment logic
    const getAssignedLineFixed = (employeeIndex) => {
        if (!config.enabled || !lineCounts || lineCounts.length === 0) return null;
        
        let cumulative = 0;
        for (let i = 0; i < lineCounts.length; i++) {
            cumulative += lineCounts[i];
            if (employeeIndex < cumulative) {
                return (i + 1).toString();
            }
        }
        return lineCounts.length.toString();
    };

    // Group employees by line - FIXED LOGIC
    const employeesByLine = {};
    Array.from({ length: lineCount }).forEach((_, lineIndex) => {
        employeesByLine[lineIndex + 1] = [];
    });

    selectedIds.forEach((id, index) => {
        const lineNumber = getAssignedLineFixed(index);
        if (lineNumber && employeesByLine[lineNumber]) {
            employeesByLine[lineNumber].push({ 
                id, 
                originalIndex: index,
                positionInLine: employeesByLine[lineNumber].length + 1
            });
        }
    });

    // Calculate totals
    const totalAssigned = selectedIds.filter(id => id).length;
    const totalRequested = request.requested_amount;
    const totalAllocated = lineCounts.reduce((sum, count) => sum + count, 0);

    // Debug information
    const debugInfo = selectedIds.map((id, index) => {
        const line = getAssignedLineFixed(index);
        const emp = getEmployeeDetails(id);
        return {
            index,
            id,
            name: emp?.name || 'Empty',
            assignedLine: line
        };
    });

    return (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 shadow-md mb-6 p-4 border rounded-lg">
            <h3 className="mb-3 font-bold text-purple-800 dark:text-purple-300 text-lg">
                Informasi Penugasan Line ({lineCount} Lines)
            </h3>
            
            <div className="mb-4 p-3 bg-purple-100 dark:bg-purple-800/30 rounded">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-purple-700 dark:text-purple-300 font-medium">Diminta</div>
                        <div className="text-lg font-bold text-purple-800 dark:text-purple-200">{totalRequested}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-700 dark:text-purple-300 font-medium">Terisi</div>
                        <div className="text-lg font-bold text-purple-800 dark:text-purple-200">{totalAssigned}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-700 dark:text-purple-300 font-medium">Dialokasikan</div>
                        <div className="text-lg font-bold text-purple-800 dark:text-purple-200">{totalAllocated}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-700 dark:text-purple-300 font-medium">Status</div>
                        <div className={`text-sm font-bold ${
                            totalAllocated > totalRequested 
                                ? 'text-orange-600 dark:text-orange-400'
                                : totalAssigned >= totalRequested
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                            {totalAllocated > totalRequested 
                                ? `+${totalAllocated - totalRequested} Extra`
                                : totalAssigned >= totalRequested
                                ? '✓ Lengkap'
                                : '⏳ Progress'
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug info - can be removed in production */}
            <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">Debug Info:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                    {debugInfo.map((info, idx) => (
                        <div key={idx} className="text-yellow-600 dark:text-yellow-400">
                            #{info.index + 1}: {info.name} → Line {info.assignedLine}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`gap-4 grid ${lineCount <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                {Object.entries(employeesByLine).map(([lineNumber, employees]) => {
                    const allocated = lineCounts[lineNumber - 1] || 0;
                    const filled = employees.length;
                    
                    return (
                        <div key={lineNumber} className="bg-purple-100 dark:bg-purple-800/30 p-3 rounded">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-purple-800 dark:text-purple-200">
                                    Line {lineNumber}
                                </h4>
                                <div className={`text-xs px-2 py-1 rounded ${
                                    filled === allocated 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
                                        : filled > 0
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300'
                                }`}>
                                    {filled}/{allocated}
                                </div>
                            </div>
                            
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {employees.map(({ id, originalIndex, positionInLine }) => {
                                    const emp = getEmployeeDetails(id);
                                    return emp ? (
                                        <div
                                            key={id}
                                            className="bg-white dark:bg-purple-900/40 p-2 rounded border border-purple-200 dark:border-purple-600"
                                        >
                                            <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">
                                                {positionInLine}. {emp.name}
                                            </div>
                                            <div className="text-purple-600 dark:text-purple-300 text-xs mt-1">
                                                <div>{emp.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'} • {emp.type}</div>
                                                <div>Score: {(emp.final_score || 0).toFixed(2)}</div>
                                                <div className="text-purple-500 dark:text-purple-400">
                                                    Posisi Global: {originalIndex + 1}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={`empty-${originalIndex}`} className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-100 dark:border-purple-700 text-center">
                                            <div className="text-purple-400 dark:text-purple-500 text-xs italic">
                                                {positionInLine}. Belum dipilih
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Show empty slots if line is not full */}
                                {Array.from({ length: allocated - filled }).map((_, emptyIndex) => (
                                    <div key={`empty-${emptyIndex}`} className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-100 dark:border-purple-700 text-center">
                                        <div className="text-purple-400 dark:text-purple-500 text-xs italic">
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
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-600">
                <h5 className="font-medium text-purple-700 dark:text-purple-300 text-sm mb-2">
                    Ringkasan Penugasan per Line:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {Object.entries(employeesByLine).map(([lineNumber, employees]) => {
                        const allocated = lineCounts[lineNumber - 1] || 0;
                        const filled = employees.length;
                        
                        return (
                            <div key={lineNumber} className={`p-2 rounded text-center ${
                                filled === allocated 
                                    ? 'bg-green-100 dark:bg-green-800/30 border border-green-200 dark:border-green-600'
                                    : filled > 0
                                    ? 'bg-yellow-100 dark:bg-yellow-800/30 border border-yellow-200 dark:border-yellow-600'
                                    : 'bg-gray-100 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-600'
                            }`}>
                                <div className="font-medium text-purple-800 dark:text-purple-200">
                                    Line {lineNumber}
                                </div>
                                <div className="text-purple-600 dark:text-purple-300">
                                    {filled} / {allocated} karyawan
                                </div>
                                <div className={`text-xs font-medium ${
                                    filled === allocated 
                                        ? 'text-green-600 dark:text-green-400'
                                        : filled > 0
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                    {filled === allocated ? '✓ Penuh' : filled > 0 ? '⏳ Sebagian' : '○ Kosong'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LineAssignmentDisplay;