import React, { useMemo } from 'react';

export default function BulkEmployeePreview({
    selectedBulkRequests,
    sameDayRequests,
    allSortedEligibleEmployees,
    strategy
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
        return chosenRequests.map(req => ({
            request: req,
            employees: assignEmployees(req)
        }));
    }, [chosenRequests, allSortedEligibleEmployees, strategy]);

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

            {assignments.map(({ request, employees }) => (
                <div key={request.id} className="mb-6">
                    <h4 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
                        {request.shift?.name || 'No Shift'} • {request.requested_amount} orang • Sub: {request.sub_section?.name}
                    </h4>

                    <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {employees.map(emp => (
                            <div
                                key={emp.id}
                                className="bg-gray-50 dark:bg-gray-700 p-3 border border-gray-200 dark:border-gray-600 rounded-md"
                            >
                                <div className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm">
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
    );
}
