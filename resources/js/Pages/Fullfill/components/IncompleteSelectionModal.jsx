import { useState, useEffect } from 'react';

export default function IncompleteSelectionModal({
    show,
    onClose,
    onConfirm,
    request,
    selectedCount,
    requiredMale,
    requiredFemale,
    currentMaleCount,
    currentFemaleCount
}) {
    const [showAnyway, setShowAnyway] = useState(false);

    useEffect(() => {
        // Reset the "show anyway" toggle when modal is reopened
        if (show) {
            setShowAnyway(false);
        }
    }, [show]);

    if (!show) return null;

    const missingMale = Math.max(0, requiredMale - currentMaleCount);
    const missingFemale = Math.max(0, requiredFemale - currentFemaleCount);
    const missingTotal = Math.max(0, request.requested_amount - selectedCount);

    const hasGenderRequirements = requiredMale > 0 || requiredFemale > 0;
    const meetsGenderRequirements = currentMaleCount >= requiredMale && currentFemaleCount >= requiredFemale;
    const meetsTotalRequirements = selectedCount >= request.requested_amount;

    return (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 shadow-xl rounded-lg w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Pilihan Tidak Lengkap
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Pilihan karyawan saat ini belum memenuhi semua persyaratan:
                    </p>

                    <div className="space-y-3 mb-4">
                        {!meetsTotalRequirements && (
                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-5 w-5 text-yellow-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Jumlah karyawan:</span> Anda memilih {selectedCount} dari {request.requested_amount} yang dibutuhkan ({missingTotal} kurang)
                                </p>
                            </div>
                        )}

                        {hasGenderRequirements && !meetsGenderRequirements && (
                            <>
                                {missingMale > 0 && (
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 h-5 w-5 text-blue-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Laki-laki:</span> {currentMaleCount} dari {requiredMale} yang dibutuhkan ({missingMale} kurang)
                                        </p>
                                    </div>
                                )}

                                {missingFemale > 0 && (
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 h-5 w-5 text-pink-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Perempuan:</span> {currentFemaleCount} dari {requiredFemale} yang dibutuhkan ({missingFemale} kurang)
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {(!meetsGenderRequirements || !meetsTotalRequirements) && (
                        <div className="flex items-start mb-4">
                            <div className="flex-shrink-0 pt-0.5">
                                <input
                                    id="show-anyway"
                                    type="checkbox"
                                    checked={showAnyway}
                                    onChange={() => setShowAnyway(!showAnyway)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            </div>
                            <label htmlFor="show-anyway" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Saya mengerti dan ingin melanjutkan dengan pilihan saat ini
                            </label>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
                    >
                        Kembali
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={(!meetsGenderRequirements || !meetsTotalRequirements) && !showAnyway}
                        className={`px-4 py-2 rounded-md ${(!meetsGenderRequirements || !meetsTotalRequirements) && !showAnyway
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        Lanjutkan
                    </button>
                </div>
            </div>
        </div>
    );
}