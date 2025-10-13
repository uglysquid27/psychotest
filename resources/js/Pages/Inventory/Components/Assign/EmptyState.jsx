import React from "react";

export default function EmptyState({ search, onClearSearch, onNewAssign }) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md p-12 rounded-xl text-center">
            <svg
                className="mx-auto mb-4 w-16 h-16 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
            </svg>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white text-lg">
                No assignments found
            </h3>
            <p className="mb-4 text-gray-500 dark:text-gray-400">
                {search ? "Try adjusting your search terms" : "Start by assigning equipment to employees"}
            </p>
            {search ? (
                <button
                    onClick={onClearSearch}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                >
                    Clear Search
                </button>
            ) : (
                <button
                    onClick={onNewAssign}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                >
                    New Assign
                </button>
            )}
        </div>
    );
}