import { useState, useMemo } from 'react';
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
    toggleMultiSelectMode
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubSection, setSelectedSubSection] = useState('all');
    const [tempSelectedIds, setTempSelectedIds] = useState([]);
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);

    const availableSubSections = useMemo(() => {
        const subSectionMap = new Map();

        allSortedEligibleEmployees.forEach(emp => {
            emp.subSections.forEach(subSection => {
                if (!subSectionMap.has(subSection.id)) {
                    subSectionMap.set(subSection.id, {
                        id: subSection.id,
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
            const subSectionId = parseInt(selectedSubSection);
            filtered = filtered.filter(emp =>
                emp.subSections.some(ss => ss.id === subSectionId)
            );
        }

        return filtered;
    }, [allSortedEligibleEmployees, searchTerm, selectedSubSection]);

    // FIXED: More robust sub-section filtering
    // FIXED: Comprehensive sub-section filtering with better type handling
    const sameSubSectionEmployees = useMemo(() => {
        const reqSubId = request?.sub_section_id;
        if (!reqSubId) return [];

        return filteredEmployees.filter(emp => {
            if (!emp.subSections || !Array.isArray(emp.subSections)) return false;

            return emp.subSections.some(ss => {
                if (!ss || !ss.id) return false;

                // Try multiple comparison methods
                const ssId = ss.id;
                const matches =
                    ssId == reqSubId || // Loose equality
                    String(ssId) === String(reqSubId) || // String comparison
                    Number(ssId) === Number(reqSubId); // Number comparison

                return matches;
            });
        });
    }, [filteredEmployees, request?.sub_section_id]);

    const otherSubSectionEmployees = useMemo(() => {
        const reqSubId = request?.sub_section_id;
        if (!reqSubId) return filteredEmployees;

        return filteredEmployees.filter(emp => {
            if (!emp.subSections || !Array.isArray(emp.subSections)) return true;

            return !emp.subSections.some(ss => {
                if (!ss || !ss.id) return false;

                const ssId = ss.id;
                const matches =
                    ssId == reqSubId ||
                    String(ssId) === String(reqSubId) ||
                    Number(ssId) === Number(reqSubId);

                return matches;
            });
        });
    }, [filteredEmployees, request?.sub_section_id]);


    // Rest of the component remains the same...
    const toggleEmployeeSelection = (employeeId) => {
        if (!multiSelectMode) {
            selectNewEmployee(employeeId);
            return;
        }

        setTempSelectedIds(prev => {
            const isCurrentlySelected = prev.includes(employeeId);
            const newEmployee = allSortedEligibleEmployees.find(e => e.id === employeeId);

            if (isCurrentlySelected) {
                return prev.filter(id => id !== employeeId);
            } else {
                if (prev.length >= request.requested_amount) {
                    alert(`Maksimum ${request.requested_amount} karyawan dapat dipilih`);
                    return prev;
                }

                const currentSelection = prev.map(id =>
                    allSortedEligibleEmployees.find(e => e.id === id)
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

                return [...prev, employeeId];
            }
        });
    };

    const applyMultiSelection = () => {
        const finalSelection = tempSelectedIds.map(id =>
            allSortedEligibleEmployees.find(e => e.id === id)
        ).filter(Boolean);

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
            // Show incomplete selection modal
            setShowIncompleteModal(true);
        }
    };

    const cancelMultiSelection = () => {
        setTempSelectedIds([]);
        setShowModal(false);
    };

    const renderEmployeeCard = (emp) => {
        const isSelectedInSingle = selectedIds.includes(emp.id);
        const isSelectedInMulti = tempSelectedIds.includes(emp.id);
        const isSelected = multiSelectMode ? isSelectedInMulti : isSelectedInSingle;
        const isCurrentlyScheduled = emp.isCurrentlyScheduled;
        const isDisabledInSingle = !multiSelectMode && isSelectedInSingle;

        let displaySubSectionName = 'Tidak Ada Bagian';
        if (emp.subSections && emp.subSections.length > 0) {
            const sameSub = emp.subSections.find(ss => ss.id === request.sub_section_id);
            if (sameSub) {
                displaySubSectionName = sameSub.name;
            } else {
                displaySubSectionName = emp.subSections[0].name;
            }
        }

        const isFemale = emp.gender === 'female';

        return (
            <div
                key={emp.id}
                onClick={() => !isDisabledInSingle && toggleEmployeeSelection(emp.id)}
                className={`cursor-pointer text-left p-3 rounded-md border transition relative ${isSelected
                    ? multiSelectMode
                        ? 'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 ring-2 ring-green-500 dark:ring-green-400'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : isCurrentlyScheduled
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                        : isFemale
                            ? 'hover:bg-pink-50 dark:hover:bg-pink-900/20 border-pink-200 dark:border-pink-700'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    } ${isDisabledInSingle ? 'cursor-not-allowed opacity-60' : ''}`}
            >
                {multiSelectMode && (
                    <div className="absolute top-2 right-2">
                        <input
                            type="checkbox"
                            checked={isSelectedInMulti}
                            onChange={() => { }} // Handled by parent click
                            className="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                    </div>
                )}

                <div className="flex justify-between items-start">
                    <div className={`flex ${multiSelectMode ? 'pr-8' : ''}`}>
                        {/* Employee Photo */}
                        <div className="mr-3 flex-shrink-0">
                            {emp.photo ? (
                                <img
                                    src={`/storage/${emp.photo}`}
                                    alt={emp.name}
                                    className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 ${emp.photo ? 'hidden' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className="text-gray-500 dark:text-gray-400 text-lg font-semibold">
                                    {emp.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div>
                            <strong className="text-gray-900 dark:text-gray-100">{emp.name}</strong>
                            <div className="mt-1 text-gray-500 dark:text-gray-400 text-xs">
                                <p>NIK: {emp.nik}</p>
                                <p>Tipe: {emp.type}</p>
                                <p>Sub: {displaySubSectionName}</p>
                                <p>Skor: {emp.total_score.toFixed(2)}</p>
                                {emp.type === 'harian' && (
                                    <p>Bobot Kerja: {emp.working_day_weight}</p>
                                )}
                                <p>Beban Kerja: {emp.workload_points}</p>
                                <p>Test Buta: {emp.blind_test_points}</p>
                                <p>Rating: {emp.average_rating.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                    {!multiSelectMode && (
                        <div className="flex flex-col items-end">
                            <span className={`text-xs px-1 rounded mb-1 ${isFemale
                                ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                }`}>
                                {isFemale ? 'P' : 'L'}
                            </span>
                            {isCurrentlyScheduled && (
                                <span className="text-xs px-1 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                    Sudah dijadwalkan
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!showModal) return null;

    return (
        <div
            className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowModal(false)}
        >
            <div
                className="relative bg-white dark:bg-gray-800 shadow-xl rounded-lg w-full max-w-6xl max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with close button */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">
                            {multiSelectMode ? 'Pilih Multiple Karyawan' : 'Pilih Karyawan Baru'}
                        </h3>
                        {multiSelectMode && (
                            <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">
                                {tempSelectedIds.length} / {request.requested_amount} terpilih
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowModal(false)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Multi-select mode toggle */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={toggleMultiSelectMode}
                                className={`px-4 py-2 rounded-md font-medium transition-colors ${multiSelectMode
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {multiSelectMode ? '📋 Mode Multi-Select' : '🔄 Mode Single Select'}
                            </button>

                            {multiSelectMode && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setTempSelectedIds([])}
                                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-md"
                                    >
                                        🗑️ Clear All
                                    </button>
                                    <button
                                        onClick={() => {
                                            const availableIds = filteredEmployees
                                                .slice(0, request.requested_amount)
                                                .map(emp => emp.id);
                                            setTempSelectedIds(availableIds);
                                        }}
                                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-md"
                                    >
                                        ✅ Select Top {Math.min(request.requested_amount, filteredEmployees.length)}
                                    </button>
                                </div>
                            )}
                        </div>

                        {multiSelectMode && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={cancelMultiSelection}
                                    className="px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors"
                                >
                                    ❌ Batal
                                </button>
                                <button
                                    onClick={applyMultiSelection}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                                >
                                    ✅ Terapkan Pilihan
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex flex-col md:flex-row gap-4">
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
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* SubSection Filter */}
                        <div className="md:w-1/3">
                            <label htmlFor="subsection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Filter berdasarkan Sub-Bagian
                            </label>
                            <select
                                id="subsection"
                                value={selectedSubSection}
                                onChange={(e) => setSelectedSubSection(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                className="px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors"
                            >
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    {/* Results Summary */}
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        Menampilkan {filteredEmployees.length} dari {allSortedEligibleEmployees.length} karyawan
                        {searchTerm && ` • Pencarian: "${searchTerm}"`}
                        {selectedSubSection !== 'all' && ` • Filter: ${availableSubSections.find(s => s.id === parseInt(selectedSubSection))?.section_name} - ${availableSubSections.find(s => s.id === parseInt(selectedSubSection))?.name}`}
                    </div>
                </div>

                {/* Employee List */}
                <div className="overflow-y-auto max-h-[50vh] p-6">
                    {/* Same Sub-Section Employees */}
                    {sameSubSectionEmployees.length > 0 && (
                        <div className="mb-8">
                            <h4 className="mb-4 font-semibold text-lg text-gray-700 dark:text-gray-300 flex items-center">
                                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                Karyawan dari Sub-Bagian Sama ({request?.sub_section?.name || 'Unknown'}) - {sameSubSectionEmployees.length} orang
                            </h4>
                            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {sameSubSectionEmployees.map(renderEmployeeCard)}
                            </div>
                        </div>
                    )}

                    {/* Other Sub-Section Employees */}
                    {otherSubSectionEmployees.length > 0 && (
                        <div>
                            <h4 className="mb-4 font-semibold text-lg text-gray-700 dark:text-gray-300 flex items-center">
                                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                                Karyawan dari Sub-Bagian Lain - {otherSubSectionEmployees.length} orang
                            </h4>
                            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {otherSubSectionEmployees.map(renderEmployeeCard)}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {filteredEmployees.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                                🔍
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Tidak ada karyawan ditemukan
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Coba ubah kata kunci pencarian atau filter yang digunakan
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!multiSelectMode && (
                    <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 px-6 py-2 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                )}

                {showIncompleteModal && (
                    <IncompleteSelectionModal
                        show={showIncompleteModal}
                        onClose={() => setShowIncompleteModal(false)}
                        onConfirm={() => {
                            handleMultiSelect(tempSelectedIds);
                            setShowIncompleteModal(false);
                            setShowModal(false);
                        }}
                        request={request}
                        selectedCount={tempSelectedIds.length}
                        requiredMale={request.male_count || 0}
                        requiredFemale={request.female_count || 0}
                        currentMaleCount={tempSelectedIds.filter(id => {
                            const emp = allSortedEligibleEmployees.find(e => e.id === id);
                            return emp?.gender === 'male';
                        }).length}
                        currentFemaleCount={tempSelectedIds.filter(id => {
                            const emp = allSortedEligibleEmployees.find(e => e.id === id);
                            return emp?.gender === 'female';
                        }).length}
                    />
                )}
            </div>
        </div>
    );
}