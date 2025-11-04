// BulkFulfillmentPanel.jsx
import { useState, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';

export default function BulkFulfillmentPanel({
    sameDayRequests,
    currentRequest,
    selectedBulkRequests,
    toggleBulkRequestSelection,
    processing,
    bulkSelectedEmployees,
    openBulkChangeModal,
    getEmployeeDetails,
    allSortedEligibleEmployees,
    getBulkLineAssignment
}) {
    const [strategy, setStrategy] = useState('optimal');
    const [visibility, setVisibility] = useState('private');
    const [backendError, setBackendError] = useState(null);

    const isPutwayRequest = useCallback((request) => {
        return request?.sub_section?.name?.toLowerCase() === 'putway' ||
               request?.subSection?.name?.toLowerCase() === 'putway';
    }, []);

    const isShrinkRequest = useCallback((request) => {
        return request?.sub_section?.name?.toLowerCase() === 'shrink' ||
               request?.subSection?.name?.toLowerCase() === 'shrink';
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
        return Object.keys(bulkSelectedEmployees).filter(
            requestId => {
                const employees = bulkSelectedEmployees[requestId] || [];
                const request = sameSubsectionRequests.find(req => String(req.id) === requestId);
                return request && employees.length === request.requested_amount && employees.every(id => id);
            }
        ).length;
    }, [bulkSelectedEmployees, sameSubsectionRequests]);

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
            } else {
                console.warn('❌ Selected bulk request not found in sameSubsectionRequests:', requestId);
            }
        });

        return stats;
    }, [selectedBulkRequests, bulkSelectedEmployees, sameSubsectionRequests]);

    // ADD THE MISSING handleBulkSubmit FUNCTION
    const handleBulkSubmit = useCallback(
        (strategy, visibility) => {
            setBackendError(null);

            const hasIncompleteAssignments = selectedBulkRequests.some(
                (requestId) => {
                    const employees = bulkSelectedEmployees[requestId] || [];
                    const request = sameSubsectionRequests.find(
                        (req) => String(req.id) === requestId
                    );
                    return (
                        request && employees.length < request.requested_amount
                    );
                }
            );

            if (hasIncompleteAssignments) {
                setBackendError(
                    "Beberapa request belum terisi penuh. Silakan lengkapi semua assignment terlebih dahulu."
                );
                return;
            }

            const bulkData = {};
            selectedBulkRequests.forEach((requestId) => {
                const employees = bulkSelectedEmployees[requestId] || [];
                if (employees.length > 0) {
                    bulkData[requestId] = employees;
                }
            });

            router.post(
                route("manpower-requests.bulk-fulfill"),
                {
                    request_ids: selectedBulkRequests,
                    employee_selections: bulkData,
                    strategy: strategy,
                    visibility: visibility,
                    status: "pending",
                },
                {
                    onSuccess: () => {
                        console.log("Bulk fulfill successful");
                        router.visit(route("manpower-requests.index"));
                    },
                    onError: (errors) => {
                        console.error("Bulk fulfill error:", errors);
                        if (errors.fulfillment_error) {
                            setBackendError(errors.fulfillment_error);
                        } else if (errors.message) {
                            setBackendError(errors.message);
                        } else {
                            setBackendError(
                                "Terjadi kesalahan saat memproses bulk fulfillment"
                            );
                        }
                    },
                }
            );
        },
        [selectedBulkRequests, bulkSelectedEmployees, sameSubsectionRequests]
    );

    // Auto-assign function
    const handleAutoFulfill = useCallback(
        (strategy) => {
            const newBulkSelections = { ...bulkSelectedEmployees };
            const requestsToFulfill = sameSubsectionRequests.filter(
                (req) =>
                    selectedBulkRequests.includes(String(req.id)) &&
                    req.status !== 'fulfilled'
            );

            const usedEmployeeIds = new Set(
                Object.values(newBulkSelections)
                    .flat()
                    .filter((id) => id)
            );

            let availableEmployees = allSortedEligibleEmployees.filter(
                (emp) =>
                    !usedEmployeeIds.has(String(emp.id)) &&
                    emp.status === 'available'
            );

            // Sort based on strategy
            if (strategy === 'same_section') {
                availableEmployees.sort((a, b) => {
                    const aIsSame = a.subSections.some(
                        (ss) => String(ss.id) === String(currentRequest.sub_section_id)
                    );
                    const bIsSame = b.subSections.some(
                        (ss) => String(ss.id) === String(currentRequest.sub_section_id)
                    );
                    if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

                    const aTotalScore = a.final_score || a.total_score || 0;
                    const bTotalScore = b.final_score || b.total_score || 0;
                    return bTotalScore - aTotalScore;
                });
            } else if (strategy === 'balanced') {
                availableEmployees.sort((a, b) => {
                    const aWorkload = a.work_days_14_days || 0;
                    const bWorkload = b.work_days_14_days || 0;
                    return aWorkload - bWorkload;
                });
            } else {
                // optimal strategy - sort by final score
                availableEmployees.sort((a, b) => {
                    const aScore = a.final_score || a.total_score || 0;
                    const bScore = b.final_score || b.total_score || 0;
                    return bScore - aScore;
                });
            }

            requestsToFulfill.forEach((req) => {
                const requiredMale = req.male_count || 0;
                const requiredFemale = req.female_count || 0;
                const totalRequired = req.requested_amount;

                const maleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === 'male' &&
                        !usedEmployeeIds.has(String(emp.id)) &&
                        emp.status === 'available'
                );

                const femaleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === 'female' &&
                        !usedEmployeeIds.has(String(emp.id)) &&
                        emp.status === 'available'
                );

                const selectedForRequest = [];

                // Select males first
                for (
                    let i = 0;
                    i < requiredMale && maleCandidates.length > 0;
                    i++
                ) {
                    const candidate = maleCandidates.shift();
                    selectedForRequest.push(String(candidate.id));
                    usedEmployeeIds.add(String(candidate.id));
                    availableEmployees = availableEmployees.filter(
                        (emp) => String(emp.id) !== String(candidate.id)
                    );
                }

                // Select females next
                for (
                    let i = 0;
                    i < requiredFemale && femaleCandidates.length > 0;
                    i++
                ) {
                    const candidate = femaleCandidates.shift();
                    selectedForRequest.push(String(candidate.id));
                    usedEmployeeIds.add(String(candidate.id));
                    availableEmployees = availableEmployees.filter(
                        (emp) => String(emp.id) !== String(candidate.id)
                    );
                }

                // Fill remaining slots with any available employees
                const remainingSlots = totalRequired - selectedForRequest.length;
                if (remainingSlots > 0) {
                    const otherCandidates = availableEmployees
                        .filter(
                            (emp) =>
                                !usedEmployeeIds.has(String(emp.id)) &&
                                emp.status === 'available'
                        )
                        .slice(0, remainingSlots);

                    otherCandidates.forEach((candidate) => {
                        selectedForRequest.push(String(candidate.id));
                        usedEmployeeIds.add(String(candidate.id));
                        availableEmployees = availableEmployees.filter(
                            (emp) => String(emp.id) !== String(candidate.id)
                        );
                    });
                }

                newBulkSelections[String(req.id)] = selectedForRequest;
            });

            // Update state
            Object.keys(newBulkSelections).forEach(requestId => {
                if (!selectedBulkRequests.includes(requestId)) {
                    delete newBulkSelections[requestId];
                }
            });
        },
        [
            allSortedEligibleEmployees,
            bulkSelectedEmployees,
            sameSubsectionRequests,
            selectedBulkRequests,
            currentRequest.sub_section_id,
        ]
    );

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
                    <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base">Penuhi semua request untuk sub-bagian "{currentRequest.sub_section?.name}" secara sekaligus</p>
                </div>
            </div>

            {/* Error Display */}
            {backendError && (
                <div className="bg-red-100 dark:bg-red-900/20 mb-4 p-3 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
                    <p className="font-semibold">Error:</p>
                    <p>{backendError}</p>
                </div>
            )}

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
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Sub-Bagian:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {currentRequest.sub_section?.name}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tanggal:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(currentRequest.date).toLocaleDateString('id-ID')}
                            </span>
                        </div>
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
                        
                        {/* Auto-assign Button */}
                        <div className="pt-2">
                            <button
                                onClick={() => handleAutoFulfill(strategy)}
                                disabled={selectedBulkRequests.length === 0}
                                className={`w-full px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
                                    selectedBulkRequests.length === 0
                                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-700 dark:text-gray-300'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                🔄 Auto-Assign {selectedBulkRequests.length} Request
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
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Pilih semua:</span>
                        <input
                            type="checkbox"
                            checked={selectedBulkRequests.length === sameSubsectionRequests.length}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    // Select all
                                    const allIds = sameSubsectionRequests.map(req => String(req.id));
                                    selectedBulkRequests.forEach(id => {
                                        if (!allIds.includes(id)) {
                                            allIds.push(id);
                                        }
                                    });
                                } else {
                                    // Deselect all
                                    selectedBulkRequests.forEach(id => {});
                                }
                            }}
                            className="rounded"
                        />
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
                            const isPutway = isPutwayRequest(req);
                            const isShrink = isShrinkRequest(req);

                            return (
                                <div
                                    key={req.id}
                                    className={`p-3 sm:p-4 rounded-md mb-3 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-600'
                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    } ${isCurrentRequest ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}
                                    onClick={() => toggleBulkRequestSelection(req.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                                                        {req.shift?.name || 'No Shift'} - {req.requested_amount} orang
                                                    </div>
                                                    {isCurrentRequest && (
                                                        <span className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded-full text-yellow-800 dark:text-yellow-200 text-xs whitespace-nowrap">
                                                            Request Saat Ini
                                                        </span>
                                                    )}
                                                    {req.status === 'fulfilled' && (
                                                        <span className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full text-green-800 dark:text-green-200 text-xs whitespace-nowrap">
                                                            Sudah Dipenuhi
                                                        </span>
                                                    )}
                                                    {(isPutway || isShrink) && (
                                                        <span className={`${isPutway ? 'bg-purple-100 dark:bg-purple-800' : 'bg-blue-100 dark:bg-blue-800'} px-2 py-1 rounded-full ${isPutway ? 'text-purple-800 dark:text-purple-200' : 'text-blue-800 dark:text-blue-200'} text-xs whitespace-nowrap`}>
                                                            {isPutway ? 'Putway' : 'Shrink'} - {isPutway ? '2 Lines' : '4 Shrinks'}
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
                                            
                                            {/* Tampilkan informasi line assignment untuk putway dan shrink */}
                                            {(isPutway || isShrink) && (
                                                <div className={`mb-3 p-2 ${isPutway ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'} rounded border`}>
                                                    <div className={`flex items-center ${isPutway ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'} text-xs`}>
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                        {isPutway 
                                                            ? "Penugasan Line: Karyawan akan ditugaskan bergantian ke Line 1 dan Line 2"
                                                            : "Penugasan Shrink: Karyawan akan ditugaskan bergantian ke Shrink 1, 2, 3, dan 4"}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                {Array.from({ length: req.requested_amount }).map((_, index) => {
                                                    const employeeId = assignedEmployees[index];
                                                    const employee = employeeId ? getEmployeeDetails(employeeId) : null;
                                                    const lineAssignment = (isPutway || isShrink) && employeeId ? 
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
                                                                        <span className={`ml-1 ${isPutway ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'} px-1 rounded text-xs`}>
                                                                            {lineAssignment.label}
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
                                                                    {/* ML SCORES */}
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
                                            
                                            {/* Tampilkan summary line assignment untuk putway dan shrink */}
                                            {(isPutway || isShrink) && assignedCount > 0 && (
                                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                                                    <h6 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">
                                                        Preview Penugasan {isPutway ? 'Line' : 'Shrink'}:
                                                    </h6>
                                                    <div className={`grid ${isPutway ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-2 sm:gap-3 text-xs`}>
                                                        {Array.from({ length: isPutway ? 2 : 4 }).map((_, lineIndex) => (
                                                            <div key={lineIndex} className={`${isPutway ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20'} p-2 sm:p-3 rounded`}>
                                                                <div className={`font-medium ${isPutway ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'} mb-2 text-xs sm:text-sm`}>
                                                                    {isPutway ? 'Line' : 'Shrink'} {lineIndex + 1}
                                                                </div>
                                                                {assignedEmployees
                                                                    .filter((_, idx) => 
                                                                        isPutway 
                                                                            ? (idx % 2) === lineIndex
                                                                            : (idx % 4) === lineIndex
                                                                    )
                                                                    .map((id, idx) => {
                                                                        const emp = getEmployeeDetails(id);
                                                                        return emp ? (
                                                                            <div key={id} className={`${isPutway ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'} py-1 text-xs truncate`}>
                                                                                {idx + 1}. {emp.name} ({emp.gender === 'female' ? 'P' : 'L'})
                                                                            </div>
                                                                        ) : null;
                                                                    })}
                                                            </div>
                                                        ))}
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => handleAutoFulfill(strategy)}
                        disabled={selectedBulkRequests.length === 0}
                        className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${
                            selectedBulkRequests.length === 0
                                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-700 dark:text-gray-300'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        Auto-Assign
                    </button>
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
        </div>
    );
}