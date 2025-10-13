import React, { useState, useEffect } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import NotificationModal from "./NotificationModal";


export default function UpdateEmployeeModal({ employee, show, onClose, equipments }) {
    const [handovers, setHandovers] = useState([]);
    const [originalHandovers, setOriginalHandovers] = useState([]);
    const [photo, setPhoto] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [availableSizes, setAvailableSizes] = useState({});
    const [notification, setNotification] = useState({
        show: false,
        type: "",
        title: "",
        message: "",
    });

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message });
    };

    useEffect(() => {
        if (show && employee) {
            loadEmployeeHandovers();
        }
    }, [show, employee]);

    const loadEmployeeHandovers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                route("handovers.employee.handovers", { employee: employee.id })
            );
            const data = await response.json();

            if (data.success) {
                setHandovers(data.handovers);
                setOriginalHandovers(
                    JSON.parse(JSON.stringify(data.handovers))
                );
                if (data.handovers.length > 0) {
                    setSelectedDate(data.handovers[0].date.split("T")[0]);
                    setPhoto(data.handovers[0].photo || "");
                }

                loadAvailableSizes(data.handovers);
            } else {
                throw new Error(data.message || "Failed to load handovers");
            }
        } catch (error) {
            console.error("Error loading handovers:", error);
            showNotification(
                "error",
                "Load Failed",
                "Failed to load handovers: " + error.message
            );
        } finally {
            setIsLoading(false);
        }
    };

   const loadAvailableSizes = (handoversData) => {
    const sizes = {};

    handoversData.forEach((handover) => {
        const equipment = handover.equipment;
        if (equipment.size) {
            const sizeData = {};
            equipment.size.split(",").forEach((sizeItem) => {
                if (sizeItem && sizeItem.includes(":")) {
                    const [sizeName, amount] = sizeItem.split(":");
                    const stock = parseInt(amount) || 0;
                    sizeData[sizeName] = stock;
                }
            });
            sizes[equipment.id] = sizeData;
        }
    });

    setAvailableSizes(sizes);
};

   const handleSizeChange = (handoverId, newSize) => {
    setHandovers((prev) =>
        prev.map((handover) =>
            handover.id === handoverId
                ? { ...handover, size: newSize }
                : handover
        )
    );
    // Remove the real-time stock update logic - it will be handled on submit
};

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadStatus("Uploading...");

            const validTypes = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/bmp",
            ];
            if (!validTypes.includes(file.type)) {
                throw new Error("Please select a valid image file");
            }

            if (file.size > 10 * 1024 * 1024) {
                throw new Error("File size must be less than 10MB");
            }

            const authResponse = await fetch("/api/imagekit/auth");

            if (!authResponse.ok) {
                throw new Error("ImageKit authentication failed");
            }

            const authData = await authResponse.json();

            const fileName = `handover_update_${
                employee.id
            }_${Date.now()}.${file.name.split(".").pop()}`;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileName", fileName);
            formData.append("folder", "/handovers");
            formData.append("useUniqueFileName", "true");
            formData.append(
                "publicKey",
                import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
            );
            formData.append("signature", authData.signature);
            formData.append("token", authData.token);
            formData.append("expire", authData.expire);

            const uploadResponse = await fetch(
                "https://upload.imagekit.io/api/v1/files/upload",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const uploadResult = await uploadResponse.json();

            if (uploadResponse.ok && uploadResult.url) {
                setPhoto(uploadResult.url);
                setUploadStatus("success");

                // REMOVE the notification here - just update status
                console.log("Photo uploaded successfully:", uploadResult.url);

                // Optional: Show a simple success message without modal
                // You can use a toast or inline message instead
                setUploadStatus("Upload successful!");

                // Auto-clear the success status after 2 seconds
                setTimeout(() => {
                    setUploadStatus("");
                }, 2000);
            } else {
                throw new Error(uploadResult.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("error");

            // Only show notification for errors, not for successes
            showNotification(
                "error",
                "Upload Failed",
                "Upload failed: " + error.message
            );
            e.target.value = "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedDate) {
            showNotification("warning", "Date Required", "Please select date");
            return;
        }

        if (handovers.length === 0) {
            showNotification(
                "warning",
                "No Handovers",
                "No handovers to update"
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const updateData = {
                date: selectedDate,
                photo_url: photo,
                handovers: handovers.map((handover) => {
                    const originalHandover = originalHandovers.find(
                        (oh) => oh.id === handover.id
                    );
                    return {
                        id: handover.id,
                        size: handover.size,
                        original_size: originalHandover?.size,
                        equipment_id: handover.equipment.id,
                    };
                }),
            };

            console.log("Update data dengan stock management:", updateData);

            // FIX: Get CSRF token properly
            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content");
            if (!csrfToken) {
                throw new Error("CSRF token not found");
            }

            console.log("CSRF Token:", csrfToken); // Debug log

            const response = await fetch(
                route("handovers.employee.update", { employee: employee.id }),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrfToken, // Use the token variable
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify(updateData),
                }
            );

            // Check if response is ok before parsing JSON
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (data.success) {
                let message = data.message;

                if (data.stock_changes) {
                    message += "\n\nStock changes:";
                    data.stock_changes.forEach((change) => {
                        if (change.type === "returned") {
                            message += `\n✅ Returned 1 ${change.equipment_type} (Size: ${change.old_size}) to stock`;
                        } else if (change.type === "assigned") {
                            message += `\n📦 Assigned 1 ${change.equipment_type} (Size: ${change.new_size}) from stock`;
                        }
                    });
                }

                showNotification("success", "Update Successful", message);
                onClose();
                router.reload();
            } else {
                throw new Error(data.message || "Update failed");
            }
        } catch (error) {
            console.error("Update error:", error);
            showNotification(
                "error",
                "Update Failed",
                "Update failed: " + error.message
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAvailableSizes = (equipment) => {
        if (!equipment.size) return [];

        const sizes = [];
        equipment.size.split(",").forEach((sizeItem) => {
            if (sizeItem && sizeItem.includes(":")) {
                const [sizeName, amount] = sizeItem.split(":");
                const stock = parseInt(amount) || 0;
                sizes.push({
                    name: sizeName,
                    stock: stock,
                });
            }
        });

        return sizes;
    };

const isSizeAvailable = (
    equipmentId,
    sizeName,
    currentHandoverId = null
) => {
    if (!availableSizes[equipmentId]) return false;

    const stock = availableSizes[equipmentId][sizeName] || 0;

    if (currentHandoverId) {
        const currentHandover = handovers.find(
            (h) => h.id === currentHandoverId
        );
        // If this is the currently selected size for this handover, it should be available
        if (currentHandover && currentHandover.size === sizeName) {
            return true;
        }
    }

    return stock > 0;
};

const getSizeStock = (equipmentId, sizeName, currentHandoverId = null) => {
    if (!availableSizes[equipmentId]) return 0;

    const stock = availableSizes[equipmentId][sizeName] || 0;

    if (currentHandoverId) {
        const currentHandover = handovers.find(
            (h) => h.id === currentHandoverId
        );
        // If this is the currently selected size for this handover, 
        // show the actual stock (don't add 1) because it's already assigned
        if (currentHandover && currentHandover.size === sizeName) {
            return stock;
        }
    }

    return stock;
};

    const hasStockAffectingChanges = () => {
        return handovers.some((handover) => {
            const original = originalHandovers.find(
                (oh) => oh.id === handover.id
            );
            return original && original.size !== handover.size;
        });
    };

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth="4xl">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
                    <div className="p-6 border-gray-200 dark:border-gray-700 border-b">
                        <h2 className="font-semibold text-gray-900 dark:text-white text-xl">
                            Update Assignments for {employee?.name}
                        </h2>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
                            NIK: {employee?.nik} | Update date and sizes for all
                            equipment
                        </p>

                        {hasStockAffectingChanges() && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 mt-3 p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
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
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                    <span>
                                        <strong>Stock Notice:</strong> Changing
                                        sizes will automatically return the
                                        previous size to stock and assign the
                                        new size from available stock.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6 p-6">
                            {/* Date Selection */}
                            <div>
                                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                    Assignment Date *
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                    className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white transition-colors"
                                    required
                                />
                            </div>

                            {/* Photo Upload Section */}
                            <div>
                                <label className="block mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                    Handover Photo (Optional)
                                </label>

                                {photo ? (
                                    <div className="flex flex-col items-center space-y-4">
                                        <img
                                            src={photo}
                                            alt="Current handover"
                                            className="shadow-md border-2 border-green-200 dark:border-green-800 rounded-lg w-48 h-48 object-cover"
                                        />
                                        <div className="flex gap-2">
                                            <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors cursor-pointer">
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
                                                Change Photo
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setPhoto("")}
                                                className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 transition-colors"
                                            >
                                                Remove Photo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 border-2 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 border-dashed rounded-lg text-center transition-colors">
                                        <svg
                                            className="mx-auto mb-4 w-12 h-12 text-gray-400"
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
                                        <p className="mb-4 text-gray-500 dark:text-gray-400">
                                            No photo uploaded yet
                                        </p>
                                        <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors cursor-pointer">
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
                                            Upload Photo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}

                                {uploadStatus && (
                                    <div
                                        className={`mt-3 text-sm font-medium ${
                                            uploadStatus.includes("success") ||
                                            uploadStatus.includes("successful")
                                                ? "text-green-600 dark:text-green-400"
                                                : uploadStatus === "error" ||
                                                  uploadStatus.includes(
                                                      "Failed"
                                                  )
                                                ? "text-red-600 dark:text-red-400"
                                                : "text-blue-600 dark:text-blue-400"
                                        }`}
                                    >
                                        {uploadStatus}
                                        {uploadStatus === "Uploading..." && (
                                            <span className="ml-2 inline-block animate-spin">
                                                ⏳
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Equipment List with Size Selection */}
                            <div>
                                <label className="block mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                    Equipment Assignments ({handovers.length}{" "}
                                    items)
                                </label>

                                {isLoading ? (
                                    <div className="py-8 text-center">
                                        <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                            <svg
                                                className="w-5 h-5 animate-spin"
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
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Loading handovers...
                                        </div>
                                    </div>
                                ) : handovers.length === 0 ? (
                                    <div className="py-8 text-gray-500 dark:text-gray-400 text-center">
                                        <svg
                                            className="mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600"
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
                                            No equipment assigned to this
                                            employee
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {handovers.map((handover) => {
                                            const equipment =
                                                handover.equipment;
                                            const sizes =
                                                getAvailableSizes(equipment);
                                            const hasSizes = sizes.length > 0;

                                            return (
                                                <div
                                                    key={handover.id}
                                                    className="bg-gray-50 dark:bg-gray-700/50 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-start gap-3">
                                                            {equipment.photo && (
                                                                <img
                                                                    src={
                                                                        equipment.photo
                                                                    }
                                                                    alt={
                                                                        equipment.type
                                                                    }
                                                                    className="border border-gray-200 dark:border-gray-600 rounded-lg w-12 h-12 object-cover"
                                                                />
                                                            )}
                                                            <div>
                                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                                    {
                                                                        equipment.type
                                                                    }
                                                                </h3>
                                                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                                    Serial:{" "}
                                                                    {handover.serial_number ||
                                                                        "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full font-medium text-blue-800 dark:text-blue-300 text-xs">
                                                            Assigned
                                                        </span>
                                                    </div>

                                                    {hasSizes ? (
                                                        <div>
                                                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                                                Select Size *
                                                            </label>
                                                            <div className="gap-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                                                {sizes.map(
                                                                    (
                                                                        size,
                                                                        idx
                                                                    ) => {
                                                                        const isAvailable =
                                                                            isSizeAvailable(
                                                                                equipment.id,
                                                                                size.name,
                                                                                handover.id
                                                                            );
                                                                        const stock =
                                                                            getSizeStock(
                                                                                equipment.id,
                                                                                size.name,
                                                                                handover.id
                                                                            );

                                                                        return (
                                                                            <label
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className={`relative flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                                                                                    handover.size ===
                                                                                    size.name
                                                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                                                                                        : isAvailable
                                                                                        ? "border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                                                                        : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`size-${handover.id}`}
                                                                                    value={
                                                                                        size.name
                                                                                    }
                                                                                    checked={
                                                                                        handover.size ===
                                                                                        size.name
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        handleSizeChange(
                                                                                            handover.id,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        !isAvailable
                                                                                    }
                                                                                    className="sr-only"
                                                                                />
                                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                                    {
                                                                                        size.name
                                                                                    }
                                                                                </span>
                                                                                <span
                                                                                    className={`text-xs mt-1 px-2 py-1 rounded-full ${
                                                                                        isAvailable
                                                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                                    }`}
                                                                                >
                                                                                    {isAvailable
                                                                                        ? `${stock} available`
                                                                                        : "Out of stock"}
                                                                                </span>
                                                                            </label>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                                                            No size variations
                                                            available for this
                                                            equipment
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-gray-200 dark:border-gray-700 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedDate}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-6 py-2 rounded-lg font-medium text-white transition-colors"
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
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    "Update Assignments"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: "",
                        title: "",
                        message: "",
                    })
                }
            />
        </>
    );
}