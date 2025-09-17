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
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                    Karyawan Terpilih ({selectedIds.length}/{request.requested_amount})
                </h3>
                <button
                    type="button"
                    onClick={toggleMultiSelectMode}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        multiSelectMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                >
                    {multiSelectMode ? '✖️ Tutup Multi Select' : '🔍 Mode Multi Select'}
                </button>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: request.requested_amount }).map((_, index) => {
                    const employeeId = selectedIds[index];
                    const employee = employeeId ? getEmployeeDetails(employeeId) : null;

                    return (
                        <div
                            key={index}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                employee
                                    ? employee.isCurrentlyScheduled
                                        ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                        : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                                    #{index + 1}
                                </span>
                                {isPutwaySubsection && employee && (
                                    <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full font-medium text-purple-800 dark:text-purple-300 text-xs">
                                        Line {lineAssignments[employee.id]}
                                    </span>
                                )}
                            </div>

                            {employee ? (
                                <div className="space-y-1">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                        {employee.name}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                                        {employee.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'} • {employee.type}
                                    </div>
                                    {employee.subSections && (
                                        <div className="text-gray-500 dark:text-gray-500 text-xs">
                                            Sub: {employee.subSections.map(ss => ss.name).join(', ')}
                                        </div>
                                    )}
                                    {employee.isCurrentlyScheduled && (
                                        <div className="mt-1 text-green-600 dark:text-green-400 text-xs">
                                            ✓ Sudah dijadwalkan
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-500 dark:text-gray-400 italic">
                                    Belum dipilih
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => openChangeModal(index)}
                                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 mt-3 px-2 py-1 rounded w-full text-gray-700 dark:text-gray-300 text-sm transition-colors"
                            >
                                {employee ? 'Ganti' : 'Pilih'} Karyawan
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}