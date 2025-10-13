import React from "react";
import Modal from "@/Components/Modal";

export default function NotificationModal({ show, type, title, message, onClose }) {
    if (!show) return null;

    const icons = {
        success: (
            <div className="flex justify-center items-center bg-green-100 dark:bg-green-900/20 rounded-full w-12 h-12">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
        ),
        error: (
            <div className="flex justify-center items-center bg-red-100 dark:bg-red-900/20 rounded-full w-12 h-12">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
        ),
        warning: (
            <div className="flex justify-center items-center bg-yellow-100 dark:bg-yellow-900/20 rounded-full w-12 h-12">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
        ),
        info: (
            <div className="flex justify-center items-center bg-blue-100 dark:bg-blue-900/20 rounded-full w-12 h-12">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        ),
    };

    const bgColors = {
        success: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
        error: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800",
        warning: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800",
        info: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800",
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className={`p-6 rounded-lg border ${bgColors[type]}`}>
                <div className="flex items-start gap-4">
                    {icons[type]}
                    <div className="flex-1">
                        <h3 className="mb-2 font-semibold text-gray-900 dark:text-white text-lg">{title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{message}</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={onClose}
                                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}