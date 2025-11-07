// BulkFulfillmentPanel.jsx - FIXED VERSION
import { useState, useMemo, useCallback } from 'react';

export default function BulkFulfillmentPanel({
    sameDayRequests,
    currentRequest,
    selectedBulkRequests,
    setSelectedBulkRequests, // FIXED: Now properly used
    toggleBulkRequestSelection,
    handleBulkSubmit,
    processing,
    bulkSelectedEmployees,
    setBulkSelectedEmployees, // FIXED: Now properly used
    openBulkChangeModal,
    getEmployeeDetails,
    allSortedEligibleEmployees,
    getBulkLineAssignment,
    handleAutoFulfill,
    lineAssignmentConfig = {},
    handleLineConfigChange
}) {
    const [strategy, setStrategy] = useState('optimal');
    const [visibility, setVisibility] = useState('private');

    const isPutwayRequest = useCallback((request) => {
        return request?.sub_section?.name?.toLowerCase() === 'putway' ||
               request?.subSection?.name?.toLowerCase() === 'putway';
    }, []);

    const sameSubsectionRequests = useMemo(() => {
        // Get requests from same subsection that are not fulfilled
        const sameSubRequests = sameDayRequests.filter(req => {
            const reqSubSectionId = req.sub_section_id || req.subSection?.id;
            const currentSubSectionId = currentRequest.sub_section_id || currentRequest.subSection?.id;
            
            return String(reqSubSectionId) === String(currentSubSectionId) &&
                   req.status !== 'fulfilled';
        });

        // CRITICAL: Always include current request in bulk mode if not fulfilled
        const allRequests = [...sameSubRequests];
        const currentRequestIncluded = allRequests.some(req => 
            String(req.id) === String(currentRequest.id)
        );
        
        if (currentRequest.status !== 'fulfilled' && !currentRequestIncluded) { 
            allRequests.unshift(currentRequest); // Add at beginning for visibility
        }

        return allRequests;
    }, [sameDayRequests, currentRequest]);

    const totalRequests = sameSubsectionRequests.length;
    const totalEmployeesNeeded = sameSubsectionRequests.reduce((total, req) => total + req.requested_amount, 0);

    // Calculate how many requests have been fully assigned
    const fullyAssignedRequests = useMemo(() => {
        return selectedBulkRequests.filter(
            requestId => {
                const employees = bulkSelectedEmployees[requestId] || [];
                const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
                return request && employees.length === request.requested_amount && employees.every(id => id);
            }
        ).length;
    }, [bulkSelectedEmployees, sameSubsectionRequests, selectedBulkRequests]);

    const allRequestsFullyAssigned = useMemo(() => {
        return selectedBulkRequests.every(requestId => {
            const employees = bulkSelectedEmployees[requestId] || [];
            const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
            return request && employees.length === request.requested_amount;
        });
    }, [selectedBulkRequests, bulkSelectedEmployees, sameSubsectionRequests]);

    // Check if all selected requests are fully assigned
    const hasIncompleteAssignments = useMemo(() => {
        return selectedBulkRequests.some(requestId => {
            const employees = bulkSelectedEmployees[requestId] || [];
            const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
            return request && employees.length < request.requested_amount;
        });
    }, [selectedBulkRequests, bulkSelectedEmployees, sameSubsectionRequests]);

    // Calculate statistics for display
    const assignmentStats = useMemo(() => {
        const stats = {
            totalSelected: 0,
            totalAssigned: 0,
            byRequest: {}
        };

        selectedBulkRequests.forEach(requestId => {
            const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
            if (request) {
                const employees = bulkSelectedEmployees[requestId] || [];
                const assignedCount = employees.filter(id => id).length;
                
                stats.totalSelected += request.requested_amount;
                stats.totalAssigned += assignedCount;
                stats.byRequest[requestId] = {
                    requested: request.requested_amount,
                    assigned: assignedCount,
                    shift: request.shift?.name || 'No Shift',
                    name: request.sub_section?.name || 'Unknown'
                };
            }
        });

        return stats;
    }, [selectedBulkRequests, bulkSelectedEmployees, sameSubsectionRequests]);

    const handleAutoFill = () => {
        handleAutoFulfill(strategy, selectedBulkRequests);
    };

    const handleLineAssignmentToggle = (requestId, enabled) => {
        const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
        if (!request) return;

        handleLineConfigChange(requestId, 'fullConfig', {
            ...lineAssignmentConfig[requestId],
            enabled,
            lineCount: 2,
            lineCounts: enabled ? [
                Math.ceil(request.requested_amount / 2), 
                Math.floor(request.requested_amount / 2)
            ] : []
        });
    };

    const handleClearAll = () => {
        // FIXED: Properly clear all selections
        setSelectedBulkRequests([]);
        
        // Reset bulk selected employees for all requests
        const resetEmployees = {};
        Object.keys(bulkSelectedEmployees).forEach(key => {
            resetEmployees[key] = [];
        });
        setBulkSelectedEmployees(resetEmployees);
    };

    const handleSelectAll = () => {
        const allIds = sameSubsectionRequests.map(req => String(req.id));
        setSelectedBulkRequests(allIds);
        
        // Initialize employee arrays for all selected requests
        const newBulkSelectedEmployees = { ...bulkSelectedEmployees };
        allIds.forEach(id => {
            // If already has employees, keep them; otherwise initialize empty array
            if (!newBulkSelectedEmployees[id]) {
                newBulkSelectedEmployees[id] = [];
            }
        });
        setBulkSelectedEmployees(newBulkSelectedEmployees);
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-100 dark:to-indigo-900/20 shadow-lg mb-6 p-4 sm:p-6 border border-blue-200 dark:border-blue-700 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-800/40 mr-0 sm:mr-4 mb-3 sm:mb-0 p-3 rounded-full">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 text-xl sm:text-2xl">Bulk Fulfillment</h3>
                    <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                        Penuhi semua request untuk sub-bagian "{currentRequest.sub_section?.name}" secara sekaligus
                    </p>
                </div>
            </div>

            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">📊 Ringkasan</h4>
                    <div className="space-y-2 text-sm sm:text-base">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Request Tersedia:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Karyawan Dibutuhkan:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{totalEmployeesNeeded}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Request Terpilih:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{selectedBulkRequests.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Karyawan Terisi:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {assignmentStats.totalAssigned} / {assignmentStats.totalSelected}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Request Terisi Penuh:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {fullyAssignedRequests} / {selectedBulkRequests.length}
                            </span>
                        </div>
                        {hasIncompleteAssignments && selectedBulkRequests.length > 0 && (
                            <div className="flex justify-between">
                                <span className="text-yellow-600 dark:text-yellow-400">Status:</span>
                                <span className="font-medium text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm">
                                    ⚠️ Beberapa request belum terisi penuh
                                </span>
                            </div>
                        )}
                        {allRequestsFullyAssigned && selectedBulkRequests.length > 0 && (
                            <div className="flex justify-between">
                                <span className="text-green-600 dark:text-green-400">Status:</span>
                                <span className="font-medium text-green-600 dark:text-green-400 text-xs sm:text-sm">
                                    ✅ Semua request terisi penuh
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">⚙️ Pengaturan</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                                Strategi Penugasan:
                            </label>
                            <select
                                value={strategy}
                                onChange={(e) => setStrategy(e.target.value)}
                                className="bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                            >
                                <option value="optimal">Optimal (Prioritas Sub-Bagian + Score)</option>
                                <option value="same_section">Same Section (Prioritas Section Sama)</option>
                                <option value="balanced">Balanced (Merata Beban Kerja)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                                Visibility:
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="private"
                                        checked={visibility === 'private'}
                                        onChange={() => setVisibility('private')}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 text-sm">Private</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="public"
                                        checked={visibility === 'public'}
                                        onChange={() => setVisibility('public')}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 text-sm">Public</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-between space-x-2">
                            <button
                                onClick={handleAutoFill}
                                disabled={selectedBulkRequests.length === 0}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${
                                    selectedBulkRequests.length === 0
                                        ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                Auto Fill Selected
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Selection Section */}
            <div className="bg-white dark:bg-gray-800 mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">
                        Daftar Request untuk Sub-Bagian "{currentRequest.sub_section?.name}"
                    </h4>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedBulkRequests.length} of {sameSubsectionRequests.length} selected
                        </span>
                        <button
                            onClick={handleSelectAll}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                        >
                            Select All
                        </button>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {sameSubsectionRequests.length > 0 ? (
                        sameSubsectionRequests.map((req) => {
                            const maleCount = req.male_count || 0;
                            const femaleCount = req.female_count || 0;
                            const isCurrentRequest = String(req.id) === String(currentRequest.id);
                            const isSelected = selectedBulkRequests.includes(String(req.id));
                            const assignedEmployees = bulkSelectedEmployees[String(req.id)] || [];
                            const assignedCount = assignedEmployees.filter(id => id).length;
                            const enableLineAssignment = lineAssignmentConfig[String(req.id)]?.enabled || false;

                            return (
                                <div
                                    key={req.id}
                                    className={`p-3 sm:p-4 rounded-md mb-3 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-600'
                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    } ${isCurrentRequest ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}
                                    onClick={(e) => {
                                        // Only toggle selection if clicking on the main container
                                        if (e.target.type !== 'checkbox' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.type !== 'radio') {
                                            toggleBulkRequestSelection(req.id);
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleBulkRequestSelection(req.id)}
                                                className="mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                                                        {req.shift?.name || 'No Shift'} - {req.requested_amount} orang
                                                    </div>
                                                    {isCurrentRequest && (
                                                        <span className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded-full text-yellow-800 dark:text-yellow-200 text-xs whitespace-nowrap">
                                                            Request Saat Ini (ID: {req.id})
                                                        </span>
                                                    )}
                                                    {req.status === 'fulfilled' && (
                                                        <span className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full text-green-800 dark:text-green-200 text-xs whitespace-nowrap">
                                                            Sudah Dipenuhi
                                                        </span>
                                                    )}
                                                    {enableLineAssignment && (
                                                        <span className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-full text-purple-800 dark:text-purple-200 text-xs whitespace-nowrap">
                                                            Line Assignment
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                                                    {/* Requirements */}
                                                    <div>
                                                        <div className="text-gray-600 dark:text-gray-400 mb-1">
                                                            <strong>Kebutuhan:</strong>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 sm:gap-2">
                                                            {maleCount > 0 && (
                                                                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                                                                    L: {maleCount}
                                                                </span>
                                                            )}
                                                            {femaleCount > 0 && (
                                                                <span className="bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 px-2 py-1 rounded text-xs">
                                                                    P: {femaleCount}
                                                                </span>
                                                            )}
                                                            <span className="bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                                                                Total: {req.requested_amount}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Assignment Progress */}
                                                    <div>
                                                        <div className="text-gray-600 dark:text-gray-400 mb-1">
                                                            <strong>Penugasan:</strong>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                                <div 
                                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                                    style={{ 
                                                                        width: `${(assignedCount / req.requested_amount) * 100}%` 
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                {assignedCount}/{req.requested_amount}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Line Assignment Toggle */}
                                    {isSelected && (
                                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                                                    Konfigurasi Line Assignment
                                                </span>
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={enableLineAssignment}
                                                        onChange={(e) => handleLineAssignmentToggle(String(req.id), e.target.checked)}
                                                        className="rounded text-purple-600 focus:ring-purple-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span className="text-sm text-purple-700 dark:text-purple-300">Aktifkan Line Assignment</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Employee Selection for Bulk Request */}
                                    {isSelected && (
                                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                                                <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                                                    Karyawan Terpilih:
                                                </h5>
                                                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                                    assignedCount === req.requested_amount
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                }`}>
                                                    {assignedCount} / {req.requested_amount}
                                                </span>
                                            </div>
                                            
                                            {(isPutwayRequest(req) || enableLineAssignment) && (
                                                <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
                                                    <div className="flex items-center text-purple-700 dark:text-purple-300 text-xs">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                        Penugasan Line: Karyawan akan ditugaskan bergantian ke Line 1 dan Line 2
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                {Array.from({ length: req.requested_amount }).map((_, index) => {
                                                    const employeeId = assignedEmployees[index];
                                                    const employee = employeeId ? getEmployeeDetails(employeeId) : null;
                                                    const lineAssignment = (isPutwayRequest(req) || enableLineAssignment) && employeeId ? 
                                                        getBulkLineAssignment(String(req.id), employeeId) : null;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`p-2 sm:p-3 rounded border ${
                                                                employee
                                                                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                                                                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                                    #{index + 1}
                                                                    {lineAssignment && (
                                                                        <span className="ml-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded text-xs">
                                                                            Line {lineAssignment}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                {employee && (
                                                                    <span className={`text-xs px-1 rounded ${
                                                                        employee.gender === 'female'
                                                                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    }`}>
                                                                        {employee.gender === 'female' ? 'P' : 'L'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {employee ? (
                                                                <div className="mb-2">
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">
                                                                        {employee.name}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                                                        {employee.type} - {employee.subSections?.[0]?.name || '-'}
                                                                    </div>
                                                                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-1 grid grid-cols-3 gap-1">
                                                                        <div>Base: {(employee.total_score || 0).toFixed(2)}</div>
                                                                        <div>ML: {(employee.ml_score || 0).toFixed(2)}</div>
                                                                        <div>Final: {(employee.final_score || 0).toFixed(2)}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-500 dark:text-gray-400 text-xs italic mb-2">
                                                                    Belum dipilih
                                                                </div>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openBulkChangeModal(String(req.id), index);
                                                                }}
                                                                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 w-full py-1 rounded text-gray-700 dark:text-gray-300 text-xs transition-colors"
                                                            >
                                                                {employee ? 'Ganti' : 'Pilih'} Karyawan
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Display line assignment summary */}
                                            {(isPutwayRequest(req) || enableLineAssignment) && assignedCount > 0 && (
                                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                                                    <h6 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">
                                                        Preview Penugasan Line:
                                                    </h6>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs">
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded">
                                                            <div className="font-medium text-purple-700 dark:text-purple-300 mb-2 text-xs sm:text-sm">Line 1</div>
                                                            {assignedEmployees
                                                                .filter((_, idx) => (idx % 2) === 0)
                                                                .map((id, idx) => {
                                                                    const emp = getEmployeeDetails(id);
                                                                    return emp ? (
                                                                        <div key={id} className="text-purple-600 dark:text-purple-400 py-1 text-xs truncate">
                                                                            {idx * 2 + 1}. {emp.name} ({emp.gender === 'female' ? 'P' : 'L'})
                                                                        </div>
                                                                    ) : null;
                                                                })}
                                                        </div>
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded">
                                                            <div className="font-medium text-purple-700 dark:text-purple-300 mb-2 text-xs sm:text-sm">Line 2</div>
                                                            {assignedEmployees
                                                                .filter((_, idx) => (idx % 2) === 1)
                                                                .map((id, idx) => {
                                                                    const emp = getEmployeeDetails(id);
                                                                    return emp ? (
                                                                        <div key={id} className="text-purple-600 dark:text-purple-400 py-1 text-xs truncate">
                                                                            {idx * 2 + 2}. {emp.name} ({emp.gender === 'female' ? 'P' : 'L'})
                                                                        </div>
                                                                    ) : null;
                                                                })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center">
                            <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">📋</div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                                Tidak ada request untuk sub-bagian ini pada tanggal yang sama.
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-1">
                                Semua request mungkin sudah terpenuhi atau tidak ada request lain dengan sub-bagian yang sama.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    {selectedBulkRequests.length} request terpilih dari {totalRequests} • 
                    {assignmentStats.totalAssigned} dari {assignmentStats.totalSelected} karyawan terisi
                </div>
                <button
                    onClick={() => handleBulkSubmit(strategy, visibility)}
                    disabled={processing || selectedBulkRequests.length === 0 || hasIncompleteAssignments}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-white transition-colors text-sm sm:text-base w-full sm:w-auto ${
                        processing || selectedBulkRequests.length === 0 || hasIncompleteAssignments
                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    }`}
                >
                    {processing ? (
                        <span className="flex items-center justify-center sm:justify-start">
                            <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memproses...
                        </span>
                    ) : (
                        `Penuhi ${selectedBulkRequests.length} Request`
                    )}
                </button>
            </div>
        </div>
    );
}