// BulkEmployeePreview.jsx
import React, { useMemo } from 'react';

export default function BulkEmployeePreview({
    selectedBulkRequests,
    sameDayRequests,
    allSortedEligibleEmployees,
    strategy,
    bulkSelectedEmployees = {},
    getBulkLineAssignment,
    lineAssignmentConfig = {}
}) {
    const chosenRequests = sameDayRequests.filter(req =>
        selectedBulkRequests.includes(req.id)
    );

    // helper ambil kandidat sesuai strategi
    const assignEmployees = (req) => {
        let candidates = [...allSortedEligibleEmployees];

        if (strategy === 'optimal') {
            // Prioritas same subsection + score tinggi
            candidates.sort((a, b) => {
                const aSame = a.subSections.some(ss => String(ss.id) === String(req.sub_section_id));
                const bSame = b.subSections.some(ss => String(ss.id) === String(req.sub_section_id));
                if (aSame !== bSame) return aSame ? -1 : 1;

                const aScore = (a.workload_points || 0) + (a.blind_test_points || 0) + (a.average_rating || 0);
                const bScore = (b.workload_points || 0) + (b.blind_test_points || 0) + (b.average_rating || 0);
                return bScore - aScore;
            });
        } else if (strategy === 'same_section') {
            // Urutkan by section sama dulu
            candidates.sort((a, b) => {
                const aSection = a.subSections.some(ss => ss.section?.id === req.sub_section?.section_id);
                const bSection = b.subSections.some(ss => ss.section?.id === req.sub_section?.section_id);
                return aSection === bSection ? 0 : aSection ? -1 : 1;
            });
        } else if (strategy === 'balanced') {
            // Pilih workload terendah
            candidates.sort((a, b) => (a.workload_points || 0) - (b.workload_points || 0));
        }

        return candidates.slice(0, req.requested_amount);
    };

    const assignments = useMemo(() => {
        return chosenRequests.map(req => {
            // Use manually selected employees if available, otherwise use auto-assigned
            const manuallySelected = bulkSelectedEmployees[String(req.id)];
            const employees = manuallySelected 
                ? manuallySelected.map(id => allSortedEligibleEmployees.find(emp => String(emp.id) === id)).filter(Boolean)
                : assignEmployees(req);

            return {
                request: req,
                employees: employees,
                enableLineAssignment: lineAssignmentConfig[String(req.id)]?.enabled || false
            };
        });
    }, [chosenRequests, allSortedEligibleEmployees, strategy, bulkSelectedEmployees, lineAssignmentConfig]);

    if (chosenRequests.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-md p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100 text-lg">Preview Karyawan</h3>
                <p className="text-gray-500 dark:text-gray-400 italic">Tidak ada request terpilih.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100 text-lg">👥 Preview Karyawan (Strategy: {strategy})</h3>

            {assignments.map(({ request, employees, enableLineAssignment }) => {
                const employeesByLine = {};
                if (enableLineAssignment && getBulkLineAssignment) {
                    employees.forEach(emp => {
                        const line = getBulkLineAssignment(String(request.id), String(emp.id));
                        if (!employeesByLine[line]) employeesByLine[line] = [];
                        employeesByLine[line].push(emp);
                    });
                }

                return (
                    <div key={request.id} className="mb-6">
                        <h4 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
                            {request.shift?.name || 'No Shift'} • {request.requested_amount} orang • Sub: {request.sub_section?.name}
                            {enableLineAssignment && (
                                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs rounded-full">
                                    Line Assignment
                                </span>
                            )}
                        </h4>

                        {enableLineAssignment ? (
                            // Display with line assignment
                            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                                {Object.entries(employeesByLine).map(([lineNumber, lineEmployees]) => (
                                    <div key={lineNumber} className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                                        <h5 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">
                                            Line {lineNumber} ({lineEmployees.length} orang)
                                        </h5>
                                        <div className="gap-2 grid grid-cols-1">
                                            {lineEmployees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className="bg-white dark:bg-gray-700 p-3 border border-purple-200 dark:border-purple-600 rounded-md"
                                                >
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">{emp.name}</div>
                                                    <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                                                        {emp.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'} • {emp.type}
                                                    </div>
                                                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                                                        Skor: {emp.total_score?.toFixed(2)} | Beban: {emp.workload_points}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Display without line assignment
                            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {employees.map(emp => (
                                    <div
                                        key={emp.id}
                                        className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">{emp.name}</div>
                                        <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                                            {emp.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'} • {emp.type}
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                                            Skor: {emp.total_score?.toFixed(2)} | Beban: {emp.workload_points}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}