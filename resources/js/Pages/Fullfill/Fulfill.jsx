import { useForm } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import dayjs from "dayjs";
import { router } from "@inertiajs/react";

import RequestDetails from "./components/RequestDetails";
import GenderStats from "./components/GenderStats";
import EmployeeSelection from "./components/EmployeeSelection";
import ConfirmationSection from "./components/ComfirmationSection";
import EmployeeModal from "./components/EmployeeModal";
import BulkFulfillmentPanel from "./components/BulkFulfillmentPanel";
import LineAssignmentConfig from "./components/LineAssignmentConfig";

export default function Fulfill({
    request,
    sameSubSectionEmployees,
    otherSubSectionEmployees,
    currentScheduledIds = [],
    sameDayRequests = [],
    message,
    auth,
}) {
    const [enableLineAssignment, setEnableLineAssignment] = useState(false);
    const [lineAssignments, setLineAssignments] = useState({});
    const [lineAssignmentConfig, setLineAssignmentConfig] = useState({});

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
            ml_score: emp.ml_score || 0,
            final_score: emp.final_score || emp.total_score || 0,
            priority_score: emp.priority_score || 0, // ADD THIS
            priority_info: emp.priority_info || [], // ADD THIS
            has_priority: emp.has_priority || false, // ADD THIS
        }));
    }, [
        sameSubSectionEmployees,
        otherSubSectionEmployees,
        currentScheduledIds,
    ]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            // PRIORITY 1: Priority employees first
            if (a.has_priority !== b.has_priority) {
                return a.has_priority ? -1 : 1;
            }
            
            // PRIORITY 2: If both have priority, compare priority scores
            if (a.has_priority && b.has_priority && a.priority_score !== b.priority_score) {
                return b.priority_score - a.priority_score;
            }

            // PRIORITY 3: Currently scheduled employees
            if (a.isCurrentlyScheduled !== b.isCurrentlyScheduled) {
                return a.isCurrentlyScheduled ? -1 : 1;
            }

            // PRIORITY 4: Exact subsection match
            const aIsSame = a.subSections.some(
                (ss) => String(ss.id) === String(request.sub_section_id)
            );
            const bIsSame = b.subSections.some(
                (ss) => String(ss.id) === String(request.sub_section_id)
            );

            if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

            // PRIORITY 5: Final score (which already includes priority)
            if (a.final_score !== b.final_score) {
                return b.final_score - a.final_score;
            }

            // PRIORITY 6: Gender matching
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

            // PRIORITY 7: Employee type (bulanan first)
            if (a.type === "bulanan" && b.type === "harian") return -1;
            if (a.type === "harian" && b.type === "bulanan") return 1;

            // PRIORITY 8: For harian employees, working day weight
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

    // UPDATED: Initial selection with priority first
    const initialSelectedIds = useMemo(() => {
        // Step 1: Get all priority employees that match gender requirements
        const priorityEmployees = allSortedEligibleEmployees
            .filter(emp => emp.has_priority)
            .map(emp => String(emp.id));
        
        // Step 2: Get valid currently scheduled IDs
        const validCurrentIds = currentScheduledIds
            .map((id) => String(id))
            .filter((id) =>
                allSortedEligibleEmployees.some((e) => String(e.id) === id)
            );

        // Step 3: If we have scheduled employees, they take precedence
        if (validCurrentIds.length > 0) {
            const selected = [...validCurrentIds];
            
            // Fill remaining slots with priority employees first, then others
            const remainingCount = request.requested_amount - selected.length;
            if (remainingCount > 0) {
                // Get priority employees not already selected
                const availablePriority = priorityEmployees
                    .filter(id => !selected.includes(id))
                    .slice(0, remainingCount);
                
                selected.push(...availablePriority);
                
                // If still need more, get other employees
                if (selected.length < request.requested_amount) {
                    const stillNeeded = request.requested_amount - selected.length;
                    const otherEmployees = allSortedEligibleEmployees
                        .filter(emp => 
                            !selected.includes(String(emp.id)) && 
                            !emp.has_priority
                        )
                        .slice(0, stillNeeded)
                        .map(emp => String(emp.id));
                    
                    selected.push(...otherEmployees);
                }
            }
            
            return selected.slice(0, request.requested_amount);
        }

        // Step 4: No scheduled employees, start with priority
        const selected = [];
        
        // Add priority employees first
        selected.push(...priorityEmployees.slice(0, request.requested_amount));
        
        // If still need more, add other employees
        if (selected.length < request.requested_amount) {
            const remainingCount = request.requested_amount - selected.length;
            const otherEmployees = allSortedEligibleEmployees
                .filter(emp => !emp.has_priority)
                .slice(0, remainingCount)
                .map(emp => String(emp.id));
            
            selected.push(...otherEmployees);
        }
        
        // Step 5: Ensure gender requirements are met
        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;
        
        // Check current gender counts
        let currentMale = 0, currentFemale = 0;
        selected.forEach(id => {
            const emp = allSortedEligibleEmployees.find(e => String(e.id) === id);
            if (emp) {
                if (emp.gender === "male") currentMale++;
                else if (emp.gender === "female") currentFemale++;
            }
        });
        
        // Adjust if gender requirements not met
        if (currentMale < requiredMale || currentFemale < requiredFemale) {
            const newSelected = [];
            
            // First, ensure we have required males
            if (currentMale < requiredMale) {
                const neededMales = requiredMale - currentMale;
                const maleCandidates = allSortedEligibleEmployees
                    .filter(emp => 
                        emp.gender === "male" && 
                        !selected.includes(String(emp.id))
                    )
                    .sort((a, b) => {
                        // Priority employees first
                        if (a.has_priority !== b.has_priority) return a.has_priority ? -1 : 1;
                        return b.final_score - a.final_score;
                    })
                    .slice(0, neededMales)
                    .map(emp => String(emp.id));
                
                // Add these males, replacing some non-male employees if needed
                const nonMaleSelected = selected.filter(id => {
                    const emp = allSortedEligibleEmployees.find(e => String(e.id) === id);
                    return emp && emp.gender !== "male";
                });
                
                // Remove some non-males to make room
                const toRemove = Math.min(nonMaleSelected.length, maleCandidates.length);
                const remainingSelected = selected.filter(id => !nonMaleSelected.slice(0, toRemove).includes(id));
                newSelected.push(...remainingSelected, ...maleCandidates);
            }
            
            // Ensure we have required females
            if (currentFemale < requiredFemale) {
                const neededFemales = requiredFemale - currentFemale;
                const femaleCandidates = allSortedEligibleEmployees
                    .filter(emp => 
                        emp.gender === "female" && 
                        !newSelected.includes(String(emp.id))
                    )
                    .sort((a, b) => {
                        // Priority employees first
                        if (a.has_priority !== b.has_priority) return a.has_priority ? -1 : 1;
                        return b.final_score - a.final_score;
                    })
                    .slice(0, neededFemales)
                    .map(emp => String(emp.id));
                
                // Add these females
                const currentList = [...newSelected];
                const nonFemaleSelected = currentList.filter(id => {
                    const emp = allSortedEligibleEmployees.find(e => String(e.id) === id);
                    return emp && emp.gender !== "female";
                });
                
                // Remove some non-females to make room
                const toRemove = Math.min(nonFemaleSelected.length, femaleCandidates.length);
                const remainingSelected = currentList.filter(id => !nonFemaleSelected.slice(0, toRemove).includes(id));
                newSelected.length = 0; // Clear array
                newSelected.push(...remainingSelected, ...femaleCandidates);
            }
            
            // Fill remaining slots with best candidates
            if (newSelected.length < request.requested_amount) {
                const remaining = request.requested_amount - newSelected.length;
                const remainingCandidates = allSortedEligibleEmployees
                    .filter(emp => !newSelected.includes(String(emp.id)))
                    .sort((a, b) => {
                        // Priority employees first
                        if (a.has_priority !== b.has_priority) return a.has_priority ? -1 : 1;
                        return b.final_score - a.final_score;
                    })
                    .slice(0, remaining)
                    .map(emp => String(emp.id));
                
                newSelected.push(...remainingCandidates);
            }
            
            return newSelected.slice(0, request.requested_amount);
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
        enable_line_assignment: false,
        line_assignments: {},
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

    // Check if there are same subsection requests available for bulk mode
    const hasSameSectionRequests = useMemo(() => {
        const currentSectionId = String(request.subSection?.section_id);
        if (!currentSectionId) return false;

        return sameDayRequests.some((req) => {
            const reqSectionId = String(req.subSection?.section_id);
            return (
                reqSectionId === currentSectionId &&
                req.status !== "fulfilled" &&
                String(req.id) !== String(request.id)
            );
        });
    }, [sameDayRequests, request]);

    // Initialize bulk selected employees when entering bulk mode
    useEffect(() => {
        if (bulkMode) {
            // Initialize current request's employees
            const currentRequestId = String(request.id);
            setBulkSelectedEmployees((prev) => ({
                ...prev,
                [currentRequestId]: initialSelectedIds,
            }));
        }
    }, [bulkMode, request.id, initialSelectedIds]);

    // NEW: Initialize line assignments only once on component mount
    useEffect(() => {
        if (
            Object.keys(lineAssignments).length === 0 &&
            selectedIds.length > 0
        ) {
            const currentConfig = lineAssignmentConfig[request.id] || {
                enabled: false,
                lineCount: 2,
            };
            const initialLineAssignments = {};

            selectedIds.forEach((id, index) => {
                initialLineAssignments[String(id)] = (
                    (index % currentConfig.lineCount) +
                    1
                ).toString();
            });

            setLineAssignments(initialLineAssignments);

            // Also initialize config
            const initialConfig = {
                enabled: false,
                lineCount: 2,
                lineCounts: calculateLineCounts(2, request.requested_amount),
            };

            setLineAssignmentConfig({
                [request.id]: initialConfig,
            });
        }
    }, []); // Empty dependency array - only run once

    // Helper function to calculate line counts
    const calculateLineCounts = useCallback((lineCount, requestedAmount) => {
        const baseCount = Math.floor(requestedAmount / lineCount);
        const remainder = requestedAmount % lineCount;

        return Array.from({ length: lineCount }, (_, i) =>
            i < remainder ? baseCount + 1 : baseCount
        );
    }, []);

    // Check if there are any currently scheduled employees
    const hasScheduledEmployees = useMemo(() => {
        return selectedIds.some((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === id
            );
            return emp?.isCurrentlyScheduled;
        });
    }, [selectedIds, allSortedEligibleEmployees]);

    useEffect(() => {
        const allValidRequestIds = new Set();

        sameDayRequests.forEach((req) => {
            if (req.id && req.id !== request.id) {
                allValidRequestIds.add(String(req.id));
            }
        });

        const validSelected = selectedBulkRequests.filter((id) =>
            allValidRequestIds.has(String(id))
        );

        if (validSelected.length !== selectedBulkRequests.length) {
            setSelectedBulkRequests(validSelected);
        }
    }, [sameDayRequests, request.id, selectedBulkRequests]);

    useEffect(() => {
        setSelectedIds(initialSelectedIds.map((id) => String(id)));
    }, [initialSelectedIds]);

    useEffect(() => {
        setData("employee_ids", selectedIds);
    }, [selectedIds, setData]);

    useEffect(() => {
        if (message) {
            setBackendError(message);
        }
    }, [message]);

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

    const handleLineConfigChange = (requestId, type, data) => {
        if (type === "line_assignment") {
            const { employeeId, newLine } = data;
            setLineAssignments((prev) => {
                const newAssignments = {
                    ...prev,
                    [employeeId]: newLine,
                };
                return newAssignments;
            });
        } else if (type === "fullConfig") {
            setLineAssignmentConfig((prev) => {
                const newConfig = {
                    ...prev,
                    [requestId]: data,
                };
                return newConfig;
            });

            // Update the enableLineAssignment state
            if (requestId === String(request.id)) {
                setEnableLineAssignment(data.enabled);
            }
        }
    };

    // Sync enableLineAssignment with the config
    useEffect(() => {
        const currentConfig = lineAssignmentConfig[request.id];
        if (currentConfig) {
            setEnableLineAssignment(currentConfig.enabled);
        }
    }, [lineAssignmentConfig, request.id]);

    const handleModalEmployeeSelect = (employee) => {
        if (activeBulkRequest) {
            handleBulkEmployeeChange(
                activeBulkRequest.requestId,
                activeBulkRequest.index,
                String(employee.id)
            );
            setActiveBulkRequest(null);
        } else if (changingEmployeeIndex !== null) {
            const newSelectedIds = [...selectedIds];
            const newEmployeeId = String(employee.id);
            const oldEmployeeId = newSelectedIds[changingEmployeeIndex];

            // Check if the employee is already selected at a different position
            const existingIndex = newSelectedIds.findIndex(
                (id) => String(id) === newEmployeeId
            );

            if (existingIndex !== -1) {
                // If employee is already selected elsewhere, swap positions
                const temp = newSelectedIds[changingEmployeeIndex];
                newSelectedIds[changingEmployeeIndex] =
                    newSelectedIds[existingIndex];
                newSelectedIds[existingIndex] = temp;

                // Update line assignments if line assignment is enabled
                if (enableLineAssignment) {
                    setLineAssignments((prev) => {
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
                    setLineAssignments((prev) => {
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
            handleEmployeeSelect(employee.id);
        }

        setShowModal(false);
    };

    const handleReplaceEmployee = (index) => {
        setChangingEmployeeIndex(index);
        setShowModal(true);
    };

    const handleEmployeeSelect = (employeeId) => {
        const stringId = String(employeeId);

        setSelectedIds((prev) => {
            if (prev.includes(stringId)) {
                // Remove employee and their line assignment if enabled
                if (enableLineAssignment) {
                    setLineAssignments((prevAssignments) => {
                        const newAssignments = { ...prevAssignments };
                        delete newAssignments[stringId];
                        return newAssignments;
                    });
                }
                return prev.filter((id) => id !== stringId);
            }
            if (prev.length >= request.requested_amount) {
                return prev;
            }

            const newSelectedIds = [...prev, stringId];

            // Set default line assignment for new employee if enabled
            if (enableLineAssignment) {
                setLineAssignments((prevAssignments) => {
                    const currentConfig = lineAssignmentConfig[request.id];
                    const lineCount = currentConfig?.lineCount || 2;
                    const newLine = (
                        ((newSelectedIds.length - 1) % lineCount) +
                        1
                    ).toString();
                    const newAssignments = {
                        ...prevAssignments,
                        [stringId]: newLine,
                    };
                    return newAssignments;
                });
            }

            return newSelectedIds;
        });
    };

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

    const handleAutoFulfill = useCallback(
        (strategy, requestIds) => {
            const newBulkSelections = { ...bulkSelectedEmployees };
            const requestsToFulfill = sameDayRequests.filter(
                (req) =>
                    requestIds.includes(String(req.id)) &&
                    req.status !== "fulfilled"
            );

            // Also include current request if it's in the requestIds
            const allRequests = [...requestsToFulfill];
            if (requestIds.includes(String(request.id))) {
                const currentAlreadyIncluded = allRequests.some(
                    (req) => String(req.id) === String(request.id)
                );
                if (!currentAlreadyIncluded) {
                    allRequests.push(request);
                }
            }

            const usedEmployeeIds = new Set();

            let availableEmployees = allSortedEligibleEmployees.filter(
                (emp) => emp.status === "available"
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

            allRequests.forEach((req) => {
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
            request,
        ]
    );

    const handleBulkSubmit = useCallback(
        (strategy, visibility) => {
            setBackendError(null);

            const hasIncompleteAssignments = selectedBulkRequests.some(
                (requestId) => {
                    const employees = bulkSelectedEmployees[requestId] || [];
                    const req =
                        sameDayRequests.find(
                            (r) => String(r.id) === requestId
                        ) ||
                        (String(request.id) === requestId ? request : null);
                    return req && employees.length < req.requested_amount;
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
        [selectedBulkRequests, bulkSelectedEmployees, sameDayRequests, request]
    );

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

    const getBulkLineAssignment = useCallback(
        (requestId, employeeId) => {
            const requestEmployees = bulkSelectedEmployees[requestId] || [];
            const index = requestEmployees.indexOf(employeeId);
            return index !== -1 ? ((index % 2) + 1).toString() : "1";
        },
        [bulkSelectedEmployees]
    );

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setBackendError(null);

        const stringSelectedIds = selectedIds.map((id) => String(id));

        const processedLineAssignments = {};
        Object.entries(lineAssignments).forEach(([employeeId, line]) => {
            processedLineAssignments[String(employeeId)] = String(line);
        });

        const currentConfig = lineAssignmentConfig[request.id] || {};
        const isLineAssignmentEnabled =
            currentConfig.enabled || enableLineAssignment;

        router.post(
            route("manpower-requests.fulfill.store", request.id),
            {
                employee_ids: stringSelectedIds,
                fulfilled_by: auth.user.id,
                visibility: data.visibility,
                enable_line_assignment: isLineAssignmentEnabled,
                line_assignments: isLineAssignmentEnabled
                    ? processedLineAssignments
                    : {},
                is_revision: request.status === "fulfilled",
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.visit(route("manpower-requests.index"));
                },
                onError: (errors) => {
                    console.error("Submission errors:", errors);
                    if (errors.fulfillment_error) {
                        setBackendError(errors.fulfillment_error);
                    }
                },
            }
        );
    };

    const getEmployeeDetails = useCallback(
        (id) => {
            const idStr = String(id);
            return allSortedEligibleEmployees.find(
                (emp) => String(emp.id) === idStr
            );
        },
        [allSortedEligibleEmployees]
    );

    const lineAssignmentsForDisplay = useMemo(() => {
        if (!enableLineAssignment) return {};

        const assignments = {};
        selectedIds.forEach((id, index) => {
            assignments[id] =
                lineAssignments[id] || ((index % 2) + 1).toString();
        });
        return assignments;
    }, [enableLineAssignment, selectedIds, lineAssignments]);

    // NEW: Function to navigate to BulkFulfillment page
    const navigateToBulkFulfillment = () => {
        router.visit(
            route("manpower-requests.bulk-fulfillment", {
                request_id: request.id,
            })
        );
    };

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
                    {/* UPDATED: Bulk Fulfillment Button */}
                    {hasSameSectionRequests && (
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={navigateToBulkFulfillment}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                                <span>Bulk Fulfillment</span>
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

                {/* REMOVED: Old bulk mode panel */}

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
            openChangeModal={(index) => {
                setChangingEmployeeIndex(index);
                setShowModal(true);
            }}
            multiSelectMode={multiSelectMode}
            toggleMultiSelectMode={() =>
                setMultiSelectMode(!multiSelectMode)
            }
            enableLineAssignment={enableLineAssignment}
            lineAssignments={lineAssignmentsForDisplay}
            
        />

                            <LineAssignmentConfig
                                requestId={request.id}
                                request={request}
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
                    request={request}
                    allSortedEligibleEmployees={allSortedEligibleEmployees}
                    selectedIds={
                        bulkMode && activeBulkRequest
                            ? bulkSelectedEmployees[
                                  activeBulkRequest.requestId
                              ] || []
                            : selectedIds
                    }
                    selectNewEmployee={handleModalEmployeeSelect}
                    handleMultiSelect={(newSelectedIds) => {
                        const newIdsStr = newSelectedIds.map((id) =>
                            String(id)
                        );
                        setSelectedIds(newIdsStr);
                        return true;
                    }}
                    multiSelectMode={multiSelectMode}
                    toggleMultiSelectMode={() =>
                        setMultiSelectMode(!multiSelectMode)
                    }
                    isBulkMode={bulkMode}
                    isLoading={isLoadingEmployees}
                    activeBulkRequest={activeBulkRequest}
                />
            </div>
        </AuthenticatedLayout>
    );
}
