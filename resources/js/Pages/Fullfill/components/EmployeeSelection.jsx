// EmployeeSelection.jsx - Updated with red indicator for harian employees reaching 21 days
import { motion } from 'framer-motion';

export default function EmployeeSelection({
    request,
    selectedIds,
    getEmployeeDetails,
    openChangeModal,
    multiSelectMode,
    toggleMultiSelectMode,
    isPutwaySubsection,
    lineAssignments
}) {
    
    
    // Check if any selected employees are assigned to other requests
    const hasAssignedEmployees = selectedIds.some(id => {
        const emp = getEmployeeDetails(id);
        return emp && emp.status === 'assigned' && !emp.isCurrentlyScheduled;
    });

    // Check if harian employee has reached 21 days
    const isHarianReachingLimit = (emp) => {
        return emp.type === 'harian' && emp.work_days_30_days >= 21;
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-4 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg sm:text-xl">
                        Karyawan yang Dipilih
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                        {selectedIds.length} dari {request.requested_amount} karyawan terpilih
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={toggleMultiSelectMode}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm sm:text-base"
                    >
                        {multiSelectMode ? 'Mode Multi-Select' : 'Mode Single Select'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={openChangeModal}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm sm:text-base"
                    >
                        {selectedIds.length === 0 ? 'Pilih Karyawan' : 'Ubah Pilihan'}
                    </button>
                </div>
            </div>

            {/* Selected Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {selectedIds.map((id, index) => {
                    const emp = getEmployeeDetails(id);
                    if (!emp) return null;

                    const isAssigned = emp.status === 'assigned' && !emp.isCurrentlyScheduled;
                    const isCurrentlyScheduled = emp.isCurrentlyScheduled;
                    const isFemale = emp.gender === 'female';
                    const isHarianLimit = isHarianReachingLimit(emp);

                    return (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`border rounded-lg p-3 sm:p-4 relative ${
                                isCurrentlyScheduled
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                    : isAssigned
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                                        : isFemale
                                            ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700'
                                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                            } ${isHarianLimit ? 'ring-2 ring-red-500 dark:ring-red-400' : ''}`}
                        >
                            {/* Harian Limit Warning Badge */}
                            {isHarianLimit && (
                                <div className="absolute top-2 right-10 z-10">
                    <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 whitespace-nowrap flex items-center border border-red-300 dark:border-red-700">
                        ⚠️ Limit 21 Hari
                    </span>
                </div>
                            )}

                            {/* Gender Badge */}
                            <div className="absolute top-2 right-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                    isFemale
                                        ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                }`}>
                                    {isFemale ? 'P' : 'L'}
                                </span>
                            </div>

                            {/* Status Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {isCurrentlyScheduled && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 whitespace-nowrap">
                                        Terjadwal
                                    </span>
                                )}
                                {isAssigned && !isCurrentlyScheduled && (
                                    <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 whitespace-nowrap">
                                        Ditugaskan
                                    </span>
                                )}
                            </div>

                            {/* Employee Information */}
                            <div className="mt-6">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
                                    {emp.name}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">NIK: {emp.nik}</p>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">Tipe: {emp.type}</p>
                                
                                {/* Work Days Information */}
                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs border-t pt-2 border-gray-200 dark:border-gray-600">
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
                                <div className="mt-2 grid grid-cols-3 gap-1 text-xs border-t pt-2 border-gray-200 dark:border-gray-600">
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
                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                    {/* <p>Workload: {emp.workload_points}</p> */}
                                    <p>Blind Test: {emp.blind_test_points}</p>
                                    <p>Rating: {emp.average_rating?.toFixed(1) || '0.0'}</p>
                                </div>

                                {/* Last 5 Shifts */}
                                <div className="mt-2 text-xs border-t pt-2 border-gray-200 dark:border-gray-600">
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

                            {/* Change Employee Button */}
                            <button
                                type="button"
                                onClick={() => !isAssigned && openChangeModal(index)}
                                disabled={isAssigned}
                                className={`mt-3 w-full px-3 py-2 rounded text-sm transition-colors ${
                                    isAssigned
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {emp ? (isAssigned ? 'Tidak Dapat Diganti' : 'Ganti Karyawan') : 'Pilih Karyawan'}
                            </button>
                        </motion.div>
                    );
                })}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, request.requested_amount - selectedIds.length) }).map((_, index) => (
                    <motion.div
                        key={`empty-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: (selectedIds.length + index) * 0.1 }}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center min-h-[120px] text-center"
                    >
                        <div className="text-gray-400 dark:text-gray-500 text-2xl mb-2">
                            👤
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Slot Kosong
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            Klik ubah pilihan untuk menambahkan
                        </p>
                    </motion.div>
                ))}
            </div>
            

            {/* Warning Message for Assigned Employees */}
            {hasAssignedEmployees && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
                >
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                            Beberapa karyawan yang dipilih sudah ditugaskan di request lain. Mereka mungkin tidak tersedia.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}