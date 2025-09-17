import { useState, useMemo } from 'react';

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
    isBulkMode = false
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [subsectionFilter, setSubsectionFilter] = useState('all');
    const [selectedForMultiSelect, setSelectedForMultiSelect] = useState([]);

    const filteredEmployees = useMemo(() => {
        return allSortedEligibleEmployees.filter(emp => {
            // Search filter
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.nik.toLowerCase().includes(searchTerm.toLowerCase());

            // Gender filter
            const matchesGender = genderFilter === 'all' || emp.gender === genderFilter;

            // Type filter
            const matchesType = typeFilter === 'all' || emp.type === typeFilter;

            // Subsection filter
            const matchesSubsection = subsectionFilter === 'all' || 
                emp.subSections.some(ss => ss.id.toString() === subsectionFilter);

            return matchesSearch && matchesGender && matchesType && matchesSubsection;
        });
    }, [allSortedEligibleEmployees, searchTerm, genderFilter, typeFilter, subsectionFilter]);

    const uniqueSubsections = useMemo(() => {
        const subsections = new Map();
        allSortedEligibleEmployees.forEach(emp => {
            emp.subSections.forEach(ss => {
                if (!subsections.has(ss.id)) {
                    subsections.set(ss.id, ss);
                }
            });
        });
        return Array.from(subsections.values());
    }, [allSortedEligibleEmployees]);

   const handleEmployeeClick = (employeeId) => {
    if (multiSelectMode) {
        setSelectedForMultiSelect(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            } else {
                return [...prev, employeeId];
            }
        });
    } else {
        // Handle bulk mode selection
        if (isBulkMode && activeBulkRequest) {
            selectNewEmployee(employeeId);
        } else {
            selectNewEmployee(employeeId);
        }
    }
};

    const applyMultiSelect = () => {
        if (selectedForMultiSelect.length > 0) {
            const success = handleMultiSelect(selectedForMultiSelect);
            if (success) {
                setSelectedForMultiSelect([]);
                setShowModal(false);
            }
        }
    };

    const isSelected = (employeeId) => {
        if (multiSelectMode) {
            return selectedForMultiSelect.includes(employeeId);
        }
        return selectedIds.includes(employeeId);
    };

    if (!showModal) return null;

    return (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-4 border-gray-200 dark:border-gray-700 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                            {multiSelectMode ? 'Pilih Banyak Karyawan' : 'Pilih Karyawan'}
                        </h3>
                        <button
                            onClick={() => {
                                setShowModal(false);
                                setSelectedForMultiSelect([]);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-4 border-gray-200 dark:border-gray-700 border-b">
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Cari nama atau NIK..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full dark:text-white"
                            />
                        </div>
                        <select
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
                        >
                            <option value="all">Semua Gender</option>
                            <option value="male">Laki-laki</option>
                            <option value="female">Perempuan</option>
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
                        >
                            <option value="all">Semua Jenis</option>
                            <option value="bulanan">Bulanan</option>
                            <option value="harian">Harian</option>
                        </select>
                        <select
                            value={subsectionFilter}
                            onChange={(e) => setSubsectionFilter(e.target.value)}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
                        >
                            <option value="all">Semua Sub Bagian</option>
                            {uniqueSubsections.map(ss => (
                                <option key={ss.id} value={ss.id}>
                                    {ss.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                            Menampilkan {filteredEmployees.length} dari {allSortedEligibleEmployees.length} karyawan
                        </span>
                        <button
                            onClick={toggleMultiSelectMode}
                            className={`px-3 py-1 rounded text-sm ${
                                multiSelectMode 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                            }`}
                        >
                            {multiSelectMode ? 'Mode Single' : 'Mode Multi'}
                        </button>
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {multiSelectMode && <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Pilih</th>}
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Nama</th>
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">NIK</th>
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Jenis</th>
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Gender</th>
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Sub Bagian</th>
                                <th className="p-3 font-medium text-gray-500 dark:text-gray-300 text-xs text-left uppercase">Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {filteredEmployees.map((employee) => (
                                <tr
                                    key={employee.id}
                                    onClick={() => handleEmployeeClick(employee.id)}
                                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                        isSelected(employee.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    } ${employee.isCurrentlyScheduled ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                                >
                                    {multiSelectMode && (
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected(employee.id)}
                                                onChange={() => handleEmployeeClick(employee.id)}
                                                className="rounded"
                                            />
                                        </td>
                                    )}
                                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                                        {employee.name}
                                        {employee.isCurrentlyScheduled && (
                                            <span className="bg-green-100 dark:bg-green-800 ml-2 px-2 py-1 rounded-full text-green-800 dark:text-green-200 text-xs">
                                                Terjadwal
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">{employee.nik}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            employee.type === 'bulanan'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        }`}>
                                            {employee.type}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            employee.gender === 'female'
                                                ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                            {employee.gender === 'female' ? 'Perempuan' : 'Laki-laki'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                        {employee.subSections?.[0]?.name || '-'}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                        {((employee.workload_points || 0) + (employee.blind_test_points || 0) + (employee.average_rating || 0)).toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {multiSelectMode && (
                    <div className="p-4 border-gray-200 dark:border-gray-700 border-t">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                                {selectedForMultiSelect.length} karyawan terpilih
                            </span>
                            <button
                                onClick={applyMultiSelect}
                                disabled={selectedForMultiSelect.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 px-4 py-2 rounded text-white disabled:cursor-not-allowed"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}