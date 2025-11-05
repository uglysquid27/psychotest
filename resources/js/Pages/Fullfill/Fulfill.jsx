import { useForm } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { router } from "@inertiajs/react";

import RequestDetails from "./components/RequestDetails";
import GenderStats from "./components/GenderStats";
import EmployeeSelection from "./components/EmployeeSelection";
import ConfirmationSection from "./components/ComfirmationSection";
import EmployeeModal from "./components/EmployeeModal";
import BulkFulfillmentPanel from "./components/BulkFulfillmentPanel";
import LineAssignmentConfig from "./components/LineAssignmentConfig";
// import LineAssignmentDisplay from "./components/LineAssignmentDisplay";

export default function Fulfill({
    request,
    sameSubSectionEmployees,
    otherSubSectionEmployees,
    currentScheduledIds = [],
    sameDayRequests = [],
    message,
    auth,
}) {
    // Line assignment state
    const [lineAssignmentConfig, setLineAssignmentConfig] = useState({});
    const [draggingEmployee, setDraggingEmployee] = useState(null);

    const normalizeGender = (gender) => {
        if (!gender) {
            return "male";
        }
        const normalized = gender.toString().toLowerCase().trim();
        if (normalized !== "female" && normalized !== "male") {
            return "male";
        }
        return normalized;
    };

    const canReviseFulfilledRequest = useMemo(() => {
        if (request.status === "fulfilled") {
            const hasPendingSchedules = request.schedules?.some(
                (schedule) => schedule.status === "pending"
            );

            const hasRejectedEmployees = request.schedules?.some(
                (schedule) =>
                    schedule.employee?.status === "rejected" ||
                    schedule.status === "rejected"
            );

            return hasPendingSchedules || hasRejectedEmployees;
        }
        return false;
    }, [request]);

    const combinedEmployees = useMemo(() => {
        const availableEmployees = [
            ...sameSubSectionEmployees,
            ...otherSubSectionEmployees,
        ].filter((emp) => {
            const empId = String(emp.id);
            const currentScheduledIdsStr = currentScheduledIds.map((id) =>
                String(id)
            );

            return (
                currentScheduledIdsStr.includes(empId) ||
                emp.status === "available"
            );
        });

        return availableEmployees.map((emp) => ({
            ...emp,
            subSections: emp.sub_sections_data || emp.sub_sections || [],
            gender: normalizeGender(emp.gender),
            originalGender: emp.gender,
            isCurrentlyScheduled: currentScheduledIds
                .map((id) => String(id))
                .includes(String(emp.id)),
            // ADD ML SCORES
            ml_score: emp.ml_score || 0,
            final_score: emp.final_score || emp.total_score || 0,
        }));
    }, [
        sameSubSectionEmployees,
        otherSubSectionEmployees,
        currentScheduledIds,
    ]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            if (a.isCurrentlyScheduled !== b.isCurrentlyScheduled) {
                return a.isCurrentlyScheduled ? -1 : 1;
            }

            const aIsSame = a.subSections.some(
                (ss) => String(ss.id) === String(request.sub_section_id)
            );
            const bIsSame = b.subSections.some(
                (ss) => String(ss.id) === String(request.sub_section_id)
            );

            if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

            // USE ML-ENHANCED FINAL SCORE INSTEAD OF TOTAL SCORE
            if (a.final_score !== b.final_score) {
                return b.final_score - a.final_score;
            }

            const aGenderMatch =
                request.male_count > 0 && a.gender === "male"
                    ? 0
                    : request.female_count > 0 && a.gender === "female"
                    ? 0
                    : 1;
            const bGenderMatch =
                request.male_count > 0 && b.gender === "male"
                    ? 0
                    : request.female_count > 0 && b.gender === "female"
                    ? 0
                    : 1;
            if (aGenderMatch !== bGenderMatch)
                return aGenderMatch - bGenderMatch;

            // Keep existing type and weight sorting
            if (a.type === "bulanan" && b.type === "harian") return -1;
            if (a.type === "harian" && b.type === "bulanan") return 1;

            if (a.type === "harian" && b.type === "harian") {
                return b.working_day_weight - a.working_day_weight;
            }

            return a.id - b.id;
        });

        return sorted;
    }, [
        combinedEmployees,
        request.sub_section_id,
        request.male_count,
        request.female_count,
    ]);

    const initialSelectedIds = useMemo(() => {
        const validCurrentIds = currentScheduledIds
            .map((id) => String(id))
            .filter((id) =>
                allSortedEligibleEmployees.some((e) => String(e.id) === id)
            );

        if (validCurrentIds.length > 0) {
            if (validCurrentIds.length < request.requested_amount) {
                const remainingCount =
                    request.requested_amount - validCurrentIds.length;

                const remainingSameSubSection = allSortedEligibleEmployees
                    .filter(
                        (e) =>
                            !validCurrentIds.includes(String(e.id)) &&
                            e.subSections.some(
                                (ss) =>
                                    String(ss.id) ===
                                    String(request.sub_section_id)
                            )
                    )
                    .slice(0, remainingCount)
                    .map((e) => String(e.id));

                if (remainingSameSubSection.length >= remainingCount) {
                    return [...validCurrentIds, ...remainingSameSubSection];
                }

                const remainingOtherSubSection = allSortedEligibleEmployees
                    .filter(
                        (e) =>
                            !validCurrentIds.includes(String(e.id)) &&
                            !e.subSections.some(
                                (ss) =>
                                    String(ss.id) ===
                                    String(request.sub_section_id)
                            )
                    )
                    .slice(0, remainingCount - remainingSameSubSection.length)
                    .map((e) => String(e.id));

                return [
                    ...validCurrentIds,
                    ...remainingSameSubSection,
                    ...remainingOtherSubSection,
                ];
            }
            return validCurrentIds.slice(0, request.requested_amount);
        }

        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;
        const totalRequired = requiredMale + requiredFemale;

        const sameSubMales = allSortedEligibleEmployees.filter(
            (e) =>
                e.gender === "male" &&
                e.subSections.some(
                    (ss) => String(ss.id) === String(request.sub_section_id)
                )
        );

        const sameSubFemales = allSortedEligibleEmployees.filter(
            (e) =>
                e.gender === "female" &&
                e.subSections.some(
                    (ss) => String(ss.id) === String(request.sub_section_id)
                )
        );

        const otherSubMales = allSortedEligibleEmployees.filter(
            (e) =>
                e.gender === "male" &&
                !e.subSections.some(
                    (ss) => String(ss.id) === String(request.sub_section_id)
                )
        );

        const otherSubFemales = allSortedEligibleEmployees.filter(
            (e) =>
                e.gender === "female" &&
                !e.subSections.some(
                    (ss) => String(ss.id) === String(request.sub_section_id)
                )
        );

        const selected = [];

        selected.push(
            ...sameSubMales.slice(0, requiredMale).map((e) => String(e.id))
        );
        selected.push(
            ...sameSubFemales.slice(0, requiredFemale).map((e) => String(e.id))
        );

        const currentMaleCount = selected.filter((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === id
            );
            return emp?.gender === "male";
        }).length;

        if (currentMaleCount < requiredMale) {
            const needed = requiredMale - currentMaleCount;
            selected.push(
                ...otherSubMales.slice(0, needed).map((e) => String(e.id))
            );
        }

        const currentFemaleCount = selected.filter((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === id
            );
            return emp?.gender === "female";
        }).length;

        if (currentFemaleCount < requiredFemale) {
            const needed = requiredFemale - currentFemaleCount;
            selected.push(
                ...otherSubFemales.slice(0, needed).map((e) => String(e.id))
            );
        }

        if (selected.length < request.requested_amount) {
            const remainingSameSub = allSortedEligibleEmployees
                .filter(
                    (e) =>
                        !selected.includes(String(e.id)) &&
                        e.subSections.some(
                            (ss) =>
                                String(ss.id) === String(request.sub_section_id)
                        )
                )
                .slice(0, request.requested_amount - selected.length);

            selected.push(...remainingSameSub.map((e) => String(e.id)));

            // If still not enough, get from other subsections
            if (selected.length < request.requested_amount) {
                const remainingOtherSub = allSortedEligibleEmployees
                    .filter(
                        (e) =>
                            !selected.includes(String(e.id)) &&
                            !e.subSections.some(
                                (ss) =>
                                    String(ss.id) ===
                                    String(request.sub_section_id)
                            )
                    )
                    .slice(0, request.requested_amount - selected.length);

                selected.push(...remainingOtherSub.map((e) => String(e.id)));
            }
        }

        return selected.slice(0, request.requested_amount);
    }, [
        allSortedEligibleEmployees,
        request.requested_amount,
        request.male_count,
        request.female_count,
        request.sub_section_id,
        currentScheduledIds,
    ]);

    const { data, setData, post, processing, errors } = useForm({
        employee_ids: initialSelectedIds,
        fulfilled_by: auth.user.id,
        visibility: "private",
        line_assignment_config: {},
    });

    const [selectedIds, setSelectedIds] = useState(() =>
        initialSelectedIds.map((id) => String(id))
    );
    const [showModal, setShowModal] = useState(false);
    const [changingEmployeeIndex, setChangingEmployeeIndex] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedBulkRequests, setSelectedBulkRequests] = useState([]);
    const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState({});
    const [activeBulkRequest, setActiveBulkRequest] = useState(null);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    // Line Assignment Functions
    const initializeLineConfig = useCallback((request) => {
    const defaultLines = 2;
    
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
        enabled: true,
        lineCount: defaultLines,
        lineCounts: lineCounts,
        employeesPerLine: Array.from({ length: defaultLines }, () => [])
    };
}, []);

    const handleLineConfigChange = useCallback((requestId, field, value) => {
    setLineAssignmentConfig(prev => {
        const config = { ...prev[requestId] };
        
        console.log('🔧 Line config change:', {
            requestId,
            field,
            value,
            currentConfig: config
        });
        
        if (field === 'enabled') {
            if (value && !config.enabled) {
                const requestToUse = requestId === String(request.id) ? request : 
                    sameDayRequests.find(req => String(req.id) === requestId);
                const newConfig = initializeLineConfig(requestToUse);
                
                console.log('✅ Initialized line config:', newConfig);
                
                return {
                    ...prev,
                    [requestId]: newConfig
                };
            } else {
                return {
                    ...prev,
                    [requestId]: { enabled: false, lineCount: 0, lineCounts: [], employeesPerLine: [] }
                };
            }
        }
        
        // IMPORTANT: For lineCounts, directly set the value
        if (field === 'lineCounts') {
            const newConfig = {
                ...config,
                lineCounts: value,
                lineCount: value.length
            };
            
            console.log('📊 Updated lineCounts:', {
                requestId,
                newLineCounts: value,
                newLineCount: value.length
            });
            
            return {
                ...prev,
                [requestId]: newConfig
            };
        }
        
        if (field === 'lineCount') {
            const newLineCount = parseInt(value) || 1;
            
            const newConfig = {
                ...config,
                lineCount: newLineCount
            };
            
            console.log('🔢 Updated lineCount:', {
                requestId,
                newLineCount
            });
            
            return {
                ...prev,
                [requestId]: newConfig
            };
        }
        
        return { ...prev };
    });
}, [initializeLineConfig, request, sameDayRequests]);

    const handleLineEmployeeCountChange = useCallback((requestId, lineIndex, newCount) => {
        setLineAssignmentConfig(prev => {
            const config = { ...prev[requestId] };
            const newLineCounts = [...(config.lineCounts || [])];
            newLineCounts[lineIndex] = parseInt(newCount) || 0;
            
            return {
                ...prev,
                [requestId]: {
                    ...config,
                    lineCounts: newLineCounts
                }
            };
        });
    }, []);

    // Drag and Drop Handlers
    const handleDragStart = useCallback((e, requestId, sourceLineIndex, employeeIndex) => {
        setDraggingEmployee({ requestId, sourceLineIndex, employeeIndex });
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e, requestId, targetLineIndex) => {
        e.preventDefault();
        
        if (!draggingEmployee || draggingEmployee.requestId !== requestId) return;

        const { sourceLineIndex, employeeIndex } = draggingEmployee;
        
        if (sourceLineIndex === targetLineIndex) return;

        setLineAssignmentConfig(prev => {
            const config = { ...prev[requestId] };
            const newEmployeesPerLine = [...(config.employeesPerLine || [])];
            
            // Remove employee from source line
            const [movedEmployee] = newEmployeesPerLine[sourceLineIndex].splice(employeeIndex, 1);
            
            // Add employee to target line
            newEmployeesPerLine[targetLineIndex].push(movedEmployee);
            
            return {
                ...prev,
                [requestId]: {
                    ...config,
                    employeesPerLine: newEmployeesPerLine
                }
            };
        });
        
        setDraggingEmployee(null);
    }, [draggingEmployee]);

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


    // Initialize line config for current request - FIXED to prevent infinite loop
    useEffect(() => {
        if (request && !lineAssignmentConfig[request.id]) {
            setLineAssignmentConfig(prev => ({
                ...prev,
                [request.id]: initializeLineConfig(request)
            }));
        }
    }, [request, lineAssignmentConfig]); // Removed initializeLineConfig from dependencies

    // Update form data with line assignment config
    useEffect(() => {
        setData("line_assignment_config", lineAssignmentConfig);
    }, [lineAssignmentConfig, setData]);

    // Check if there are any currently scheduled employees
    const hasScheduledEmployees = useMemo(() => {
        return selectedIds.some((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === id
            );
            return emp?.isCurrentlyScheduled;
        });
    }, [selectedIds, allSortedEligibleEmployees]);

    // Validate and clean up bulk requests
    useEffect(() => {
        const allValidRequestIds = new Set();

        sameDayRequests.forEach((req) => {
            allValidRequestIds.add(String(req.id));
        });

        allValidRequestIds.add(String(request.id));

        const sameSubsectionRequests = sameDayRequests.filter(
            (req) =>
                String(req.sub_section_id) === String(request.sub_section_id) &&
                req.status !== "fulfilled"
        );
        sameSubsectionRequests.forEach((req) => {
            allValidRequestIds.add(String(req.id));
        });

        const invalidRequests = selectedBulkRequests.filter(
            (id) => !allValidRequestIds.has(id)
        );

        if (invalidRequests.length > 0) {
            setSelectedBulkRequests((prev) =>
                prev.filter((id) => allValidRequestIds.has(id))
            );

            setBulkSelectedEmployees((prev) => {
                const cleaned = { ...prev };
                invalidRequests.forEach((invalidId) => {
                    delete cleaned[invalidId];
                });
                return cleaned;
            });
        }
    }, [
        sameDayRequests,
        request.sub_section_id,
        request.status,
        request.id,
        selectedBulkRequests,
    ]);

    useEffect(() => {
        setSelectedIds(initialSelectedIds.map((id) => String(id)));
    }, [initialSelectedIds]);

    useEffect(() => {
        setData("employee_ids", selectedIds);
    }, [selectedIds, setData]);

    const genderStats = useMemo(() => {
        const stats = {
            total: 0,
            male: 0,
            female: 0,
            male_bulanan: 0,
            male_harian: 0,
            female_bulanan: 0,
            female_harian: 0,
            required_male: request.male_count || 0,
            required_female: request.female_count || 0,
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
                if (emp.gender === "female") {
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
        request.male_count,
        request.female_count,
    ]);

    const lineAssignments = useMemo(() => {
    const assignments = {};
    const config = lineAssignmentConfig[request.id];
    
    if (config?.enabled && config.lineCounts) {
        // Use configured line assignment
        selectedIds.forEach((id, index) => {
            let cumulative = 0;
            for (let i = 0; i < config.lineCounts.length; i++) {
                cumulative += config.lineCounts[i];
                if (index < cumulative) {
                    assignments[id] = {
                        number: (i + 1).toString(),
                        label: `Line ${i + 1}`
                    };
                    break;
                }
            }
        });
    }

    return assignments;
}, [selectedIds, lineAssignmentConfig, request.id]);

    const bulkLineAssignments = useMemo(() => {
        const assignments = {};

        Object.keys(bulkSelectedEmployees).forEach((requestId) => {
            const request = sameDayRequests.find(
                (req) => String(req.id) === requestId
            );
            if (!request) return;

            const config = lineAssignmentConfig[requestId];
            const employeeIds = bulkSelectedEmployees[requestId] || [];
            
            employeeIds.forEach((id, index) => {
                const key = `${requestId}-${id}`;
                if (config?.enabled) {
                    assignments[key] = {
                        number: getAssignedLine(config, index),
                        label: `Line ${getAssignedLine(config, index)}`
                    };
                } else {
                    // Default assignment for all subsections
                    const lineCount = 2;
                    assignments[key] = {
                        number: ((index % lineCount) + 1).toString(),
                        label: `Line ${(index % lineCount) + 1}`
                    };
                }
            });
        });

        return assignments;
    }, [bulkSelectedEmployees, sameDayRequests, lineAssignmentConfig, getAssignedLine]);

    const getBulkLineAssignment = useCallback(
        (requestId, employeeId) => {
            const key = `${requestId}-${employeeId}`;
            return bulkLineAssignments[key] || null;
        },
        [bulkLineAssignments]
    );

    useEffect(() => {
        if (errors?.fulfillment_error) {
            setBackendError(errors.fulfillment_error);
        }
    }, [errors]);

    const handleBulkEmployeeChange = useCallback(
        (requestId, index, newEmployeeId) => {
            setBulkSelectedEmployees((prev) => {
                const currentEmployees = prev[requestId] || [];

                if (
                    newEmployeeId !== currentEmployees[index] &&
                    currentEmployees.includes(newEmployeeId)
                ) {
                    alert("Karyawan ini sudah dipilih untuk request ini");
                    return prev;
                }

                const newEmployees = [...currentEmployees];
                newEmployees[index] = newEmployeeId;

                return {
                    ...prev,
                    [requestId]: newEmployees,
                };
            });
        },
        []
    );

    const handleBulkSubmit = useCallback(
        (strategy, visibility) => {
            setBackendError(null);

            const hasIncompleteAssignments = selectedBulkRequests.some(
                (requestId) => {
                    const employees = bulkSelectedEmployees[requestId] || [];
                    const request = sameDayRequests.find(
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
                    line_assignment_config: lineAssignmentConfig,
                },
                {
                    onSuccess: () => {
                        console.log("Bulk fulfill successful");
                        setBulkSelectedEmployees({});
                        setSelectedBulkRequests([]);
                        setBulkMode(false);
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
        [selectedBulkRequests, bulkSelectedEmployees, sameDayRequests, lineAssignmentConfig]
    );

    // Replace the existing getAssignedLine method in your controller with this:

// In your Fulfill.jsx, update the handleSubmit to log the config being sent:

const handleSubmit = useCallback(
    (e) => {
        e.preventDefault();
        setBackendError(null);

        const selectedEmployees = selectedIds.map((id) =>
            allSortedEligibleEmployees.find((e) => String(e.id) === id)
        );

        const maleCount = selectedEmployees.filter(
            (e) => e?.gender === "male"
        ).length;
        const femaleCount = selectedEmployees.filter(
            (e) => e?.gender === "female"
        ).length;

        if (request.male_count > 0 && maleCount < request.male_count) {
            alert(
                `Diperlukan minimal ${request.male_count} karyawan laki-laki`
            );
            return;
        }

        if (
            request.female_count > 0 &&
            femaleCount < request.female_count
        ) {
            alert(
                `Diperlukan minimal ${request.female_count} karyawan perempuan`
            );
            return;
        }

        // Debug: Log the line assignment config before submit
        console.log('📋 Submitting with line assignment config:', {
            requestId: request.id,
            fullConfig: lineAssignmentConfig,
            requestConfig: lineAssignmentConfig[request.id]
        });

        const submitData = {
            employee_ids: selectedIds,
            fulfilled_by: auth.user.id,
            is_revision: request.status === "fulfilled",
            visibility: data.visibility,
            line_assignment_config: lineAssignmentConfig,
        };

        console.log('📤 Full submit data:', submitData);

        post(route("manpower-requests.fulfill.store", request.id), {
            data: submitData,
            onSuccess: () => router.visit(route("manpower-requests.index")),
            onError: (errors) => {
                console.error('❌ Submit errors:', errors);
                if (errors.fulfillment_error) {
                    setBackendError(errors.fulfillment_error);
                }
            },
        });
    },
    [
        selectedIds,
        request,
        allSortedEligibleEmployees,
        post,
        auth.user.id,
        data.visibility,
        lineAssignmentConfig,
        setData,
    ]
);

    const handleAutoFulfill = useCallback(
        (strategy, requestIds) => {
            const newBulkSelections = { ...bulkSelectedEmployees };
            const requestsToFulfill = sameDayRequests.filter(
                (req) =>
                    requestIds.includes(String(req.id)) &&
                    req.status !== "fulfilled"
            );

            const usedEmployeeIds = new Set(
                Object.values(newBulkSelections)
                    .flat()
                    .filter((id) => id)
            );

            let availableEmployees = allSortedEligibleEmployees.filter(
                (emp) =>
                    !usedEmployeeIds.has(String(emp.id)) &&
                    emp.status === "available"
            );

            if (strategy === "same_section") {
                availableEmployees.sort((a, b) => {
                    const aIsSame = a.subSections.some(
                        (ss) => String(ss.id) === String(request.sub_section_id)
                    );
                    const bIsSame = b.subSections.some(
                        (ss) => String(ss.id) === String(request.sub_section_id)
                    );
                    if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

                    const aTotalScore =
                        (a.workload_points || 0) +
                        (a.blind_test_points || 0) +
                        (a.average_rating || 0);
                    const bTotalScore =
                        (b.workload_points || 0) +
                        (b.blind_test_points || 0) +
                        (b.average_rating || 0);
                    return bTotalScore - aTotalScore;
                });
            } else if (strategy === "balanced") {
                availableEmployees.sort((a, b) => {
                    const aWorkload =
                        (a.workload_points || 0) + (a.blind_test_points || 0);
                    const bWorkload =
                        (b.workload_points || 0) + (b.blind_test_points || 0);
                    return aWorkload - bWorkload;
                });
            }

            requestsToFulfill.forEach((req) => {
                const requiredMale = req.male_count || 0;
                const requiredFemale = req.female_count || 0;
                const totalRequired = req.requested_amount;

                const maleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === "male" &&
                        !usedEmployeeIds.has(String(emp.id)) &&
                        emp.status === "available"
                );

                const femaleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === "female" &&
                        !usedEmployeeIds.has(String(emp.id)) &&
                        emp.status === "available"
                );

                const selectedForRequest = [];

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

                const remainingSlots =
                    totalRequired - selectedForRequest.length;
                if (remainingSlots > 0) {
                    const otherCandidates = availableEmployees
                        .filter(
                            (emp) =>
                                !usedEmployeeIds.has(String(emp.id)) &&
                                emp.status === "available"
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

            setBulkSelectedEmployees(newBulkSelections);
        },
        [
            allSortedEligibleEmployees,
            bulkSelectedEmployees,
            sameDayRequests,
            request.sub_section_id,
        ]
    );

    const openChangeModal = useCallback((index) => {
        setChangingEmployeeIndex(index);
        setShowModal(true);
    }, []);

    const openBulkChangeModal = useCallback(
        (requestId, index) => {
            const requestIdStr = String(requestId);

            const requestExists =
                sameDayRequests.some(
                    (req) => String(req.id) === requestIdStr
                ) || String(requestIdStr) === String(request.id);

            if (!requestExists) {
                console.error(
                    "❌ Cannot open modal: Request not found",
                    requestIdStr
                );

                setSelectedBulkRequests((prev) =>
                    prev.filter((id) => id !== requestIdStr)
                );
                setBulkSelectedEmployees((prev) => {
                    const cleaned = { ...prev };
                    delete cleaned[requestIdStr];
                    return cleaned;
                });
                alert("Request tidak valid telah dihapus dari seleksi.");
                return;
            }

            setActiveBulkRequest({ requestId: requestIdStr, index });
            setShowModal(true);
        },
        [sameDayRequests, request.id]
    );

    const selectNewEmployee = useCallback(
        (newEmployeeId) => {
            if (changingEmployeeIndex === null && activeBulkRequest === null) {
                return;
            }

            const newEmployeeIdStr = String(newEmployeeId);

            if (activeBulkRequest) {
                const { requestId, index } = activeBulkRequest;
                const currentEmployees = bulkSelectedEmployees[requestId] || [];
                const currentEmployeesStr = currentEmployees.map((id) =>
                    String(id)
                );

                let bulkRequest = sameDayRequests.find(
                    (req) => String(req.id) === requestId
                );

                if (!bulkRequest && String(requestId) === String(request.id)) {
                    bulkRequest = request;
                }

                if (!bulkRequest) {
                    console.error("❌ Bulk request not found:", requestId);

                    if (String(requestId) !== String(request.id)) {
                        setSelectedBulkRequests((prev) =>
                            prev.filter((id) => id !== requestId)
                        );
                        setBulkSelectedEmployees((prev) => {
                            const cleaned = { ...prev };
                            delete cleaned[requestId];
                            return cleaned;
                        });
                        alert(
                            "Request tidak valid telah dihapus dari seleksi. Silakan refresh halaman dan coba lagi."
                        );
                    } else {
                        alert(
                            "Request saat ini tidak ditemukan. Silakan refresh halaman."
                        );
                    }

                    setShowModal(false);
                    setActiveBulkRequest(null);
                    return;
                }

                const newEmployee = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === newEmployeeIdStr
                );
                const currentEmp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === String(currentEmployees[index])
                );

                if (!newEmployee) {
                    alert("Karyawan tidak ditemukan");
                    return;
                }

                let newMaleCount = currentEmployees.filter((id) => {
                    const emp = allSortedEligibleEmployees.find(
                        (e) => String(e.id) === String(id)
                    );
                    return emp?.gender === "male";
                }).length;

                let newFemaleCount = currentEmployees.filter((id) => {
                    const emp = allSortedEligibleEmployees.find(
                        (e) => String(e.id) === String(id)
                    );
                    return emp?.gender === "female";
                }).length;

                if (currentEmp) {
                    if (currentEmp.gender === "male") newMaleCount--;
                    if (currentEmp.gender === "female") newFemaleCount--;
                }

                if (newEmployee.gender === "male") newMaleCount++;
                if (newEmployee.gender === "female") newFemaleCount++;

                if (
                    bulkRequest.male_count > 0 &&
                    newMaleCount > bulkRequest.male_count
                ) {
                    alert(
                        `Maksimum ${bulkRequest.male_count} karyawan laki-laki diperbolehkan untuk request ini`
                    );
                    return;
                }

                if (
                    bulkRequest.female_count > 0 &&
                    newFemaleCount > bulkRequest.female_count
                ) {
                    alert(
                        `Maksimum ${bulkRequest.female_count} karyawan perempuan diperbolehkan untuk request ini`
                    );
                    return;
                }

                const newEmployees = [...currentEmployees];
                newEmployees[index] = newEmployeeId;

                setBulkSelectedEmployees((prev) => ({
                    ...prev,
                    [requestId]: newEmployees,
                }));

                setShowModal(false);
                setActiveBulkRequest(null);
                return;
            }

            const newIds = [...selectedIds];
            const currentEmpId = newIds[changingEmployeeIndex];

            if (
                newEmployeeIdStr !== String(currentEmpId) &&
                newIds.map((id) => String(id)).includes(newEmployeeIdStr)
            ) {
                alert("Karyawan ini sudah dipilih");
                return;
            }

            const newEmployee = allSortedEligibleEmployees.find(
                (e) => String(e.id) === newEmployeeIdStr
            );
            const currentEmp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === String(currentEmpId)
            );

            let newMaleCount = selectedIds.filter((id) => {
                const emp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === String(id)
                );
                return emp?.gender === "male";
            }).length;

            let newFemaleCount = selectedIds.filter((id) => {
                const emp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === String(id)
                );
                return emp?.gender === "female";
            }).length;

            if (currentEmp) {
                if (currentEmp.gender === "male") newMaleCount--;
                if (currentEmp.gender === "female") newFemaleCount--;
            }

            if (newEmployee.gender === "male") newMaleCount++;
            if (newEmployee.gender === "female") newFemaleCount++;

            if (request.male_count > 0 && newMaleCount > request.male_count) {
                alert(
                    `Maksimum ${request.male_count} karyawan laki-laki diperbolehkan`
                );
                return;
            }

            if (
                request.female_count > 0 &&
                newFemaleCount > request.female_count
            ) {
                alert(
                    `Maksimum ${request.female_count} karyawan perempuan diperbolehkan`
                );
                return;
            }

            newIds[changingEmployeeIndex] = newEmployeeId;
            setSelectedIds(newIds);

            setShowModal(false);
            setChangingEmployeeIndex(null);
        },
        [
            changingEmployeeIndex,
            selectedIds,
            allSortedEligibleEmployees,
            request.male_count,
            request.female_count,
            activeBulkRequest,
            bulkSelectedEmployees,
            sameDayRequests,
        ]
    );

    const handleMultiSelect = useCallback(
        (newSelectedIds) => {
            const newIdsStr = newSelectedIds.map((id) => String(id));

            const selectedEmployees = newIdsStr
                .map((id) =>
                    allSortedEligibleEmployees.find((e) => String(e.id) === id)
                )
                .filter(Boolean);

            const maleCount = selectedEmployees.filter(
                (e) => e.gender === "male"
            ).length;
            const femaleCount = selectedEmployees.filter(
                (e) => e.gender === "female"
            ).length;

            if (request.male_count > 0 && maleCount > request.male_count) {
                alert(
                    `Maksimum ${request.male_count} karyawan laki-laki diperbolehkan`
                );
                return false;
            }

            if (
                request.female_count > 0 &&
                femaleCount > request.female_count
            ) {
                alert(
                    `Maksimum ${request.female_count} karyawan perempuan diperbolehkan`
                );
                return false;
            }

            // If validation passes, update the selection
            setSelectedIds(newIdsStr);
            return true;
        },
        [allSortedEligibleEmployees, request.male_count, request.female_count]
    );

    const getEmployeeDetails = useCallback(
        (id) => {
            const idStr = String(id);
            return allSortedEligibleEmployees.find(
                (emp) => String(emp.id) === idStr
            );
        },
        [allSortedEligibleEmployees]
    );

    const toggleMultiSelectMode = useCallback(() => {
        setMultiSelectMode((prev) => !prev);
    }, []);

    const toggleBulkMode = useCallback(() => {
        setBulkMode((prev) => !prev);
        if (!bulkMode) {
            const nonFulfilledSameSubsectionRequests = sameDayRequests.filter(
                (req) =>
                    req.sub_section_id === request.sub_section_id &&
                    req.status !== "fulfilled"
            );

            const allRequests = [...nonFulfilledSameSubsectionRequests];
            if (
                request.status !== "fulfilled" &&
                !allRequests.some((req) => req.id === request.id)
            ) {
                allRequests.push(request);
            }

            setSelectedBulkRequests(allRequests.map((req) => String(req.id)));

            const initialSelections = {};
            let usedEmployeeIds = new Set();

            if (request.status !== "fulfilled") {
                initialSelections[String(request.id)] = [...selectedIds];
                selectedIds.forEach((id) => usedEmployeeIds.add(id));
            }

            allRequests.forEach((req) => {
                const reqId = String(req.id);
                if (
                    reqId === String(request.id) &&
                    request.status !== "fulfilled"
                )
                    return;

                const requiredMale = req.male_count || 0;
                const requiredFemale = req.female_count || 0;
                const totalRequired = req.requested_amount;

                const availableEmployees = allSortedEligibleEmployees.filter(
                    (emp) =>
                        !usedEmployeeIds.has(String(emp.id)) &&
                        emp.status === "available"
                );

                const selectedForRequest = [];

                const maleCandidates = availableEmployees
                    .filter(
                        (emp) =>
                            emp.gender === "male" && emp.status === "available"
                    )
                    .slice(0, requiredMale);

                maleCandidates.forEach((emp) => {
                    selectedForRequest.push(String(emp.id));
                    usedEmployeeIds.add(String(emp.id));
                });

                const femaleCandidates = availableEmployees
                    .filter(
                        (emp) =>
                            emp.gender === "female" &&
                            !usedEmployeeIds.has(String(emp.id)) &&
                            emp.status === "available"
                    )
                    .slice(0, requiredFemale);

                femaleCandidates.forEach((emp) => {
                    selectedForRequest.push(String(emp.id));
                    usedEmployeeIds.add(String(emp.id));
                });

                const remainingSlots =
                    totalRequired - selectedForRequest.length;
                if (remainingSlots > 0) {
                    const otherCandidates = availableEmployees
                        .filter(
                            (emp) =>
                                !usedEmployeeIds.has(String(emp.id)) &&
                                emp.status === "available"
                        )
                        .slice(0, remainingSlots);

                    otherCandidates.forEach((emp) => {
                        selectedForRequest.push(String(emp.id));
                        usedEmployeeIds.add(String(emp.id));
                    });
                }

                initialSelections[reqId] = selectedForRequest;
            });

            setBulkSelectedEmployees(initialSelections);

            // Initialize line config for bulk requests
            allRequests.forEach(req => {
                if (!lineAssignmentConfig[String(req.id)]) {
                    setLineAssignmentConfig(prev => ({
                        ...prev,
                        [String(req.id)]: initializeLineConfig(req)
                    }));
                }
            });
        }
    }, [
        bulkMode,
        sameDayRequests,
        request,
        selectedIds,
        allSortedEligibleEmployees,
        lineAssignmentConfig,
        initializeLineConfig,
    ]);

    const toggleBulkRequestSelection = useCallback((requestId) => {
        const requestIdStr = String(requestId);
        setSelectedBulkRequests((prev) => {
            if (prev.includes(requestIdStr)) {
                return prev.filter((id) => id !== requestIdStr);
            } else {
                return [...prev, requestIdStr];
            }
        });
    }, []);

    if (
        request.status === "fulfilled" &&
        !canReviseFulfilledRequest &&
        !request.schedules?.length
    ) {
        return (
            <AuthenticatedLayout
                header={
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl">
                            Penuhi Request Man Power
                        </h2>
                    </div>
                }
                user={auth.user}
            >
                <div className="bg-white dark:bg-gray-800 shadow-md mx-auto mt-6 p-4 rounded-lg max-w-4xl text-center">
                    <p className="mb-3 font-bold text-green-600 dark:text-green-400 text-lg">
                        Permintaan ini sudah terpenuhi!
                    </p>
                    {request.fulfilled_by && (
                        <p className="mb-4 text-gray-600 dark:text-gray-300">
                            Dipenuhi oleh: {request.fulfilled_by.name} (
                            {request.fulfilled_by.email})
                        </p>
                    )}
                    <button
                        onClick={() =>
                            router.visit(route("manpower-requests.index"))
                        }
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 mt-4 px-4 py-2 rounded-lg text-white"
                    >
                        Kembali ke Daftar
                    </button>
                </div>
            </AuthenticatedLayout>
        );
    }

    const totalSameSubSection = sameSubSectionEmployees.length;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl">
                        Penuhi Request Man Power
                    </h2>
                    {/* Only show bulk mode button if there are no scheduled employees */}
                    {!hasScheduledEmployees && (
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={toggleBulkMode}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                    bulkMode
                                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                                        : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                                }`}
                            >
                                {bulkMode
                                    ? "Keluar Mode Bulk"
                                    : "Mode Bulk Fulfill"}
                            </button>
                        </div>
                    )}
                </div>
            }
            user={auth.user}
        >
            <div className="mx-auto mt-6 max-w-6xl">
                <RequestDetails request={request} auth={auth} />

                {request.status === "fulfilled" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 shadow-md mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <h3 className="mb-3 font-bold text-blue-800 dark:text-blue-300 text-lg">
                            Informasi Jadwal Saat Ini
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300">
                            {genderStats.current_scheduled} dari{" "}
                            {request.requested_amount} karyawan sudah
                            dijadwalkan sebelumnya.
                        </p>
                        <p className="mt-1 text-blue-700 dark:text-blue-300">
                            Anda dapat mengganti karyawan yang menolak atau
                            membiarkan yang sudah menerima.
                        </p>
                    </div>
                )}

                {bulkMode && (
                    <BulkFulfillmentPanel
                        sameDayRequests={sameDayRequests}
                        currentRequest={request}
                        selectedBulkRequests={selectedBulkRequests}
                        toggleBulkRequestSelection={toggleBulkRequestSelection}
                        handleBulkSubmit={handleBulkSubmit}
                        processing={processing}
                        bulkSelectedEmployees={bulkSelectedEmployees}
                        openBulkChangeModal={openBulkChangeModal}
                        getEmployeeDetails={getEmployeeDetails}
                        allSortedEligibleEmployees={allSortedEligibleEmployees}
                        handleAutoFulfill={handleAutoFulfill}
                        getBulkLineAssignment={getBulkLineAssignment}
                        lineAssignmentConfig={lineAssignmentConfig}
                        handleLineConfigChange={handleLineConfigChange}
                        handleLineEmployeeCountChange={handleLineEmployeeCountChange}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        LineAssignmentConfig={LineAssignmentConfig}
                    />
                )}

                {/* Line Assignment Configuration for Current Request */}
              {!bulkMode && (
    <LineAssignmentConfig
        requestId={String(request.id)}
        request={request}
        lineAssignmentConfig={lineAssignmentConfig}
        handleLineConfigChange={handleLineConfigChange}
        handleLineEmployeeCountChange={handleLineEmployeeCountChange}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        bulkSelectedEmployees={bulkSelectedEmployees}
        selectedIds={selectedIds}
        getEmployeeDetails={getEmployeeDetails}
        bulkMode={bulkMode}
    />
)}

                {!bulkMode && (
                    <>
                        <GenderStats
                            genderStats={genderStats}
                            request={request}
                            selectedIds={selectedIds}
                            allSortedEligibleEmployees={
                                allSortedEligibleEmployees
                            }
                        />

                        {backendError && (
                            <div className="bg-red-100 dark:bg-red-900/20 mb-4 p-3 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
                                <p className="font-semibold">Error:</p>
                                <p>{backendError}</p>
                            </div>
                        )}

                        {totalSameSubSection < request.requested_amount && (
                            <div className="bg-yellow-100 dark:bg-yellow-900/20 mb-4 p-3 border border-yellow-400 dark:border-yellow-600 rounded-lg text-yellow-700 dark:text-yellow-300">
                                <p>
                                    Hanya {totalSameSubSection} karyawan dari
                                    sub-bagian yang sama yang tersedia
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <EmployeeSelection
                                request={request}
                                selectedIds={selectedIds}
                                getEmployeeDetails={getEmployeeDetails}
                                openChangeModal={openChangeModal}
                                multiSelectMode={multiSelectMode}
                                toggleMultiSelectMode={toggleMultiSelectMode}
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
                                            checked={
                                                data.visibility === "private"
                                            }
                                            onChange={() =>
                                                setData("visibility", "private")
                                            }
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
                                            checked={
                                                data.visibility === "public"
                                            }
                                            onChange={() =>
                                                setData("visibility", "public")
                                            }
                                            className="mr-2"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">
                                            Public
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <ConfirmationSection
                                auth={auth}
                                processing={processing}
                                isBulkMode={false}
                            />
                        </form>
                    </>
                )}

                <EmployeeModal
                    showModal={showModal}
                    setShowModal={setShowModal}
                    request={
                        activeBulkRequest
                            ? sameDayRequests.find(
                                  (req) =>
                                      String(req.id) ===
                                      activeBulkRequest.requestId
                              ) || request
                            : request
                    }
                    allSortedEligibleEmployees={allSortedEligibleEmployees}
                    selectedIds={
                        activeBulkRequest
                            ? bulkSelectedEmployees[
                                  activeBulkRequest.requestId
                              ] || []
                            : selectedIds
                    }
                    selectNewEmployee={selectNewEmployee}
                    handleMultiSelect={handleMultiSelect}
                    multiSelectMode={multiSelectMode}
                    toggleMultiSelectMode={toggleMultiSelectMode}
                    isBulkMode={!!activeBulkRequest}
                    isLoading={isLoadingEmployees}
                />
            </div>
        </AuthenticatedLayout>
    );
}