// In Revise.jsx - FIXED line assignment handling
import { useForm } from '@inertiajs/react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import dayjs from 'dayjs';
import { router } from '@inertiajs/react';

import RequestDetails from './components/RequestDetails';
import GenderStats from './components/GenderStats';
import EmployeeSelection from './components/EmployeeSelection';
import ConfirmationSection from './components/ComfirmationSection';
import EmployeeModal from './components/EmployeeModal';
import LineAssignmentConfig from './components/LineAssignmentConfig';

export default function Revise({
    request = {},
    sameSubSectionEmployees = [],
    otherSubSectionEmployees = [],
    currentScheduledIds = [],
    auth = {}
}){
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('darkMode') === 'true' ||
                (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [isDarkMode]);

    // Safe access to request properties
    const safeRequest = useMemo(() => ({
        ...request,
        sub_section: request?.sub_section || request?.subSection || {},
        male_count: request?.male_count || 0,
        female_count: request?.female_count || 0,
        requested_amount: request?.requested_amount || 0,
        sub_section_id: request?.sub_section_id || '',
        id: request?.id || ''
    }), [request]);

    // Safe access to auth
    const safeAuth = useMemo(() => ({
        user: auth?.user || {}
    }), [auth]);

    // LINE ASSIGNMENT STATE
    const [enableLineAssignment, setEnableLineAssignment] = useState(false);
    const [lineAssignments, setLineAssignments] = useState({});
    const [lineAssignmentConfig, setLineAssignmentConfig] = useState({});

    const normalizeGender = (gender) => {
        if (!gender) {
            return 'male';
        }
        const normalized = gender.toString().toLowerCase().trim();
        if (normalized !== 'female' && normalized !== 'male') {
            return 'male';
        }
        return normalized;
    };

    const combinedEmployees = useMemo(() => {
        return [
            ...(sameSubSectionEmployees || []).map(emp => ({
                ...emp,
                subSections: emp.sub_sections_data || emp.sub_sections || [],
                gender: normalizeGender(emp.gender),
                originalGender: emp.gender,
                isCurrentlyScheduled: (currentScheduledIds || []).includes(String(emp.id))
            })),
            ...(otherSubSectionEmployees || []).map(emp => ({
                ...emp,
                subSections: emp.sub_sections_data || emp.sub_sections || [],
                gender: normalizeGender(emp.gender),
                originalGender: emp.gender,
                isCurrentlyScheduled: (currentScheduledIds || []).includes(String(emp.id))
            }))
        ];
    }, [sameSubSectionEmployees, otherSubSectionEmployees, currentScheduledIds]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            if (a.isCurrentlyScheduled !== b.isCurrentlyScheduled) {
                return a.isCurrentlyScheduled ? -1 : 1;
            }

            const aIsSame = a.subSections.some(ss => String(ss.id) === String(safeRequest?.sub_section_id));
            const bIsSame = b.subSections.some(ss => String(ss.id) === String(safeRequest?.sub_section_id));

            if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

            const aTotalScore = (a.workload_points || 0) + (a.blind_test_points || 0) + (a.average_rating || 0);
            const bTotalScore = (b.workload_points || 0) + (b.blind_test_points || 0) + (b.average_rating || 0);

            const aGenderMatch = safeRequest?.male_count > 0 && a.gender === 'male' ? 0 :
                safeRequest?.female_count > 0 && a.gender === 'female' ? 0 : 1;
            const bGenderMatch = safeRequest?.male_count > 0 && b.gender === 'male' ? 0 :
                safeRequest?.female_count > 0 && b.gender === 'female' ? 0 : 1;
            if (aGenderMatch !== bGenderMatch) return aGenderMatch - bGenderMatch;

            if (aTotalScore !== bTotalScore) {
                return bTotalScore - aTotalScore;
            }

            if (a.type === 'bulanan' && b.type === 'harian') return -1;
            if (a.type === 'harian' && b.type === 'bulanan') return 1;

            if (a.type === 'harian' && b.type === 'harian') {
                return b.working_day_weight - a.working_day_weight;
            }

            return a.id - b.id;
        });

        return sorted;
    }, [combinedEmployees, safeRequest]);

    const getEmployeeDetails = useCallback((id) => {
        const idStr = String(id);
        return allSortedEligibleEmployees.find(emp => String(emp.id) === idStr);
    }, [allSortedEligibleEmployees]);

    const initialSelectedIds = useMemo(() => {
        return (currentScheduledIds || []).filter(id =>
            allSortedEligibleEmployees.some(e => String(e.id) === String(id))
        ).slice(0, safeRequest?.requested_amount || 0);
    }, [allSortedEligibleEmployees, safeRequest?.requested_amount, currentScheduledIds]);

    const { data, setData, put, processing, errors } = useForm({
        employee_ids: initialSelectedIds,
        fulfilled_by: safeAuth?.user?.id || '',
        visibility: 'public',
        enable_line_assignment: false,
        line_assignments: {}
    });

    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [showModal, setShowModal] = useState(false);
    const [changingEmployeeIndex, setChangingEmployeeIndex] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    // LINE ASSIGNMENT INITIALIZATION
    useEffect(() => {
        if (Object.keys(lineAssignments).length === 0 && selectedIds.length > 0) {
            const currentConfig = lineAssignmentConfig[safeRequest.id] || { enabled: false, lineCount: 2 };
            const initialLineAssignments = {};
            
            selectedIds.forEach((id, index) => {
                initialLineAssignments[String(id)] = ((index % currentConfig.lineCount) + 1).toString();
            });
            
            setLineAssignments(initialLineAssignments);
            
            // Also initialize config
            const initialConfig = {
                enabled: false,
                lineCount: 2,
                lineCounts: calculateLineCounts(2, safeRequest.requested_amount)
            };
            
            setLineAssignmentConfig({
                [safeRequest.id]: initialConfig
            });
        }
    }, []);

    // Helper function to calculate line counts
    const calculateLineCounts = useCallback((lineCount, requestedAmount) => {
        const baseCount = Math.floor(requestedAmount / lineCount);
        const remainder = requestedAmount % lineCount;
        
        return Array.from({ length: lineCount }, (_, i) => 
            i < remainder ? baseCount + 1 : baseCount
        );
    }, []);

    useEffect(() => {
        setData('employee_ids', selectedIds);
    }, [selectedIds, setData]);

    // Check if there are any currently scheduled employees
    const hasScheduledEmployees = useMemo(() => {
        return selectedIds.some(id => {
            const emp = allSortedEligibleEmployees.find(e => String(e.id) === id);
            return emp?.isCurrentlyScheduled;
        });
    }, [selectedIds, allSortedEligibleEmployees]);

    const genderStats = useMemo(() => {
        const stats = {
            total: 0,
            male: 0,
            female: 0,
            male_bulanan: 0,
            male_harian: 0,
            female_bulanan: 0,
            female_harian: 0,
            required_male: safeRequest.male_count || 0,
            required_female: safeRequest.female_count || 0,
            current_scheduled: 0,
        };

        selectedIds.forEach((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === id
            );
            if (emp) {
                stats.total++;
                if (emp.isCurrentlyScheduled) {
                    stats.current_scheduled++;
                }
                if (emp.gender === 'female') {
                    stats.female++;
                    stats[`female_${emp.type}`]++;
                } else {
                    stats.male++;
                    stats[`male_${emp.type}`]++;
                }
            }
        });

        return stats;
    }, [
        selectedIds,
        allSortedEligibleEmployees,
        safeRequest.male_count,
        safeRequest.female_count,
    ]);

    // FIXED: LINE CONFIG CHANGE HANDLER - Properly update enableLineAssignment
    const handleLineConfigChange = (requestId, type, data) => {
        console.log('🔄 Line config change:', { requestId, type, data });
        
        if (type === 'line_assignment') {
            const { employeeId, newLine } = data;
            setLineAssignments(prev => {
                const newAssignments = {
                    ...prev,
                    [employeeId]: newLine
                };
                return newAssignments;
            });
        } else if (type === 'fullConfig') {
            setLineAssignmentConfig(prev => {
                const newConfig = {
                    ...prev,
                    [requestId]: data
                };
                return newConfig;
            });
            
            // FIXED: Always update enableLineAssignment when config changes
            if (requestId === String(safeRequest.id)) {
                console.log('🎯 Setting enableLineAssignment to:', data.enabled);
                setEnableLineAssignment(data.enabled);
                // Also update form data
                setData('enable_line_assignment', data.enabled);
            }
        }
    };

    // Sync enableLineAssignment with the config on mount
    useEffect(() => {
        const currentConfig = lineAssignmentConfig[safeRequest.id];
        if (currentConfig) {
            console.log('🔄 Syncing enableLineAssignment from config:', currentConfig.enabled);
            setEnableLineAssignment(currentConfig.enabled);
            setData('enable_line_assignment', currentConfig.enabled);
        }
    }, [lineAssignmentConfig, safeRequest.id, setData]);

    // Employee selection handler
    const handleSelectEmployee = useCallback((id) => {
        const stringId = String(id);

        setSelectedIds((prev) => {
            if (prev.includes(stringId)) {
                // Remove employee and their line assignment if enabled
                if (enableLineAssignment) {
                    setLineAssignments(prevAssignments => {
                        const newAssignments = { ...prevAssignments };
                        delete newAssignments[stringId];
                        return newAssignments;
                    });
                }
                return prev.filter((id) => id !== stringId);
            }
            if (prev.length >= safeRequest.requested_amount) {
                return prev;
            }
            
            const newSelectedIds = [...prev, stringId];
            
            // Set default line assignment for new employee if enabled
            if (enableLineAssignment) {
                setLineAssignments(prevAssignments => {
                    const currentConfig = lineAssignmentConfig[safeRequest.id];
                    const lineCount = currentConfig?.lineCount || 2;
                    const newLine = ((newSelectedIds.length - 1) % lineCount + 1).toString();
                    const newAssignments = {
                        ...prevAssignments,
                        [stringId]: newLine
                    };
                    return newAssignments;
                });
            }
            
            return newSelectedIds;
        });
    }, [safeRequest.requested_amount, enableLineAssignment, lineAssignmentConfig, safeRequest.id]);

    const handleRemoveEmployee = useCallback((id) => {
        const idStr = String(id);
        setSelectedIds(prev => {
            const newSelectedIds = prev.filter(i => i !== idStr);
            
            // Remove line assignment
            if (enableLineAssignment) {
                setLineAssignments(prevAssignments => {
                    const newAssignments = { ...prevAssignments };
                    delete newAssignments[idStr];
                    return newAssignments;
                });
            }
            
            return newSelectedIds;
        });
    }, [enableLineAssignment]);

    const handleReplaceEmployee = useCallback((index) => {
        setChangingEmployeeIndex(index);
        setShowModal(true);
        setMultiSelectMode(false);
    }, []);

    const handleModalSelect = useCallback((employee) => {
        if (changingEmployeeIndex !== null) {
            const newSelectedIds = [...selectedIds];
            const newEmployeeId = String(employee.id);
            const oldEmployeeId = newSelectedIds[changingEmployeeIndex];
            
            // Check if the employee is already selected at a different position
            const existingIndex = newSelectedIds.findIndex(id => String(id) === newEmployeeId);
            
            if (existingIndex !== -1) {
                // If employee is already selected elsewhere, swap positions
                const temp = newSelectedIds[changingEmployeeIndex];
                newSelectedIds[changingEmployeeIndex] = newSelectedIds[existingIndex];
                newSelectedIds[existingIndex] = temp;
                
                // Update line assignments if line assignment is enabled
                if (enableLineAssignment) {
                    setLineAssignments(prev => {
                        const newAssignments = { ...prev };
                        const tempLine = newAssignments[oldEmployeeId];
                        const existingLine = newAssignments[newEmployeeId];
                        
                        // Swap the line assignments
                        newAssignments[newEmployeeId] = tempLine;
                        newAssignments[oldEmployeeId] = existingLine;
                        
                        return newAssignments;
                    });
                }
            } else {
                // Simply replace the employee at the specified index
                newSelectedIds[changingEmployeeIndex] = newEmployeeId;
                
                // Update line assignments if line assignment is enabled
                if (enableLineAssignment) {
                    setLineAssignments(prev => {
                        const currentLine = prev[oldEmployeeId];
                        const newAssignments = { ...prev };
                        
                        // Transfer line assignment from old to new employee
                        newAssignments[newEmployeeId] = currentLine;
                        delete newAssignments[oldEmployeeId];
                        
                        return newAssignments;
                    });
                }
            }
            
            setSelectedIds(newSelectedIds);
            setChangingEmployeeIndex(null);
        } else {
            // Handle direct employee selection
            handleSelectEmployee(employee.id);
        }
        
        setShowModal(false);
    }, [changingEmployeeIndex, handleSelectEmployee, selectedIds, enableLineAssignment]);

    // FIXED: SUBMIT HANDLER - Only submit line assignments when enabled
    const handleSubmit = (e) => {
        e.preventDefault();
        setBackendError(null);

        const stringSelectedIds = selectedIds.map(id => String(id));
        
        const processedLineAssignments = {};
        
        // ONLY process line assignments if line assignment is enabled
        if (enableLineAssignment) {
            Object.entries(lineAssignments).forEach(([employeeId, line]) => {
                // Only include assignments for currently selected employees
                if (stringSelectedIds.includes(String(employeeId))) {
                    processedLineAssignments[String(employeeId)] = String(line);
                }
            });
        }

        const currentConfig = lineAssignmentConfig[safeRequest.id] || {};
        const isLineAssignmentEnabled = currentConfig.enabled || enableLineAssignment;

        console.log('🎯 REVISION SUBMISSION DATA:', {
            employee_ids: stringSelectedIds,
            enable_line_assignment: isLineAssignmentEnabled,
            enableLineAssignment_state: enableLineAssignment,
            currentConfig_enabled: currentConfig.enabled,
            line_assignments: processedLineAssignments,
            line_assignments_count: Object.keys(processedLineAssignments).length,
            should_submit_line_assignments: isLineAssignmentEnabled
        });

        // FIXED: Only send line_assignments if line assignment is enabled
        put(route('manpower-requests.update-revision', safeRequest.id), {
            employee_ids: stringSelectedIds,
            fulfilled_by: safeAuth.user.id,
            visibility: data.visibility,
            enable_line_assignment: isLineAssignmentEnabled,
            line_assignments: isLineAssignmentEnabled ? processedLineAssignments : {}, // Send empty object if disabled
            is_revision: true,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                console.log('✅ Revision successful');
                router.visit(route("manpower-requests.index"));
            },
            onError: (errors) => {
                console.error('❌ Revision failed:', errors);
                if (errors.revision_error) {
                    setBackendError(errors.revision_error);
                }
            },
        });
    };

    const selectedEmployees = useMemo(() => {
        return selectedIds.map(id =>
            allSortedEligibleEmployees.find(emp => String(emp.id) === String(id))
        ).filter(Boolean);
    }, [selectedIds, allSortedEligibleEmployees]);

    const handleAddEmployee = () => {
        if (selectedIds.length < safeRequest.requested_amount) {
            setMultiSelectMode(true);
            setShowModal(true);
            setChangingEmployeeIndex(null);
        }
    };

    const handleMultiSelect = useCallback((newSelectedIds) => {
        // Validate gender requirements
        const selectedEmployees = newSelectedIds.map(id =>
            allSortedEligibleEmployees.find(e => String(e.id) === String(id))
        ).filter(Boolean);

        const maleCount = selectedEmployees.filter(e => e.gender === 'male').length;
        const femaleCount = selectedEmployees.filter(e => e.gender === 'female').length;

        if (safeRequest.male_count > 0 && maleCount > safeRequest.male_count) {
            alert(`Maksimum ${safeRequest.male_count} karyawan laki-laki diperbolehkan`);
            return false;
        }

        if (safeRequest.female_count > 0 && femaleCount > safeRequest.female_count) {
            alert(`Maksimum ${safeRequest.female_count} karyawan perempuan diperbolehkan`);
            return false;
        }

        // If validation passes, update the selection
        setSelectedIds(newSelectedIds);
        
        // Update line assignments for new selection if enabled
        if (enableLineAssignment) {
            const newLineAssignments = {};
            newSelectedIds.forEach((id, index) => {
                const currentConfig = lineAssignmentConfig[safeRequest.id];
                const lineCount = currentConfig?.lineCount || 2;
                newLineAssignments[String(id)] = ((index % lineCount) + 1).toString();
            });
            setLineAssignments(newLineAssignments);
        }
        
        return true;
    }, [allSortedEligibleEmployees, safeRequest.male_count, safeRequest.female_count, enableLineAssignment, lineAssignmentConfig, safeRequest.id]);

    const selectNewEmployee = useCallback((employee) => {
        const employeeIdStr = String(employee.id);

        if (changingEmployeeIndex !== null) {
            const oldEmployeeId = selectedIds[changingEmployeeIndex];
            
            setSelectedIds(prev => {
                const newIds = [...prev];
                newIds[changingEmployeeIndex] = employeeIdStr;
                return newIds;
            });

            // Update line assignments if enabled
            if (enableLineAssignment && lineAssignments[oldEmployeeId]) {
                setLineAssignments(prevAssignments => {
                    const currentLine = prevAssignments[oldEmployeeId];
                    const newAssignments = { ...prevAssignments };
                    
                    newAssignments[employeeIdStr] = currentLine;
                    delete newAssignments[oldEmployeeId];
                    
                    return newAssignments;
                });
            }
            
            setChangingEmployeeIndex(null);
        } else if (multiSelectMode) {
            handleSelectEmployee(employeeIdStr);
        } else {
            if (selectedIds.length < safeRequest.requested_amount) {
                handleSelectEmployee(employeeIdStr);
            }
        }
        setShowModal(false);
    }, [changingEmployeeIndex, multiSelectMode, handleSelectEmployee, selectedIds, safeRequest.requested_amount, enableLineAssignment, lineAssignments]);

    const lineAssignmentsForDisplay = useMemo(() => {
        if (!enableLineAssignment) return {};

        const assignments = {};
        selectedIds.forEach((id, index) => {
            assignments[id] = lineAssignments[id] || ((index % 2) + 1).toString();
        });
        return assignments;
    }, [enableLineAssignment, selectedIds, lineAssignments]);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setChangingEmployeeIndex(null);
        setMultiSelectMode(false);
    }, []);

    // Debug line assignment state
    useEffect(() => {
        console.log('🔍 LINE ASSIGNMENT STATE:', {
            enableLineAssignment,
            lineAssignments,
            lineAssignmentConfig: lineAssignmentConfig[safeRequest.id],
            selectedIds
        });
    }, [enableLineAssignment, lineAssignments, lineAssignmentConfig, safeRequest.id, selectedIds]);

    return (
        <AuthenticatedLayout
            user={safeAuth?.user || {}}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Revisi Pemenuhan Permintaan</h2>}
        >
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <h1 className="text-2xl font-bold mb-2">Revisi Pemenuhan Permintaan</h1>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Revisi penugasan karyawan untuk permintaan yang sudah terpenuhi
                                    </p>
                                </div>

                                {backendError && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                        {backendError}
                                    </div>
                                )}

                                <RequestDetails request={safeRequest} auth={safeAuth} />

                                {safeRequest.status === "fulfilled" && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 shadow-md mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg">
                                        <h3 className="mb-3 font-bold text-blue-800 dark:text-blue-300 text-lg">
                                            Informasi Jadwal Saat Ini
                                        </h3>
                                        <p className="text-blue-700 dark:text-blue-300">
                                            {genderStats.current_scheduled} dari{" "}
                                            {safeRequest.requested_amount} karyawan sudah
                                            dijadwalkan sebelumnya.
                                        </p>
                                        <p className="mt-1 text-blue-700 dark:text-blue-300">
                                            Anda dapat mengganti karyawan yang menolak atau
                                            membiarkan yang sudah menerima.
                                        </p>
                                    </div>
                                )}

                                <GenderStats
                                    genderStats={genderStats}
                                    request={safeRequest}
                                    selectedIds={selectedIds}
                                    allSortedEligibleEmployees={allSortedEligibleEmployees}
                                />

                                <LineAssignmentConfig
                                    requestId={safeRequest.id}
                                    request={safeRequest}
                                    lineAssignmentConfig={lineAssignmentConfig}
                                    handleLineConfigChange={handleLineConfigChange}
                                    getEmployeeDetails={getEmployeeDetails}
                                    bulkMode={false}
                                    bulkSelectedEmployees={{}}
                                    selectedIds={selectedIds}
                                    lineAssignments={lineAssignments}
                                />

                                <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100 text-lg">
                                        Visibility
                                    </h3>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="private"
                                                checked={data.visibility === "private"}
                                                onChange={() => setData("visibility", "private")}
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">
                                                Private
                                            </span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value="public"
                                                checked={data.visibility === "public"}
                                                onChange={() => setData("visibility", "public")}
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">
                                                Public
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <EmployeeSelection
                                    request={safeRequest}
                                    selectedIds={selectedIds}
                                    getEmployeeDetails={getEmployeeDetails}
                                    openChangeModal={handleReplaceEmployee}
                                    multiSelectMode={multiSelectMode}
                                    toggleMultiSelectMode={() => setMultiSelectMode(!multiSelectMode)}
                                    enableLineAssignment={enableLineAssignment}
                                    lineAssignments={lineAssignmentsForDisplay}
                                />

                                <ConfirmationSection
                                    auth={safeAuth}
                                    processing={processing}
                                    isBulkMode={false}
                                    isRevision={true}
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeModal
                showModal={showModal}
                setShowModal={handleCloseModal}
                request={safeRequest}
                allSortedEligibleEmployees={allSortedEligibleEmployees}
                selectedIds={selectedIds}
                selectNewEmployee={selectNewEmployee}
                handleMultiSelect={handleMultiSelect}
                multiSelectMode={multiSelectMode}
                toggleMultiSelectMode={() => setMultiSelectMode(!multiSelectMode)}
                isBulkMode={false}
                isLoading={false}
            />
        </AuthenticatedLayout>
    );
}