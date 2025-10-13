import React, { useState } from "react";
import Modal from "@/Components/Modal";
import NotificationModal from "./NotificationModal";

export default function DeleteConfirmationModal({ show, onClose, handover, onConfirm }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        type: "",
        title: "",
        message: "",
    });

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Delete error:", error);
            showNotification("error", "Delete Failed", "Delete failed: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth="md">
                <div className="bg-white dark:bg-gray-800 shadow-xl p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex justify-center items-center bg-red-100 dark:bg-red-900/20 rounded-full w-10 h-10">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Delete Assignment</h3>
                    </div>

                    <p className="mb-6 text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete the assignment of <strong>{handover?.equipment?.type}</strong> to{" "}
                        <strong>{handover?.employee?.name}</strong>? This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="disabled:opacity-50 px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium text-white transition-colors"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                "Delete Assignment"
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() => setNotification({ show: false, type: "", title: "", message: "" })}
            />
        </>
    );
}