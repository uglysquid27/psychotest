import React, { useState, useEffect } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";

// Utility function untuk konversi image
const validateAndConvertImage = (file) => {
    return new Promise((resolve, reject) => {
        // Validasi tipe file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            reject(new Error('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP)'));
            return;
        }

        // Validasi ukuran file (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            reject(new Error('File size must be less than 10MB'));
            return;
        }

        // Jika file sudah PNG, langsung return
        if (file.type === 'image/png') {
            resolve({
                file: file,
                isConverted: false
            });
            return;
        }

        // Konversi ke PNG untuk format lain
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            try {
                // Set canvas size sama dengan image
                canvas.width = img.width;
                canvas.height = img.height;

                // Clear canvas dan draw image
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Konversi ke PNG
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Buat file baru dengan nama yang sama tapi extension .png
                        const fileName = file.name.replace(/\.[^/.]+$/, "") + '.png';
                        const pngFile = new File([blob], fileName, {
                            type: 'image/png',
                            lastModified: new Date().getTime()
                        });
                        resolve({
                            file: pngFile,
                            isConverted: true
                        });
                    } else {
                        reject(new Error('Failed to convert image to PNG - blob creation failed'));
                    }
                }, 'image/png', 0.9); // quality 90%
            } catch (error) {
                reject(new Error('Canvas drawing error: ' + error.message));
            }
        };

        img.onerror = function() {
            reject(new Error('Failed to load image for conversion'));
        };

        // Handle CORS issues
        img.crossOrigin = 'Anonymous';
        
        // Load image dari file
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
};

export default function Assign() {
    const { handovers, filters, equipments } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");

    // State untuk grouped data
    const [groupedHandovers, setGroupedHandovers] = useState({});
    const [expandedEmployees, setExpandedEmployees] = useState(new Set());
    const [availableEquipments, setAvailableEquipments] = useState([]);

    // modal states
    const [showModal, setShowModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [selectedHandover, setSelectedHandover] = useState(null);
    const [photo, setPhoto] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debug states
    const [uploadStatus, setUploadStatus] = useState("");
    const [debugInfo, setDebugInfo] = useState({});
    const [showDebug, setShowDebug] = useState(false);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [handoverToDelete, setHandoverToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Group handovers by employee
    useEffect(() => {
        const grouped = {};

        handovers.data.forEach((handover) => {
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
        });

        setGroupedHandovers(grouped);
    }, [handovers]);

    // Load available equipments
    useEffect(() => {
        setAvailableEquipments(equipments || []);
    }, [equipments]);

    const toggleEmployeeExpansion = (employeeId) => {
        const newExpanded = new Set(expandedEmployees);
        if (newExpanded.has(employeeId)) {
            newExpanded.delete(employeeId);
        } else {
            newExpanded.add(employeeId);
        }
        setExpandedEmployees(newExpanded);
    };

    // Get equipment yang belum diassign ke employee tertentu
    const getAvailableEquipmentsForEmployee = (employeeId) => {
        const employeeAssignments =
            groupedHandovers[employeeId]?.assignments || [];
        const assignedEquipmentIds = new Set(
            employeeAssignments.map((assignment) => assignment.equipment.id)
        );

        return availableEquipments.filter(
            (equipment) => !assignedEquipmentIds.has(equipment.id)
        );
    };

    const openModal = (employee, handover = null) => {
        setSelectedEmp(employee);
        setSelectedHandover(handover);
        setPhoto(handover?.photo || "");
        setSelectedDate(
            handover?.date
                ? new Date(handover.date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]
        );
        setShowModal(true);
        // Reset debug info when opening modal
        setUploadStatus("");
        setDebugInfo({});
        setShowDebug(false);
    };

    // Handle delete assignment
    const handleDelete = async () => {
        if (!handoverToDelete) return;

        setIsDeleting(true);

        try {
            const url = `/handovers/${handoverToDelete.id}`;

            // Get CSRF token
            let csrfToken =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content") ||
                document
                    .querySelector('meta[name="X-CSRF-TOKEN"]')
                    ?.getAttribute("content") ||
                document.querySelector('input[name="_token"]')?.value;

            const response = await fetch(url, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/json",
                },
                credentials: "include",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Delete failed: ${response.status} - ${errorText}`
                );
            }

            const result = await response.json();

            if (result.success) {
                setShowDeleteModal(false);
                router.reload();
            } else {
                throw new Error(result.error || "Delete failed");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Delete failed: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validasi minimal - hanya date yang required
        if (!selectedDate) {
            alert("Please select date");
            return;
        }

        setIsSubmitting(true);
        setUploadStatus("saving");

        try {
            const url = `/handovers/${selectedHandover.id}/update-with-date`;

            // Get CSRF token from multiple possible sources
            let csrfToken =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content") ||
                document
                    .querySelector('meta[name="X-CSRF-TOKEN"]')
                    ?.getAttribute("content") ||
                document.querySelector('input[name="_token"]')?.value;

            console.log("CSRF Token found:", !!csrfToken);

            if (!csrfToken) {
                throw new Error("CSRF token not found");
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    photo_url: photo || selectedHandover.photo, // Gunakan photo baru atau yang lama
                    date: selectedDate,
                    handover_id: selectedHandover.id,
                }),
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Server error: ${response.status} - ${errorText}`
                );
            }

            const result = await response.json();
            console.log("JSON Response:", result);

            if (result.success) {
                setUploadStatus("success");
                setTimeout(() => {
                    setShowModal(false);
                    router.reload();
                }, 1000);
            } else {
                throw new Error(result.error || "Save failed");
            }
        } catch (error) {
            setIsSubmitting(false);
            setUploadStatus("error");
            setDebugInfo((prev) => ({
                ...prev,
                submitError: error.message,
                timestamp: new Date().toISOString(),
            }));
            console.error("Save error details:", {
                error: error.message,
                handoverId: selectedHandover?.id,
                photoUrl: photo,
                date: selectedDate,
            });
            alert("Save failed: " + error.message);
        }
    };

    // Handle file select untuk upload photo
const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        setUploadStatus("Processing image...");

        console.log("Selected file:", {
            name: file.name,
            type: file.type,
            size: file.size
        });

        // Validasi dan konversi file
        let processedFile;
        try {
            const conversionResult = await validateAndConvertImage(file);
            processedFile = conversionResult.file;
            console.log("File processed successfully:", {
                name: processedFile.name,
                type: processedFile.type,
                size: processedFile.size
            });
        } catch (conversionError) {
            console.error("Conversion error:", conversionError);
            // Fallback: use original file if conversion fails
            processedFile = file;
            console.log("Using original file as fallback");
        }

        setUploadStatus("Uploading to ImageKit...");

        // Upload ke ImageKit
        const authResponse = await fetch("/api/imagekit/auth");
        
        if (!authResponse.ok) {
            throw new Error('ImageKit authentication failed: ' + authResponse.status);
        }
        
        const authData = await authResponse.json();
        console.log("ImageKit auth success");

        // Gunakan handover ID yang aman
        const handoverId = selectedHandover?.id || `temp_${Date.now()}`;

        // Prepare form data untuk upload
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('fileName', `handover_${handoverId}_${Date.now()}.${processedFile.type.split('/')[1]}`);
        formData.append('folder', '/handovers');
        formData.append('useUniqueFileName', 'true');
        formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY);
        formData.append('signature', authData.signature);
        formData.append('token', authData.token);
        formData.append('expire', authData.expire);

        console.log("Starting upload...");

        // Upload ke ImageKit
        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            body: formData
        });

        console.log("Upload response status:", uploadResponse.status);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("Upload failed:", errorText);
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log("Upload result:", uploadResult);

        if (uploadResult.url) {
            setPhoto(uploadResult.url);
            setUploadStatus("success");
            console.log("Upload successful, URL:", uploadResult.url);
        } else {
            throw new Error(uploadResult.message || 'Upload failed - no URL returned');
        }

    } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");
        setDebugInfo(prev => ({ 
            ...prev, 
            uploadError: error.message,
            timestamp: new Date().toISOString()
        }));
        alert('Upload failed: ' + error.message);
        // Reset input
        if (e.target) {
            e.target.value = '';
        }
    }
};

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("handovers.assign.page"), { search });
    };

    const clearSearch = () => {
        setSearch("");
        router.get(route("handovers.assign.page"), { search: "" });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
                            Employee Equipment Assignments
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage equipment assignments grouped by employee
                        </p>
                    </div>
                    <Link
                        href={route("equipments.index")}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
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
            }
        >
            <div className="py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl overflow-hidden mb-6">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                        Employee Assignments Overview
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        View and manage equipment assignments
                                        for each employee
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                        {Object.keys(groupedHandovers).length}{" "}
                                        employees
                                    </span>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                                        {handovers.total} total assignments
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <div className="flex-1 relative">
                                <svg
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search employees by name or NIK..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                                >
                                    Search
                                </button>
                                {search && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Employee Assignment Cards */}
                    <div className="space-y-6">
                        {Object.keys(groupedHandovers).length > 0 ? (
                            Object.values(groupedHandovers).map((group) => (
                                <div
                                    key={group.employee.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
                                >
                                    {/* Employee Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        onClick={() =>
                                            toggleEmployeeExpansion(
                                                group.employee.id
                                            )
                                        }
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                                                    {group.employee.name.charAt(
                                                        0
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {group.employee.name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <span>
                                                            NIK:{" "}
                                                            {group.employee.nik}
                                                        </span>
                                                        <span>
                                                            Assignments:{" "}
                                                            {
                                                                group.totalAssignments
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        group.totalAssignments >
                                                        0
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    {group.totalAssignments}{" "}
                                                    equipment assigned
                                                </span>
                                                <svg
                                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                                        expandedEmployees.has(
                                                            group.employee.id
                                                        )
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedEmployees.has(
                                        group.employee.id
                                    ) && (
                                        <div className="border-t border-gray-200 dark:border-gray-700">
                                            {/* Assigned Equipment */}
                                            <div className="p-6">
                                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                                    Assigned Equipment (
                                                    {group.assignments.length})
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {group.assignments.map(
                                                        (assignment) => (
                                                            <div
                                                                key={
                                                                    assignment.id
                                                                }
                                                                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                                            >
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div>
                                                                        <h5 className="font-medium text-gray-900 dark:text-white">
                                                                            {
                                                                                assignment
                                                                                    .equipment
                                                                                    .type
                                                                            }
                                                                        </h5>
                                                                        {assignment.size && (
                                                                            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                                                                Size:{" "}
                                                                                {
                                                                                    assignment.size
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {assignment.photo ? (
                                                                        <img
                                                                            src={
                                                                                assignment.photo
                                                                            }
                                                                            alt="handover"
                                                                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-gray-400 text-xs">
                                                                            No
                                                                            photo
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                                    Assigned:{" "}
                                                                    {new Date(
                                                                        assignment.date
                                                                    ).toLocaleDateString(
                                                                        "id-ID",
                                                                        {
                                                                            year: "numeric",
                                                                            month: "long",
                                                                            day: "numeric",
                                                                        }
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            openModal(
                                                                                group.employee,
                                                                                assignment
                                                                            )
                                                                        }
                                                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
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
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                            />
                                                                        </svg>
                                                                        Update
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            openDeleteModal(
                                                                                assignment
                                                                            )
                                                                        }
                                                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
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
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                            />
                                                                        </svg>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Available Equipment */}
                                            <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                                    Available Equipment to
                                                    Assign
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {getAvailableEquipmentsForEmployee(
                                                        group.employee.id
                                                    ).map((equipment) => (
                                                        <div
                                                            key={equipment.id}
                                                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm"
                                                        >
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <h5 className="font-medium text-gray-900 dark:text-white">
                                                                        {
                                                                            equipment.type
                                                                        }
                                                                    </h5>
                                                                    {equipment.photo && (
                                                                        <img
                                                                            src={
                                                                                equipment.photo
                                                                            }
                                                                            alt={
                                                                                equipment.type
                                                                            }
                                                                            className="w-16 h-16 object-cover rounded-lg mt-2 border border-gray-200 dark:border-gray-600"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                        equipment.size ||
                                                                        equipment.amount >
                                                                            0
                                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                    }`}
                                                                >
                                                                    {equipment.size
                                                                        ? "Multiple Sizes"
                                                                        : `${equipment.amount} available`}
                                                                </span>
                                                            </div>

                                                            {/* Stock Information */}
                                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                                {equipment.size ? (
                                                                    <div>
                                                                        <div className="font-medium mb-1">
                                                                            Available
                                                                            Sizes:
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            {equipment.size
                                                                                .split(
                                                                                    ","
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        sizeItem,
                                                                                        idx
                                                                                    ) => {
                                                                                        if (
                                                                                            !sizeItem ||
                                                                                            !sizeItem.includes(
                                                                                                ":"
                                                                                            )
                                                                                        )
                                                                                            return null;
                                                                                        const [
                                                                                            sizeName,
                                                                                            amount,
                                                                                        ] =
                                                                                            sizeItem.split(
                                                                                                ":"
                                                                                            );
                                                                                        const stock =
                                                                                            parseInt(
                                                                                                amount
                                                                                            ) ||
                                                                                            0;
                                                                                        return (
                                                                                            <div
                                                                                                key={
                                                                                                    idx
                                                                                                }
                                                                                                className="flex justify-between items-center"
                                                                                            >
                                                                                                <span>
                                                                                                    Size{" "}
                                                                                                    {
                                                                                                        sizeName
                                                                                                    }
                                                                                                </span>
                                                                                                <span
                                                                                                    className={`px-2 py-1 rounded text-xs ${
                                                                                                        stock >
                                                                                                        0
                                                                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                                                    }`}
                                                                                                >
                                                                                                    {
                                                                                                        stock
                                                                                                    }{" "}
                                                                                                    available
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-between items-center">
                                                                        <span>
                                                                            Stock:
                                                                        </span>
                                                                        <span
                                                                            className={`px-2 py-1 rounded text-xs ${
                                                                                equipment.amount >
                                                                                0
                                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                equipment.amount
                                                                            }{" "}
                                                                            available
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="mt-4">
                                                                <Link
                                                                    href={route(
                                                                        "equipments.assign.page.id",
                                                                        {
                                                                            equipment:
                                                                                equipment.id,
                                                                        }
                                                                    )}
                                                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow"
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
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            d="M12 4v16m8-8H4"
                                                                        />
                                                                    </svg>
                                                                    Assign This
                                                                    Equipment
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {getAvailableEquipmentsForEmployee(
                                                    group.employee.id
                                                ).length === 0 && (
                                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                        <svg
                                                            className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={1}
                                                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                            />
                                                        </svg>
                                                        <p>
                                                            No available
                                                            equipment to assign
                                                        </p>
                                                        <p className="text-sm">
                                                            All equipment types
                                                            have been assigned
                                                            to this employee
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            /* Empty State */
                            <div className="text-center py-12">
                                <div className="max-w-md mx-auto">
                                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-12 h-12 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1}
                                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                            />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No assignments found
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {search
                                            ? "Try adjusting your search terms"
                                            : "No equipment assignments found in the system"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {handovers.last_page > 1 && (
                        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing {handovers.from} to {handovers.to}{" "}
                                    of {handovers.total} assignments
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={handovers.prev_page_url || "#"}
                                        preserveScroll
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            handovers.prev_page_url
                                                ? "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                        }`}
                                    >
                                        Previous
                                    </Link>
                                    <Link
                                        href={handovers.next_page_url || "#"}
                                        preserveScroll
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            handovers.next_page_url
                                                ? "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                        }`}
                                    >
                                        Next
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Update Photo Modal */}
            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                maxWidth="lg"
            >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Update Handover
                        </h2>
                    </div>

                    {selectedEmp && selectedHandover && (
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Assignment Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Equipment
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {selectedHandover.equipment.type}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Employee
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {selectedEmp.name} ({selectedEmp.nik})
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Size
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {selectedHandover.size || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Current Date
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {new Date(
                                            selectedHandover.date
                                        ).toLocaleDateString("id-ID", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Date Picker */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Update Assignment Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                                    Update Handover Photo
                                </label>

                                {/* Current Photo */}
                                {selectedHandover.photo && !photo && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Current photo:
                                        </p>
                                        <img
                                            src={selectedHandover.photo}
                                            alt="current handover"
                                            className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                        />
                                    </div>
                                )}

                                {/* New Photo Upload */}
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                    <div className="space-y-4">
                                        {!photo ? (
                                            <>
                                                <svg
                                                    className="w-12 h-12 mx-auto text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1}
                                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>

                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                    id="handover-photo-input"
                                                />

                                                <label
                                                    htmlFor="handover-photo-input"
                                                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
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
                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                                        />
                                                    </svg>
                                                    Choose Photo (Auto-convert
                                                    to PNG)
                                                </label>

                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    All images will be
                                                    automatically converted to
                                                    PNG format
                                                </p>
                                            </>
                                        ) : (
                                            <div className="space-y-4">
                                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                                    ✓ Photo uploaded
                                                    successfully!
                                                </p>
                                                <img
                                                    src={photo}
                                                    alt="uploaded handover"
                                                    className="w-48 h-48 mx-auto object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPhoto("")}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
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
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                    Remove Photo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Debug Section */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDebug(!showDebug)}
                                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    {showDebug ? "▼" : "▶"} Debug Info
                                </button>
                                {showDebug && (
                                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
                                        <div>Status: {uploadStatus}</div>
                                        <div>
                                            Handover ID: {selectedHandover.id}
                                        </div>
                                        <div>
                                            Photo URL:{" "}
                                            {photo ? "Set" : "Not set"}
                                        </div>
                                        <div>Selected Date: {selectedDate}</div>
                                        <div>
                                            Debug:{" "}
                                            {JSON.stringify(debugInfo, null, 2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedDate || isSubmitting} // Hanya date yang required
                                    className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                                        !selectedDate || isSubmitting
                                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg
                                                className="w-4 h-4 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
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
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                maxWidth="md"
            >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                            Delete Assignment
                        </h2>
                    </div>

                    {handoverToDelete && (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="flex-shrink-0">
                                    <svg
                                        className="w-8 h-8 text-red-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-red-800 dark:text-red-300">
                                        Are you sure you want to delete this
                                        assignment?
                                    </h3>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Employee
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {handoverToDelete.employee.name} (
                                        {handoverToDelete.employee.nik})
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Equipment
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {handoverToDelete.equipment.type}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Size
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {handoverToDelete.size || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Assigned Date
                                    </label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {handoverToDelete.date
                                            ? new Date(
                                                  handoverToDelete.date
                                              ).toLocaleDateString("id-ID", {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                              })
                                            : "Not set"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <>
                                            <svg
                                                className="w-4 h-4 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
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
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                            Delete Assignment
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
