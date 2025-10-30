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
        sub_section_id: request?.sub_section_id || ''
    }), [request]);

    // Safe access to auth
    const safeAuth = useMemo(() => ({
        user: auth?.user || {}
    }), [auth]);

    // Check if this is a putway subsection for line assignments
    const isPutwaySubsection = useMemo(() => {
        const subsectionName = safeRequest.sub_section?.name || '';
        return subsectionName.toLowerCase() === 'putway';
    }, [safeRequest]);

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
                isCurrentlyScheduled: (currentScheduledIds || []).includes(emp.id)
            })),
            ...(otherSubSectionEmployees || []).map(emp => ({
                ...emp,
                subSections: emp.sub_sections_data || emp.sub_sections || [],
                gender: normalizeGender(emp.gender),
                originalGender: emp.gender,
                isCurrentlyScheduled: (currentScheduledIds || []).includes(emp.id)
            }))
        ];
    }, [sameSubSectionEmployees, otherSubSectionEmployees, currentScheduledIds]);

    const allSortedEligibleEmployees = useMemo(() => {
        const sorted = [...combinedEmployees].sort((a, b) => {
            if (a.isCurrentlyScheduled !== b.isCurrentlyScheduled) {
                return a.isCurrentlyScheduled ? -1 : 1;
            }

            // PRIORITIZE SAME SUBSECTION
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
        return allSortedEligibleEmployees.find(emp => emp.id === id);
    }, [allSortedEligibleEmployees]);

    const initialSelectedIds = useMemo(() => {
        return (currentScheduledIds || []).filter(id =>
            allSortedEligibleEmployees.some(e => e.id === id)
        ).slice(0, safeRequest?.requested_amount || 0);
    }, [allSortedEligibleEmployees, safeRequest?.requested_amount, currentScheduledIds]);

    const { data, setData, put, processing, errors } = useForm({
        employee_ids: initialSelectedIds,
        fulfilled_by: safeAuth?.user?.id || '',
        visibility: 'public'
    });

    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [showModal, setShowModal] = useState(false);
    const [changingEmployeeIndex, setChangingEmployeeIndex] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    useEffect(() => {
        setData('employee_ids', selectedIds);
    }, [selectedIds]);

    const handleSelectEmployee = useCallback((id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    }, []);

    const handleRemoveEmployee = useCallback((id) => {
        setSelectedIds(prev => prev.filter(i => i !== id));
    }, []);

    const handleReplaceEmployee = useCallback((index) => {
        setChangingEmployeeIndex(index);
        setShowModal(true);
    }, []);

    const handleModalSelect = useCallback((employee) => {
        if (changingEmployeeIndex !== null) {
            setSelectedIds(prev => {
                const newIds = [...prev];
                newIds[changingEmployeeIndex] = employee.id;
                return newIds;
            });
        } else if (multiSelectMode) {
            handleSelectEmployee(employee.id);
        } else {
            setSelectedIds(prev => [...prev, employee.id]);
        }
        setShowModal(false);
        setChangingEmployeeIndex(null);
        setMultiSelectMode(false);
    }, [changingEmployeeIndex, handleSelectEmployee, multiSelectMode]);

 const handleSubmit = (e) => {
        e.preventDefault();
        setBackendError(null);

        if (selectedIds.length !== (safeRequest?.requested_amount || 0)) {
            setBackendError(`Jumlah karyawan yang dipilih harus ${safeRequest?.requested_amount}`);
            return;
        }

        put(route('manpower-requests.update-revision', safeRequest?.id), {
            data: { // Wrap data in data property
                employee_ids: selectedIds,
                fulfilled_by: safeAuth?.user?.id || '',
                visibility: data.visibility
            },
            onSuccess: () => {
                // Optional: Add any success handling here
                console.log('Revision successful');
            },
            onError: (errors) => {
                if (errors.revision_error) {
                    setBackendError(errors.revision_error);
                } else if (errors.message) {
                    setBackendError(errors.message);
                } else {
                    setBackendError('Terjadi kesalahan saat menyimpan revisi');
                }
            }
        });
    };

    const selectedEmployees = useMemo(() => {
        return selectedIds.map(id =>
            allSortedEligibleEmployees.find(emp => emp.id === id)
        ).filter(Boolean);
    }, [selectedIds, allSortedEligibleEmployees]);

    const genderStats = useMemo(() => {
        const stats = { male: 0, female: 0 };
        selectedEmployees.forEach(emp => {
            if (emp.gender === 'male') stats.male++;
            else if (emp.gender === 'female') stats.female++;
        });
        return stats;
    }, [selectedEmployees]);

    const handleAddEmployee = () => {
        setMultiSelectMode(true);
        setShowModal(true);
    };

    const handleMultiSelect = useCallback((newSelectedIds) => {
    // Validate gender requirements
    const selectedEmployees = newSelectedIds.map(id =>
        allSortedEligibleEmployees.find(e => e.id === id)
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
    return true;
}, [allSortedEligibleEmployees, safeRequest.male_count, safeRequest.female_count]);

const selectNewEmployee = useCallback((employeeId) => {
    if (changingEmployeeIndex !== null) {
        // Replace specific employee
        setSelectedIds(prev => {
            const newIds = [...prev];
            newIds[changingEmployeeIndex] = employeeId;
            return newIds;
        });
        setChangingEmployeeIndex(null);
    } else if (multiSelectMode) {
        // Toggle selection in multi-select mode
        setSelectedIds(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            } else {
                return [...prev, employeeId];
            }
        });
    } else {
        // Add new employee (single select)
        setSelectedIds(prev => [...prev, employeeId]);
    }
    setShowModal(false);
}, [changingEmployeeIndex, multiSelectMode]);


return (
    <AuthenticatedLayout
        user={safeAuth?.user || {}}
        header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Revisi Pemenuhan Permintaan</h2>}
    >
        <div className="py-6">
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6 text-gray-900 dark:text-gray-100">
                        {/* Wrap everything in a form element */}
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

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                <div className="lg:col-span-2">
                                    <EmployeeSelection
                                        selectedEmployees={selectedEmployees}
                                        selectedIds={selectedIds}
                                        request={safeRequest}
                                        isPutwaySubsection={isPutwaySubsection}
                                        onReplaceEmployee={handleReplaceEmployee}
                                        onRemoveEmployee={handleRemoveEmployee}
                                        onAddEmployee={handleAddEmployee}
                                        isRevision={true}
                                        auth={safeAuth}
                                        getEmployeeDetails={getEmployeeDetails}
                                        openChangeModal={handleReplaceEmployee}
                                        lineAssignments={{}}
                                    />
                                </div>

                                <div className="space-y-6">
                                    <GenderStats
                                        genderStats={genderStats}
                                        request={safeRequest}
                                    />

                                    <ConfirmationSection
                                        data={data}
                                        setData={setData}
                                        processing={processing}
                                        errors={errors}
                                        onSubmit={handleSubmit}
                                        isRevision={true}
                                        auth={safeAuth}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal code remains outside the form */}
        {showModal && (
            <EmployeeModal
                showModal={showModal}
                setShowModal={() => {
                    setShowModal(false);
                    setChangingEmployeeIndex(null);
                    setMultiSelectMode(false);
                }}
                request={safeRequest}
                allSortedEligibleEmployees={allSortedEligibleEmployees}
                selectedIds={selectedIds}
                selectNewEmployee={selectNewEmployee}
                handleMultiSelect={handleMultiSelect}
                multiSelectMode={multiSelectMode}
                toggleMultiSelectMode={() => setMultiSelectMode(prev => !prev)}
            />
        )}
    </AuthenticatedLayout>
);
}