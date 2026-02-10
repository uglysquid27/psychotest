import { Head, Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Icons
const AssignmentIcon = () => (
    <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
    </svg>
);

const PlayIcon = () => (
    <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const CheckCircleIcon = () => (
    <svg
        className="w-5 h-5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const ClockIcon = () => (
    <svg
        className="w-5 h-5 text-yellow-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const CalendarIcon = () => (
    <svg
        className="w-4 h-4 mr-1 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
    </svg>
);

const AlertIcon = () => (
    <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
    </svg>
);

const InfoIcon = () => (
    <svg
        className="w-5 h-5 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const CloseIcon = () => (
    <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>
);

export default function MyAssignments({ assignments, testTypes, auth }) {
    const [filter, setFilter] = useState("all"); // all, pending, completed
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [expiredAssignment, setExpiredAssignment] = useState(null);

    // Filter assignments
    const filteredAssignments = assignments.data.filter((assignment) => {
        if (filter === "pending") {
            return (
                assignment.status === "assigned" ||
                assignment.status === "in_progress"
            );
        }
        if (filter === "completed") {
            return assignment.status === "completed";
        }
        if (filter === "overdue") {
            return isAssignmentExpired(assignment);
        }
        return true;
    });

    // Check if assignment is expired (due date is yesterday or earlier)
    const isAssignmentExpired = (assignment) => {
        if (!assignment.due_date) return false;

        const dueDate = new Date(assignment.due_date);
        const today = new Date();

        // Compare only dates (ignore time)
        const dueDateOnly = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate(),
        );
        const todayOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        );

        return (
            dueDateOnly < todayOnly &&
            (assignment.status === "assigned" ||
                assignment.status === "in_progress")
        );
    };

    // Check if assignment is accessible today
    const isAssignmentAccessibleToday = (assignment) => {
        if (!assignment.due_date) return true;

        const dueDate = new Date(assignment.due_date);
        const today = new Date();

        // Compare only dates (ignore time)
        const dueDateOnly = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate(),
        );
        const todayOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        );

        return (
            dueDateOnly >= todayOnly &&
            (assignment.status === "assigned" ||
                assignment.status === "in_progress")
        );
    };

    // Check if assignment is overdue (past due date but still accessible today)
    const isAssignmentOverdue = (assignment) => {
        if (!assignment.due_date) return false;

        const dueDate = new Date(assignment.due_date);
        const now = new Date();

        // Overdue if current time is past due time but still today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);

        return (
            now > dueDate &&
            dueDateOnly.getTime() === today.getTime() &&
            (assignment.status === "assigned" ||
                assignment.status === "in_progress")
        );
    };

    // Start test
    const startTest = (assignment) => {
        // Check if already completed
        if (assignment.status === "completed") {
            alert(
                "Tes ini sudah diselesaikan. Anda hanya dapat mengerjakan sekali.",
            );
            return;
        }

        // Check if already attempted
        if (assignment.attempts >= 1) {
            alert(
                "Anda sudah menggunakan kesempatan mengerjakan tes ini. Hanya 1 kali percobaan diperbolehkan.",
            );
            return;
        }

        // Check if assignment is expired
        if (isAssignmentExpired(assignment)) {
            setExpiredAssignment(assignment);
            setShowExpiredModal(true);
            return;
        }

        // Check if assignment is accessible today
        if (!isAssignmentAccessibleToday(assignment)) {
            setExpiredAssignment(assignment);
            setShowExpiredModal(true);
            return;
        }

        router.post(route("employee.test-assignments.start", assignment.id));
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case "completed":
                return <CheckCircleIcon />;
            case "in_progress":
                return <ClockIcon />;
            case "expired":
                return <AlertIcon />;
            default:
                return <InfoIcon />;
        }
    };

    // Get status text
    const getStatusText = (status, dueDate) => {
        if (status === "completed") return "Completed";
        if (status === "in_progress") return "In Progress";
        if (status === "expired") return "Expired";

        if (isAssignmentExpired({ due_date: dueDate, status }))
            return "Expired";
        if (isAssignmentOverdue({ due_date: dueDate, status }))
            return "Overdue";
        return "Assigned";
    };

    // Get status color
    const getStatusColor = (status, dueDate) => {
        if (status === "completed") return "bg-green-100 text-green-800";
        if (status === "in_progress") return "bg-yellow-100 text-yellow-800";
        if (status === "expired") return "bg-red-100 text-red-800";

        if (isAssignmentExpired({ due_date: dueDate, status }))
            return "bg-red-100 text-red-800";
        if (isAssignmentOverdue({ due_date: dueDate, status }))
            return "bg-orange-100 text-orange-800";
        return "bg-blue-100 text-blue-800";
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Format date with time
    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Calculate days remaining
    const getDaysRemaining = (dueDate) => {
        if (!dueDate) return null;

        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    // Get time past due
    const getTimePastDue = (dueDate) => {
        if (!dueDate) return null;

        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = now - due;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(
            (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );

        return { days: diffDays, hours: diffHours };
    };

    // Check if due date is today
    const isDueToday = (dueDate) => {
        if (!dueDate) return false;

        const today = new Date();
        const due = new Date(dueDate);

        // Compare only dates (ignore time)
        const todayOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        );
        const dueOnly = new Date(
            due.getFullYear(),
            due.getMonth(),
            due.getDate(),
        );

        return dueOnly.getTime() === todayOnly.getTime();
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center">
                    <AssignmentIcon />
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        My Test Assignments
                    </h2>
                </div>
            }
        >
            <Head title="My Test Assignments" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Stats Overview */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4"
                    >
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-blue-100 mr-4">
                                    <svg
                                        className="w-6 h-6 text-blue-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Total Assignments
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {assignments.total}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-yellow-100 mr-4">
                                    <svg
                                        className="w-6 h-6 text-yellow-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Pending
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {
                                            assignments.data.filter(
                                                (a) =>
                                                    a.status === "assigned" ||
                                                    a.status === "in_progress",
                                            ).length
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 mr-4">
                                    <svg
                                        className="w-6 h-6 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Completed
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {
                                            assignments.data.filter(
                                                (a) => a.status === "completed",
                                            ).length
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-red-100 mr-4">
                                    <svg
                                        className="w-6 h-6 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Expired
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {
                                            assignments.data.filter((a) =>
                                                isAssignmentExpired(a),
                                            ).length
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6 bg-white rounded-lg shadow p-4"
                    >
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-md ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                            >
                                All ({assignments.total})
                            </button>
                            <button
                                onClick={() => setFilter("pending")}
                                className={`px-4 py-2 rounded-md ${filter === "pending" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                            >
                                Pending (
                                {
                                    assignments.data.filter(
                                        (a) =>
                                            a.status === "assigned" ||
                                            a.status === "in_progress",
                                    ).length
                                }
                                )
                            </button>
                            <button
                                onClick={() => setFilter("completed")}
                                className={`px-4 py-2 rounded-md ${filter === "completed" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                            >
                                Completed (
                                {
                                    assignments.data.filter(
                                        (a) => a.status === "completed",
                                    ).length
                                }
                                )
                            </button>
                            <button
                                onClick={() => setFilter("overdue")}
                                className={`px-4 py-2 rounded-md ${filter === "overdue" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                            >
                                Expired (
                                {
                                    assignments.data.filter((a) =>
                                        isAssignmentExpired(a),
                                    ).length
                                }
                                )
                            </button>
                        </div>
                    </motion.div>

                    {/* Assignments List */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div className="p-0">
                            {filteredAssignments.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg
                                            className="w-16 h-16 mx-auto opacity-50"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No assignments found
                                    </h3>
                                    <p className="text-gray-500">
                                        {filter === "all"
                                            ? "You don't have any test assignments yet."
                                            : filter === "pending"
                                              ? "You don't have any pending test assignments."
                                              : filter === "completed"
                                                ? "You haven't completed any tests yet."
                                                : "You don't have any expired assignments."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 p-6">
                                    {filteredAssignments.map((assignment) => {
                                        const daysRemaining = getDaysRemaining(
                                            assignment.due_date,
                                        );
                                        const isExpired =
                                            isAssignmentExpired(assignment);
                                        const isOverdue =
                                            isAssignmentOverdue(assignment);
                                        const isAccessible =
                                            isAssignmentAccessibleToday(
                                                assignment,
                                            );
                                        const timePastDue = isOverdue
                                            ? getTimePastDue(
                                                  assignment.due_date,
                                              )
                                            : null;

                                        return (
                                            <motion.div
                                                key={assignment.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${
                                                    assignment.status ===
                                                    "completed"
                                                        ? "border-green-200 bg-green-50"
                                                        : isExpired
                                                          ? "border-red-200 bg-red-50"
                                                          : isOverdue
                                                            ? "border-orange-200 bg-orange-50"
                                                            : "border-gray-200"
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    {/* Test Info */}
                                                    <div className="flex-1">
                                                        <div className="flex items-start mb-2">
                                                            {getStatusIcon(
                                                                assignment.status,
                                                            )}
                                                            <div className="ml-2">
                                                                <h3 className="text-lg font-semibold text-gray-900">
                                                                    {testTypes[
                                                                        assignment
                                                                            .test_type
                                                                    ] ||
                                                                        assignment.test_name}
                                                                </h3>
                                                                <p className="text-sm text-gray-500">
                                                                    {assignment.test_type
                                                                        .charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase() +
                                                                        assignment.test_type.slice(
                                                                            1,
                                                                        )}{" "}
                                                                    Test
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span
                                                                className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status, assignment.due_date)}`}
                                                            >
                                                                {getStatusText(
                                                                    assignment.status,
                                                                    assignment.due_date,
                                                                )}
                                                            </span>

                                                            {/* Days Remaining or Time Past Due */}
                                                            {assignment.due_date &&
                                                                (assignment.status ===
                                                                    "assigned" ||
                                                                    assignment.status ===
                                                                        "in_progress") &&
                                                                !isExpired && (
                                                                    <span
                                                                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                            isOverdue
                                                                                ? "bg-orange-100 text-orange-800"
                                                                                : daysRemaining <=
                                                                                    1
                                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                                  : "bg-green-100 text-green-800"
                                                                        }`}
                                                                    >
                                                                        {isOverdue
                                                                            ? `Overdue by ${timePastDue.hours} hours`
                                                                            : isDueToday(
                                                                                    assignment.due_date,
                                                                                )
                                                                              ? "Due Today"
                                                                              : `${daysRemaining} days remaining`}
                                                                    </span>
                                                                )}

                                                            {/* Attempts */}
                                                            {assignment.attempts >
                                                                0 && (
                                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                                    Attempt{" "}
                                                                    {
                                                                        assignment.attempts
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Dates */}
                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                                            <div className="flex items-center">
                                                                <CalendarIcon />
                                                                <span className="ml-1">
                                                                    Assigned:{" "}
                                                                    {formatDate(
                                                                        assignment.assigned_at,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {assignment.due_date && (
                                                                <div className="flex items-center">
                                                                    <CalendarIcon />
                                                                    <span
                                                                        className={`ml-1 ${isExpired || isOverdue ? "text-red-600 font-semibold" : ""}`}
                                                                    >
                                                                        Due:{" "}
                                                                        {formatDateTime(
                                                                            assignment.due_date,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {assignment.completed_at && (
                                                                <div className="flex items-center">
                                                                    <CalendarIcon />
                                                                    <span className="ml-1 text-green-600">
                                                                        Completed:{" "}
                                                                        {formatDate(
                                                                            assignment.completed_at,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Score if completed */}
                                                        {assignment.status ===
                                                            "completed" &&
                                                            assignment.score !==
                                                                null && (
                                                                <div className="mt-4">
                                                                    <div className="flex items-center">
                                                                        <span className="text-sm font-medium text-gray-700 mr-2">
                                                                            Score:
                                                                        </span>
                                                                        <span className="text-lg font-bold text-gray-900">
                                                                            {
                                                                                assignment.score
                                                                            }
                                                                        </span>
                                                                        <span
                                                                            className={`ml-2 text-lg font-bold ${assignment.percentage >= 70 ? "text-green-600" : "text-red-600"}`}
                                                                        >
                                                                            (
                                                                            {
                                                                                assignment.percentage
                                                                            }
                                                                            %)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Notes */}
                                                        {assignment.notes && (
                                                            <div className="mt-4">
                                                                <p className="text-sm text-gray-600">
                                                                    <span className="font-medium">
                                                                        Note:
                                                                    </span>{" "}
                                                                    {
                                                                        assignment.notes
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Warning message for expired assignments */}
                                                        {isExpired && (
                                                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                                <div className="flex items-center">
                                                                    <AlertIcon className="mr-2 flex-shrink-0" />
                                                                    <p className="text-sm text-red-700">
                                                                        <strong>
                                                                            Perhatian:
                                                                        </strong>{" "}
                                                                        Tes ini
                                                                        sudah
                                                                        melewati
                                                                        batas
                                                                        waktu
                                                                        (kemarin
                                                                        atau
                                                                        sebelumnya).
                                                                        Anda
                                                                        tidak
                                                                        dapat
                                                                        mengakses
                                                                        tes ini
                                                                        lagi.
                                                                        Silakan
                                                                        hubungi
                                                                        administrator
                                                                        untuk
                                                                        bantuan.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Warning message for overdue assignments (due today but time has passed) */}
                                                        {isOverdue &&
                                                            !isExpired && (
                                                                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                                                    <div className="flex items-center">
                                                                        <AlertIcon className="mr-2 flex-shrink-0 text-orange-500" />
                                                                        <p className="text-sm text-orange-700">
                                                                            <strong>
                                                                                Perhatian:
                                                                            </strong>{" "}
                                                                            Waktu
                                                                            tes
                                                                            sudah
                                                                            lewat,
                                                                            tetapi
                                                                            masih
                                                                            dapat
                                                                            diakses
                                                                            hari
                                                                            ini.
                                                                            Silakan
                                                                            selesaikan
                                                                            secepat
                                                                            mungkin.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-col space-y-2 min-w-[200px]">
                                                        {assignment.status ===
                                                            "assigned" ||
                                                        assignment.status ===
                                                            "in_progress" ? (
                                                            <button
                                                                onClick={() =>
                                                                    startTest(
                                                                        assignment,
                                                                    )
                                                                }
                                                                className={`inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest focus:outline-none focus:border-indigo-700 focus:ring focus:ring-indigo-200 active:bg-indigo-800 transition ease-in-out duration-150 ${
                                                                    isExpired ||
                                                                    !isAccessible
                                                                        ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                                                                        : "bg-indigo-600 hover:bg-indigo-700"
                                                                }`}
                                                                disabled={
                                                                    isExpired ||
                                                                    !isAccessible
                                                                }
                                                                title={
                                                                    isExpired
                                                                        ? "Tes sudah melewati batas waktu"
                                                                        : !isAccessible
                                                                          ? "Tes belum dapat diakses"
                                                                          : ""
                                                                }
                                                            >
                                                                <PlayIcon />
                                                                {assignment.status ===
                                                                "in_progress"
                                                                    ? "Continue Test"
                                                                    : "Start Test"}
                                                            </button>
                                                        ) : assignment.status ===
                                                          "completed" ? (
                                                            <Link
                                                                href={getTestResultLink(
                                                                    assignment.test_type,
                                                                )}
                                                                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 focus:outline-none focus:border-green-700 focus:ring focus:ring-green-200 active:bg-green-800 transition ease-in-out duration-150 text-center"
                                                            >
                                                                View Results
                                                            </Link>
                                                        ) : null}

                                                        {/* View Details Button for expired tests */}
                                                        {(isExpired ||
                                                            assignment.status ===
                                                                "expired") && (
                                                            <button
                                                                onClick={() => {
                                                                    setExpiredAssignment(
                                                                        assignment,
                                                                    );
                                                                    setShowExpiredModal(
                                                                        true,
                                                                    );
                                                                }}
                                                                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:outline-none focus:border-red-700 focus:ring focus:ring-red-200 active:bg-red-800 transition ease-in-out duration-150 text-center"
                                                            >
                                                                View Details
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {filteredAssignments.length > 0 &&
                                assignments.total > assignments.per_page && (
                                    <div className="px-6 py-4 border-t border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-700">
                                                Showing{" "}
                                                <span className="font-medium">
                                                    {assignments.from}
                                                </span>{" "}
                                                to{" "}
                                                <span className="font-medium">
                                                    {assignments.to}
                                                </span>{" "}
                                                of{" "}
                                                <span className="font-medium">
                                                    {assignments.total}
                                                </span>{" "}
                                                results
                                            </div>
                                            <div className="flex space-x-2">
                                                {assignments.links.map(
                                                    (link, index) => (
                                                        <Link
                                                            key={index}
                                                            href={
                                                                link.url || "#"
                                                            }
                                                            className={`px-3 py-1 rounded-md ${
                                                                link.active
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                            } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
                                                            dangerouslySetInnerHTML={{
                                                                __html: link.label,
                                                            }}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Expired Assignment Modal */}
            <AnimatePresence>
                {showExpiredModal && expiredAssignment && (
                    <ExpiredAssignmentModal
                        assignment={expiredAssignment}
                        testTypes={testTypes}
                        onClose={() => {
                            setShowExpiredModal(false);
                            setExpiredAssignment(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}

// Helper function to get test result link
function getTestResultLink(testType) {
    const links = {
        kraepelin: route("kraepelin.results"),
        ketelitian: "#", // Add your result routes
        hitungan: "#",
        deret: "#",
        wartegg: route("wartegg.history"),
        analogi: "#",
        spasial: "#",
        numerik: "#",
        disc: "#",
        personality: "#",
    };
    return links[testType] || "#";
}

// Expired Assignment Modal Component
function ExpiredAssignmentModal({ assignment, testTypes, onClose }) {
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTimePastDue = (dueDate) => {
        if (!dueDate) return null;

        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = now - due;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(
            (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const diffMinutes = Math.floor(
            (diffTime % (1000 * 60 * 60)) / (1000 * 60),
        );

        return { days: diffDays, hours: diffHours, minutes: diffMinutes };
    };

    const timePastDue = getTimePastDue(assignment.due_date);

    // Check if due date is yesterday or earlier
    const isYesterdayOrEarlier = () => {
        if (!assignment.due_date) return false;

        const dueDate = new Date(assignment.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);

        return dueDateOnly < today;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="p-2 rounded-full bg-red-100 mr-3">
                                <svg
                                    className="w-6 h-6 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Tes Tidak Dapat Diakses
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {isYesterdayOrEarlier()
                                        ? "Batas waktu telah berlalu"
                                        : "Tes belum dapat diakses"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    {/* Test Info */}
                    <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-2">
                            {testTypes[assignment.test_type] ||
                                assignment.test_name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Jenis:{" "}
                            {assignment.test_type.charAt(0).toUpperCase() +
                                assignment.test_type.slice(1)}{" "}
                            Test
                        </p>

                        {/* Status Badge */}
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 mb-4">
                            <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                            <span className="text-sm font-semibold">
                                {isYesterdayOrEarlier()
                                    ? "TELAH BERAKHIR"
                                    : "BELUM DAPAT DIAKSES"}
                            </span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                    Ditugaskan
                                </p>
                                <p className="text-sm text-gray-600">
                                    {formatDate(assignment.assigned_at)}
                                </p>
                            </div>
                        </div>

                        {assignment.due_date && (
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">
                                        Batas Waktu
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {formatDate(assignment.due_date)}
                                    </p>
                                    {isYesterdayOrEarlier() && timePastDue && (
                                        <p className="text-sm text-red-600 font-semibold mt-1">
                                            Telah berlalu{" "}
                                            {timePastDue.days > 0
                                                ? `${timePastDue.days} hari `
                                                : ""}
                                            {timePastDue.hours > 0
                                                ? `${timePastDue.hours} jam `
                                                : ""}
                                            {timePastDue.minutes > 0
                                                ? `${timePastDue.minutes} menit`
                                                : ""}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Warning Message */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex">
                            <AlertIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-700 font-medium mb-1">
                                    {isYesterdayOrEarlier()
                                        ? "Akses Tes Ditutup"
                                        : "Tes Belum Dapat Diakses"}
                                </p>
                                <p className="text-sm text-red-600">
                                    {isYesterdayOrEarlier()
                                        ? "Tes ini sudah melewati batas tanggal. Anda tidak dapat mengakses tes ini lagi."
                                        : "Tes ini hanya dapat diakses pada tanggal yang ditentukan. Silakan tunggu hingga tanggal tersebut."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Steps */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                            Langkah yang dapat dilakukan:
                        </p>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            {isYesterdayOrEarlier() ? (
                                <>
                                    <li>
                                        Hubungi administrator untuk meminta
                                        perpanjangan waktu
                                    </li>
                                    <li>
                                        Minta penugasan ulang tes jika
                                        diperlukan
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        Tunggu hingga tanggal tes dapat diakses
                                    </li>
                                    <li>
                                        Periksa jadwal tes lainnya yang masih
                                        aktif
                                    </li>
                                </>
                            )}
                            <li>Periksa jadwal tes lainnya yang masih aktif</li>
                        </ul>
                    </div>

                    {/* Notes */}
                    {assignment.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-1">
                                Catatan Administrator:
                            </p>
                            <p className="text-sm text-gray-600">
                                {assignment.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                    >
                        Tutup
                    </button>
                    <Link
                        href={route("employee.test-assignments.my")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors"
                    >
                        Lihat Tes Lainnya
                    </Link>
                </div>
            </motion.div>
        </motion.div>
    );
}
