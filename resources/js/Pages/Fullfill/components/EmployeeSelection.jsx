const safeFixed = (num, decimals = 2) => {
    return typeof num === "number" ? num.toFixed(decimals) : "0.00";
};

export default function EmployeeSelection({
    request,
    selectedIds,
    getEmployeeDetails,
    openChangeModal
}) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="mb-3 font-bold text-lg text-gray-900 dark:text-gray-100">Karyawan Terpilih</h3>
            <div className="gap-4 grid grid-cols-1 lg:grid-cols-2">
                {Array.from({ length: request.requested_amount }).map((_, index) => {
                    const employeeId = selectedIds[index];
                    const employee = getEmployeeDetails(employeeId);
                    const isEmptySlot = !employeeId;
                    const employeeSubSection = employee?.subSections?.find(ss => ss.id === request.sub_section_id);
                    const isFemale = employee?.gender === 'female';
                    const isCurrentlyScheduled = employee?.isCurrentlyScheduled;

                    return (
                        <div 
                            key={employeeId || `slot-${index}`} 
                            className={`flex justify-between items-center space-x-3 p-3 rounded-md transition-colors ${
                                isCurrentlyScheduled 
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
                                    : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center space-x-3 flex-1">
                                <input
                                    type="checkbox"
                                    checked={!isEmptySlot}
                                    readOnly
                                    className={`w-5 h-5 form-checkbox rounded focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                                        isCurrentlyScheduled 
                                            ? 'text-green-600 focus:ring-green-500' 
                                            : 'text-blue-600 focus:ring-blue-500'
                                    }`}
                                />
                                <div className="flex-1">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {isEmptySlot ? `Slot ${index + 1} Kosong` : employee?.name}
                                        </span>
                                        {!isEmptySlot && (
                                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                                                ({employee?.nik || 'N/A'})
                                            </span>
                                        )}
                                    </div>
                                    
                                    {employee && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            {isCurrentlyScheduled && (
                                                <span className="inline-block px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-medium">
                                                    📅 Sudah dijadwalkan
                                                </span>
                                            )}
                                            <span className={`inline-block px-2 py-1 rounded-full font-medium ${
                                                isFemale
                                                    ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300'
                                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                            }`}>
                                                {isFemale ? '👩 Perempuan' : '👨 Laki-laki'}
                                            </span>
                                            <span className="inline-block px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                                                📋 {employee.type}
                                            </span>
                                            <span className="inline-block px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                                                🏢 {employeeSubSection?.name || 'Lain'}
                                            </span>
                                            <span className="inline-block px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                                                ⭐ {safeFixed(employee.total_score, 2)}
                                            </span>
                                            {employee.type === 'harian' && (
                                                <span className="inline-block px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300">
                                                    ⚖️ {employee.working_day_weight}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => openChangeModal(index)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                                    isCurrentlyScheduled 
                                        ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 focus:ring-green-500' 
                                        : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:ring-blue-500'
                                }`}
                            >
                                {isEmptySlot ? '➕ Pilih' : '🔄 Ubah'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}