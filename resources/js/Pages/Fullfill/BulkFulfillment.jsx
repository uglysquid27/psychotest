// BulkFulfillment.jsx - COMPLETE with individual employee movement and full screen
import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import EmployeeModal from "./components/EmployeeModal";

export default function BulkFulfillment({
    auth,
    sameDayRequests = [],
    currentRequest,
    allSortedEligibleEmployees = [],
    message,
}) {
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState({});
    const [strategy, setStrategy] = useState("optimal");
    const [visibility, setVisibility] = useState("private");
    const [lineAssignmentConfig, setLineAssignmentConfig] = useState({});
    const [processing, setProcessing] = useState(false);

    // New states for EmployeeModal
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState(null);
    const [activeEmployeeIndex, setActiveEmployeeIndex] = useState(null);
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    // New state for full screen mode
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Helper function to check if request is from Inspeksi section
    const isInspeksiSection = useCallback((req) => {
        if (!req?.sub_section) return false;
        if (!req?.sub_section?.section) return false;
        const sectionName = (req.sub_section.section.name || '').toLowerCase().trim();
        return sectionName === 'inspeksi';
    }, []);

    // Check if current request is from Inspeksi section
    const isCurrentRequestInspeksi = useMemo(() => {
        return isInspeksiSection(currentRequest);
    }, [currentRequest, isInspeksiSection]);

    // Helper functions that don't depend on other hooks
    const getEmployeeDetails = useCallback(
        (employeeId) => {
            return allSortedEligibleEmployees.find(
                (emp) => String(emp.id) === String(employeeId)
            );
        },
        [allSortedEligibleEmployees]
    );

    // Filter requests from same SECTION that are not fulfilled
    const sameSectionRequests = useMemo(() => {
        const currentSectionId = String(currentRequest.sub_section?.section_id);

        if (!currentSectionId) {
            return [];
        }

        const sameSectionReqs = sameDayRequests.filter((req) => {
            const reqSectionId = String(req.sub_section?.section_id);
            const isSameSection = reqSectionId === currentSectionId;
            const isNotFulfilled = req.status !== "fulfilled";
            const isNotCurrent = String(req.id) !== String(currentRequest.id);

            return isSameSection && isNotFulfilled && isNotCurrent;
        });

        // Always include current request if not fulfilled
        const allRequests = [...sameSectionReqs];
        if (currentRequest.status !== "fulfilled") {
            allRequests.unshift(currentRequest);
        }

        return allRequests;
    }, [sameDayRequests, currentRequest]);

    // Initialize bulk selected employees when requests are selected
    useEffect(() => {
        const newBulkSelectedEmployees = { ...bulkSelectedEmployees };
        let hasChanges = false;

        selectedRequests.forEach((requestId) => {
            if (!newBulkSelectedEmployees[requestId]) {
                newBulkSelectedEmployees[requestId] = [];
                hasChanges = true;
            }
        });

        // Remove any request IDs that are no longer selected
        Object.keys(newBulkSelectedEmployees).forEach((requestId) => {
            if (!selectedRequests.includes(requestId)) {
                delete newBulkSelectedEmployees[requestId];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setBulkSelectedEmployees(newBulkSelectedEmployees);
        }
    }, [selectedRequests]);

    // Toggle request selection
    const toggleRequestSelection = useCallback((requestId) => {
        setSelectedRequests((prev) => {
            if (prev.includes(requestId)) {
                return prev.filter((id) => id !== requestId);
            } else {
                return [...prev, requestId];
            }
        });
    }, []);

    // Select all requests
    const handleSelectAll = useCallback(() => {
        const allIds = sameSectionRequests.map((req) => String(req.id));
        setSelectedRequests(allIds);
    }, [sameSectionRequests]);

    // Clear all selections
    const handleClearAll = useCallback(() => {
        setSelectedRequests([]);
        setBulkSelectedEmployees({});
    }, []);

    const handleEmployeeSelect = useCallback(
        (requestId, employeeId) => {
            const employeeIdStr = String(employeeId); // Convert to string
            
            setBulkSelectedEmployees((prev) => {
                const currentEmployees = prev[requestId] || [];
                const currentEmployeesStr = currentEmployees.map(id => String(id)); // Convert all to strings

                if (currentEmployeesStr.includes(employeeIdStr)) {
                    // Remove employee if already selected
                    return {
                        ...prev,
                        [requestId]: currentEmployees.filter(
                            (id) => String(id) !== employeeIdStr // String comparison
                        ),
                    };
                } else {
                    // Add employee if not already selected and within limit
                    const request = sameSectionRequests.find(
                        (req) => String(req.id) === requestId // String comparison
                    );
                    if (
                        request &&
                        currentEmployees.length < request.requested_amount
                    ) {
                        return {
                            ...prev,
                            [requestId]: [...currentEmployees, employeeIdStr], // Use string ID
                        };
                    }
                }
                return prev;
            });
        },
        [sameSectionRequests]
    );

    // Handle employee selection via modal (single employee)
    const handleSelectNewEmployee = useCallback(
        (employee) => {
            if (!activeRequestId || activeEmployeeIndex === null) return;

            setBulkSelectedEmployees((prev) => {
                const currentEmployees = prev[activeRequestId] || [];
                const newEmployees = [...currentEmployees];

                // Replace the employee at the specific index
                if (activeEmployeeIndex < newEmployees.length) {
                    newEmployees[activeEmployeeIndex] = String(employee.id);
                } else {
                    // Add new employee if index is beyond current array
                    newEmployees.push(String(employee.id));
                }

                return {
                    ...prev,
                    [activeRequestId]: newEmployees,
                };
            });

            setShowEmployeeModal(false);
            setActiveRequestId(null);
            setActiveEmployeeIndex(null);
        },
        [activeRequestId, activeEmployeeIndex]
    );

    // Handle multi-select from modal
    const handleMultiSelect = useCallback(
        (employeeIds) => {
            if (!activeRequestId) return;

            setBulkSelectedEmployees((prev) => ({
                ...prev,
                [activeRequestId]: employeeIds.map((id) => String(id)),
            }));

            setShowEmployeeModal(false);
            setActiveRequestId(null);
            setActiveEmployeeIndex(null);
        },
        [activeRequestId]
    );

    // Open employee modal for specific request and slot
    const openEmployeeModal = useCallback((requestId, employeeIndex = null) => {
        setActiveRequestId(requestId);
        setActiveEmployeeIndex(employeeIndex);
        setMultiSelectMode(employeeIndex === null); // Multi-select if no specific index
        setShowEmployeeModal(true);
    }, []);

    // Toggle multi-select mode in modal
    const toggleMultiSelectMode = useCallback(() => {
        setMultiSelectMode((prev) => !prev);
    }, []);

    // Check if employee matches exact subsection
    const hasExactSubsectionMatch = useCallback(
        (employee, requestSubSectionId) => {
            return employee.subSections?.some(
                (ss) => String(ss.id) === String(requestSubSectionId)
            );
        },
        []
    );

    // Check if employee matches same section
    const hasSameSectionMatch = useCallback((employee, requestSectionId) => {
        return employee.subSections?.some(
            (ss) => String(ss.section_id) === String(requestSectionId)
        );
    }, []);

    // Get gender matching score (lower is better)
    const getGenderMatchScore = useCallback((employee, request) => {
        const maleNeeded = (request.male_count || 0) > 0;
        const femaleNeeded = (request.female_count || 0) > 0;

        if (maleNeeded && employee.gender === "male") return 0;
        if (femaleNeeded && employee.gender === "female") return 0;
        return 1; // No match
    }, []);

    // Calculate priority ratio
    const calculatePriorityRatio = useCallback((requestedAmount) => {
        if (requestedAmount <= 2) return 1; // 1:1
        else if (requestedAmount <= 4) return 0.5; // 1:2
        else return 0.333; // 1:3
    }, []);

    // Calculate target priority count
    const calculateTargetPriorityCount = useCallback((requestedAmount) => {
        const ratio = calculatePriorityRatio(requestedAmount);
        const target = Math.max(1, Math.floor(requestedAmount * ratio));
        
        if (requestedAmount >= 5) {
            return Math.min(Math.ceil(requestedAmount / 3), requestedAmount);
        }
        
        return Math.min(target, requestedAmount);
    }, [calculatePriorityRatio]);

    // Get priority positions
    const getPriorityPositions = useCallback((requestedAmount) => {
        const targetPriorityCount = calculateTargetPriorityCount(requestedAmount);
        const positions = [];

        if (targetPriorityCount === 1) {
            positions.push(1);
        } else if (targetPriorityCount === 2) {
            positions.push(1, Math.ceil(requestedAmount / 2));
        } else {
            const step = Math.floor(requestedAmount / targetPriorityCount);
            for (let i = 0; i < targetPriorityCount; i++) {
                positions.push(Math.min(i * step + 1, requestedAmount));
            }
        }

        return positions.sort((a, b) => a - b);
    }, [calculateTargetPriorityCount]);

    // Sort employees with proper priority: only apply priority for Inspeksi section
    const sortEmployeesForRequest = useCallback(
        (employees, request) => {
            const requestSubSectionId = String(request.sub_section_id);
            const requestSectionId = String(request.sub_section?.section_id);
            const isInspeksi = isInspeksiSection(request);

            return [...employees].sort((a, b) => {
                // Priority 1: Priority employees first (only for Inspeksi)
                if (isInspeksi) {
                    if (a.has_priority !== b.has_priority) {
                        return a.has_priority ? -1 : 1;
                    }
                    
                    // Priority 2: If both have priority, compare priority scores
                    if (a.has_priority && b.has_priority && a.priority_score !== b.priority_score) {
                        return b.priority_score - a.priority_score;
                    }
                }

                // Priority 3: Exact subsection match
                const aExactMatch = hasExactSubsectionMatch(
                    a,
                    requestSubSectionId
                );
                const bExactMatch = hasExactSubsectionMatch(
                    b,
                    requestSubSectionId
                );

                if (aExactMatch && !bExactMatch) return -1;
                if (!aExactMatch && bExactMatch) return 1;

                // Priority 4: Same section match
                const aSameSection = hasSameSectionMatch(a, requestSectionId);
                const bSameSection = hasSameSectionMatch(b, requestSectionId);

                if (aSameSection && !bSameSection) return -1;
                if (!aSameSection && bSameSection) return 1;

                // Priority 5: ML score (final_score)
                if (a.final_score !== b.final_score) {
                    return b.final_score - a.final_score;
                }

                // Priority 6: Gender matching with request requirements
                const aGenderMatch = getGenderMatchScore(a, request);
                const bGenderMatch = getGenderMatchScore(b, request);
                if (aGenderMatch !== bGenderMatch) {
                    return aGenderMatch - bGenderMatch;
                }

                // Priority 7: Employee type (bulanan first)
                if (a.type === "bulanan" && b.type === "harian") return -1;
                if (a.type === "harian" && b.type === "bulanan") return 1;

                return String(a.id).localeCompare(String(b.id));
            });
        },
        [hasExactSubsectionMatch, hasSameSectionMatch, getGenderMatchScore, isInspeksiSection]
    );

 // Fixed Auto-fill for selected requests with proper priority handling
const handleAutoFill = useCallback(() => {
    if (selectedRequests.length === 0) return;

    const newBulkSelectedEmployees = { ...bulkSelectedEmployees };
    const usedEmployeeIds = new Set();

    // Get all currently used employees
    Object.values(newBulkSelectedEmployees).forEach((employees) => {
        employees.forEach((empId) => usedEmployeeIds.add(empId));
    });

    let availableEmployees = allSortedEligibleEmployees.filter(
        (emp) =>
            !usedEmployeeIds.has(String(emp.id)) &&
            emp.status === "available"
    );

    console.log(`Auto Fill Selected: ${availableEmployees.length} available employees`);

    // Process each selected request
    selectedRequests.forEach((requestId) => {
        const request = sameSectionRequests.find(
            (req) => String(req.id) === requestId
        );
        if (!request) return;

        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;
        const totalRequired = request.requested_amount;
        const isInspeksi = isInspeksiSection(request);

        // Calculate target priority count (only for Inspeksi)
        const targetPriorityCount = isInspeksi ? 
            calculateTargetPriorityCount(totalRequired) : 0;

        console.log(`Request ${requestId}: ${totalRequired} total, ${targetPriorityCount} target priority (Inspeksi: ${isInspeksi})`);

        // Sort employees for this specific request
        const sortedEmployees = sortEmployeesForRequest(
            availableEmployees,
            request
        );

        const selectedForRequest = [];
        
        // Separate priority and non-priority employees
        const priorityEmployees = sortedEmployees.filter(emp => emp.has_priority);
        const nonPriorityEmployees = sortedEmployees.filter(emp => !emp.has_priority);

        console.log(`  Available: ${priorityEmployees.length} priority, ${nonPriorityEmployees.length} non-priority`);

        // Phase 1: Fill priority slots for Inspeksi section
        let priorityUsed = 0;
        if (isInspeksi && targetPriorityCount > 0) {
            for (let i = 0; i < targetPriorityCount && selectedForRequest.length < totalRequired; i++) {
                let priorityEmp = priorityEmployees.find(emp => 
                    !selectedForRequest.includes(String(emp.id))
                );
                
                if (priorityEmp) {
                    selectedForRequest.push(String(priorityEmp.id));
                    usedEmployeeIds.add(String(priorityEmp.id));
                    priorityUsed++;
                    console.log(`  - Added priority employee #${priorityUsed}: ${priorityEmp.name}`);
                } else {
                    console.log(`  - No more priority employees available (need ${targetPriorityCount - priorityUsed} more)`);
                    break;
                }
            }
        }

        // Phase 2: Fill gender requirements with any available employees
        // Fill required males
        let maleCount = 0;
        while (maleCount < requiredMale && selectedForRequest.length < totalRequired) {
            // Try to find male employee
            let maleEmp = sortedEmployees.find(emp => 
                emp.gender === 'male' && 
                !selectedForRequest.includes(String(emp.id)) &&
                !usedEmployeeIds.has(String(emp.id))
            );
            
            if (maleEmp) {
                selectedForRequest.push(String(maleEmp.id));
                usedEmployeeIds.add(String(maleEmp.id));
                maleCount++;
                if (maleEmp.has_priority) priorityUsed++;
                console.log(`  - Added male employee: ${maleEmp.name} ${maleEmp.has_priority ? '(priority)' : ''}`);
            } else {
                console.log(`  - No more male employees available`);
                break;
            }
        }

        // Fill required females
        let femaleCount = 0;
        while (femaleCount < requiredFemale && selectedForRequest.length < totalRequired) {
            // Try to find female employee
            let femaleEmp = sortedEmployees.find(emp => 
                emp.gender === 'female' && 
                !selectedForRequest.includes(String(emp.id)) &&
                !usedEmployeeIds.has(String(emp.id))
            );
            
            if (femaleEmp) {
                selectedForRequest.push(String(femaleEmp.id));
                usedEmployeeIds.add(String(femaleEmp.id));
                femaleCount++;
                if (femaleEmp.has_priority) priorityUsed++;
                console.log(`  - Added female employee: ${femaleEmp.name} ${femaleEmp.has_priority ? '(priority)' : ''}`);
            } else {
                console.log(`  - No more female employees available`);
                break;
            }
        }

        // Phase 3: Fill remaining slots with any available employees
        while (selectedForRequest.length < totalRequired) {
            // Find next available employee (prefer non-priority to maintain ratio)
            let nextEmp = null;
            
            // First try non-priority to maintain ratio
            if (isInspeksi && priorityUsed >= targetPriorityCount) {
                nextEmp = sortedEmployees.find(emp => 
                    !emp.has_priority &&
                    !selectedForRequest.includes(String(emp.id)) &&
                    !usedEmployeeIds.has(String(emp.id))
                );
            }
            
            // If no non-priority or need more priority, take any available
            if (!nextEmp) {
                nextEmp = sortedEmployees.find(emp => 
                    !selectedForRequest.includes(String(emp.id)) &&
                    !usedEmployeeIds.has(String(emp.id))
                );
            }
            
            if (nextEmp) {
                selectedForRequest.push(String(nextEmp.id));
                usedEmployeeIds.add(String(nextEmp.id));
                if (nextEmp.has_priority) priorityUsed++;
                console.log(`  - Added employee: ${nextEmp.name} ${nextEmp.has_priority ? '(priority)' : ''}`);
            } else {
                console.log(`  - No more employees available`);
                break;
            }
        }

        // Update available employees
        availableEmployees = availableEmployees.filter(
            (emp) => !selectedForRequest.includes(String(emp.id))
        );

        newBulkSelectedEmployees[requestId] = selectedForRequest.slice(0, totalRequired);
        
        // Final check
        const finalPriorityCount = selectedForRequest.filter(id => {
            const emp = getEmployeeDetails(id);
            return emp?.has_priority;
        }).length;
        
        console.log(`Request ${requestId} final: ${selectedForRequest.length}/${totalRequired} filled, ${finalPriorityCount} priority (target: ${targetPriorityCount})`);
    });

    setBulkSelectedEmployees(newBulkSelectedEmployees);
}, [
    selectedRequests,
    bulkSelectedEmployees,
    allSortedEligibleEmployees,
    sameSectionRequests,
    sortEmployeesForRequest,
    getEmployeeDetails,
    isInspeksiSection,
    calculateTargetPriorityCount,
]);

// Fixed Auto-fill all requests with simpler, more reliable logic
const handleAutoFillAll = useCallback(() => {
    if (selectedRequests.length === 0) return;

    const newBulkSelectedEmployees = {};
    const usedEmployeeIds = new Set();

    // Get all available employees
    const allAvailableEmployees = [...allSortedEligibleEmployees].filter(
        (emp) => emp.status === "available"
    );

    console.log(`Auto Fill All: ${allAvailableEmployees.length} available employees`);

    // Sort selected requests: Inspeksi first, then others
    const sortedSelectedRequests = [...selectedRequests].sort((a, b) => {
        const reqA = sameSectionRequests.find(req => String(req.id) === a);
        const reqB = sameSectionRequests.find(req => String(req.id) === b);
        
        // Current request first
        if (String(a) === String(currentRequest.id)) return -1;
        if (String(b) === String(currentRequest.id)) return 1;
        
        // Inspeksi requests before non-Inspeksi
        const isInspeksiA = reqA ? isInspeksiSection(reqA) : false;
        const isInspeksiB = reqB ? isInspeksiSection(reqB) : false;
        
        if (isInspeksiA && !isInspeksiB) return -1;
        if (!isInspeksiA && isInspeksiB) return 1;
        
        // Larger requests first (more likely to need priority employees)
        return (reqB?.requested_amount || 0) - (reqA?.requested_amount || 0);
    });

    sortedSelectedRequests.forEach((requestId) => {
        const request = sameSectionRequests.find(
            (req) => String(req.id) === requestId
        );
        if (!request) return;

        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;
        const totalRequired = request.requested_amount;
        const isInspeksi = isInspeksiSection(request);

        // Calculate target priority count (only for Inspeksi)
        const targetPriorityCount = isInspeksi ? 
            calculateTargetPriorityCount(totalRequired) : 0;

        // Get employees that haven't been used yet
        const availableEmployees = allAvailableEmployees.filter(
            (emp) => !usedEmployeeIds.has(String(emp.id))
        );

        // Sort available employees for this request
        const sortedEmployees = sortEmployeesForRequest(availableEmployees, request);

        const selectedForRequest = [];
        
        // Counters
        let priorityUsed = 0;
        let maleCount = 0;
        let femaleCount = 0;

        console.log(`Processing Request ${requestId}: ${totalRequired} total, ${targetPriorityCount} target priority (Inspeksi: ${isInspeksi})`);

        // PHASE 1: Fill priority slots for Inspeksi section
        if (isInspeksi && targetPriorityCount > 0) {
            console.log(`  Phase 1: Filling ${targetPriorityCount} priority slots`);
            
            // Get priority employees from sorted list
            const availablePriority = sortedEmployees.filter(emp => emp.has_priority);
            console.log(`  Available priority employees: ${availablePriority.length}`);
            
            // Take up to targetPriorityCount priority employees
            for (let i = 0; i < Math.min(targetPriorityCount, availablePriority.length) && selectedForRequest.length < totalRequired; i++) {
                const priorityEmp = availablePriority[i];
                selectedForRequest.push(String(priorityEmp.id));
                usedEmployeeIds.add(String(priorityEmp.id));
                priorityUsed++;
                
                // Update gender counts
                if (priorityEmp.gender === 'male') maleCount++;
                else if (priorityEmp.gender === 'female') femaleCount++;
                
                console.log(`  - Added priority ${i+1}: ${priorityEmp.name} (${priorityEmp.gender})`);
            }
        }

        // PHASE 2: Fill gender requirements
        console.log(`  Phase 2: Filling gender requirements (M: ${requiredMale}, F: ${requiredFemale})`);
        
        // Fill missing males
        while (maleCount < requiredMale && selectedForRequest.length < totalRequired) {
            // Find next male employee (any priority status)
            const maleEmp = sortedEmployees.find(emp => 
                emp.gender === 'male' && 
                !usedEmployeeIds.has(String(emp.id))
            );
            
            if (maleEmp) {
                selectedForRequest.push(String(maleEmp.id));
                usedEmployeeIds.add(String(maleEmp.id));
                maleCount++;
                if (maleEmp.has_priority) priorityUsed++;
                console.log(`  - Added male: ${maleEmp.name} ${maleEmp.has_priority ? '(priority)' : ''}`);
            } else {
                console.log(`  - No more male employees available`);
                break;
            }
        }

        // Fill missing females
        while (femaleCount < requiredFemale && selectedForRequest.length < totalRequired) {
            // Find next female employee (any priority status)
            const femaleEmp = sortedEmployees.find(emp => 
                emp.gender === 'female' && 
                !usedEmployeeIds.has(String(emp.id))
            );
            
            if (femaleEmp) {
                selectedForRequest.push(String(femaleEmp.id));
                usedEmployeeIds.add(String(femaleEmp.id));
                femaleCount++;
                if (femaleEmp.has_priority) priorityUsed++;
                console.log(`  - Added female: ${femaleEmp.name} ${femaleEmp.has_priority ? '(priority)' : ''}`);
            } else {
                console.log(`  - No more female employees available`);
                break;
            }
        }

        // PHASE 3: Fill remaining slots
        const remainingSlots = totalRequired - selectedForRequest.length;
        if (remainingSlots > 0) {
            console.log(`  Phase 3: Filling ${remainingSlots} remaining slots`);
            
            for (let i = 0; i < remainingSlots; i++) {
                // Prefer non-priority employees for Inspeksi if we've met priority target
                let nextEmp = null;
                
                if (isInspeksi && priorityUsed >= targetPriorityCount) {
                    // Try non-priority first to maintain ratio
                    nextEmp = sortedEmployees.find(emp => 
                        !emp.has_priority &&
                        !usedEmployeeIds.has(String(emp.id))
                    );
                }
                
                // If not found or not Inspeksi, take any available
                if (!nextEmp) {
                    nextEmp = sortedEmployees.find(emp => 
                        !usedEmployeeIds.has(String(emp.id))
                    );
                }
                
                if (nextEmp) {
                    selectedForRequest.push(String(nextEmp.id));
                    usedEmployeeIds.add(String(nextEmp.id));
                    if (nextEmp.has_priority) priorityUsed++;
                    console.log(`  - Added slot ${i+1}: ${nextEmp.name} ${nextEmp.has_priority ? '(priority)' : ''}`);
                } else {
                    console.log(`  - No more employees available for slot ${i+1}`);
                    break;
                }
            }
        }

        // Store the result
        newBulkSelectedEmployees[requestId] = selectedForRequest.slice(0, totalRequired);
        
        // Final statistics
        const filledCount = selectedForRequest.length;
        const finalPriorityCount = selectedForRequest.filter(id => {
            const emp = getEmployeeDetails(id);
            return emp?.has_priority;
        }).length;
        
        console.log(`Request ${requestId} COMPLETE: ${filledCount}/${totalRequired} filled`);
        console.log(`  Priority: ${finalPriorityCount} (target: ${targetPriorityCount})`);
        console.log(`  Gender: ${maleCount} male, ${femaleCount} female`);
        
        if (filledCount < totalRequired) {
            console.warn(`  WARNING: ${totalRequired - filledCount} slots unfilled!`);
        }
        
        if (isInspeksi && Math.abs(finalPriorityCount - targetPriorityCount) > 1) {
            console.warn(`  WARNING: Priority count ${finalPriorityCount} is far from target ${targetPriorityCount}`);
        }
    });

    // Final summary
    console.log('='.repeat(50));
    console.log('AUTO FILL ALL COMPLETE - SUMMARY');
    console.log('='.repeat(50));
    
    let totalRequested = 0;
    let totalFilled = 0;
    let totalPriorityUsed = 0;
    
    sortedSelectedRequests.forEach(requestId => {
        const request = sameSectionRequests.find(req => String(req.id) === requestId);
        if (!request) return;
        
        const filled = newBulkSelectedEmployees[requestId]?.length || 0;
        const priorityCount = newBulkSelectedEmployees[requestId]?.filter(id => {
            const emp = getEmployeeDetails(id);
            return emp?.has_priority;
        }).length || 0;
        
        totalRequested += request.requested_amount;
        totalFilled += filled;
        totalPriorityUsed += priorityCount;
        
        console.log(`Request ${requestId}: ${filled}/${request.requested_amount} filled, ${priorityCount} priority`);
    });
    
    console.log(`TOTAL: ${totalFilled}/${totalRequested} filled, ${totalPriorityUsed} priority employees used`);
    console.log('='.repeat(50));

    if (totalFilled < totalRequested) {
        alert(`Warning: Only ${totalFilled} of ${totalRequested} slots could be filled. There may not be enough available employees.`);
    }

    setBulkSelectedEmployees(newBulkSelectedEmployees);
}, [
    selectedRequests,
    allSortedEligibleEmployees,
    sameSectionRequests,
    getEmployeeDetails,
    sortEmployeesForRequest,
    isInspeksiSection,
    calculateTargetPriorityCount,
    currentRequest.id,
]);

    // Auto-fill on initial load for selected requests
    useEffect(() => {
        if (selectedRequests.length > 0) {
            const hasAnySelection = selectedRequests.some(
                (requestId) => bulkSelectedEmployees[requestId]?.length > 0
            );

            if (!hasAnySelection) {
                handleAutoFillAll();
            }
        }
    }, [selectedRequests]);

    // Move individual employee to different line
    const moveEmployeeToLine = useCallback(
        (requestId, employeeId, targetLine) => {
            setBulkSelectedEmployees((prev) => {
                const currentEmployees = prev[requestId] || [];
                const config = lineAssignmentConfig[requestId];

                if (!config || !config.enabled) return prev;

                const employeeIndex = currentEmployees.indexOf(employeeId);
                if (employeeIndex === -1) return prev;

                // Get current line of the employee
                const currentLine = getLineAssignment(requestId, employeeId);
                if (currentLine === targetLine.toString()) return prev; // Already in target line

                // Remove employee from current position
                const employeesWithoutTarget = currentEmployees.filter(
                    (id) => id !== employeeId
                );

                // Calculate target position based on line counts
                let targetIndex = 0;
                for (let line = 1; line < targetLine; line++) {
                    targetIndex += config.lineCounts[line - 1] || 0;
                }

                // Insert at target position
                const newEmployees = [
                    ...employeesWithoutTarget.slice(0, targetIndex),
                    employeeId,
                    ...employeesWithoutTarget.slice(targetIndex),
                ];

                return {
                    ...prev,
                    [requestId]: newEmployees,
                };
            });

            // Update line counts to reflect the move
            setLineAssignmentConfig((prev) => {
                const config = prev[requestId];
                if (!config || !config.enabled) return prev;

                const currentLine = getLineAssignment(requestId, employeeId);
                if (currentLine === targetLine.toString()) return prev;

                const newLineCounts = [...config.lineCounts];

                // Decrease count in current line
                const currentLineIndex = parseInt(currentLine) - 1;
                if (newLineCounts[currentLineIndex] > 0) {
                    newLineCounts[currentLineIndex]--;
                }

                // Increase count in target line
                const targetLineIndex = targetLine - 1;
                newLineCounts[targetLineIndex]++;

                return {
                    ...prev,
                    [requestId]: {
                        ...config,
                        lineCounts: newLineCounts,
                    },
                };
            });
        },
        [lineAssignmentConfig]
    );

    // Adjust line count directly (increase/decrease number of employees in a line)
    const adjustLineCount = useCallback(
        (requestId, lineNumber, adjustment) => {
            setLineAssignmentConfig((prev) => {
                const config = prev[requestId];
                if (!config || !config.enabled) return prev;

                const request = sameSectionRequests.find(
                    (req) => String(req.id) === requestId
                );
                if (!request) return prev;

                const newLineCounts = [...config.lineCounts];
                const newCount = newLineCounts[lineNumber - 1] + adjustment;

                // Validate the adjustment
                const totalAssigned =
                    bulkSelectedEmployees[requestId]?.length || 0;
                const currentTotalDistributed = newLineCounts.reduce(
                    (sum, count) => sum + count,
                    0
                );

                // Check if adjustment is valid
                if (newCount < 0) return prev; // Can't go below 0
                if (currentTotalDistributed + adjustment > totalAssigned) {
                    // Can't distribute more than assigned employees
                    return prev;
                }

                newLineCounts[lineNumber - 1] = newCount;

                return {
                    ...prev,
                    [requestId]: {
                        ...config,
                        lineCounts: newLineCounts,
                    },
                };
            });
        },
        [sameSectionRequests, bulkSelectedEmployees]
    );

    // Handle line assignment configuration
    const handleLineConfigChange = useCallback(
        (requestId, enabled) => {
            const request = sameSectionRequests.find(
                (req) => String(req.id) === requestId
            );
            if (!request) return;

            setLineAssignmentConfig((prev) => ({
                ...prev,
                [requestId]: {
                    enabled,
                    lineCount: 2, // Default to 2 lines
                    lineCounts: enabled
                        ? calculateLineCounts(request.requested_amount, 2)
                        : [],
                },
            }));
        },
        [sameSectionRequests]
    );

    // Handle line count change
    const handleLineCountChange = useCallback(
        (requestId, lineCount) => {
            const request = sameSectionRequests.find(
                (req) => String(req.id) === requestId
            );
            if (!request) return;

            setLineAssignmentConfig((prev) => ({
                ...prev,
                [requestId]: {
                    ...prev[requestId],
                    lineCount: parseInt(lineCount),
                    lineCounts: calculateLineCounts(
                        request.requested_amount,
                        parseInt(lineCount)
                    ),
                },
            }));
        },
        [sameSectionRequests]
    );

    // Calculate line counts based on total employees and number of lines
    const calculateLineCounts = useCallback((totalEmployees, lineCount) => {
        const baseCount = Math.floor(totalEmployees / lineCount);
        const remainder = totalEmployees % lineCount;

        const counts = Array(lineCount).fill(baseCount);
        for (let i = 0; i < remainder; i++) {
            counts[i]++;
        }

        return counts;
    }, []);

    // Get line assignment for an employee
    const getLineAssignment = useCallback(
        (requestId, employeeId) => {
            const employees = bulkSelectedEmployees[requestId] || [];
            const config = lineAssignmentConfig[requestId];
            if (!config || !config.enabled) return "1";

            const index = employees.indexOf(employeeId);
            if (index === -1) return "1";

            // Distribute employees across lines based on line counts
            let cumulative = 0;
            for (let line = 0; line < config.lineCount; line++) {
                cumulative += config.lineCounts[line];
                if (index < cumulative) {
                    return (line + 1).toString();
                }
            }

            return "1";
        },
        [bulkSelectedEmployees, lineAssignmentConfig]
    );

    // Get employees by line
    const getEmployeesByLine = useCallback(
        (requestId, lineNumber) => {
            const employees = bulkSelectedEmployees[requestId] || [];
            const config = lineAssignmentConfig[requestId];
            if (!config || !config.enabled) return [];

            return employees.filter((employeeId, index) => {
                let cumulative = 0;
                for (let line = 0; line < config.lineCount; line++) {
                    cumulative += config.lineCounts[line];
                    if (index < cumulative) {
                        return line + 1 === lineNumber;
                    }
                }
                return false;
            });
        },
        [bulkSelectedEmployees, lineAssignmentConfig]
    );

    // Check if a request is a putway request
    const isPutwayRequest = useCallback((request) => {
        return request?.sub_section?.name?.toLowerCase() === "putway";
    }, []);

    // Calculate assignment statistics
    const assignmentStats = useMemo(() => {
        const stats = {
            totalSelected: 0,
            totalAssigned: 0,
            fullyAssignedRequests: 0,
            inspeksiRequests: 0,
            nonInspeksiRequests: 0,
        };

        selectedRequests.forEach((requestId) => {
            const request = sameSectionRequests.find(
                (req) => String(req.id) === requestId
            );
            if (request) {
                const employees = bulkSelectedEmployees[requestId] || [];
                const assignedCount = employees.length;

                stats.totalSelected += request.requested_amount;
                stats.totalAssigned += assignedCount;

                if (assignedCount === request.requested_amount) {
                    stats.fullyAssignedRequests++;
                }

                if (isInspeksiSection(request)) {
                    stats.inspeksiRequests++;
                } else {
                    stats.nonInspeksiRequests++;
                }
            }
        });

        return stats;
    }, [selectedRequests, bulkSelectedEmployees, sameSectionRequests, isInspeksiSection]);

    // Check if all selected requests are fully assigned
    const allRequestsFullyAssigned = useMemo(() => {
        return selectedRequests.every((requestId) => {
            const request = sameSectionRequests.find(
                (req) => String(req.id) === requestId
            );
            const employees = bulkSelectedEmployees[requestId] || [];
            return request && employees.length === request.requested_amount;
        });
    }, [selectedRequests, bulkSelectedEmployees, sameSectionRequests]);

    // Handle bulk fulfillment submission
    const handleBulkSubmit = useCallback(async () => {
        if (selectedRequests.length === 0 || !allRequestsFullyAssigned) {
            alert("Please select requests and ensure all are fully assigned");
            return;
        }

        setProcessing(true);

        try {
            const bulkData = {};
            const lineAssignments = {};

            selectedRequests.forEach((requestId) => {
                const employees = bulkSelectedEmployees[requestId] || [];
                const enableLineAssignment =
                    lineAssignmentConfig[requestId]?.enabled || false;

                bulkData[requestId] = employees;

                if (enableLineAssignment) {
                    lineAssignments[requestId] = {};
                    employees.forEach((employeeId) => {
                        lineAssignments[requestId][employeeId] =
                            getLineAssignment(requestId, employeeId);
                    });
                }
            });

            await router.post(
                route("manpower-requests.bulk-fulfill"),
                {
                    request_ids: selectedRequests,
                    employee_selections: bulkData,
                    strategy: strategy,
                    visibility: visibility,
                    status: "pending",
                    enable_line_assignment: Object.values(
                        lineAssignmentConfig
                    ).some((config) => config.enabled),
                    line_assignments: lineAssignments,
                },
                {
                    onSuccess: () => {
                        setSelectedRequests([]);
                        setBulkSelectedEmployees({});
                        setLineAssignmentConfig({});
                        router.visit(route("manpower-requests.index"));
                    },
                    onError: (errors) => {
                        alert(
                            errors.message ||
                                "Terjadi kesalahan saat memproses bulk fulfillment"
                        );
                    },
                }
            );
        } catch (error) {
            alert("Terjadi kesalahan saat memproses bulk fulfillment");
        } finally {
            setProcessing(false);
        }
    }, [
        selectedRequests,
        bulkSelectedEmployees,
        strategy,
        visibility,
        lineAssignmentConfig,
        allRequestsFullyAssigned,
    ]);

    const getSubSectionIdFromRequest = useCallback((request) => {
        if (!request) return null;

        const subSectionId =
            request.sub_section?.id ||
            request.sub_section_id ||
            request.subSection?.id;

        return subSectionId ? String(subSectionId) : null;
    }, []);

    const getCurrentModalRequest = useCallback(() => {
        let targetRequest;

        if (!activeRequestId) {
            targetRequest = currentRequest;
        } else {
            targetRequest =
                sameSectionRequests.find(
                    (req) => String(req.id) === activeRequestId
                ) || currentRequest;
        }

        const subSectionId = getSubSectionIdFromRequest(targetRequest);

        return {
            ...targetRequest,
            sub_section_id: subSectionId,
            sub_section: targetRequest.sub_section || { id: subSectionId },
        };
    }, [
        activeRequestId,
        currentRequest,
        sameSectionRequests,
        getSubSectionIdFromRequest,
    ]);

    // Get selected employees for the active request in modal
    const getSelectedIdsForModal = useCallback(() => {
        if (!activeRequestId) return [];
        return bulkSelectedEmployees[activeRequestId] || [];
    }, [activeRequestId, bulkSelectedEmployees]);

    // Toggle full screen mode
    const toggleFullScreen = useCallback(() => {
        setIsFullScreen((prev) => !prev);
    }, []);

    // Render line assignment preview with individual employee movement
    const renderLineAssignmentPreview = useCallback(
        (
            requestId,
            assignedEmployees,
            enableLineAssignment,
            lineCount,
            isPutway
        ) => {
            if (!enableLineAssignment && !isPutway) return null;

            const config = lineAssignmentConfig[requestId];
            if (!config) return null;

            const totalAssigned = assignedEmployees.length;
            const totalDistributed = config.lineCounts.reduce(
                (sum, count) => sum + count,
                0
            );

            return (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h6 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2">
                        Distribusi Karyawan per Line:
                    </h6>

                    {/* Line Count Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700 mb-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-700 dark:text-blue-300">
                                Total Karyawan Terdistribusi:
                            </span>
                            <span className="font-bold text-blue-800 dark:text-blue-200">
                                {totalDistributed} / {totalAssigned}
                            </span>
                        </div>
                        {totalDistributed !== totalAssigned && (
                            <div className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                                ⚠️ Jumlah distribusi tidak sesuai dengan total
                                karyawan
                            </div>
                        )}
                    </div>

                    {/* Line Controls and Employee Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: lineCount }).map(
                            (_, lineIndex) => {
                                const lineNumber = lineIndex + 1;
                                const currentCount =
                                    config.lineCounts[lineIndex] || 0;
                                const lineEmployees = getEmployeesByLine(
                                    requestId,
                                    lineNumber
                                );

                                return (
                                    <div
                                        key={lineIndex}
                                        className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-700"
                                    >
                                        <div className="font-medium text-purple-700 dark:text-purple-300 mb-2 flex justify-between items-center">
                                            <span>Line {lineNumber}</span>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        adjustLineCount(
                                                            requestId,
                                                            lineNumber,
                                                            -1
                                                        );
                                                    }}
                                                    disabled={currentCount <= 0}
                                                    className="w-6 h-6 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded text-sm flex items-center justify-center"
                                                    title="Kurangi 1 slot"
                                                >
                                                    -
                                                </button>
                                                <span className="text-lg font-bold min-w-8 text-center">
                                                    {currentCount}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        adjustLineCount(
                                                            requestId,
                                                            lineNumber,
                                                            1
                                                        );
                                                    }}
                                                    disabled={
                                                        totalDistributed >=
                                                        totalAssigned
                                                    }
                                                    className="w-6 h-6 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded text-sm flex items-center justify-center"
                                                    title="Tambah 1 slot"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Employee List with Movement Controls */}
                                        <div className="mt-2 max-h-48 overflow-y-auto">
                                            {lineEmployees.map((id, idx) => {
                                                const emp =
                                                    getEmployeeDetails(id);
                                                return emp ? (
                                                    <div
                                                        key={id}
                                                        className="flex items-center justify-between text-purple-600 dark:text-purple-400 py-1 text-xs border-b border-purple-100 dark:border-purple-700 last:border-b-0"
                                                    >
                                                        <div className="truncate flex-1">
                                                            {idx + 1}.{" "}
                                                            {emp.name} (
                                                            {emp.gender ===
                                                            "female"
                                                                ? "P"
                                                                : "L"}
                                                            )
                                                            {emp.has_priority && (
                                                                <span className="ml-1 text-yellow-600">⭐</span>
                                                            )}
                                                        </div>
                                                        <div className="flex space-x-1 ml-2">
                                                            {lineCount > 1 &&
                                                                Array.from({
                                                                    length: lineCount,
                                                                }).map(
                                                                    (
                                                                        _,
                                                                        targetLineIndex
                                                                    ) => {
                                                                        const targetLine =
                                                                            targetLineIndex +
                                                                            1;
                                                                        if (
                                                                            targetLine ===
                                                                            lineNumber
                                                                        )
                                                                            return null;

                                                                        return (
                                                                            <button
                                                                                key={
                                                                                    targetLine
                                                                                }
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    moveEmployeeToLine(
                                                                                        requestId,
                                                                                        id,
                                                                                        targetLine
                                                                                    );
                                                                                }}
                                                                                className="w-5 h-5 bg-purple-400 hover:bg-purple-500 text-white rounded text-xs flex items-center justify-center"
                                                                                title={`Pindah ke Line ${targetLine}`}
                                                                            >
                                                                                →
                                                                                {
                                                                                    targetLine
                                                                                }
                                                                            </button>
                                                                        );
                                                                    }
                                                                )}
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                            {lineEmployees.length === 0 && (
                                                <div className="text-purple-400 dark:text-purple-500 text-xs italic py-1">
                                                    Belum ada karyawan
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>

                    {/* Quick Distribution Controls */}
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                        <h6 className="font-medium text-green-700 dark:text-green-300 text-sm mb-2">
                            Distribusi Cepat:
                        </h6>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Equal distribution
                                    const equalCounts = calculateLineCounts(
                                        totalAssigned,
                                        lineCount
                                    );
                                    setLineAssignmentConfig((prev) => ({
                                        ...prev,
                                        [requestId]: {
                                            ...prev[requestId],
                                            lineCounts: equalCounts,
                                        },
                                    }));
                                }}
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                            >
                                ⚖️ Distribusi Merata
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Reset to default distribution
                                    const request = sameSectionRequests.find(
                                        (req) => String(req.id) === requestId
                                    );
                                    if (!request) return;

                                    const defaultCounts = calculateLineCounts(
                                        request.requested_amount,
                                        lineCount
                                    );
                                    setLineAssignmentConfig((prev) => ({
                                        ...prev,
                                        [requestId]: {
                                            ...prev[requestId],
                                            lineCounts: defaultCounts,
                                        },
                                    }));
                                }}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                            >
                                🔄 Reset Default
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Focus on first line
                                    const newCounts = Array(lineCount).fill(0);
                                    newCounts[0] = totalAssigned;
                                    setLineAssignmentConfig((prev) => ({
                                        ...prev,
                                        [requestId]: {
                                            ...prev[requestId],
                                            lineCounts: newCounts,
                                        },
                                    }));
                                }}
                                className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs"
                            >
                                🎯 Semua di Line 1
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Split between first two lines
                                    const newCounts = Array(lineCount).fill(0);
                                    const half = Math.ceil(totalAssigned / 2);
                                    newCounts[0] = half;
                                    newCounts[1] = totalAssigned - half;
                                    setLineAssignmentConfig((prev) => ({
                                        ...prev,
                                        [requestId]: {
                                            ...prev[requestId],
                                            lineCounts: newCounts,
                                        },
                                    }));
                                }}
                                className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs"
                            >
                                🪓 Bagi Dua
                            </button>
                        </div>
                    </div>
                </div>
            );
        },
        [
            getEmployeesByLine,
            getEmployeeDetails,
            moveEmployeeToLine,
            adjustLineCount,
            lineAssignmentConfig,
            sameSectionRequests,
            calculateLineCounts,
        ]
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    {/* Fixed: Changed from h2 to div to fix HTML validation */}
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-xl">
                        Bulk Fulfillment -{" "}
                        {currentRequest.sub_section?.section?.name ||
                            "Same Section"}
                    </div>
                </div>
            }
            user={auth.user}
        >
            <div
                className={`mx-auto mt-6 ${
                    isFullScreen ? "max-w-full px-4" : "max-w-7xl"
                }`}
            >
                {/* Header Section */}
                <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-100 dark:to-indigo-900/20 shadow-lg mb-6 p-6 border border-blue-200 dark:border-blue-700 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div className="flex items-start">
                            <div className="bg-blue-100 dark:bg-blue-800/40 mr-0 sm:mr-4 mb-3 sm:mb-0 p-3 rounded-full">
                                <svg
                                    className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400"
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
                            </div>
                            <div>
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-xl sm:text-2xl">
                                    Bulk Fulfillment
                                </h3>
                                <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                                    Penuhi semua request untuk section "
                                    {currentRequest.sub_section?.section?.name}"
                                    secara sekaligus
                                </p>
                                <p className="text-blue-500 dark:text-blue-300 text-xs sm:text-sm mt-1">
                                    {isCurrentRequestInspeksi ? (
                                        "Prioritas: Priority Employees → Subsection Exact → Section Sama → ML Score"
                                    ) : (
                                        "Prioritas: Subsection Exact → Section Sama → ML Score"
                                    )}
                                </p>
                                {isCurrentRequestInspeksi && (
                                    <p className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm mt-1">
                                        * Priority ratio system aktif untuk section Inspeksi (1:3 ratio)
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={toggleFullScreen}
                            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center space-x-2 transition-colors"
                        >
                            {isFullScreen ? (
                                <>
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
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    <span>Tutup Full Screen</span>
                                </>
                            ) : (
                                <>
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
                                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                        />
                                    </svg>
                                    <span>Full Screen</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="bg-red-100 dark:bg-red-900/20 mb-6 p-4 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
                        <p className="font-semibold">Error:</p>
                        <p>{message}</p>
                    </div>
                )}

                {/* Summary and Controls - Hidden in Full Screen */}
                {!isFullScreen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Summary Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h4 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                📊 Ringkasan
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Total Request Tersedia:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {sameSectionRequests.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Request Terpilih:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {selectedRequests.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Inspeksi Requests:
                                    </span>
                                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                        {assignmentStats.inspeksiRequests}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Non-Inspeksi Requests:
                                    </span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {assignmentStats.nonInspeksiRequests}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Karyawan Terisi:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {assignmentStats.totalAssigned} /{" "}
                                        {assignmentStats.totalSelected}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Request Terisi Penuh:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {assignmentStats.fullyAssignedRequests}{" "}
                                        / {selectedRequests.length}
                                    </span>
                                </div>
                                {selectedRequests.length > 0 && (
                                    <div className="flex justify-between">
                                        <span
                                            className={`${
                                                allRequestsFullyAssigned
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-yellow-600 dark:text-yellow-400"
                                            }`}
                                        >
                                            Status:
                                        </span>
                                        <span
                                            className={`font-medium ${
                                                allRequestsFullyAssigned
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-yellow-600 dark:text-yellow-400"
                                            }`}
                                        >
                                            {allRequestsFullyAssigned
                                                ? "✅ Siap Diproses"
                                                : "⚠️ Periksa Penugasan"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h4 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                ⚙️ Pengaturan
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                        Strategi Auto-fill:
                                    </label>
                                    <select
                                        value={strategy}
                                        onChange={(e) =>
                                            setStrategy(e.target.value)
                                        }
                                        className="bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full text-gray-900 dark:text-gray-100 text-sm"
                                    >
                                        <option value="optimal">
                                            Optimal ({isCurrentRequestInspeksi ? "Priority → " : ""}Subsection → ML Score)
                                        </option>
                                        <option value="same_section">
                                            Prioritas Section Sama
                                        </option>
                                        <option value="balanced">
                                            Beban Kerja Merata
                                        </option>
                                    </select>
                                    {isCurrentRequestInspeksi && (
                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                            * Priority ratio (1:3) akan diterapkan untuk Inspeksi requests
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                        Visibility:
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="private"
                                                checked={
                                                    visibility === "private"
                                                }
                                                onChange={() =>
                                                    setVisibility("private")
                                                }
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                                                Private
                                            </span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="public"
                                                checked={
                                                    visibility === "public"
                                                }
                                                onChange={() =>
                                                    setVisibility("public")
                                                }
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                                                Public
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleAutoFill}
                                        disabled={selectedRequests.length === 0}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${
                                            selectedRequests.length === 0
                                                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                                                : "bg-green-600 hover:bg-green-700 text-white"
                                        }`}
                                    >
                                        Auto Fill Selected
                                    </button>
                                    <button
                                        onClick={handleAutoFillAll}
                                        disabled={selectedRequests.length === 0}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${
                                            selectedRequests.length === 0
                                                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-700 text-white"
                                        }`}
                                    >
                                        {isCurrentRequestInspeksi 
                                            ? "Auto Fill All (Priority Ratio)"
                                            : "Auto Fill All"}
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
                )}

                {/* Requests List */}
                <div className="bg-white dark:bg-gray-800 mb-6 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                            Daftar Request untuk Section "
                            {currentRequest.sub_section?.section?.name}"
                        </h4>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedRequests.length} of{" "}
                                {sameSectionRequests.length} selected
                            </span>
                            <button
                                onClick={handleSelectAll}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                            >
                                Select All
                            </button>
                            {isFullScreen && (
                                <button
                                    onClick={toggleFullScreen}
                                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded flex items-center space-x-1"
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
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    <span>Tutup Full Screen</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        className={`space-y-4 ${
                            isFullScreen
                                ? "max-h-screen overflow-y-auto"
                                : "max-h-96 overflow-y-auto"
                        }`}
                    >
                        {sameSectionRequests.length > 0 ? (
                            sameSectionRequests.map((request) => {
                                const requestId = String(request.id);
                                const isSelected =
                                    selectedRequests.includes(requestId);
                                const isCurrentRequest =
                                    requestId === String(currentRequest.id);
                                const isInspeksi = isInspeksiSection(request);
                                const assignedEmployees =
                                    bulkSelectedEmployees[requestId] || [];
                                const config =
                                    lineAssignmentConfig[requestId] || {};
                                const enableLineAssignment =
                                    config.enabled || false;
                                const lineCount = config.lineCount || 2;
                                const isPutway = isPutwayRequest(request);

                                return (
                                    <div
                                        key={requestId}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                                                : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                        } ${
                                            isCurrentRequest
                                                ? "ring-2 ring-yellow-400"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start space-x-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleRequestSelection(
                                                            requestId
                                                        )
                                                    }
                                                    className="mt-1 cursor-pointer"
                                                />
                                                <div
                                                    className="flex-1 cursor-default"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {request.shift
                                                                ?.name ||
                                                                "No Shift"}{" "}
                                                            -{" "}
                                                            {
                                                                request.requested_amount
                                                            }{" "}
                                                            orang
                                                        </div>
                                                        <span className="bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                                                            {request.sub_section?.name}
                                                        </span>
                                                        {isCurrentRequest && (
                                                            <span className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded-full text-yellow-800 dark:text-yellow-200 text-xs">
                                                                Current Request
                                                            </span>
                                                        )}
                                                        {isInspeksi && (
                                                            <span className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded-full text-yellow-800 dark:text-yellow-200 text-xs">
                                                                Inspeksi (Priority)
                                                            </span>
                                                        )}
                                                        {(isPutway ||
                                                            enableLineAssignment) && (
                                                            <span className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-full text-purple-800 dark:text-purple-200 text-xs">
                                                                Line Assignment
                                                                ({lineCount}{" "}
                                                                lines)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-gray-600 dark:text-gray-400 mb-2">
                                                                <strong>
                                                                    Kebutuhan
                                                                    Gender:
                                                                </strong>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {request.male_count > 0 && (
                                                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                                                                        Laki:{" "}
                                                                        {request.male_count}
                                                                    </span>
                                                                )}
                                                                {request.female_count > 0 && (
                                                                    <span className="bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 px-2 py-1 rounded text-xs">
                                                                        Perempuan:{" "}
                                                                        {request.female_count}
                                                                    </span>
                                                                )}
                                                                <span className="bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                                                                    Total:{" "}
                                                                    {request.requested_amount}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="text-gray-600 dark:text-gray-400 mb-2">
                                                                <strong>
                                                                    Progress
                                                                    Penugasan:
                                                                </strong>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                                    <div
                                                                        className="bg-green-500 h-2 rounded-full transition-all"
                                                                        style={{
                                                                            width: `${(assignedEmployees.length / request.requested_amount) * 100}%`,
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                    {assignedEmployees.length}
                                                                    /
                                                                    {request.requested_amount}
                                                                </span>
                                                            </div>
                                                            {isInspeksi && (
                                                                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                                                                    Priority employees: {assignedEmployees.filter(id => {
                                                                        const emp = getEmployeeDetails(id);
                                                                        return emp?.has_priority;
                                                                    }).length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Employee Selection */}
                                        {isSelected && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h5 className="font-medium text-gray-700 dark:text-gray-300">
                                                        Karyawan Terpilih:
                                                    </h5>
                                                    <div className="flex items-center space-x-2">
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded-full ${
                                                                assignedEmployees.length ===
                                                                request.requested_amount
                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                            }`}
                                                        >
                                                            {assignedEmployees.length}{" "}
                                                            /{" "}
                                                            {request.requested_amount}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEmployeeModal(
                                                                    requestId
                                                                );
                                                            }}
                                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors cursor-pointer"
                                                        >
                                                            📋 Pilih Multiple
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {Array.from({
                                                        length: request.requested_amount,
                                                    }).map((_, index) => {
                                                        const employeeId =
                                                            assignedEmployees[
                                                                index
                                                            ];
                                                        const employee =
                                                            employeeId
                                                                ? getEmployeeDetails(
                                                                      employeeId
                                                                  )
                                                                : null;
                                                        const lineAssignment =
                                                            (isPutway ||
                                                                enableLineAssignment) &&
                                                            employee
                                                                ? getLineAssignment(
                                                                      requestId,
                                                                      employeeId
                                                                  )
                                                                : null;

                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`p-3 rounded border ${
                                                                    employee
                                                                        ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                                                                        : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                                        #{" "}
                                                                        {index + 1}
                                                                        {lineAssignment && (
                                                                            <span className="ml-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded text-xs">
                                                                                Line{" "}
                                                                                {lineAssignment}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {employee && (
                                                                        <span
                                                                            className={`text-xs px-1 rounded ${employee.gender === "female"
                                                                                    ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                                                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                                                }`}
                                                                        >
                                                                            {employee.gender ===
                                                                            "female"
                                                                                ? "P"
                                                                                : "L"}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {employee ? (
                                                                    <div className="mb-2">
                                                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                                                            {employee.name}
                                                                            {employee.has_priority && (
                                                                                <span className="ml-1 text-yellow-600">⭐</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                                                            {employee.type}{" "}
                                                                            -{" "}
                                                                            {employee
                                                                                .subSections?.[0]
                                                                                ?.name ||
                                                                                "-"}
                                                                        </div>
                                                                        <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                                                            ML
                                                                            Score:{" "}
                                                                            {((employee.final_score || 0) * 100).toFixed(1)}%
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-gray-500 dark:text-gray-400 text-xs italic mb-2">
                                                                        Belum
                                                                        dipilih
                                                                    </div>
                                                                )}

                                                                <div className="flex space-x-2">
                                                                    {employee ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    // Open employee modal to change this employee
                                                                                    openEmployeeModal(
                                                                                        requestId,
                                                                                        index
                                                                                    );
                                                                                }}
                                                                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-1 rounded text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                Ganti
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    handleEmployeeSelect(
                                                                                        requestId,
                                                                                        employeeId
                                                                                    );
                                                                                }}
                                                                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                Hapus
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(
                                                                                e
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                // Open employee selection modal for this specific slot
                                                                                openEmployeeModal(
                                                                                    requestId,
                                                                                    index
                                                                                );
                                                                            }}
                                                                            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 py-1 rounded text-gray-700 dark:text-gray-300 text-xs transition-colors cursor-pointer"
                                                                        >
                                                                            Pilih
                                                                            Karyawan
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Enhanced Line Assignment Preview with Individual Employee Movement */}
                                                {renderLineAssignmentPreview(
                                                    requestId,
                                                    assignedEmployees,
                                                    enableLineAssignment,
                                                    lineCount,
                                                    isPutway
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center">
                                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">
                                    📋
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Tidak ada request untuk section ini pada
                                    tanggal yang sama.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {selectedRequests.length} request terpilih • 
                        {assignmentStats.totalAssigned} dari{" "}
                        {assignmentStats.totalSelected} karyawan terisi •
                        {assignmentStats.inspeksiRequests > 0 && (
                            <span className="text-yellow-600 ml-2">
                                {assignmentStats.inspeksiRequests} Inspeksi
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleBulkSubmit}
                        disabled={
                            processing ||
                            selectedRequests.length === 0 ||
                            !allRequestsFullyAssigned
                        }
                        className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors w-full sm:w-auto ${
                            processing ||
                            selectedRequests.length === 0 ||
                            !allRequestsFullyAssigned
                                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        }`}
                    >
                        {processing ? (
                            <span className="flex items-center justify-center">
                                <svg
                                    className="mr-2 w-4 h-4 text-white animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Memproses...
                            </span>
                        ) : (
                            `Penuhi ${selectedRequests.length} Request`
                        )}
                    </button>
                </div>
            </div>

            {/* Employee Modal */}
            <EmployeeModal
                showModal={showEmployeeModal}
                setShowModal={setShowEmployeeModal}
                request={getCurrentModalRequest()}
                allSortedEligibleEmployees={allSortedEligibleEmployees}
                selectedIds={getSelectedIdsForModal()}
                selectNewEmployee={handleSelectNewEmployee}
                handleMultiSelect={handleMultiSelect}
                multiSelectMode={multiSelectMode}
                toggleMultiSelectMode={toggleMultiSelectMode}
                isBulkMode={true}
                isLoading={false}
                activeBulkRequest={activeRequestId}
                bulkRequests={sameSectionRequests.filter((req) =>
                    selectedRequests.includes(String(req.id))
                )}
                bulkSelectedEmployees={bulkSelectedEmployees}
                onBulkEmployeeSelect={handleEmployeeSelect}
                lineAssignmentConfig={lineAssignmentConfig}
                getLineAssignment={getLineAssignment}
                showPriorityStars={isInspeksiSection(getCurrentModalRequest())}
            />
        </AuthenticatedLayout>
    );
}