// resources/js/Pages/ManpowerRequests/BulkEmployeeModal.jsx
import { useState, useMemo } from 'react';

export default function BulkEmployeeModal({
    showModal,
    setShowModal,
    request,
    allSortedEligibleEmployees,
    selectNewEmployee
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubSection, setSelectedSubSection] = useState('all');
    const [failedImages, setFailedImages] = useState(new Set());

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

    // In BulkEmployeeModal.jsx, make sure the handleEmployeeSelect is working correctly
const handleEmployeeSelect = (employeeId) => {
  console.log('Employee selected in modal:', employeeId);
  selectNewEmployee(employeeId);
};

    const renderEmployeeCard = (emp) => {
        const empId = String(emp.id);
        const imageFailed = failedImages.has(empId);
        const photoUrl = getEmployeePhotoUrl(emp);

        let displaySubSectionName = 'Tidak Ada Bagian';
        if (emp.subSections && emp.subSections.length > 0) {
            const sameSub = emp.subSections.find(ss => String(ss.id) === String(request.sub_section_id));
            if (sameSub) {
                displaySubSectionName = sameSub.name;
            } else {
                displaySubSectionName = emp.subSections[0].name;
            }
        }

        const isFemale = emp.gender === 'female';

        return (
            <div
                key={empId}
                onClick={() => handleEmployeeSelect(empId)}
                className={`cursor-pointer text-left p-3 rounded-md border transition relative hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                    isFemale
                        ? 'border-pink-200 dark:border-pink-700'
                        : 'border-blue-200 dark:border-blue-700'
                }`}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                {photoUrl && !imageFailed ? (
                                    <img
                                        src={photoUrl}
                                        alt={emp.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                        onError={(e) => handleImageError(empId, e)}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <strong className="text-gray-900 dark:text-gray-100">{emp.name}</strong>
                                <div className="mt-1 text-gray-500 dark:text-gray-400 text-xs">
                                    <p>NIK: {emp.nik}</p>
                                    <p>Tipe: {emp.type}</p>
                                    <p>Sub: {displaySubSectionName}</p>
                                    <p>Skor: {emp.total_score?.toFixed(2)}</p>
                                    {emp.type === 'harian' && (
                                        <p>Bobot Kerja: {emp.working_day_weight}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`text-xs px-2 py-1 rounded mb-1 ${
                            isFemale
                                ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                        }`}>
                            {isFemale ? 'P' : 'L'}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                            <p>Beban: {emp.workload_points}</p>
                            <p>Test: {emp.blind_test_points}</p>
                            <p>Rating: {emp.average_rating?.toFixed(1)}</p>
                        </div>
                    </div>
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
                            Pilih Karyawan Pengganti
                        </h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {request?.sub_section_name} - {request?.shift_name}
                        </span>
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
                        {selectedSubSection !== 'all' && ` • Filter: ${availableSubSections.find(s => s.id === selectedSubSection)?.section_name} - ${availableSubSections.find(s => s.id === selectedSubSection)?.name}`}
                    </div>
                </div>

                {/* Employee List */}
                <div className="overflow-y-auto max-h-[50vh] p-6">
                    {/* Same Sub-Section Employees */}
                    {sameSubSectionEmployees.length > 0 && (
                        <div className="mb-8">
                            <h4 className="mb-4 font-semibold text-lg text-gray-700 dark:text-gray-300 flex items-center">
                                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                Karyawan dari Sub-Bagian Sama ({request?.sub_section_name || 'Unknown'}) - {sameSubSectionEmployees.length} orang
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
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 px-6 py-2 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}