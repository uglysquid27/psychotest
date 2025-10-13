import React from "react";

// Main EmployeeCard component
export default function EmployeeCard({ 
    group, 
    isExpanded, 
    onToggle, 
    onUpdate, 
    onQuickAssign, 
    onDelete 
}) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {/* Employee Header */}
            <div
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 p-6 transition-colors cursor-pointer"
                onClick={() => onToggle(group.employee.id)}
            >
                <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
                    <div className="flex flex-1 items-center gap-4">
                        <div className="flex justify-center items-center bg-gradient-to-br from-blue-500 to-purple-500 rounded-full w-12 h-12 font-medium text-white text-lg">
                            {group.employee.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                {group.employee.name}
                            </h3>
                            <div className="flex flex-wrap gap-4 mt-1 text-gray-600 dark:text-gray-400 text-sm">
                                <span>NIK: {group.employee.nik}</span>
                                <span>Assignments: {group.totalAssignments}</span>
                                {group.employee.sub_sections && group.employee.sub_sections.length > 0 && (
                                    <span>
                                        {group.employee.sub_sections[0]?.section?.name}
                                        {group.employee.sub_sections[0]?.name && ` / ${group.employee.sub_sections[0].name}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(group.employee);
                            }}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Update
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickAssign(group.employee);
                            }}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Assign More
                        </button>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                group.totalAssignments > 0
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                        >
                            {group.totalAssignments} equipment assigned
                        </span>
                        <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-gray-200 dark:border-gray-700 border-t">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-900 text-md dark:text-white">
                                Assigned Equipment ({group.assignments.length})
                            </h4>
                        </div>
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {group.assignments.map((assignment) => (
                                <AssignmentItem 
                                    key={assignment.id} 
                                    assignment={assignment} 
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AssignmentItem({ assignment, onDelete }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                        {assignment.equipment.type}
                    </h5>
                    {assignment.size && (
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/30 mt-1 px-2 py-1 rounded-full font-medium text-blue-800 dark:text-blue-300 text-xs">
                            Size: {assignment.size}
                        </span>
                    )}
                </div>
                {assignment.photo ? (
                    <img
                        src={assignment.photo}
                        alt="handover"
                        className="border border-gray-200 dark:border-gray-600 rounded-lg w-12 h-12 object-cover"
                    />
                ) : (
                    <span className="text-gray-400 text-xs">No photo</span>
                )}
            </div>
            <div className="mb-3 text-gray-600 dark:text-gray-400 text-sm">
                Assigned: {new Date(assignment.date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onDelete(assignment)}
                    className="inline-flex flex-1 justify-center items-center gap-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-3 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 text-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    );
}

// Empty State Component
export function EmptyState({ search, onClearSearch, onNewAssign }) {
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
                {search
                    ? "Try adjusting your search terms"
                    : "Start by assigning equipment to employees"}
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

// Pagination Component
export function Pagination({ safeHandovers }) {
    if (safeHandovers.last_page <= 1) return null;

    return (
        <div className="flex justify-center mt-8">
            <nav className="flex items-center gap-2">
                {safeHandovers.links?.map((link, index) => (
                    <a
                        key={index}
                        href={link.url || "#"}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            link.active
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        } ${
                            !link.url
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                        }`}
                        dangerouslySetInnerHTML={{
                            __html: link.label,
                        }}
                    />
                ))}
            </nav>
        </div>
    );
}