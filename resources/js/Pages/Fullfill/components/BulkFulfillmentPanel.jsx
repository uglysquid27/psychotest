// BulkFulfillmentPanel.jsx
import { useState } from 'react';

export default function BulkFulfillmentPanel({
    sameDayRequests,
    currentRequest,
    selectedBulkRequests,
    toggleBulkRequestSelection,
    handleBulkSubmit,
    processing,
    bulkSelectedEmployees,
    openBulkChangeModal,
    getEmployeeDetails,
    allSortedEligibleEmployees,
    handleAutoFulfill
}) {
    const [strategy, setStrategy] = useState('optimal');
    const [visibility, setVisibility] = useState('private');
    
    // Get all requests from the same subsection including current request
    const sameSubsectionRequests = sameDayRequests.filter(req => 
        req.sub_section_id === currentRequest.sub_section_id
    );
    
    // Ensure current request is included
    const allRequests = [...sameSubsectionRequests];
    if (!allRequests.some(req => req.id === currentRequest.id)) {
        allRequests.push(currentRequest);
    }

    const totalRequests = allRequests.length;
    const totalEmployeesNeeded = allRequests.reduce((total, req) => total + req.requested_amount, 0);

    // Calculate how many requests have been fully assigned
    const fullyAssignedRequests = Object.keys(bulkSelectedEmployees).filter(
        requestId => {
            const employees = bulkSelectedEmployees[requestId] || [];
            const request = allRequests.find(req => req.id.toString() === requestId);
            return request && employees.length === request.requested_amount && employees.every(id => id);
        }
    ).length;

    return (
        <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-100 dark:to-indigo-900/20 shadow-lg mb-6 p-6 border border-blue-200 dark:border-blue-700 rounded-xl">
            <div className="flex items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-800/40 mr-4 p-3 rounded-full">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 text-2xl">Bulk Fulfillment</h3>
                    <p className="text-blue-600 dark:text-blue-400">Penuhi semua request untuk sub-bagian "{currentRequest.sub_section?.name}" secara sekaligus</p>
                </div>
            </div>

            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">📊 Ringkasan</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Request:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Karyawan Dibutuhkan:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{totalEmployeesNeeded}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Request Terpilih:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{selectedBulkRequests.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Request Terisi Penuh:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {fullyAssignedRequests} / {selectedBulkRequests.length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Sub-Bagian:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {currentRequest.sub_section?.name}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tanggal:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(currentRequest.date).toLocaleDateString('id-ID')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">⚙️ Pengaturan</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                Strategi Penugasan:
                            </label>
                            <select
                                value={strategy}
                                onChange={(e) => setStrategy(e.target.value)}
                                className="bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full text-gray-900 dark:text-gray-100"
                            >
                                <option value="optimal">Optimal (Prioritas Sub-Bagian + Score)</option>
                                <option value="same_section">Same Section (Prioritas Section Sama)</option>
                                <option value="balanced">Balanced (Merata Beban Kerja)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                Visibility:
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="private"
                                        checked={visibility === 'private'}
                                        onChange={() => setVisibility('private')}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Private</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="public"
                                        checked={visibility === 'public'}
                                        onChange={() => setVisibility('public')}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Public</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mb-4 space-x-3">
                <button
                    onClick={() => {
                        // Select all requests including current one
                        setSelectedBulkRequests(allRequests.map(req => req.id));
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm"
                >
                    📋 Pilih Semua ({totalRequests})
                </button>
                <button
                    onClick={() => {
                        // Clear all selections
                        setSelectedBulkRequests([]);
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium text-sm"
                >
                    🗑️ Hapus Semua
                </button>
                <button
                    onClick={() => handleAutoFulfill(strategy, selectedBulkRequests)}
                    disabled={processing || selectedBulkRequests.length === 0}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                        processing || selectedBulkRequests.length === 0
                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-gray-700'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                    ⚡ Auto-Fulfill Terpilih
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">📋 Daftar Request untuk Sub-Bagian "{currentRequest.sub_section?.name}"</h4>
                <div className="max-h-60 overflow-y-auto">
                   {allRequests.length > 0 ? (
        allRequests.map((req) => {
                            const maleCount = req.male_count || 0;
                            const femaleCount = req.female_count || 0;
                            const isCurrentRequest = req.id === currentRequest.id;
                            
                            return (
                                <div
                                    key={req.id}
                                    className={`p-3 rounded-md mb-2 cursor-pointer transition-colors ${
                                        selectedBulkRequests.includes(req.id)
                                            ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-600'
                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    } ${isCurrentRequest ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}
                                    onClick={() => toggleBulkRequestSelection(req.id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedBulkRequests.includes(req.id)}
                                                onChange={() => {}}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {req.shift?.name || 'No Shift'} - {req.requested_amount} orang
                                                    {isCurrentRequest && (
                                                        <span className="bg-yellow-100 dark:bg-yellow-800 ml-2 px-2 py-1 rounded-full text-yellow-800 dark:text-yellow-200 text-xs">
                                                            Request Saat Ini
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400 text-sm">
                                                    Status: <span className={`px-2 py-1 text-xs rounded-full ${
                                                        req.status === 'fulfilled' 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                        {req.status === 'fulfilled' ? 'Sudah dipenuhi' : 'Belum dipenuhi'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-600 dark:text-gray-400 text-sm">
                                                {maleCount > 0 && `L: ${maleCount} `}
                                                {femaleCount > 0 && `P: ${femaleCount}`}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Employee Selection for Bulk Request */}
                                    {selectedBulkRequests.includes(req.id) && (
                                        <div className="mt-3 pt-3 border-gray-200 dark:border-gray-600 border-t">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                                                    Karyawan Terpilih:
                                                </h5>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    (bulkSelectedEmployees[req.id]?.length || 0) === req.requested_amount
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                }`}>
                                                    {(bulkSelectedEmployees[req.id]?.length || 0)} / {req.requested_amount}
                                                </span>
                                            </div>
                                            <div className="gap-2 grid grid-cols-1 sm:grid-cols-2">
                                                {Array.from({ length: req.requested_amount }).map((_, index) => {
                                                    const employeeIds = bulkSelectedEmployees[req.id] || [];
                                                    const employeeId = employeeIds[index];
                                                    const employee = employeeId ? getEmployeeDetails(employeeId) : null;
                                                    
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`p-2 rounded border ${
                                                                employee 
                                                                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                                                                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                                    #{index + 1}
                                                                </span>
                                                                {employee && (
                                                                    <span className={`text-xs px-1 rounded ${
                                                                        employee.gender === 'female'
                                                                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    }`}>
                                                                        {employee.gender === 'female' ? 'P' : 'L'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {employee ? (
                                                                <div className="mt-1">
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                                        {employee.name}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                                                                        {employee.type} - {employee.subSections?.[0]?.name || '-'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-500 dark:text-gray-400 text-xs italic">
                                                                    Belum dipilih
                                                                </div>
                                                            )}
                                                            
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openBulkChangeModal(req.id, index);
                                                                }}
                                                                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 mt-2 px-2 py-1 rounded w-full text-gray-700 dark:text-gray-300 text-xs transition-colors"
                                                            >
                                                                {employee ? 'Ganti' : 'Pilih'} Karyawan
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-gray-500 dark:text-gray-400 text-center">
                            Tidak ada request untuk sub-bagian ini.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                    {selectedBulkRequests.length} request terpilih dari {totalRequests}
                </div>
                <button
                    onClick={() => handleBulkSubmit(strategy, visibility)}
                    disabled={processing || selectedBulkRequests.length === 0}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                        processing || selectedBulkRequests.length === 0
                            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    }`}
                >
                    {processing ? (
                        <span className="flex items-center">
                            <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memproses...
                        </span>
                    ) : (
                        `🚀 Penuhi ${selectedBulkRequests.length} Request Sekaligus`
                    )}
                </button>
            </div>
        </div>
    );
}