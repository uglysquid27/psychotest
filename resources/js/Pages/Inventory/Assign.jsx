import React, { useState, useEffect } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

// Import sub-components
import NotificationModal from "./Components/Assign/NotificationModal";
import DeleteConfirmationModal from "./Components/Assign/DeleteConfirmationModal";
import EmployeeCard, { Pagination } from "./Components/Assign/EmployeeCard";
import SearchFilters from "./Components/Assign/SearchFilters";
import EmptyState from "./Components/Assign/EmptyState";

// Import modal components
import QuickAssign from "./Components/Assign/QuickAssign";
import NewAssignModal from "./Components/Assign/NewAssignModal";
import UpdateEmployeeModal from "./Components/Assign/UpdateEmployeeModal";

export default function Assign({
    handovers,
    filters,
    equipments,
    employees,
    sections, 
    subSections,
}) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [selectedSection, setSelectedSection] = useState(filters.section || "");
    const [selectedSubSection, setSelectedSubSection] = useState(filters.sub_section || "");
    const [filteredSubSections, setFilteredSubSections] = useState([]);
    const [groupedHandovers, setGroupedHandovers] = useState({});
    const [expandedEmployees, setExpandedEmployees] = useState(new Set());

    // Modal states
    const [showQuickAssign, setShowQuickAssign] = useState(false);
    const [showNewAssign, setShowNewAssign] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [handoverToDelete, setHandoverToDelete] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        type: "",
        title: "",
        message: "",
    });

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message });
    };

    // Safe data handling
    const safeHandovers = handovers || {
        data: [],
        total: 0,
        from: 0,
        to: 0,
        last_page: 1,
    };

    // Filter subsections based on selected section
    useEffect(() => {
        if (selectedSection) {
            const filtered = subSections.filter(
                (sub) => sub.section_id == selectedSection
            );
            setFilteredSubSections(filtered);
            if (
                selectedSubSection &&
                !filtered.some((sub) => sub.id == selectedSubSection)
            ) {
                setSelectedSubSection("");
            }
        } else {
            setFilteredSubSections([]);
            setSelectedSubSection("");
        }
    }, [selectedSection, selectedSubSection, subSections]);

    // Group handovers by employee
    useEffect(() => {
        if (!safeHandovers.data) {
            setGroupedHandovers({});
            return;
        }

        // Filter handovers based on search and section filters
        const filteredHandovers = safeHandovers.data.filter((handover) => {
            if (!handover?.employee) return false;

            const employee = handover.employee;

            // Search filter
            const matchesSearch =
                !search ||
                employee.name.toLowerCase().includes(search.toLowerCase()) ||
                employee.nik.toLowerCase().includes(search.toLowerCase());

            // Section filter
            const matchesSection =
                !selectedSection ||
                employee.sub_sections?.some(
                    (sub) => sub.section_id == selectedSection
                );

            // Subsection filter
            const matchesSubSection =
                !selectedSubSection ||
                employee.sub_sections?.some(
                    (sub) => sub.id == selectedSubSection
                );

            return matchesSearch && matchesSection && matchesSubSection;
        });

        // Group filtered handovers by employee
        const grouped = {};
        filteredHandovers.forEach((handover) => {
            if (handover?.employee) {
                const employeeId = handover.employee.id;
                if (!grouped[employeeId]) {
                    grouped[employeeId] = {
                        employee: handover.employee,
                        assignments: [],
                        totalAssignments: 0,
                    };
                }
                grouped[employeeId].assignments.push(handover);
                grouped[employeeId].totalAssignments++;
            }
        });

        setGroupedHandovers(grouped);
    }, [safeHandovers, search, selectedSection, selectedSubSection]);

    const toggleEmployeeExpansion = (employeeId) => {
        const newExpanded = new Set(expandedEmployees);
        if (newExpanded.has(employeeId)) {
            newExpanded.delete(employeeId);
        } else {
            newExpanded.add(employeeId);
        }
        setExpandedEmployees(newExpanded);
    };

    const getAvailableEquipmentsForEmployee = (employeeId) => {
        const employeeAssignments =
            groupedHandovers[employeeId]?.assignments || [];
        const assignedEquipmentIds = new Set(
            employeeAssignments.map((assignment) => assignment.equipment.id)
        );

        return (
            equipments?.filter(
                (equipment) => !assignedEquipmentIds.has(equipment.id)
            ) || []
        );
    };

    const handleQuickAssign = (employee) => {
        setSelectedEmployee(employee);
        setShowQuickAssign(true);
    };

    const handleNewAssign = () => {
        setShowNewAssign(true);
    };

    const handleUpdate = (employee) => {
        setSelectedEmployee(employee);
        setShowUpdateModal(true);
    };

    const openDeleteModal = (handover) => {
        setHandoverToDelete(handover);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!handoverToDelete) return;

        try {
            const response = await fetch(
                route("handovers.destroy", {
                    handover: handoverToDelete.id,
                }),
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": document.querySelector(
                            'meta[name="csrf-token"]'
                        ).content,
                        "X-Requested-With": "XMLHttpRequest",
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                showNotification(
                    "success",
                    "Delete Successful",
                    "Assignment deleted successfully"
                );
                router.reload();
            } else {
                throw new Error(data.error || "Delete failed");
            }
        } catch (error) {
            console.error("Delete error:", error);
            showNotification(
                "error",
                "Delete Failed",
                "Delete failed: " + error.message
            );
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("handovers.assign"), {
            search,
            section: selectedSection !== "" ? selectedSection : undefined,
            sub_section:
                selectedSubSection !== "" ? selectedSubSection : undefined,
        });
    };

    const clearSearch = () => {
        setSearch("");
        setSelectedSection("");
        setSelectedSubSection("");
        router.get(route("handovers.assign"), {
            search: "",
            section: "",
            sub_section: "",
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="font-semibold text-gray-800 dark:text-white text-xl">
                            Employee Equipment Assignments
                        </h2>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
                            Manage equipment assignments grouped by employee
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href={route("handovers.export")}
                            className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md font-medium text-white text-xs sm:text-sm transition-colors duration-200"
                            title="Export to Excel"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <span className="hidden sm:inline">Export</span>
                        </a>

                        <button
                            onClick={handleNewAssign}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            New Assign
                        </button>
                        <Link
                            href={route("equipments.index")}
                            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            Back to Equipment
                        </Link>
                    </div>
                </div>
            }
        >
            <div className="py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 dark:from-gray-800 to-indigo-50 dark:to-gray-900 shadow-lg mb-6 rounded-xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex lg:flex-row flex-col justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h1 className="mb-2 font-bold text-gray-800 dark:text-white text-2xl">
                                        Employee Assignments Overview
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        View and manage equipment assignments for each employee
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full font-medium text-blue-600 dark:text-blue-400 text-sm">
                                        {Object.keys(groupedHandovers).length} employees
                                    </span>
                                    <span className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full font-medium text-green-600 dark:text-green-400 text-sm">
                                        {safeHandovers.total} total assignments
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Section */}
                    <SearchFilters
                        search={search}
                        setSearch={setSearch}
                        selectedSection={selectedSection}
                        setSelectedSection={setSelectedSection}
                        selectedSubSection={selectedSubSection}
                        setSelectedSubSection={setSelectedSubSection}
                        sections={sections}
                        filteredSubSections={filteredSubSections}
                        onSearch={handleSearch}
                        onClear={clearSearch}
                    />
<div className="space-y-6">
    {Object.keys(groupedHandovers).length > 0 ? (
        Object.values(groupedHandovers).map((group) => (
            <EmployeeCard
                key={group.employee.id}
                group={group}
                isExpanded={expandedEmployees.has(group.employee.id)}
                onToggle={toggleEmployeeExpansion}
                onUpdate={handleUpdate}
                onQuickAssign={handleQuickAssign}
                onDelete={openDeleteModal}
            />
        ))
    ) : (
        <EmptyState
            search={search}
            onClearSearch={clearSearch}
            onNewAssign={handleNewAssign}
        />
    )}
</div>

{/* Add Pagination after the Employee Cards */}
<Pagination safeHandovers={safeHandovers} />
                </div>
            </div>

            {/* Modals */}
            {showQuickAssign && (
                <QuickAssign
                    show={showQuickAssign}
                    onClose={() => setShowQuickAssign(false)}
                    employee={selectedEmployee}
                    equipments={getAvailableEquipmentsForEmployee(selectedEmployee?.id)}
                    onSuccess={() => {
                        showNotification(
                            "success",
                            "Assignment Successful",
                            "Equipment assigned successfully"
                        );
                        router.reload();
                    }}
                    onError={(error) => {
                        showNotification(
                            "error",
                            "Assignment Failed",
                            "Assignment failed: " + error.message
                        );
                    }}
                />
            )}

            {showNewAssign && (
                <NewAssignModal
                    show={showNewAssign}
                    onClose={() => setShowNewAssign(false)}
                    employees={employees}
                    equipments={equipments}
                    onSuccess={() => {
                        showNotification(
                            "success",
                            "Assignment Successful",
                            "Equipment assigned successfully"
                        );
                        router.reload();
                    }}
                    onError={(error) => {
                        showNotification(
                            "error",
                            "Assignment Failed",
                            "Assignment failed: " + error.message
                        );
                    }}
                />
            )}

            {showUpdateModal && (
                <UpdateEmployeeModal
                    show={showUpdateModal}
                    onClose={() => setShowUpdateModal(false)}
                    employee={selectedEmployee}
                    sections={sections}
                    subSections={subSections}
                    onSuccess={() => {
                        showNotification(
                            "success",
                            "Update Successful",
                            "Employee updated successfully"
                        );
                        router.reload();
                    }}
                    onError={(error) => {
                        showNotification(
                            "error",
                            "Update Failed",
                            "Update failed: " + error.message
                        );
                    }}
                />
            )}

            <DeleteConfirmationModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                handover={handoverToDelete}
                onConfirm={handleDelete}
            />

            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() => setNotification({ show: false, type: "", title: "", message: "" })}
            />
        </AuthenticatedLayout>
    );
}