// EmployeeModal.jsx - Complete with bulk mode support
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IncompleteSelectionModal from './IncompleteSelectionModal';

export default function EmployeeModal({
    showModal,
    setShowModal,
    request,
    allSortedEligibleEmployees,
    selectedIds,
    selectNewEmployee,
    handleMultiSelect,
    multiSelectMode,
    toggleMultiSelectMode,
    isBulkMode = false,
    isLoading = false,
    activeBulkRequest = null
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubSection, setSelectedSubSection] = useState('all');
    const [tempSelectedIds, setTempSelectedIds] = useState([]);
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const [failedImages, setFailedImages] = useState(new Set());

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [showModal]);

    // Reset temp selection when modal opens/closes or mode changes
    useEffect(() => {
        if (showModal && multiSelectMode) {
            setTempSelectedIds([]);
        }
    }, [showModal, multiSelectMode]);

    const availableSubSections = useMemo(() => {
        const subSectionMap = new Map();

        allSortedEligibleEmployees.forEach(emp => {
            emp.subSections.forEach(subSection => {
                if (!subSectionMap.has(String(subSection.id))) {
                    subSectionMap.set(String(subSection.id), {
                        id: String(subSection.id),
                        name: subSection.name,
                        section_name: subSection.section?.name || 'Unknown Section'
                    });
                }
            });
        });

        return Array.from(subSectionMap.values()).sort((a, b) => {
            if (a.section_name !== b.section_name) {
                return a.section_name.localeCompare(b.section_name);
            }
            return a.name.localeCompare(b.name);
        });
    }, [allSortedEligibleEmployees]);

    const filteredEmployees = useMemo(() => {
        let filtered = allSortedEligibleEmployees;

        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.name.toLowerCase().includes(searchLower) ||
                emp.nik.toLowerCase().includes(searchLower)
            );
        }

        if (selectedSubSection !== 'all') {
            const subSectionId = selectedSubSection;
            filtered = filtered.filter(emp =>
                emp.subSections.some(ss => String(ss.id) === subSectionId)
            );
        }

        return filtered;
    }, [allSortedEligibleEmployees, searchTerm, selectedSubSection]);

    const sameSubSectionEmployees = useMemo(() => {
        const reqSubId = String(request?.sub_section_id);
        if (!reqSubId) return [];

        return filteredEmployees.filter(emp => {
            if (!emp.subSections || !Array.isArray(emp.subSections)) return false;

            return emp.subSections.some(ss => {
                if (!ss || !ss.id) return false;

                const ssId = String(ss.id);
                return ssId === reqSubId;
            });
        });
    }, [filteredEmployees, request?.sub_section_id]);

    const otherSubSectionEmployees = useMemo(() => {
        const reqSubId = String(request?.sub_section_id);
        if (!reqSubId) return filteredEmployees;

        return filteredEmployees.filter(emp => {
            if (!emp.subSections || !Array.isArray(emp.subSections)) return true;

            return !emp.subSections.some(ss => {
                if (!ss || !ss.id) return false;

                const ssId = String(ss.id);
                return ssId === reqSubId;
            });
        });
    }, [filteredEmployees, request?.sub_section_id]);

    // Check if harian employee has reached 21 days
    const isHarianReachingLimit = (emp) => {
        return emp.type === 'harian' && emp.work_days_30_days >= 21;
    };

    const handleImageError = (employeeId, e) => {
        if (!failedImages.has(employeeId)) {
            setFailedImages(prev => new Set(prev).add(employeeId));
        }
        
        e.target.style.display = 'none';
        const fallback = e.target.nextSibling;
        if (fallback) {
            fallback.style.display = 'flex';
        }
    };

    const UserIcon = ({ className = "w-6 h-6" }) => (
        <svg 
            className={className}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
            />
        </svg>
    );

    const getEmployeePhotoUrl = (employee) => {
        if (!employee.photo) return null;
        
        if (employee.photo.startsWith('http')) {
            return employee.photo;
        }
        
        let photoPath = employee.photo;
        if (!photoPath.startsWith('/')) {
            photoPath = `/storage/${photoPath}`;
        }
        
        return photoPath;
    };

    const toggleEmployeeSelection = (employeeId) => {
    console.log('🎯 toggleEmployeeSelection called', { employeeId, multiSelectMode });
    
    if (!multiSelectMode) {
        // In single mode, we're either replacing an employee or selecting a new one
        // Find the actual employee object
        const selectedEmployee = allSortedEligibleEmployees.find(emp => String(emp.id) === String(employeeId));
        console.log('🔍 Selected employee for single mode:', selectedEmployee);
        
        if (selectedEmployee) {
            selectNewEmployee(selectedEmployee); // Pass the employee object, not just ID
        } else {
            console.error('❌ Employee not found:', employeeId);
        }
        return;
    }

    // ... rest of multi-select logic remains the same
    setTempSelectedIds(prev => {
        const prevStr = prev.map(id => String(id));
        const employeeIdStr = String(employeeId);
        const isCurrentlySelected = prevStr.includes(employeeIdStr);
        const newEmployee = allSortedEligibleEmployees.find(e => String(e.id) === employeeIdStr);

        if (isCurrentlySelected) {
            const newIds = prev.filter(id => String(id) !== employeeIdStr);
            return newIds;
        } else {
            if (prev.length >= request.requested_amount) {
                alert(`Maksimum ${request.requested_amount} karyawan dapat dipilih`);
                return prev;
            }

            const currentSelection = prevStr.map(id =>
                allSortedEligibleEmployees.find(e => String(e.id) === id)
            ).filter(Boolean);

            const newSelectionWithEmployee = [...currentSelection, newEmployee];
            const maleCount = newSelectionWithEmployee.filter(e => e.gender === 'male').length;
            const femaleCount = newSelectionWithEmployee.filter(e => e.gender === 'female').length;

            if (request.male_count > 0 && maleCount > request.male_count) {
                alert(`Maksimum ${request.male_count} karyawan laki-laki diperbolehkan`);
                return prev;
            }

            if (request.female_count > 0 && femaleCount > request.female_count) {
                alert(`Maksimum ${request.female_count} karyawan perempuan diperbolehkan`);
                return prev;
            }

            const newIds = [...prev, employeeId];
            return newIds;
        }
    });
};

    const applyMultiSelection = () => {
        const finalSelection = tempSelectedIds.map(id => {
            const idStr = String(id);
            return allSortedEligibleEmployees.find(e => String(e.id) === idStr);
        }).filter(Boolean);

        const maleCount = finalSelection.filter(e => e.gender === 'male').length;
        const femaleCount = finalSelection.filter(e => e.gender === 'female').length;

        const missingMale = Math.max(0, (request.male_count || 0) - maleCount);
        const missingFemale = Math.max(0, (request.female_count || 0) - femaleCount);
        const missingTotal = Math.max(0, request.requested_amount - tempSelectedIds.length);

        const hasGenderRequirements = (request.male_count || 0) > 0 || (request.female_count || 0) > 0;
        const meetsGenderRequirements = maleCount >= (request.male_count || 0) && femaleCount >= (request.female_count || 0);
        const meetsTotalRequirements = tempSelectedIds.length >= request.requested_amount;

        if (meetsGenderRequirements && meetsTotalRequirements) {
            handleMultiSelect(tempSelectedIds);
            setShowModal(false);
        } else {
            setShowIncompleteModal(true);
        }
    };

    const cancelMultiSelection = () => {
        setTempSelectedIds([]);
        setShowModal(false);
    };

    const handleSelectTopEmployees = () => {
        const availableIds = filteredEmployees
            .slice(0, request.requested_amount)
            .map(emp => String(emp.id));
        
        setTempSelectedIds(availableIds);
    };

    // Get current request for bulk mode
    const getCurrentRequest = () => {
        if (isBulkMode && activeBulkRequest) {
            // In bulk mode, we might have a different request context
            // This would need to be passed from the parent component
            return request; // Fallback to main request
        }
        return request;
    };

    const currentRequest = getCurrentRequest();

    // Loading skeleton for employee cards
    const EmployeeCardSkeleton = () => (
        <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="cursor-pointer text-left p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-1">
                    <div className="min-w-0 flex-1">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-3/4"></div>
                        <div className="mt-2 space-y-1">
                            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                        </div>
                        
                        {/* ML Scores Section Skeleton */}
                        <div className="mt-3 grid grid-cols-3 gap-1 text-xs border-t pt-2 border-gray-200 dark:border-gray-600">
                            {[...Array(3)].map((_, i) => (
                                <div key={i}>
                                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-1 w-2/3"></div>
                                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Additional Info Skeleton */}
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderEmployeeCard = (emp) => {
        const empId = String(emp.id);
        const selectedIdsStr = selectedIds.map(id => String(id));
        const tempSelectedIdsStr = tempSelectedIds.map(id => String(id));
        
        const isSelectedInSingle = selectedIdsStr.includes(empId);
        const isSelectedInMulti = tempSelectedIdsStr.includes(empId);
        const isSelected = multiSelectMode ? isSelectedInMulti : isSelectedInSingle;
        const isCurrentlyScheduled = emp.isCurrentlyScheduled;
        const isDisabledInSingle = !multiSelectMode && isSelectedInSingle;
        
        const isAssigned = emp.status === 'assigned' && !isCurrentlyScheduled;
        const isDisabled = isAssigned || isDisabledInSingle;

        const imageFailed = failedImages.has(empId);
        const photoUrl = getEmployeePhotoUrl(emp);

        let displaySubSectionName = 'Tidak Ada Bagian';
        if (emp.subSections && emp.subSections.length > 0) {
            const sameSub = emp.subSections.find(ss => String(ss.id) === String(currentRequest.sub_section_id));
            if (sameSub) {
                displaySubSectionName = sameSub.name;
            } else {
                displaySubSectionName = emp.subSections[0].name;
            }
        }

        const isFemale = emp.gender === 'female';
        const isHarianLimit = isHarianReachingLimit(emp);

        return (
            <motion.div
                key={empId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                    if (!isDisabled) {
                        toggleEmployeeSelection(empId);
                    }
                }}
                className={`cursor-pointer text-left p-3 rounded-md border transition relative ${
                    isSelected
                        ? multiSelectMode
                            ? 'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 ring-2 ring-green-500 dark:ring-green-400'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : isCurrentlyScheduled
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                            : isAssigned
                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-60'
                                : isFemale
                                    ? 'hover:bg-pink-50 dark:hover:bg-pink-900/20 border-pink-200 dark:border-pink-700'
                                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''} ${
                    isHarianLimit ? 'ring-2 ring-red-500 dark:ring-red-400' : ''
                }`}
            >
                {/* Harian Limit Warning Badge */}
                {isHarianLimit && (
                     <div className="absolute top-2 right-10 z-10">
                    <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 whitespace-nowrap flex items-center border border-red-300 dark:border-red-700">
                        ⚠️ Limit 21 Hari
                    </span>
                </div>
                )}

                {multiSelectMode && (
                    <div className="absolute top-2 right-2">
                        <input
                            type="checkbox"
                            checked={isSelectedInMulti}
                            onChange={() => {
                                if (!isAssigned) {
                                    toggleEmployeeSelection(empId);
                                }
                            }}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                            disabled={isAssigned}
                        />
                    </div>
                )}

                <div className="flex justify-between items-start">
                    <div className={`flex ${multiSelectMode ? 'pr-8' : ''}`}>
                        <div className="min-w-0 flex-1">
                            <strong className="text-gray-900 dark:text-gray-100 text-sm sm:text-base block truncate">
                                {emp.name}
                            </strong>
                            <div className="mt-1 text-gray-500 dark:text-gray-400 text-xs">
                                <p className="truncate">NIK: {emp.nik}</p>
                                <p className="truncate">Tipe: {emp.type}</p>
                                <p className="truncate">Status: {emp.status === 'assigned' ? 'Assigned' : 'Available'}</p>
                                <p className="truncate">Sub: {displaySubSectionName}</p>
                                
                                {/* Work Days Information */}
                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs border-t pt-1 border-gray-200 dark:border-gray-600">
                                    <div className={isHarianLimit ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                                        <span className="font-medium">Hari Kerja (2M):</span>
                                        <br />
                                        {emp.work_days_14_days || 0} hari
                                    </div>
                                    <div className={isHarianLimit ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                                        <span className="font-medium">Periode (1B):</span>
                                        <br />
                                        {emp.work_days_30_days || 0} hari
                                        {isHarianLimit && (
                                            <span className="ml-1 text-red-500">⚠️</span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* ML Scores Section */}
                                <div className="mt-2 grid grid-cols-3 gap-1 text-xs border-t pt-1 border-gray-200 dark:border-gray-600">
                                    <div>
                                        <span className="font-medium">Base:</span>
                                        <br />
                                        {emp.total_score?.toFixed(2) || '0.00'}
                                    </div>
                                    <div>
                                        <span className="font-medium">ML:</span>
                                        <br />
                                        {emp.ml_score?.toFixed(2) || '0.00'}
                                    </div>
                                    <div>
                                        <span className="font-medium text-green-600 dark:text-green-400">Final:</span>
                                        <br />
                                        {emp.final_score?.toFixed(2) || '0.00'}
                                    </div>
                                </div>
                                
                                {/* Additional Info */}
                                <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                                    <p>Blind Test: {emp.blind_test_points}</p>
                                    <p>Rating: {emp.average_rating?.toFixed(1) || '0.0'}</p>
                                </div>

                                {/* Last 5 Shifts */}
                                <div className="mt-2 text-xs border-t pt-1 border-gray-200 dark:border-gray-600">
                                    <span className="font-medium">Shift Terakhir (5 hari):</span>
                                    <div className="mt-1 max-h-16 overflow-y-auto">
                                        {emp.last_5_shifts && emp.last_5_shifts.length > 0 ? (
                                            emp.last_5_shifts.map((shift, index) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="truncate flex-1">{shift.date}:</span>
                                                    <span className="font-medium ml-1">{shift.shift_name || 'N/A'}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-gray-400">Tidak ada data</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {!multiSelectMode && (
                        <div className="flex flex-col items-end shrink-0 ml-2">
                            <span className={`text-xs px-1 rounded mb-1 ${
                                isFemale
                                    ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                            }`}>
                                {isFemale ? 'P' : 'L'}
                            </span>
                            {isCurrentlyScheduled && (
                                <span className="text-xs px-1 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 whitespace-nowrap">
                                    Terjadwal
                                </span>
                            )}
                            {isAssigned && !isCurrentlyScheduled && (
                                <span className="text-xs px-1 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 whitespace-nowrap">
                                    Ditugaskan
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    if (!showModal) return null;

    return (
        <>
            {/* Main Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 overflow-y-auto"
                    >
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                            onClick={() => setShowModal(false)}
                        />
                        
                        {/* Modal Content */}
                        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="relative bg-white dark:bg-gray-800 shadow-xl rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header with close button */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center space-x-2 sm:space-x-4 mb-2 sm:mb-0">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg sm:text-xl">
                                            {multiSelectMode ? 'Pilih Multiple Karyawan' : 'Pilih Karyawan Baru'}
                                            {isBulkMode && ' (Bulk Mode)'}
                                        </h3>
                                        {multiSelectMode && (
                                            <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full whitespace-nowrap">
                                                {tempSelectedIds.length} / {currentRequest.requested_amount} terpilih
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Loading Overlay */}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 z-10 flex items-center justify-center"
                                    >
                                        <div className="text-center">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
                                            />
                                            <p className="text-gray-600 dark:text-gray-300 font-medium">
                                                Memuat data karyawan...
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Multi-select mode toggle */}
                                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                            <button
                                                onClick={toggleMultiSelectMode}
                                                disabled={isLoading}
                                                className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base w-full sm:w-auto ${
                                                    multiSelectMode
                                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {multiSelectMode ? '📋 Mode Multi-Select' : '🔄 Mode Single Select'}
                                            </button>

                                            {multiSelectMode && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setTempSelectedIds([])}
                                                        disabled={isLoading}
                                                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        🗑️ Clear All
                                                    </button>
                                                    <button
                                                        onClick={handleSelectTopEmployees}
                                                        disabled={isLoading}
                                                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        ✅ Select Top {Math.min(currentRequest.requested_amount, filteredEmployees.length)}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {multiSelectMode && (
                                            <div className="flex space-x-2 w-full sm:w-auto">
                                                <button
                                                    onClick={cancelMultiSelection}
                                                    disabled={isLoading}
                                                    className="px-3 sm:px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors text-sm sm:text-base flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ❌ Batal
                                                </button>
                                                <button
                                                    onClick={applyMultiSelection}
                                                    disabled={isLoading}
                                                    className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm sm:text-base flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ✅ Terapkan
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Search and Filter Section */}
                                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                                        {/* Search Input */}
                                        <div className="flex-1">
                                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Cari berdasarkan Nama atau NIK
                                            </label>
                                            <input
                                                type="text"
                                                id="search"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Ketik nama atau NIK karyawan..."
                                                disabled={isLoading}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* SubSection Filter */}
                                        <div className="lg:w-1/3">
                                            <label htmlFor="subsection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Filter berdasarkan Sub-Bagian
                                            </label>
                                            <select
                                                id="subsection"
                                                value={selectedSubSection}
                                                onChange={(e) => setSelectedSubSection(e.target.value)}
                                                disabled={isLoading}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="all">Semua Sub-Bagian</option>
                                                {availableSubSections.map(subSection => (
                                                    <option key={subSection.id} value={subSection.id}>
                                                        {subSection.section_name} - {subSection.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Clear Filters */}
                                        <div className="flex items-end">
                                            <button
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSelectedSubSection('all');
                                                }}
                                                disabled={isLoading}
                                                className="px-3 sm:px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors text-sm sm:text-base w-full lg:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Reset Filter
                                            </button>
                                        </div>
                                    </div>

                                    {/* Results Summary */}
                                    <div className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        {isLoading ? (
                                            <div className="flex items-center space-x-2">
                                                <motion.div
                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                                />
                                                <span>Memuat data karyawan...</span>
                                            </div>
                                        ) : (
                                            <>
                                                Menampilkan {filteredEmployees.length} dari {allSortedEligibleEmployees.length} karyawan
                                                {searchTerm && ` • Pencarian: "${searchTerm}"`}
                                                {selectedSubSection !== 'all' && ` • Filter: ${availableSubSections.find(s => s.id === selectedSubSection)?.section_name} - ${availableSubSections.find(s => s.id === selectedSubSection)?.name}`}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Employee List */}
                                <div className="overflow-y-auto max-h-[40vh] sm:max-h-[50vh] p-4 sm:p-6">
                                    {isLoading ? (
                                        // Loading Skeletons
                                        <div className="space-y-6">
                                            {/* Same Sub-Section Skeleton */}
                                            <div className="mb-6 sm:mb-8">
                                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
                                                <div className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                    {[...Array(3)].map((_, i) => (
                                                        <EmployeeCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Other Sub-Section Skeleton */}
                                            <div>
                                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                                                <div className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                    {[...Array(6)].map((_, i) => (
                                                        <EmployeeCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Actual Employee Data
                                        <>
                                            {/* Same Sub-Section Employees */}
                                            {sameSubSectionEmployees.length > 0 && (
                                                <div className="mb-6 sm:mb-8">
                                                    <h4 className="mb-3 sm:mb-4 font-semibold text-gray-700 dark:text-gray-300 text-base sm:text-lg flex items-center">
                                                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-2"></span>
                                                        Karyawan dari Sub-Bagian Sama ({currentRequest?.sub_section?.name || 'Unknown'}) - {sameSubSectionEmployees.length} orang
                                                    </h4>
                                                    <div className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                        {sameSubSectionEmployees.map(renderEmployeeCard)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other Sub-Section Employees */}
                                            {otherSubSectionEmployees.length > 0 && (
                                                <div>
                                                    <h4 className="mb-3 sm:mb-4 font-semibold text-gray-700 dark:text-gray-300 text-base sm:text-lg flex items-center">
                                                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-2"></span>
                                                        Karyawan dari Sub-Bagian Lain - {otherSubSectionEmployees.length} orang
                                                    </h4>
                                                    <div className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                        {otherSubSectionEmployees.map(renderEmployeeCard)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* No Results */}
                                            {filteredEmployees.length === 0 && (
                                                <div className="text-center py-8 sm:py-12">
                                                    <div className="text-gray-400 dark:text-gray-500 text-4xl sm:text-6xl mb-3 sm:mb-4">
                                                        🔍
                                                    </div>
                                                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                                        Tidak ada karyawan ditemukan
                                                    </h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                                                        Coba ubah kata kunci pencarian atau filter yang digunakan
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Footer */}
                                {!multiSelectMode && (
                                    <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            disabled={isLoading}
                                            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 px-4 sm:px-6 py-2 rounded-lg text-gray-700 dark:text-gray-200 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Incomplete Selection Modal */}
            {showIncompleteModal && (
                <IncompleteSelectionModal
                    show={showIncompleteModal}
                    onClose={() => setShowIncompleteModal(false)}
                    onConfirm={() => {
                        handleMultiSelect(tempSelectedIds);
                        setShowIncompleteModal(false);
                        setShowModal(false);
                    }}
                    request={currentRequest}
                    selectedCount={tempSelectedIds.length}
                    requiredMale={currentRequest.male_count || 0}
                    requiredFemale={currentRequest.female_count || 0}
                    currentMaleCount={tempSelectedIds.filter(id => {
                        const emp = allSortedEligibleEmployees.find(e => String(e.id) === String(id));
                        return emp?.gender === 'male';
                    }).length}
                    currentFemaleCount={tempSelectedIds.filter(id => {
                        const emp = allSortedEligibleEmployees.find(e => String(e.id) === String(id));
                        return emp?.gender === 'female';
                    }).length}
                />
            )}
        </>
    );
}