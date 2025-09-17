export default function ConfirmationSection({ auth, processing, isBulkMode }) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100 text-lg">Konfirmasi</h3>
            
            <div className="bg-gray-50 dark:bg-gray-700 mb-4 p-3 rounded-md">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    <strong>Dipenuhi oleh:</strong> {auth.user.name} ({auth.user.email})
                </p>
                <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
                    <strong>Waktu:</strong> {new Date().toLocaleString('id-ID')}
                </p>
            </div>

            <button
                type="submit"
                disabled={processing}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                    processing
                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                        : isBulkMode
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                            : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                }`}
            >
                {processing ? (
                    <span className="flex justify-center items-center">
                        <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                    </span>
                ) : (
                    isBulkMode ? '🚀 Penuhi Semua Request Sekaligus' : '✅ Konfirmasi Penugasan'
                )}
            </button>
        </div>
    );
}