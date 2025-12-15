import { useForm } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { router } from "@inertiajs/react";

import RequestDetails from "./components/RequestDetails";
import GenderStats from "./components/GenderStats";
import EmployeeSelection from "./components/EmployeeSelection";
import ConfirmationSection from "./components/ComfirmationSection";
import EmployeeModal from "./components/EmployeeModal";
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
    const [showRatioInfo, setShowRatioInfo] = useState(false); // NEW: Toggle for ratio info

    // Helper function to check if request is from Inspeksi section
    // Update the isInspeksiSection function in Fulfill.jsx:

    // Helper function to check if request is from Inspeksi section
    const isInspeksiSection = useCallback((req) => {
        console.log("=== isInspeksiSection DEBUG ===");
        console.log("Full request object:", req);

        // Try different property names
        const subSection = req?.subSection || req?.sub_section;
        console.log("subSection (camelCase):", req?.subSection);
        console.log("sub_section (snake_case):", req?.sub_section);
        console.log("Using subSection value:", subSection);

        if (!subSection) {
            console.log("No subSection found in any format, returning false");
            return false;
        }

        // Try different property names for section
        const section = subSection?.section || subSection?.section_data;
        console.log("section (camelCase):", subSection?.section);
        console.log("section_data:", subSection?.section_data);
        console.log("Using section value:", section);

        if (!section) {
            console.log("No section found in subSection, returning false");
            return false;
        }

        const rawSectionName = section.name || "";
        const trimmedSectionName = rawSectionName.trim();
        const lowerSectionName = trimmedSectionName.toLowerCase();

        console.log("Section name analysis:");
        console.log("  - Raw:", `"${rawSectionName}"`);
        console.log("  - Trimmed:", `"${trimmedSectionName}"`);
        console.log("  - Lowercase:", `"${lowerSectionName}"`);
        console.log('  - Is "inspeksi"?', lowerSectionName === "inspeksi");

        console.log("=== END DEBUG ===");

        return lowerSectionName === "inspeksi";
    }, []);

    const isInspeksiRequest = useMemo(() => {
        console.log("=== isInspeksiRequest DEBUG ===");
        console.log("Calling isInspeksiSection with request:", request);
        const result = isInspeksiSection(request);
        console.log("isInspeksiRequest result:", result);
        console.log("=== END DEBUG ===");
        return result;
    }, [request, isInspeksiSection]);

    // Add this useEffect to see all available properties:
    useEffect(() => {
        console.log("=== COMPLETE REQUEST STRUCTURE ===");
        console.log("All properties on request object:");
        Object.keys(request).forEach((key) => {
            console.log(`  ${key}:`, request[key]);
        });

        // Check for nested relationships
        console.log("Checking for subSection variants:");
        const possibleSubSectionNames = [
            "subSection",
            "sub_section",
            "subSectionData",
            "sub_section_data",
            "subsection",
            "sub_section_relation",
        ];

        possibleSubSectionNames.forEach((name) => {
            if (request[name]) {
                console.log(`Found ${name}:`, request[name]);
                console.log(
                    `Properties on ${name}:`,
                    Object.keys(request[name])
                );

                // Check for section within subSection
                const possibleSectionNames = [
                    "section",
                    "section_data",
                    "sectionData",
                    "section_relation",
                ];
                possibleSectionNames.forEach((sectionName) => {
                    if (request[name][sectionName]) {
                        console.log(
                            `Found ${sectionName} in ${name}:`,
                            request[name][sectionName]
                        );
                        console.log(
                            `Properties on ${sectionName}:`,
                            Object.keys(request[name][sectionName])
                        );
                    }
                });
            }
        });

        console.log("=== END STRUCTURE DEBUG ===");
    }, [request]);

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
            priority_score: emp.priority_score || 0,
            priority_info: emp.priority_info || [],
            has_priority: emp.has_priority || false,
        }));
    }, [
        sameSubSectionEmployees,
        otherSubSectionEmployees,
        currentScheduledIds,
    ]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            // PRIORITY 1: Priority employees first (only for Inspeksi section)
            if (isInspeksiRequest) {
                if (a.has_priority !== b.has_priority) {
                    return a.has_priority ? -1 : 1;
                }

                // PRIORITY 2: If both have priority, compare priority scores
                if (
                    a.has_priority &&
                    b.has_priority &&
                    a.priority_score !== b.priority_score
                ) {
                    return b.priority_score - a.priority_score;
                }
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
        isInspeksiRequest,
    ]);

    // FIXED: Correct priority ratio calculation
    const getPriorityRatio = useCallback((requestedAmount) => {
        if (requestedAmount <= 2) {
            return 1; // 1:1 ratio for 1-2 employees
        } else if (requestedAmount <= 4) {
            return 0.5; // 1:2 ratio for 3-4 employees
        } else {
            return 0.333; // 1:3 ratio for 5+ employees
        }
    }, []);

    // FIXED: Correct target priority count calculation
    const calculateTargetPriorityCount = useCallback(
        (requestedAmount) => {
            const ratio = getPriorityRatio(requestedAmount);
            // For 1:3 ratio, multiply by 0.333 (which is 1/3)
            const target = Math.max(1, Math.floor(requestedAmount * ratio));

            // Ensure we don't exceed requested amount and for 1:3 ratio, round up if needed
            if (requestedAmount >= 5) {
                // For 1:3 ratio: 5-7 = 2, 8-10 = 3, etc.
                return Math.min(
                    Math.ceil(requestedAmount / 3),
                    requestedAmount
                );
            }

            return Math.min(target, requestedAmount);
        },
        [getPriorityRatio]
    );

    // Get ratio description for display
    const getRatioDescription = useCallback((requestedAmount) => {
        if (requestedAmount <= 2) {
            return "1:1";
        } else if (requestedAmount <= 4) {
            return "1:2";
        } else {
            return "1:3";
        }
    }, []);

    // Get priority positions (slots where priority employees should be placed)
    const getPriorityPositions = useCallback(
        (requestedAmount) => {
            const targetPriorityCount =
                calculateTargetPriorityCount(requestedAmount);
            const positions = [];

            if (targetPriorityCount === 1) {
                // For 1 priority employee, put them in position 1
                positions.push(1);
            } else if (targetPriorityCount === 2) {
                // For 2 priority employees, distribute evenly (positions 1 and middle)
                positions.push(1, Math.ceil(requestedAmount / 2));
            } else {
                // For 3+ priority employees, distribute evenly
                const step = Math.floor(requestedAmount / targetPriorityCount);
                for (let i = 0; i < targetPriorityCount; i++) {
                    positions.push(Math.min(i * step + 1, requestedAmount));
                }
            }

            return positions.sort((a, b) => a - b);
        },
        [calculateTargetPriorityCount]
    );

    const initialSelectedIds = useMemo(() => {
        // Step 1: Get currently scheduled employees first (preserve them)
        const validCurrentIds = currentScheduledIds
            .map((id) => String(id))
            .filter((id) =>
                allSortedEligibleEmployees.some((e) => String(e.id) === id)
            );

        // Calculate target priority count and positions (only for Inspeksi)
        const targetPriorityCount = isInspeksiRequest
            ? calculateTargetPriorityCount(request.requested_amount)
            : 0;
        const priorityPositions = isInspeksiRequest
            ? getPriorityPositions(request.requested_amount)
            : [];

        // If we have scheduled employees, use them as base
        if (validCurrentIds.length > 0) {
            const selected = new Array(request.requested_amount).fill(null);

            // Place currently scheduled employees in their positions
            validCurrentIds.forEach((id, index) => {
                if (index < request.requested_amount) {
                    selected[index] = id;
                }
            });

            // Count current priority employees (only for Inspeksi)
            const currentPriorityCount = isInspeksiRequest
                ? selected.filter((id) => {
                      if (!id) return false;
                      const emp = allSortedEligibleEmployees.find(
                          (e) => String(e.id) === id
                      );
                      return emp?.has_priority;
                  }).length
                : 0;

            // Calculate remaining priority slots (only for Inspeksi)
            const remainingPrioritySlots = Math.max(
                0,
                targetPriorityCount - currentPriorityCount
            );

            // Fill remaining slots with appropriate employees
            for (let i = 0; i < selected.length; i++) {
                if (!selected[i]) {
                    // Check if this is a priority position that still needs priority
                    const isPriorityPosition =
                        isInspeksiRequest && priorityPositions.includes(i + 1);
                    const needsPriority =
                        isPriorityPosition && remainingPrioritySlots > 0;

                    // Find appropriate employee
                    let candidate = null;

                    if (needsPriority) {
                        // Need priority employee (only for Inspeksi)
                        candidate = allSortedEligibleEmployees.find(
                            (emp) =>
                                emp.has_priority &&
                                emp.status === "available" &&
                                !selected.includes(String(emp.id))
                        );
                    } else {
                        // Get any available employee
                        candidate = allSortedEligibleEmployees.find(
                            (emp) =>
                                emp.status === "available" &&
                                !selected.includes(String(emp.id))
                        );
                    }

                    if (candidate) {
                        selected[i] = String(candidate.id);
                        if (candidate.has_priority && needsPriority) {
                            // Decrease remaining priority slots if we just added a priority employee
                            remainingPrioritySlots--;
                        }
                    }
                }
            }

            return selected.filter((id) => id !== null);
        }

        // Step 2: No scheduled employees, implement proper ratio (only for Inspeksi)
        const selected = new Array(request.requested_amount).fill(null);
        let remainingPrioritySlots = targetPriorityCount;

        if (isInspeksiRequest) {
            // First, fill priority positions with priority employees (up to target)
            for (
                let i = 0;
                i < priorityPositions.length && remainingPrioritySlots > 0;
                i++
            ) {
                const position = priorityPositions[i];
                if (selected[position - 1] === null) {
                    const priorityEmp = allSortedEligibleEmployees.find(
                        (emp) =>
                            emp.has_priority &&
                            emp.status === "available" &&
                            !selected.includes(String(emp.id))
                    );

                    if (priorityEmp) {
                        selected[position - 1] = String(priorityEmp.id);
                        remainingPrioritySlots--;
                    }
                }
            }
        }

        for (let i = 0; i < selected.length; i++) {
            if (selected[i] === null) {
                // Check if this is a priority position that still needs priority
                const isPriorityPosition =
                    isInspeksiRequest && priorityPositions.includes(i + 1);
                const needsPriority =
                    isPriorityPosition && remainingPrioritySlots > 0;

                let candidate = null;

                if (needsPriority) {
                    // Try to get priority employee for priority position
                    candidate = allSortedEligibleEmployees.find(
                        (emp) =>
                            emp.has_priority &&
                            emp.status === "available" &&
                            !selected.includes(String(emp.id))
                    );
                } else if (!isPriorityPosition) {
                    // For non-priority positions, try to get non-priority employees first
                    candidate = allSortedEligibleEmployees.find(
                        (emp) =>
                            !emp.has_priority &&
                            emp.status === "available" &&
                            !selected.includes(String(emp.id))
                    );

                    // If no non-priority available, get any available
                    if (!candidate) {
                        candidate = allSortedEligibleEmployees.find(
                            (emp) =>
                                emp.status === "available" &&
                                !selected.includes(String(emp.id))
                        );
                    }
                }

                if (candidate) {
                    selected[i] = String(candidate.id);
                    if (candidate.has_priority && needsPriority) {
                        remainingPrioritySlots--;
                    }
                }
            }
        }

        // Step 3: Ensure gender requirements are met
        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;

        let currentMale = 0,
            currentFemale = 0;
        selected.forEach((id) => {
            if (id) {
                const emp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === id
                );
                if (emp) {
                    if (emp.gender === "male") currentMale++;
                    else if (emp.gender === "female") currentFemale++;
                }
            }
        });

        // Adjust if gender requirements not met
        if (currentMale < requiredMale || currentFemale < requiredFemale) {
            const newSelected = [...selected];

            // Create a list of available employees sorted by priority and score
            const availableEmployees = allSortedEligibleEmployees
                .filter((emp) => emp.status === "available")
                .map((emp) => ({
                    id: String(emp.id),
                    gender: emp.gender,
                    has_priority: emp.has_priority,
                    final_score: emp.final_score,
                    isPriorityPosition:
                        selected.indexOf(String(emp.id)) !== -1
                            ? isInspeksiRequest &&
                              priorityPositions.includes(
                                  selected.indexOf(String(emp.id)) + 1
                              )
                            : false,
                }))
                .sort((a, b) => {
                    // Priority employees in priority positions first (preserve them)
                    if (
                        a.isPriorityPosition &&
                        a.has_priority &&
                        !b.isPriorityPosition
                    )
                        return -1;
                    if (
                        b.isPriorityPosition &&
                        b.has_priority &&
                        !a.isPriorityPosition
                    )
                        return 1;

                    // Then by priority (only for Inspeksi)
                    if (isInspeksiRequest && a.has_priority !== b.has_priority)
                        return a.has_priority ? -1 : 1;

                    // Then by score
                    return b.final_score - a.final_score;
                });

            // Track positions that can be changed (not priority positions with priority employees)
            const changeablePositions = selected
                .map((id, index) => {
                    if (!id) return index; // Empty position

                    const emp = allSortedEligibleEmployees.find(
                        (e) => String(e.id) === id
                    );
                    const isPriorityPos =
                        isInspeksiRequest &&
                        priorityPositions.includes(index + 1);

                    // Can change if: not a priority position OR is priority position but employee is not priority
                    if (
                        !isPriorityPos ||
                        (isPriorityPos && !emp?.has_priority)
                    ) {
                        return index;
                    }
                    return -1;
                })
                .filter((idx) => idx !== -1);

            // Adjust for male requirement
            if (currentMale < requiredMale) {
                const neededMales = requiredMale - currentMale;
                const maleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === "male" && !newSelected.includes(emp.id)
                );

                for (
                    let i = 0;
                    i < Math.min(neededMales, maleCandidates.length);
                    i++
                ) {
                    const pos = changeablePositions.shift();
                    if (pos !== undefined) {
                        newSelected[pos] = maleCandidates[i].id;
                    }
                }
            }

            // Adjust for female requirement
            if (currentFemale < requiredFemale) {
                const neededFemales = requiredFemale - currentFemale;
                const femaleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === "female" && !newSelected.includes(emp.id)
                );

                for (
                    let i = 0;
                    i < Math.min(neededFemales, femaleCandidates.length);
                    i++
                ) {
                    const pos = changeablePositions.shift();
                    if (pos !== undefined) {
                        newSelected[pos] = femaleCandidates[i].id;
                    }
                }
            }

            return newSelected.filter((id) => id !== null);
        }

        return selected.filter((id) => id !== null);
    }, [
        allSortedEligibleEmployees,
        request.requested_amount,
        request.male_count,
        request.female_count,
        currentScheduledIds,
        calculateTargetPriorityCount,
        getPriorityPositions,
        isInspeksiRequest,
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
            const currentRequestId = String(request.id);
            setBulkSelectedEmployees((prev) => ({
                ...prev,
                [currentRequestId]: initialSelectedIds,
            }));
        }
    }, [bulkMode, request.id, initialSelectedIds]);

    // FIXED: Helper function to calculate line counts
    const calculateLineCounts = useCallback((lineCount, requestedAmount) => {
        const baseCount = Math.floor(requestedAmount / lineCount);
        const remainder = requestedAmount % lineCount;

        return Array.from({ length: lineCount }, (_, i) =>
            i < remainder ? baseCount + 1 : baseCount
        );
    }, []);

    // Initialize line assignments only once on component mount
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

            const initialConfig = {
                enabled: false,
                lineCount: 2,
                lineCounts: calculateLineCounts(2, request.requested_amount),
            };

            setLineAssignmentConfig({
                [request.id]: initialConfig,
            });
        }
    }, []);

    const hasScheduledEmployees = useMemo(() => {
        return selectedIds.some((id) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === String(id)
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

    // Calculate priority positions for display (only for Inspeksi)
    const priorityPositions = useMemo(() => {
        return isInspeksiRequest
            ? getPriorityPositions(request.requested_amount)
            : [];
    }, [request.requested_amount, getPriorityPositions, isInspeksiRequest]);

    const genderStats = useMemo(() => {
        const targetPriorityCount = isInspeksiRequest
            ? calculateTargetPriorityCount(request.requested_amount)
            : 0;

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
            priority_count: 0,
            target_priority_count: targetPriorityCount,
            ratio_description: isInspeksiRequest
                ? getRatioDescription(request.requested_amount)
                : "N/A",
            priority_positions: priorityPositions,
            is_inspeksi: isInspeksiRequest,
        };

        selectedIds.forEach((id, index) => {
            const emp = allSortedEligibleEmployees.find(
                (e) => String(e.id) === String(id)
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
                if (emp.has_priority) {
                    stats.priority_count++;
                }
            }
        });

        return stats;
    }, [
        selectedIds,
        allSortedEligibleEmployees,
        request.requested_amount,
        request.male_count,
        request.female_count,
        calculateTargetPriorityCount,
        getRatioDescription,
        priorityPositions,
        isInspeksiRequest,
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

    // Auto-fill function with dynamic priority ratio and positions
    // Update the handleAutoFill function in Fulfill.jsx:

    // Auto-fill function with dynamic priority ratio and positions
    const handleAutoFill = useCallback(() => {
        if (!isInspeksiRequest) {
            // Simple auto-fill for non-Inspeksi sections
            const allEmployees = [...allSortedEligibleEmployees].filter(
                (emp) => emp.status === "available"
            );

            const selected = new Array(request.requested_amount).fill(null);
            const requiredMale = request.male_count || 0;
            const requiredFemale = request.female_count || 0;

            let maleCount = 0;
            let femaleCount = 0;

            // Fill gender requirements first
            for (
                let i = 0;
                i < allEmployees.length &&
                (maleCount < requiredMale || femaleCount < requiredFemale);
                i++
            ) {
                const emp = allEmployees[i];
                if (
                    maleCount < requiredMale &&
                    emp.gender === "male" &&
                    !selected.includes(String(emp.id))
                ) {
                    selected[maleCount + femaleCount] = String(emp.id);
                    maleCount++;
                } else if (
                    femaleCount < requiredFemale &&
                    emp.gender === "female" &&
                    !selected.includes(String(emp.id))
                ) {
                    selected[maleCount + femaleCount] = String(emp.id);
                    femaleCount++;
                }
            }

            // Fill remaining slots
            for (let i = 0; i < selected.length; i++) {
                if (!selected[i]) {
                    const emp = allEmployees.find(
                        (e) => !selected.includes(String(e.id))
                    );
                    if (emp) {
                        selected[i] = String(emp.id);
                    }
                }
            }

            setSelectedIds(selected.filter((id) => id !== null));
            return;
        }

        // For Inspeksi section: Implement strict priority ratio logic
        const targetPriorityCount = calculateTargetPriorityCount(
            request.requested_amount
        );
        const priorityPositions = getPriorityPositions(
            request.requested_amount
        );

        const allEmployees = [...allSortedEligibleEmployees].filter(
            (emp) => emp.status === "available"
        );

        // Separate priority and non-priority employees
        const priorityEmployees = allEmployees.filter(
            (emp) => emp.has_priority
        );
        const nonPriorityEmployees = allEmployees.filter(
            (emp) => !emp.has_priority
        );

        const selected = new Array(request.requested_amount).fill(null);

        // Step 1: First, fill priority positions with priority employees ONLY
        // (Non-priority employees should NOT be placed in priority positions during auto-fill)
        for (let i = 0; i < priorityPositions.length; i++) {
            const position = priorityPositions[i];
            // Try to find a priority employee for this position
            const priorityEmp = priorityEmployees.find(
                (emp) => !selected.includes(String(emp.id))
            );

            if (priorityEmp) {
                selected[position - 1] = String(priorityEmp.id);
                // Remove from available list
                const empIndex = priorityEmployees.findIndex(
                    (e) => String(e.id) === String(priorityEmp.id)
                );
                if (empIndex !== -1) priorityEmployees.splice(empIndex, 1);
            }
            // If no priority employee available, leave the priority position empty
            // (Don't fill with non-priority during auto-fill)
        }

        // Step 2: Fill remaining slots (non-priority positions) with any available employees
        for (let i = 0; i < selected.length; i++) {
            if (selected[i] === null) {
                const isPriorityPos = priorityPositions.includes(i + 1);

                // If this is a priority position that wasn't filled, skip it
                // (We already tried to fill priority positions in step 1)
                if (isPriorityPos) continue;

                // Try to fill with non-priority employee first
                let employee = nonPriorityEmployees.find(
                    (emp) => !selected.includes(String(emp.id))
                );

                // If no non-priority available, try priority employee
                if (!employee) {
                    employee = priorityEmployees.find(
                        (emp) => !selected.includes(String(emp.id))
                    );
                }

                if (employee) {
                    selected[i] = String(employee.id);

                    // Remove from appropriate list
                    if (employee.has_priority) {
                        const empIndex = priorityEmployees.findIndex(
                            (e) => String(e.id) === String(employee.id)
                        );
                        if (empIndex !== -1)
                            priorityEmployees.splice(empIndex, 1);
                    } else {
                        const empIndex = nonPriorityEmployees.findIndex(
                            (e) => String(e.id) === String(employee.id)
                        );
                        if (empIndex !== -1)
                            nonPriorityEmployees.splice(empIndex, 1);
                    }
                }
            }
        }

        // Step 3: Check if we have empty priority positions
        // If we do, try to move priority employees from non-priority positions to priority positions
        const emptyPriorityPositions = priorityPositions.filter(
            (pos) => !selected[pos - 1]
        );
        const filledNonPriorityPositions = [];

        // Find positions that have priority employees but are not priority positions
        for (let i = 0; i < selected.length; i++) {
            if (selected[i] && !priorityPositions.includes(i + 1)) {
                const empId = selected[i];
                const emp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === empId
                );
                if (emp && emp.has_priority) {
                    filledNonPriorityPositions.push({ position: i, empId });
                }
            }
        }

        // Move priority employees from non-priority to priority positions if possible
        for (
            let i = 0;
            i <
            Math.min(
                emptyPriorityPositions.length,
                filledNonPriorityPositions.length
            );
            i++
        ) {
            const priorityPos = emptyPriorityPositions[i];
            const nonPriorityPos = filledNonPriorityPositions[i];

            // Swap positions
            selected[priorityPos - 1] = nonPriorityPos.empId;
            selected[nonPriorityPos.position] = null;
        }

        // Step 4: Fill any remaining empty slots (including swapped non-priority positions)
        for (let i = 0; i < selected.length; i++) {
            if (selected[i] === null) {
                const isPriorityPos = priorityPositions.includes(i + 1);

                // For priority positions, still try to get priority employees first
                if (isPriorityPos) {
                    let employee = priorityEmployees.find(
                        (emp) => !selected.includes(String(emp.id))
                    );

                    if (!employee) {
                        employee = nonPriorityEmployees.find(
                            (emp) => !selected.includes(String(emp.id))
                        );
                    }

                    if (employee) {
                        selected[i] = String(employee.id);
                        // Remove from list
                        if (employee.has_priority) {
                            const empIndex = priorityEmployees.findIndex(
                                (e) => String(e.id) === String(employee.id)
                            );
                            if (empIndex !== -1)
                                priorityEmployees.splice(empIndex, 1);
                        } else {
                            const empIndex = nonPriorityEmployees.findIndex(
                                (e) => String(e.id) === String(employee.id)
                            );
                            if (empIndex !== -1)
                                nonPriorityEmployees.splice(empIndex, 1);
                        }
                    }
                } else {
                    // For non-priority positions, prefer non-priority employees
                    let employee = nonPriorityEmployees.find(
                        (emp) => !selected.includes(String(emp.id))
                    );

                    if (!employee) {
                        employee = priorityEmployees.find(
                            (emp) => !selected.includes(String(emp.id))
                        );
                    }

                    if (employee) {
                        selected[i] = String(employee.id);
                        // Remove from list
                        if (employee.has_priority) {
                            const empIndex = priorityEmployees.findIndex(
                                (e) => String(e.id) === String(employee.id)
                            );
                            if (empIndex !== -1)
                                priorityEmployees.splice(empIndex, 1);
                        } else {
                            const empIndex = nonPriorityEmployees.findIndex(
                                (e) => String(e.id) === String(employee.id)
                            );
                            if (empIndex !== -1)
                                nonPriorityEmployees.splice(empIndex, 1);
                        }
                    }
                }
            }
        }

        // Step 5: Ensure gender requirements are met
        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;

        let currentMale = 0,
            currentFemale = 0;
        selected.forEach((id) => {
            if (id) {
                const emp = allSortedEligibleEmployees.find(
                    (e) => String(e.id) === id
                );
                if (emp) {
                    if (emp.gender === "male") currentMale++;
                    else if (emp.gender === "female") currentFemale++;
                }
            }
        });

        // Adjust if gender requirements not met
        if (currentMale < requiredMale || currentFemale < requiredFemale) {
            // Create a list of employees to potentially swap
            const availableEmployees = allSortedEligibleEmployees
                .filter((emp) => emp.status === "available")
                .map((emp) => ({
                    id: String(emp.id),
                    gender: emp.gender,
                    has_priority: emp.has_priority,
                    final_score: emp.final_score,
                    isCurrentlyScheduled: emp.isCurrentlyScheduled,
                }))
                .sort((a, b) => {
                    // Priority employees in priority positions first (preserve them)
                    const aPos = selected.indexOf(a.id);
                    const bPos = selected.indexOf(b.id);
                    const aIsPriorityPos =
                        aPos !== -1 && priorityPositions.includes(aPos + 1);
                    const bIsPriorityPos =
                        bPos !== -1 && priorityPositions.includes(bPos + 1);

                    if (aIsPriorityPos && a.has_priority && !bIsPriorityPos)
                        return -1;
                    if (bIsPriorityPos && b.has_priority && !aIsPriorityPos)
                        return 1;

                    // Then by priority (only for Inspeksi)
                    if (isInspeksiRequest && a.has_priority !== b.has_priority)
                        return a.has_priority ? -1 : 1;

                    // Then by score
                    return b.final_score - a.final_score;
                });

            // Track positions that can be changed
            // Priority positions with priority employees should NOT be changed
            const changeablePositions = selected
                .map((id, index) => {
                    if (!id) return index; // Empty position

                    const emp = allSortedEligibleEmployees.find(
                        (e) => String(e.id) === id
                    );
                    const isPriorityPos = priorityPositions.includes(index + 1);

                    // Can change if: not a priority position OR is priority position but employee is not priority
                    if (
                        !isPriorityPos ||
                        (isPriorityPos && !emp?.has_priority)
                    ) {
                        return index;
                    }
                    return -1;
                })
                .filter((idx) => idx !== -1);

            // Adjust for male requirement
            if (currentMale < requiredMale) {
                const neededMales = requiredMale - currentMale;
                const maleCandidates = availableEmployees.filter(
                    (emp) => emp.gender === "male" && !selected.includes(emp.id)
                );

                for (
                    let i = 0;
                    i <
                    Math.min(
                        neededMales,
                        maleCandidates.length,
                        changeablePositions.length
                    );
                    i++
                ) {
                    const pos = changeablePositions[i];
                    if (pos !== undefined) {
                        selected[pos] = maleCandidates[i].id;
                    }
                }
            }

            // Adjust for female requirement
            if (currentFemale < requiredFemale) {
                const neededFemales = requiredFemale - currentFemale;
                const femaleCandidates = availableEmployees.filter(
                    (emp) =>
                        emp.gender === "female" && !selected.includes(emp.id)
                );

                for (
                    let i = 0;
                    i <
                    Math.min(
                        neededFemales,
                        femaleCandidates.length,
                        changeablePositions.length
                    );
                    i++
                ) {
                    const pos = changeablePositions[i];
                    if (pos !== undefined) {
                        selected[pos] = femaleCandidates[i].id;
                    }
                }
            }
        }

        setSelectedIds(selected.filter((id) => id !== null));
    }, [
        allSortedEligibleEmployees,
        request.requested_amount,
        request.male_count,
        request.female_count,
        selectedIds,
        calculateTargetPriorityCount,
        getPriorityPositions,
        isInspeksiRequest,
    ]);

    // ADDED: handleSubmit function
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
                    if (errors.fulfillment_error) {
                        setBackendError(errors.fulfillment_error);
                    }
                },
            }
        );
    };

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

            const existingIndex = newSelectedIds.findIndex(
                (id) => String(id) === newEmployeeId
            );

            if (existingIndex !== -1) {
                const temp = newSelectedIds[changingEmployeeIndex];
                newSelectedIds[changingEmployeeIndex] =
                    newSelectedIds[existingIndex];
                newSelectedIds[existingIndex] = temp;

                if (enableLineAssignment) {
                    setLineAssignments((prev) => {
                        const newAssignments = { ...prev };
                        const tempLine = newAssignments[oldEmployeeId];
                        const existingLine = newAssignments[newEmployeeId];

                        newAssignments[newEmployeeId] = tempLine;
                        newAssignments[oldEmployeeId] = existingLine;

                        return newAssignments;
                    });
                }
            } else {
                newSelectedIds[changingEmployeeIndex] = newEmployeeId;

                if (enableLineAssignment) {
                    setLineAssignments((prev) => {
                        const currentLine = prev[oldEmployeeId];
                        const newAssignments = { ...prev };

                        newAssignments[newEmployeeId] = currentLine;
                        delete newAssignments[oldEmployeeId];

                        return newAssignments;
                    });
                }
            }

            setSelectedIds(newSelectedIds);
            setChangingEmployeeIndex(null);
        } else {
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

    // ADDED: handleBulkEmployeeChange function
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

    // Function to navigate to BulkFulfillment page
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
    const ratioDescription = getRatioDescription(request.requested_amount);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl">
                        Penuhi Request Man Power
                    </h2>
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

                {/* Priority Ratio Information - Only for Inspeksi Section */}
                {isInspeksiRequest && (
                    <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
                                    Priority Ratio System ({ratioDescription})
                                </h3>
                                <div className="flex items-center space-x-4">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        <span className="font-medium">
                                            Target Priority:
                                        </span>{" "}
                                        {genderStats.target_priority_count} dari{" "}
                                        {request.requested_amount} karyawan
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        <span className="font-medium">
                                            Saat ini:
                                        </span>{" "}
                                        {genderStats.priority_count} priority
                                        {genderStats.priority_count <
                                            genderStats.target_priority_count && (
                                            <span className="text-yellow-600 ml-1">
                                                (Kurang{" "}
                                                {genderStats.target_priority_count -
                                                    genderStats.priority_count}
                                                )
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        <span className="font-medium">
                                            Priority Positions:
                                        </span>{" "}
                                        {genderStats.priority_positions
                                            .map((pos) => `#${pos}`)
                                            .join(", ")}
                                    </p>
                                    <button
                                        onClick={() =>
                                            setShowRatioInfo(!showRatioInfo)
                                        }
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                        title="Show ratio info"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleAutoFill}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
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
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                <span>Auto Fill dengan Ratio</span>
                            </button>
                        </div>

                        {/* Collapsible Ratio Info Panel */}
                        {showRatioInfo && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center mb-2">
                                    <svg
                                        className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        Priority Ratio System (Hanya untuk
                                        Section Inspeksi)
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Positions marked with ★ should ideally be
                                    filled with priority employees.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                            Priority employee in priority
                                            position
                                        </span>
                                    </div>
                                    <div className="flex items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                        <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                            Priority position awaiting priority
                                            employee
                                        </span>
                                    </div>
                                    <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                        <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                            Priority employee in regular
                                            position
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <p>
                                        <span className="font-medium">
                                            Ratio rules:
                                        </span>{" "}
                                        1-2 employees = 1:1, 3-4 employees =
                                        1:2, 5+ employees = 1:3
                                    </p>
                                    <p>
                                        Example: For 6 employees (1:3 ratio), 2
                                        priority employees are needed.
                                    </p>
                                    <p className="mt-1 font-medium text-blue-600 dark:text-blue-400">
                                        * Sistem priority hanya berlaku untuk
                                        section Inspeksi
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!isInspeksiRequest && (
                    <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
                                    Auto Fill System
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Prioritas: Subsection Exact → ML Score →
                                    Gender Matching
                                </p>
                            </div>
                            <button
                                onClick={handleAutoFill}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center space-x-2"
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
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                <span>Auto Fill</span>
                            </button>
                        </div>
                    </div>
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
                                showPriorityStars={isInspeksiRequest}
                                priorityPositions={priorityPositions}
                                isInspeksiRequest={isInspeksiRequest} // ADD THIS PROP
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
                    isInspeksiRequest={isInspeksiRequest} // ADD THIS
                    priorityPositions={priorityPositions} // ADD THIS
                />
            </div>
        </AuthenticatedLayout>
    );
}
