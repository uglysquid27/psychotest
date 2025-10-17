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

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                    Karyawan Terpilih ({selectedIds.length}/{request.requested_amount})
                </h3>
                {/* <button
                    type="button"
                    onClick={toggleMultiSelectMode}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        multiSelectMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                >
                    {multiSelectMode ? '✖️ Tutup Multi Select' : '🔍 Mode Multi Select'}
                </button> */}
            </div>

            {/* Warning for assigned employees */}
            {hasAssignedEmployees && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 mb-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                            Beberapa karyawan sudah ditugaskan di request lain dan tidak dapat dipilih.
                        </span>
                    </div>
                </div>
            )}

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: request.requested_amount }).map((_, index) => {
                    const employeeId = selectedIds[index];
                    const employee = employeeId ? getEmployeeDetails(employeeId) : null;
                    const isAssigned = employee && employee.status === 'assigned' && !employee.isCurrentlyScheduled;

                    return (
                        <div
                            key={index}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                employee
                                    ? employee.isCurrentlyScheduled
                                        ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                        : isAssigned
                                            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
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
                                        {isAssigned && (
                                            <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-1 rounded">
                                                Assigned
                                            </span>
                                        )}
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
                                    {isAssigned && (
                                        <div className="mt-1 text-red-600 dark:text-red-400 text-xs">
                                            ⚠ Sudah ditugaskan di request lain
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
                                onClick={() => !isAssigned && openChangeModal(index)}
                                disabled={isAssigned}
                                className={`mt-3 px-2 py-1 rounded w-full text-sm transition-colors ${
                                    isAssigned
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {employee ? (isAssigned ? 'Tidak Dapat Diganti' : 'Ganti') : 'Pilih'} Karyawan
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}