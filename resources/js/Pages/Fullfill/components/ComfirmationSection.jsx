export default function ConfirmationSection({ auth, processing }) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="mb-3 font-bold text-lg text-gray-900 dark:text-gray-100">Konfirmasi</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
                Anda akan mengirim permintaan ini sebagai: <span className="font-medium text-gray-900 dark:text-gray-100">{auth.user.name}</span>
            </p>
            <button
                type="submit" // This will now submit the parent form
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
                {processing ? (
                    <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                    </div>
                ) : (
                    'Submit Permintaan'
                )}
            </button>
        </div>
    );
}