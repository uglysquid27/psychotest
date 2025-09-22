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
import BulkFulfillmentPanel from './components/BulkFulfillmentPanel';

export default function Fulfill({
    request,
    sameSubSectionEmployees,
    otherSubSectionEmployees,
    currentScheduledIds = [],
    sameDayRequests = [],
    message,
    auth
}) {
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

    // Check if this is a putway subsection for line assignments
    const isPutwaySubsection = useMemo(() => {
        return request?.sub_section?.name?.toLowerCase() === 'putway' ||
            request?.subSection?.name?.toLowerCase() === 'putway';
    }, [request]);

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

    const canReviseFulfilledRequest = useMemo(() => {
        if (request.status === 'fulfilled') {
            // Check if there are any pending schedules
            const hasPendingSchedules = request.schedules?.some(schedule =>
                schedule.status === 'pending'
            );

            // Or check if any employees have rejected
            const hasRejectedEmployees = request.schedules?.some(schedule =>
                schedule.employee?.status === 'rejected' || schedule.status === 'rejected'
            );

            return hasPendingSchedules || hasRejectedEmployees;
        }
        return false;
    }, [request]);

    const combinedEmployees = useMemo(() => {
        return [
            ...sameSubSectionEmployees.map(emp => ({
                ...emp,
                subSections: emp.sub_sections_data || emp.sub_sections || [],
                gender: normalizeGender(emp.gender),
                originalGender: emp.gender,
                isCurrentlyScheduled: currentScheduledIds.includes(emp.id)
            })),
            ...otherSubSectionEmployees.map(emp => ({
                ...emp,
                subSections: emp.sub_sections_data || emp.sub_sections || [],
                gender: normalizeGender(emp.gender),
                originalGender: emp.gender,
                isCurrentlyScheduled: currentScheduledIds.includes(emp.id)
            }))
        ];
    }, [sameSubSectionEmployees, otherSubSectionEmployees, currentScheduledIds]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            if (a.isCurrentlyScheduled !== b.isCurrentlyScheduled) {
                return a.isCurrentlyScheduled ? -1 : 1;
            }

            // PRIORITIZE SAME SUBSECTION
            const aIsSame = a.subSections.some(ss => String(ss.id) === String(request.sub_section_id));
            const bIsSame = b.subSections.some(ss => String(ss.id) === String(request.sub_section_id));

            if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;

            const aTotalScore = (a.workload_points || 0) + (a.blind_test_points || 0) + (a.average_rating || 0);
            const bTotalScore = (b.workload_points || 0) + (b.blind_test_points || 0) + (b.average_rating || 0);

            const aGenderMatch = request.male_count > 0 && a.gender === 'male' ? 0 :
                request.female_count > 0 && a.gender === 'female' ? 0 : 1;
            const bGenderMatch = request.male_count > 0 && b.gender === 'male' ? 0 :
                request.female_count > 0 && b.gender === 'female' ? 0 : 1;
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
    }, [combinedEmployees, request.sub_section_id, request.male_count, request.female_count]);

    const initialSelectedIds = useMemo(() => {
        const validCurrentIds = currentScheduledIds.filter(id =>
            allSortedEligibleEmployees.some(e => e.id === id)
        );

        if (validCurrentIds.length > 0) {
            if (validCurrentIds.length < request.requested_amount) {
                const remainingCount = request.requested_amount - validCurrentIds.length;

                // PRIORITIZE SAME SUBSECTION FIRST
                const remainingSameSubSection = allSortedEligibleEmployees
                    .filter(e =>
                        !validCurrentIds.includes(e.id) &&
                        e.subSections.some(ss => ss.id === request.sub_section_id)
                    )
                    .slice(0, remainingCount)
                    .map(e => e.id);

                if (remainingSameSubSection.length >= remainingCount) {
                    return [...validCurrentIds, ...remainingSameSubSection];
                }

                // If not enough same subsection, get from other subsections
                const remainingOtherSubSection = allSortedEligibleEmployees
                    .filter(e =>
                        !validCurrentIds.includes(e.id) &&
                        !e.subSections.some(ss => ss.id === request.sub_section_id)
                    )
                    .slice(0, remainingCount - remainingSameSubSection.length)
                    .map(e => e.id);

                return [...validCurrentIds, ...remainingSameSubSection, ...remainingOtherSubSection];
            }
            return validCurrentIds.slice(0, request.requested_amount);
        }

        // Rest of the logic remains but ensure same subsection priority
        const requiredMale = request.male_count || 0;
        const requiredFemale = request.female_count || 0;
        const totalRequired = requiredMale + requiredFemale;

        // Get employees from same subsection first
        const sameSubMales = allSortedEligibleEmployees
            .filter(e => e.gender === 'male' && e.subSections.some(ss => ss.id === request.sub_section_id));

        const sameSubFemales = allSortedEligibleEmployees
            .filter(e => e.gender === 'female' && e.subSections.some(ss => ss.id === request.sub_section_id));

        // Then from other subsections
        const otherSubMales = allSortedEligibleEmployees
            .filter(e => e.gender === 'male' && !e.subSections.some(ss => ss.id === request.sub_section_id));

        const otherSubFemales = allSortedEligibleEmployees
            .filter(e => e.gender === 'female' && !e.subSections.some(ss => ss.id === request.sub_section_id));

        const selected = [];

        // Always prioritize same subsection first
        selected.push(...sameSubMales.slice(0, requiredMale).map(e => e.id));
        selected.push(...sameSubFemales.slice(0, requiredFemale).map(e => e.id));

        // Then fill remaining from other subsections if needed
        const currentMaleCount = selected.filter(id => {
            const emp = allSortedEligibleEmployees.find(e => e.id === id);
            return emp?.gender === 'male';
        }).length;

        if (currentMaleCount < requiredMale) {
            const needed = requiredMale - currentMaleCount;
            selected.push(...otherSubMales.slice(0, needed).map(e => e.id));
        }

        const currentFemaleCount = selected.filter(id => {
            const emp = allSortedEligibleEmployees.find(e => e.id === id);
            return emp?.gender === 'female';
        }).length;

        if (currentFemaleCount < requiredFemale) {
            const needed = requiredFemale - currentFemaleCount;
            selected.push(...otherSubFemales.slice(0, needed).map(e => e.id));
        }

        // Fill any remaining slots with same subsection employees first
        if (selected.length < request.requested_amount) {
            const remainingSameSub = allSortedEligibleEmployees
                .filter(e =>
                    !selected.includes(e.id) &&
                    e.subSections.some(ss => ss.id === request.sub_section_id)
                )
                .slice(0, request.requested_amount - selected.length);

            selected.push(...remainingSameSub.map(e => e.id));

            // If still not enough, get from other subsections
            if (selected.length < request.requested_amount) {
                const remainingOtherSub = allSortedEligibleEmployees
                    .filter(e =>
                        !selected.includes(e.id) &&
                        !e.subSections.some(ss => ss.id === request.sub_section_id)
                    )
                    .slice(0, request.requested_amount - selected.length);

                selected.push(...remainingOtherSub.map(e => e.id));
            }
        }

        return selected.slice(0, request.requested_amount);
    }, [allSortedEligibleEmployees, request.requested_amount, request.male_count, request.female_count, request.sub_section_id, currentScheduledIds]);

    const { data, setData, post, processing, errors } = useForm({
        employee_ids: initialSelectedIds,
        fulfilled_by: auth.user.id,
        visibility: 'private'
    });

    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [showModal, setShowModal] = useState(false);
    const [changingEmployeeIndex, setChangingEmployeeIndex] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedBulkRequests, setSelectedBulkRequests] = useState([]);
    const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState({});
    const [activeBulkRequest, setActiveBulkRequest] = useState(null);

    useEffect(() => {
        setData('employee_ids', selectedIds);
    }, [selectedIds]);

    useEffect(() => {
        setSelectedIds(initialSelectedIds);
    }, [initialSelectedIds]);

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
            current_scheduled: 0
        };

        selectedIds.forEach(id => {
            const emp = allSortedEligibleEmployees.find(e => e.id === id);
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
    }, [selectedIds, allSortedEligibleEmployees, request.male_count, request.female_count]);

    // Generate line assignments for putway subsection
    const lineAssignments = useMemo(() => {
        if (!isPutwaySubsection) return {};

        const assignments = {};
        selectedIds.forEach((id, index) => {
            // Cycle between 1 and 2: index 0,2,4... = line 1, index 1,3,5... = line 2
            assignments[id] = ((index % 2) + 1).toString();
        });

        return assignments;
    }, [isPutwaySubsection, selectedIds]);

    useEffect(() => {
        if (errors?.fulfillment_error) {
            setBackendError(errors.fulfillment_error);
        }
    }, [errors]);

    const handleBulkEmployeeChange = useCallback((requestId, index, newEmployeeId) => {
        setBulkSelectedEmployees(prev => {
            const currentEmployees = prev[requestId] || [];

            // Check if employee is already selected in this request
            if (newEmployeeId !== currentEmployees[index] && currentEmployees.includes(newEmployeeId)) {
                alert('Karyawan ini sudah dipilih untuk request ini');
                return prev;
            }

            const newEmployees = [...currentEmployees];
            newEmployees[index] = newEmployeeId;

            return {
                ...prev,
                [requestId]: newEmployees
            };
        });
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        setBackendError(null);

        const selectedEmployees = selectedIds.map(id =>
            allSortedEligibleEmployees.find(e => e.id === id)
        );

        const maleCount = selectedEmployees.filter(e => e?.gender === 'male').length;
        const femaleCount = selectedEmployees.filter(e => e?.gender === 'female').length;

        if (request.male_count > 0 && maleCount < request.male_count) {
            alert(`Diperlukan minimal ${request.male_count} karyawan laki-laki`);
            return;
        }

        if (request.female_count > 0 && femaleCount < request.female_count) {
            alert(`Diperlukan minimal ${request.female_count} karyawan perempuan`);
            return;
        }

        // ✅ update form state dulu
        setData({
            employee_ids: selectedIds,
            fulfilled_by: auth.user.id,
            is_revision: request.status === 'fulfilled',
            visibility: data.visibility
        });

        // ✅ lalu submit
        post(route('manpower-requests.fulfill.store', request.id), {
            onSuccess: () => router.visit(route('manpower-requests.index')),
            onError: (errors) => {
                if (errors.fulfillment_error) {
                    setBackendError(errors.fulfillment_error);
                }
            }
        });
    }, [selectedIds, request, allSortedEligibleEmployees, post, auth.user.id, data.visibility]);

 const handleAutoFulfill = useCallback((strategy, requestIds) => {
    // Create a copy of current bulk selections
    const newBulkSelections = { ...bulkSelectedEmployees };

    // Get all requests that need to be fulfilled
    const requestsToFulfill = sameDayRequests.filter(req =>
        requestIds.includes(req.id) && req.status !== 'fulfilled'
    );

    // Create a set of already used employees across ALL requests
    const usedEmployeeIds = new Set(
        Object.values(newBulkSelections).flat().filter(id => id)
    );

    // Create a pool of available employees (clone to avoid mutation)
    let availableEmployees = allSortedEligibleEmployees.filter(emp =>
        !usedEmployeeIds.has(emp.id)
    );

    // Strategy-based sorting
    if (strategy === 'same_section') {
        // Prioritize employees from the same section
        availableEmployees.sort((a, b) => {
            const aIsSame = a.subSections.some(ss => String(ss.id) === String(request.sub_section_id));
            const bIsSame = b.subSections.some(ss => String(ss.id) === String(request.sub_section_id));
            if (aIsSame !== bIsSame) return aIsSame ? -1 : 1;
            
            // Then by score
            const aTotalScore = (a.workload_points || 0) + (a.blind_test_points || 0) + (a.average_rating || 0);
            const bTotalScore = (b.workload_points || 0) + (b.blind_test_points || 0) + (b.average_rating || 0);
            return bTotalScore - aTotalScore;
        });
    } else if (strategy === 'balanced') {
        // Prioritize employees with lower workload
        availableEmployees.sort((a, b) => {
            const aWorkload = (a.workload_points || 0) + (a.blind_test_points || 0);
            const bWorkload = (b.workload_points || 0) + (b.blind_test_points || 0);
            return aWorkload - bWorkload;
        });
    }
    // Default is 'optimal' which uses the original sorting

    // Process each request
    requestsToFulfill.forEach(req => {
        const requiredMale = req.male_count || 0;
        const requiredFemale = req.female_count || 0;
        const totalRequired = req.requested_amount;

        // Filter available employees that match gender requirements
        const maleCandidates = availableEmployees.filter(emp =>
            emp.gender === 'male' &&
            !usedEmployeeIds.has(emp.id)
        );

        const femaleCandidates = availableEmployees.filter(emp =>
            emp.gender === 'female' &&
            !usedEmployeeIds.has(emp.id)
        );

        // Select employees for this request
        const selectedForRequest = [];

        // First, add required males
        for (let i = 0; i < requiredMale && maleCandidates.length > 0; i++) {
            const candidate = maleCandidates.shift();
            selectedForRequest.push(candidate.id);
            usedEmployeeIds.add(candidate.id);
            
            // Remove from available employees
            availableEmployees = availableEmployees.filter(emp => emp.id !== candidate.id);
        }

        // Then, add required females
        for (let i = 0; i < requiredFemale && femaleCandidates.length > 0; i++) {
            const candidate = femaleCandidates.shift();
            selectedForRequest.push(candidate.id);
            usedEmployeeIds.add(candidate.id);
            
            // Remove from available employees
            availableEmployees = availableEmployees.filter(emp => emp.id !== candidate.id);
        }

        // Fill remaining slots with any available employees
        const remainingSlots = totalRequired - selectedForRequest.length;
        if (remainingSlots > 0) {
            const otherCandidates = availableEmployees
                .filter(emp => !usedEmployeeIds.has(emp.id))
                .slice(0, remainingSlots);

            otherCandidates.forEach(candidate => {
                selectedForRequest.push(candidate.id);
                usedEmployeeIds.add(candidate.id);
                
                // Remove from available employees
                availableEmployees = availableEmployees.filter(emp => emp.id !== candidate.id);
            });
        }

        // Update the bulk selections
        newBulkSelections[req.id] = selectedForRequest;
    });

    // Update state with the new selections
    setBulkSelectedEmployees(newBulkSelections);
}, [allSortedEligibleEmployees, bulkSelectedEmployees, sameDayRequests, request.sub_section_id]);

const handleBulkSubmit = useCallback((strategy, visibility) => {
    setBackendError(null);

    // Validate all selected requests have complete assignments
    const hasIncompleteAssignments = selectedBulkRequests.some(requestId => {
        const employees = bulkSelectedEmployees[requestId] || [];
        const request = sameDayRequests.find(req => req.id.toString() === requestId.toString());
        return request && employees.length < request.requested_amount;
    });

    if (hasIncompleteAssignments) {
        setBackendError('Beberapa request belum terisi penuh. Silakan lengkapi semua assignment terlebih dahulu.');
        return;
    }

    // Prepare bulk data with employee selections
    const bulkData = {};
    selectedBulkRequests.forEach(requestId => {
        const employees = bulkSelectedEmployees[requestId] || [];
        if (employees.length > 0) {
            bulkData[requestId] = employees;
        }
    });

    console.log('Submitting bulk fulfill:', {
        request_ids: selectedBulkRequests,
        employee_selections: bulkData,
        strategy,
        visibility
    });

    console.log("🚀 Submitting bulk fulfill:");
console.log("Selected Bulk Requests:", selectedBulkRequests);
console.log("bulkSelectedEmployees (state):", JSON.stringify(bulkSelectedEmployees, null, 2));


    // Use router.post instead of useForm's post
    router.post(route('manpower-requests.bulk-fulfill'), {
        request_ids: selectedBulkRequests,
        employee_selections: bulkData,
        strategy: strategy,
        visibility: visibility,
        status: 'pending'
    }, {
        onSuccess: () => {
            console.log('Bulk fulfill successful');
            // Clear any debug data and redirect
            setBulkSelectedEmployees({});
            setSelectedBulkRequests([]);
            setBulkMode(false);
            router.visit(route('manpower-requests.index'));
        },
        onError: (errors) => {
            console.error('Bulk fulfill error:', errors);
            if (errors.fulfillment_error) {
                setBackendError(errors.fulfillment_error);
            } else if (errors.message) {
                setBackendError(errors.message);
            } else {
                setBackendError('Terjadi kesalahan saat memproses bulk fulfillment');
            }
        }
    });
}, [selectedBulkRequests, bulkSelectedEmployees, sameDayRequests]);


    const openChangeModal = useCallback((index) => {
        setChangingEmployeeIndex(index);
        setShowModal(true);
    }, []);

    const openBulkChangeModal = useCallback((requestId, index) => {
        setActiveBulkRequest({ requestId, index });
        setShowModal(true);
    }, []);

    const selectNewEmployee = useCallback((newEmployeeId) => {
        if (changingEmployeeIndex === null && activeBulkRequest === null) return;

        if (activeBulkRequest) {
            // Handle bulk employee selection
            const { requestId, index } = activeBulkRequest;
            const currentEmployees = bulkSelectedEmployees[requestId] || [];

            if (newEmployeeId !== currentEmployees[index] && currentEmployees.includes(newEmployeeId)) {
                alert('Karyawan ini sudah dipilih untuk request ini');
                return;
            }

            const newEmployee = allSortedEligibleEmployees.find(e => e.id === newEmployeeId);
            const currentEmp = allSortedEligibleEmployees.find(e => e.id === currentEmployees[index]);

            // Find the request details for gender validation
            const bulkRequest = sameDayRequests.find(req => req.id === parseInt(requestId));
            if (!bulkRequest) return;

            let newMaleCount = currentEmployees.filter(id => {
                const emp = allSortedEligibleEmployees.find(e => e.id === id);
                return emp?.gender === 'male';
            }).length;

            let newFemaleCount = currentEmployees.filter(id => {
                const emp = allSortedEligibleEmployees.find(e => e.id === id);
                return emp?.gender === 'female';
            }).length;

            if (currentEmp) {
                if (currentEmp.gender === 'male') newMaleCount--;
                if (currentEmp.gender === 'female') newFemaleCount--;
            }

            if (newEmployee.gender === 'male') newMaleCount++;
            if (newEmployee.gender === 'female') newFemaleCount++;

            if (bulkRequest.male_count > 0 && newMaleCount > bulkRequest.male_count) {
                alert(`Maksimum ${bulkRequest.male_count} karyawan laki-laki diperbolehkan untuk request ini`);
                return;
            }

            if (bulkRequest.female_count > 0 && newFemaleCount > bulkRequest.female_count) {
                alert(`Maksimum ${bulkRequest.female_count} karyawan perempuan diperbolehkan untuk request ini`);
                return;
            }

            const newEmployees = [...currentEmployees];
            newEmployees[index] = newEmployeeId;

            setBulkSelectedEmployees(prev => ({
                ...prev,
                [requestId]: newEmployees
            }));

            setShowModal(false);
            setActiveBulkRequest(null);
            return;
        }

        // Handle normal single request selection
        const newIds = [...selectedIds];
        const currentEmpId = newIds[changingEmployeeIndex];

        if (newEmployeeId !== currentEmpId && newIds.includes(newEmployeeId)) {
            alert('Karyawan ini sudah dipilih');
            return;
        }

        const newEmployee = allSortedEligibleEmployees.find(e => e.id === newEmployeeId);
        const currentEmp = allSortedEligibleEmployees.find(e => e.id === currentEmpId);

        let newMaleCount = selectedIds.filter(id => {
            const emp = allSortedEligibleEmployees.find(e => e.id === id);
            return emp?.gender === 'male';
        }).length;

        let newFemaleCount = selectedIds.filter(id => {
            const emp = allSortedEligibleEmployees.find(e => e.id === id);
            return emp?.gender === 'female';
        }).length;

        if (currentEmp) {
            if (currentEmp.gender === 'male') newMaleCount--;
            if (currentEmp.gender === 'female') newFemaleCount--;
        }

        if (newEmployee.gender === 'male') newMaleCount++;
        if (newEmployee.gender === 'female') newFemaleCount++;

        if (request.male_count > 0 && newMaleCount > request.male_count) {
            alert(`Maksimum ${request.male_count} karyawan laki-laki diperbolehkan`);
            return;
        }

        if (request.female_count > 0 && newFemaleCount > request.female_count) {
            alert(`Maksimum ${request.female_count} karyawan perempuan diperbolehkan`);
            return;
        }

        newIds[changingEmployeeIndex] = newEmployeeId;
        setSelectedIds(newIds);
        setShowModal(false);
        setChangingEmployeeIndex(null);
    }, [changingEmployeeIndex, selectedIds, allSortedEligibleEmployees, request.male_count, request.female_count, activeBulkRequest, bulkSelectedEmployees, sameDayRequests]);

    // New function to handle multi-selection
    const handleMultiSelect = useCallback((newSelectedIds) => {
        // Validate gender requirements
        const selectedEmployees = newSelectedIds.map(id =>
            allSortedEligibleEmployees.find(e => e.id === id)
        ).filter(Boolean);

        const maleCount = selectedEmployees.filter(e => e.gender === 'male').length;
        const femaleCount = selectedEmployees.filter(e => e.gender === 'female').length;

        if (request.male_count > 0 && maleCount > request.male_count) {
            alert(`Maksimum ${request.male_count} karyawan laki-laki diperbolehkan`);
            return false;
        }

        if (request.female_count > 0 && femaleCount > request.female_count) {
            alert(`Maksimum ${request.female_count} karyawan perempuan diperbolehkan`);
            return false;
        }

        // If validation passes, update the selection
        setSelectedIds(newSelectedIds);
        return true;
    }, [allSortedEligibleEmployees, request.male_count, request.female_count]);

    const getEmployeeDetails = useCallback((id) => {
        return allSortedEligibleEmployees.find(emp => emp.id === id);
    }, [allSortedEligibleEmployees]);

    const toggleMultiSelectMode = useCallback(() => {
        setMultiSelectMode(prev => !prev);
    }, []);

    const toggleBulkMode = useCallback(() => {
        setBulkMode(prev => !prev);
        if (!bulkMode) {
            // Get NON-FULFILLED requests from the SAME subsection, INCLUDING the current request if not fulfilled
            const nonFulfilledSameSubsectionRequests = sameDayRequests.filter(req =>
                req.sub_section_id === request.sub_section_id &&
                req.status !== 'fulfilled'
            );

            // Ensure current request is included if not fulfilled
            const allRequests = [...nonFulfilledSameSubsectionRequests];
            if (request.status !== 'fulfilled' && !allRequests.some(req => req.id === request.id)) {
                allRequests.push(request);
            }

            setSelectedBulkRequests(allRequests.map(req => req.id));


            // Initialize selections and AUTO-FILL them
            const initialSelections = {};
            let usedEmployeeIds = new Set(); // Track used employees across all requests

            // First, handle the current request with already selected employees
            if (request.status !== 'fulfilled') {
                initialSelections[request.id] = [...selectedIds];
                selectedIds.forEach(id => usedEmployeeIds.add(id));
            }

            // Then process other requests
            allRequests.forEach(req => {
                // Skip if already processed (current request)
                if (req.id === request.id && request.status !== 'fulfilled') return;

                const requiredMale = req.male_count || 0;
                const requiredFemale = req.female_count || 0;
                const totalRequired = req.requested_amount;

                // Filter available employees (not used in any request yet)
                const availableEmployees = allSortedEligibleEmployees.filter(emp =>
                    !usedEmployeeIds.has(emp.id)
                );

                // Auto-select employees based on optimal strategy
                const selectedForRequest = [];

                // First, add required males
                const maleCandidates = availableEmployees.filter(emp =>
                    emp.gender === 'male'
                ).slice(0, requiredMale);

                maleCandidates.forEach(emp => {
                    selectedForRequest.push(emp.id);
                    usedEmployeeIds.add(emp.id);
                });

                // Then, add required females
                const femaleCandidates = availableEmployees.filter(emp =>
                    emp.gender === 'female' &&
                    !usedEmployeeIds.has(emp.id)
                ).slice(0, requiredFemale);

                femaleCandidates.forEach(emp => {
                    selectedForRequest.push(emp.id);
                    usedEmployeeIds.add(emp.id);
                });

                // Fill remaining slots with any available employees
                const remainingSlots = totalRequired - selectedForRequest.length;
                if (remainingSlots > 0) {
                    const otherCandidates = availableEmployees.filter(emp =>
                        !usedEmployeeIds.has(emp.id)
                    ).slice(0, remainingSlots);

                    otherCandidates.forEach(emp => {
                        selectedForRequest.push(emp.id);
                        usedEmployeeIds.add(emp.id);
                    });
                }

                initialSelections[req.id] = selectedForRequest;
            });

            setBulkSelectedEmployees(initialSelections);
        }
    }, [bulkMode, sameDayRequests, request, selectedIds, allSortedEligibleEmployees]);

    const toggleBulkRequestSelection = useCallback((requestId) => {
        setSelectedBulkRequests(prev => {
            if (prev.includes(requestId)) {
                return prev.filter(id => id !== requestId);
            } else {
                return [...prev, requestId];
            }
        });
    }, []);

    if (request.status === 'fulfilled' && !canReviseFulfilledRequest && !request.schedules?.length) {
        return (
            <AuthenticatedLayout
                header={
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl">Penuhi Request Man Power</h2>
                    </div>
                }
                user={auth.user}
            >
                <div className="bg-white dark:bg-gray-800 shadow-md mx-auto mt-6 p-4 rounded-lg max-w-4xl text-center">
                    <p className="mb-3 font-bold text-green-600 dark:text-green-400 text-lg">Permintaan ini sudah terpenuhi!</p>
                    {request.fulfilled_by && (
                        <p className="mb-4 text-gray-600 dark:text-gray-300">
                            Dipenuhi oleh: {request.fulfilled_by.name} ({request.fulfilled_by.email})
                        </p>
                    )}
                    <button
                        onClick={() => router.visit(route('manpower-requests.index'))}
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
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl">Penuhi Request Man Power</h2>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleBulkMode}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${bulkMode
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                }`}
                        >
                            {bulkMode ? 'Keluar Mode Bulk' : 'Mode Bulk Fulfill'}
                        </button>
                    </div>
                </div>
            }
            user={auth.user}
        >
            <div className="mx-auto mt-6 max-w-6xl">
                <RequestDetails request={request} auth={auth} />

                {request.status === 'fulfilled' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 shadow-md mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <h3 className="mb-3 font-bold text-blue-800 dark:text-blue-300 text-lg">Informasi Jadwal Saat Ini</h3>
                        <p className="text-blue-700 dark:text-blue-300">
                            {genderStats.current_scheduled} dari {request.requested_amount} karyawan sudah dijadwalkan sebelumnya.
                        </p>
                        <p className="mt-1 text-blue-700 dark:text-blue-300">
                            Anda dapat mengganti karyawan yang menolak atau membiarkan yang sudah menerima.
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
                        handleAutoFulfill={handleAutoFulfill} // Add this line
                    />
                )}

                {/* Putway Line Assignment Notice */}
                {isPutwaySubsection && !bulkMode && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 shadow-md mb-6 p-4 border border-purple-200 dark:border-purple-700 rounded-lg">
                        <h3 className="mb-3 font-bold text-purple-800 dark:text-purple-300 text-lg">
                            Informasi Penugasan Line (Putway)
                        </h3>
                        <p className="mb-2 text-purple-700 dark:text-purple-300">
                            Karyawan akan ditugaskan secara bergantian ke Line 1 dan Line 2.
                        </p>
                        <div className="gap-4 grid grid-cols-2 mt-3">
                            <div className="bg-purple-100 dark:bg-purple-800/30 p-3 rounded">
                                <h4 className="font-medium text-purple-800 dark:text-purple-200">Line 1</h4>
                                <div className="space-y-1 mt-2">
                                    {selectedIds.filter((_, index) => index % 2 === 0).map((id, index) => {
                                        const emp = getEmployeeDetails(id);
                                        return emp ? (
                                            <div key={id} className="text-purple-700 dark:text-purple-200 text-xs">
                                                {index * 2 + 1}. {emp.name}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            <div className="bg-purple-100 dark:bg-purple-800/30 p-3 rounded">
                                <h4 className="font-medium text-purple-800 dark:text-purple-200">Line 2</h4>
                                <div className="space-y-1 mt-2">
                                    {selectedIds.filter((_, index) => index % 2 === 1).map((id, index) => {
                                        const emp = getEmployeeDetails(id);
                                        return emp ? (
                                            <div key={id} className="text-purple-700 dark:text-purple-200 text-xs">
                                                {index * 2 + 2}. {emp.name}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!bulkMode && (
                    <>
                        <GenderStats
                            genderStats={genderStats}
                            request={request}
                            selectedIds={selectedIds}
                            allSortedEligibleEmployees={allSortedEligibleEmployees}
                        />

                        {backendError && (
                            <div className="bg-red-100 dark:bg-red-900/20 mb-4 p-3 border border-red-400 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300">
                                <p className="font-semibold">Error:</p>
                                <p>{backendError}</p>
                            </div>
                        )}

                        {totalSameSubSection < request.requested_amount && (
                            <div className="bg-yellow-100 dark:bg-yellow-900/20 mb-4 p-3 border border-yellow-400 dark:border-yellow-600 rounded-lg text-yellow-700 dark:text-yellow-300">
                                <p>Hanya {totalSameSubSection} karyawan dari sub-bagian yang sama yang tersedia</p>
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
                                isPutwaySubsection={isPutwaySubsection}
                                lineAssignments={lineAssignments}
                            />

                            <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100 text-lg">Visibility</h3>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="private"
                                            checked={data.visibility === 'private'}
                                            onChange={() => setData('visibility', 'private')}
                                            className="mr-2"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">Private</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="public"
                                            checked={data.visibility === 'public'}
                                            onChange={() => setData('visibility', 'public')}
                                            className="mr-2"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">Public</span>
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
                    request={activeBulkRequest ?
                        sameDayRequests.find(req => req.id.toString() === activeBulkRequest.requestId.toString()) || request
                        : request
                    }
                    allSortedEligibleEmployees={allSortedEligibleEmployees}
                    selectedIds={activeBulkRequest ? (bulkSelectedEmployees[activeBulkRequest.requestId] || []) : selectedIds}
                    selectNewEmployee={selectNewEmployee}
                    handleMultiSelect={handleMultiSelect}
                    multiSelectMode={multiSelectMode}
                    toggleMultiSelectMode={toggleMultiSelectMode}
                    isBulkMode={!!activeBulkRequest}
                />
            </div>
        </AuthenticatedLayout>
    );
}