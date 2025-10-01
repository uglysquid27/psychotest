import React, { useState, useEffect } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";

// Quick Assign Component
function QuickAssign({ employee, show, onClose, equipments }) {
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignMultiple, setAssignMultiple] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Reset state ketika modal dibuka/tutup
    useEffect(() => {
        if (show) {
            setSelectedEquipment(null);
            setSelectedSize("");
            setShowSizeModal(false);
            setAssignMultiple(false);
            setQuantity(1);
        }
    }, [show]);

    const handleSizeSelect = (size) => {
        console.log("Size selected:", size);
        setSelectedSize(size);
        setShowSizeModal(false);

        setTimeout(() => {
            handleAssign();
        }, 100);
    };

    const handleEquipmentSelect = (equipment) => {
        console.log("Equipment selected:", equipment.type, "Has size:", !!equipment.size);
        setSelectedEquipment(equipment);

        if (equipment.size) {
            setShowSizeModal(true);
        } else {
            setSelectedSize(null);
            handleAssign();
        }
    };

    const handleAssign = async () => {
        if (!selectedEquipment || !employee) return;

        console.log("Debug - Assignment data:", {
            employee_id: employee.id,
            equipment_id: selectedEquipment.id,
            size: selectedSize,
            quantity: assignMultiple ? quantity : 1,
            equipmentHasSize: !!selectedEquipment.size,
            selectedSize: selectedSize,
        });

        if (selectedEquipment.size && !selectedSize) {
            alert("Please select a size for this equipment");
            setShowSizeModal(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const assignments = [];
            const totalToAssign = assignMultiple ? quantity : 1;

            for (let i = 0; i < totalToAssign; i++) {
                assignments.push(
                    fetch(route("handovers.quick-assign"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document.querySelector(
                                'meta[name="csrf-token"]'
                            ).content,
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        body: JSON.stringify({
                            employee_id: employee.id,
                            equipment_id: selectedEquipment.id,
                            size: selectedSize,
                            quantity: assignMultiple ? quantity : 1,
                        }),
                    })
                );
            }

            const results = await Promise.allSettled(assignments);

            const successful = [];
            const failed = [];

            for (const result of results) {
                if (result.status === "fulfilled" && result.value.ok) {
                    const data = await result.value.json();
                    if (data.success) {
                        successful.push(data);
                    } else {
                        failed.push({
                            error: data.message || "Assignment failed",
                            response: data,
                        });
                    }
                } else if (result.status === "fulfilled" && !result.value.ok) {
                    try {
                        const errorData = await result.value.json();
                        failed.push({
                            error:
                                errorData.message ||
                                `HTTP ${result.value.status}`,
                            response: errorData,
                        });
                    } catch (e) {
                        const errorText = await result.value.text();
                        failed.push({
                            error: `HTTP ${result.value.status}: ${errorText}`,
                        });
                    }
                } else {
                    failed.push({
                        error: result.reason?.message || "Request failed",
                    });
                }
            }

            if (successful.length > 0) {
                const totalAssigned = successful.reduce(
                    (sum, res) => sum + (res.handovers?.length || 1),
                    0
                );
                let message = `Successfully assigned ${totalAssigned} item(s) to ${employee.name}`;

                if (failed.length > 0) {
                    message += `, but ${failed.length} failed: ${failed[0].error}`;
                }

                alert(message);
                onClose();
                router.reload();
            } else {
                const firstError = failed[0]?.error || "All assignments failed";
                const errorDetails = failed[0]?.response
                    ? ` (Details: ${JSON.stringify(failed[0].response)})`
                    : "";
                throw new Error(firstError + errorDetails);
            }
        } catch (error) {
            console.error("Assignment error:", error);
            alert("Assignment failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Main Assign Modal */}
            <Modal show={show} onClose={onClose} maxWidth="4xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Quick Assign to {employee?.name}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            NIK: {employee?.nik}
                        </p>
                    </div>

                    <div className="p-6">
                        {/* Multiple Assignment Toggle */}
                        <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={assignMultiple}
                                        onChange={(e) =>
                                            setAssignMultiple(e.target.checked)
                                        }
                                        className="sr-only"
                                    />
                                    <div
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            assignMultiple
                                                ? "bg-blue-600"
                                                : "bg-gray-300 dark:bg-gray-600"
                                        }`}
                                    ></div>
                                    <div
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            assignMultiple
                                                ? "transform translate-x-6"
                                                : ""
                                        }`}
                                    ></div>
                                </div>
                            </label>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign multiple items
                            </span>

                            {assignMultiple && (
                                <div className="flex items-center gap-2 ml-4">
                                    <label className="text-sm text-gray-600 dark:text-gray-400">
                                        Quantity:
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={quantity}
                                        onChange={(e) =>
                                            setQuantity(
                                                parseInt(e.target.value) || 1
                                            )
                                        }
                                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Equipment Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                            {equipments?.map((equipment) => (
                                <div
                                    key={equipment.id}
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                    onClick={() =>
                                        handleEquipmentSelect(equipment)
                                    }
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {equipment.type}
                                            </h3>
                                            {equipment.photo && (
                                                <img
                                                    src={equipment.photo}
                                                    alt={equipment.type}
                                                    className="w-16 h-16 object-cover rounded-lg mt-2 border border-gray-200 dark:border-gray-600"
                                                />
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                equipment.size ||
                                                equipment.amount > 0
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
                                                    Available Sizes:
                                                </div>
                                                <div className="space-y-1">
                                                    {equipment.size
                                                        .split(",")
                                                        .map(
                                                            (sizeItem, idx) => {
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
                                                                    ) || 0;
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
                                                <span>Stock:</span>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${
                                                        equipment.amount > 0
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                    }`}
                                                >
                                                    {equipment.amount} available
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(!equipments || equipments.length === 0) && (
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
                                <p>No equipment available</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Size Selection Modal */}
            <Modal
                show={showSizeModal}
                onClose={() => setShowSizeModal(false)}
                maxWidth="sm"
            >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Select Size for {selectedEquipment?.type}
                    </h3>

                    <div className="space-y-3">
                        {selectedEquipment?.size
                            ?.split(",")
                            .map((sizeItem, index) => {
                                if (!sizeItem || !sizeItem.includes(":"))
                                    return null;

                                const [sizeName, amount] = sizeItem.split(":");
                                const stock = parseInt(amount) || 0;

                                return (
                                    <button
                                        key={index}
                                        onClick={() =>
                                            handleSizeSelect(sizeName)
                                        }
                                        disabled={stock <= 0}
                                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                                            stock > 0
                                                ? "border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                                : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {sizeName}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    stock > 0
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                }`}
                                            >
                                                {stock > 0
                                                    ? `${stock} available`
                                                    : "Out of stock"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// Update Employee Handovers Modal
// Update Employee Handovers Modal (Updated dengan stock management yang benar)
function UpdateEmployeeModal({ employee, show, onClose, equipments }) {
    const [handovers, setHandovers] = useState([]);
    const [originalHandovers, setOriginalHandovers] = useState([]); // Simpan data asli untuk perbandingan
    const [photo, setPhoto] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [availableSizes, setAvailableSizes] = useState({});

    useEffect(() => {
        if (show && employee) {
            loadEmployeeHandovers();
        }
    }, [show, employee]);

    const loadEmployeeHandovers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(route('handovers.employee.handovers', { employee: employee.id }));
            const data = await response.json();
            
            if (data.success) {
                setHandovers(data.handovers);
                setOriginalHandovers(JSON.parse(JSON.stringify(data.handovers))); // Simpan copy untuk perbandingan
                if (data.handovers.length > 0) {
                    setSelectedDate(data.handovers[0].date.split('T')[0]);
                    setPhoto(data.handovers[0].photo || "");
                }
                
                // Load available sizes untuk setiap equipment
                loadAvailableSizes(data.handovers);
            } else {
                throw new Error(data.message || 'Failed to load handovers');
            }
        } catch (error) {
            console.error('Error loading handovers:', error);
            alert('Failed to load handovers: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAvailableSizes = (handoversData) => {
        const sizes = {};
        
        handoversData.forEach(handover => {
            const equipment = handover.equipment;
            if (equipment.size) {
                const sizeData = {};
                equipment.size.split(',').forEach(sizeItem => {
                    if (sizeItem && sizeItem.includes(':')) {
                        const [sizeName, amount] = sizeItem.split(':');
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
        setHandovers(prev => prev.map(handover => 
            handover.id === handoverId 
                ? { ...handover, size: newSize }
                : handover
        ));
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

            const fileName = `handover_update_${employee.id}_${Date.now()}.${file.name.split('.').pop()}`;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileName", fileName);
            formData.append("folder", "/handovers");
            formData.append("useUniqueFileName", "true");
            formData.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY);
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
            } else {
                throw new Error(uploadResult.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("error");
            alert("Upload failed: " + error.message);
            e.target.value = "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedDate) {
            alert("Please select date");
            return;
        }

        if (handovers.length === 0) {
            alert("No handovers to update");
            return;
        }

        setIsSubmitting(true);

        try {
            // Siapkan data untuk update termasuk informasi stock management
            const updateData = {
                date: selectedDate,
                photo_url: photo,
                handovers: handovers.map(handover => {
                    const originalHandover = originalHandovers.find(oh => oh.id === handover.id);
                    return {
                        id: handover.id,
                        size: handover.size,
                        original_size: originalHandover?.size, // Size sebelumnya untuk stock management
                        equipment_id: handover.equipment.id
                    };
                })
            };

            console.log("Update data dengan stock management:", updateData);

            const response = await fetch(route('handovers.employee.update', { employee: employee.id }), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (data.success) {
                let message = data.message;
                
                // Tambahkan informasi stock changes jika ada
                if (data.stock_changes) {
                    message += "\n\nStock changes:";
                    data.stock_changes.forEach(change => {
                        if (change.type === 'returned') {
                            message += `\n✅ Returned 1 ${change.equipment_type} (Size: ${change.old_size}) to stock`;
                        } else if (change.type === 'assigned') {
                            message += `\n📦 Assigned 1 ${change.equipment_type} (Size: ${change.new_size}) from stock`;
                        }
                    });
                }

                alert(message);
                onClose();
                router.reload();
            } else {
                throw new Error(data.message || "Update failed");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Update failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAvailableSizes = (equipment) => {
        if (!equipment.size) return [];
        
        const sizes = [];
        equipment.size.split(',').forEach(sizeItem => {
            if (sizeItem && sizeItem.includes(':')) {
                const [sizeName, amount] = sizeItem.split(':');
                const stock = parseInt(amount) || 0;
                sizes.push({
                    name: sizeName,
                    stock: stock
                });
            }
        });
        
        return sizes;
    };

    const isSizeAvailable = (equipmentId, sizeName, currentHandoverId = null) => {
        if (!availableSizes[equipmentId]) return false;
        
        const stock = availableSizes[equipmentId][sizeName] || 0;
        
        // Jika ini adalah size yang sedang digunakan di handover saat ini, selalu tersedia
        if (currentHandoverId) {
            const currentHandover = handovers.find(h => h.id === currentHandoverId);
            if (currentHandover && currentHandover.size === sizeName) {
                return true;
            }
        }
        
        return stock > 0;
    };

    const getSizeStock = (equipmentId, sizeName, currentHandoverId = null) => {
        if (!availableSizes[equipmentId]) return 0;
        
        const stock = availableSizes[equipmentId][sizeName] || 0;
        
        // Jika ini adalah size yang sedang digunakan di handover saat ini, tambahkan 1 ke stock (karena akan dikembalikan)
        if (currentHandoverId) {
            const currentHandover = handovers.find(h => h.id === currentHandoverId);
            if (currentHandover && currentHandover.size === sizeName) {
                return stock + 1;
            }
        }
        
        return stock;
    };

    // Cek apakah ada perubahan size yang mempengaruhi stock
    const hasStockAffectingChanges = () => {
        return handovers.some(handover => {
            const original = originalHandovers.find(oh => oh.id === handover.id);
            return original && original.size !== handover.size;
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Update Assignments for {employee?.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        NIK: {employee?.nik} | Update date and sizes for all equipment
                    </p>
                    
                    {hasStockAffectingChanges() && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>
                                    <strong>Stock Notice:</strong> Changing sizes will automatically return the previous size to stock and assign the new size from available stock.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {/* Date Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Assignment Date *
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                required
                            />
                        </div>

                        {/* Photo Upload Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Handover Photo (Optional)
                            </label>

                            {photo ? (
                                <div className="flex flex-col items-center space-y-4">
                                    <img
                                        src={photo}
                                        alt="Current handover"
                                        className="w-48 h-48 object-cover rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md"
                                    />
                                    <div className="flex gap-2">
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
                                        >
                                            Remove Photo
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                                        No photo uploaded yet
                                    </p>
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
                                <div className={`mt-3 text-sm font-medium ${
                                    uploadStatus === "success"
                                        ? "text-green-600 dark:text-green-400"
                                        : uploadStatus === "error"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-blue-600 dark:text-blue-400"
                                }`}>
                                    {uploadStatus}
                                </div>
                            )}
                        </div>

                        {/* Equipment List with Size Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Equipment Assignments ({handovers.length} items)
                            </label>
                            
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Loading handovers...
                                    </div>
                                </div>
                            ) : handovers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                    {handovers.map((handover) => {
                                        const equipmentSizes = getAvailableSizes(handover.equipment);
                                        const originalHandover = originalHandovers.find(oh => oh.id === handover.id);
                                        const hasSizeChanged = originalHandover && originalHandover.size !== handover.size;
                                        const currentSizeStock = handover.size ? getSizeStock(handover.equipment.id, handover.size, handover.id) : 0;
                                        
                                        return (
                                            <div key={handover.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 dark:text-white">
                                                            {handover.equipment.type}
                                                        </h5>
                                                        {handover.equipment.photo && (
                                                            <img
                                                                src={handover.equipment.photo}
                                                                alt={handover.equipment.type}
                                                                className="w-12 h-12 object-cover rounded-lg mt-2 border border-gray-200 dark:border-gray-600"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                                            Current
                                                        </span>
                                                        {hasSizeChanged && (
                                                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                                                                Size Changed
                                                            </span>
                                                        )}
                                                        {handover.equipment.size && handover.size && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                isSizeAvailable(handover.equipment.id, handover.size, handover.id)
                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                            }`}>
                                                                {isSizeAvailable(handover.equipment.id, handover.size, handover.id) 
                                                                    ? `${currentSizeStock} available` 
                                                                    : 'Out of stock'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Size Selection */}
                                                {handover.equipment.size && (
                                                    <div className="mb-3">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Size
                                                        </label>
                                                        <select
                                                            value={handover.size || ""}
                                                            onChange={(e) => handleSizeChange(handover.id, e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                        >
                                                            <option value="">Select Size</option>
                                                            {equipmentSizes.map((size) => (
                                                                <option 
                                                                    key={size.name} 
                                                                    value={size.name}
                                                                    disabled={!isSizeAvailable(handover.equipment.id, size.name, handover.id) && handover.size !== size.name}
                                                                    className={!isSizeAvailable(handover.equipment.id, size.name, handover.id) && handover.size !== size.name ? 'text-red-500 bg-red-50' : ''}
                                                                >
                                                                    Size {size.name} {!isSizeAvailable(handover.equipment.id, size.name, handover.id) && handover.size !== size.name ? '(Out of stock)' : `(${getSizeStock(handover.equipment.id, size.name, handover.id)} available)`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        
                                                        {/* Stock change information */}
                                                        {hasSizeChanged && originalHandover && (
                                                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                                    </svg>
                                                                    <span>
                                                                        <strong>Stock change:</strong> Size {originalHandover.size} → Size {handover.size}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Equipment without size - show general stock */}
                                                {!handover.equipment.size && (
                                                    <div className="mb-3">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                handover.equipment.amount > 0
                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                            }`}>
                                                                {handover.equipment.amount} available
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Current Info */}
                                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                    <div>Current Size: {handover.size || "Not set"}</div>
                                                    {originalHandover && originalHandover.size !== handover.size && (
                                                        <div className="text-yellow-600 dark:text-yellow-400">
                                                            Previous Size: {originalHandover.size}
                                                        </div>
                                                    )}
                                                    <div>Assigned: {new Date(handover.date).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <p>No equipment assignments found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Updating..." : "Update All Assignments"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

// New Assign Modal Component (Updated dengan kemampuan pilih item yang sama)
function NewAssignModal({ show, onClose, employees, equipments }) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedEquipments, setSelectedEquipments] = useState([]);
    const [equipmentSizes, setEquipmentSizes] = useState({});
    const [photo, setPhoto] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        if (show) {
            setSelectedEmployee(null);
            setSelectedEquipments([]);
            setEquipmentSizes({});
            setPhoto("");
            setCurrentStep(1);
            setUploadStatus("");
        }
    }, [show]);

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setCurrentStep(2);
    };

    const toggleEquipmentSelect = (equipment) => {
        // Untuk equipment dengan size, buka modal size selection
        if (equipment.size) {
            setSelectedEquipmentForSize(equipment);
            setCurrentStep(3);
        } else {
            // Untuk equipment tanpa size, langsung tambahkan
            addEquipment(equipment, null);
        }
    };

    const addEquipment = (equipment, size) => {
        const newEquipment = {
            ...equipment,
            uniqueId: `${equipment.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // ID unik untuk duplikat
        };

        setSelectedEquipments(prev => [...prev, newEquipment]);
        
        if (size) {
            setEquipmentSizes(prev => ({
                ...prev,
                [newEquipment.uniqueId]: size
            }));
        }
    };

    const [selectedEquipmentForSize, setSelectedEquipmentForSize] = useState(null);

    const handleSizeSelect = (equipmentId, size) => {
        addEquipment(selectedEquipmentForSize, size);
        setCurrentStep(2);
    };

    const removeEquipment = (uniqueId) => {
        setSelectedEquipments(prev => prev.filter(eq => eq.uniqueId !== uniqueId));
        
        // Hapus juga size dari state jika ada
        setEquipmentSizes(prev => {
            const newSizes = { ...prev };
            delete newSizes[uniqueId];
            return newSizes;
        });
    };

    const duplicateEquipment = (equipment) => {
        if (equipment.size) {
            // Untuk equipment dengan size, buka modal size selection untuk duplikat
            setSelectedEquipmentForSize(equipment);
            setCurrentStep(3);
        } else {
            // Untuk equipment tanpa size, langsung duplikat
            addEquipment(equipment, null);
        }
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
            
            const employeeId = selectedEmployee?.id || 'temp';
            const fileName = `handover_${employeeId}_${Date.now()}.${file.name.split('.').pop()}`;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileName", fileName);
            formData.append("folder", "/handovers");
            formData.append("useUniqueFileName", "true");
            formData.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY);
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
            } else {
                throw new Error(uploadResult.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("error");
            alert("Upload failed: " + error.message);
            e.target.value = "";
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedEmployee || selectedEquipments.length === 0) {
            alert("Please select an employee and at least one equipment");
            return;
        }

        // Validasi size untuk equipment yang membutuhkan
        for (const equipment of selectedEquipments) {
            if (equipment.size && !equipmentSizes[equipment.uniqueId]) {
                alert(`Please select size for ${equipment.type}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const assignments = [];
            
            for (const equipment of selectedEquipments) {
                const assignmentData = {
                    employee_id: selectedEmployee.id,
                    equipment_id: equipment.id,
                    size: equipmentSizes[equipment.uniqueId] || null,
                    quantity: 1,
                    photo_url: photo
                };

                assignments.push(
                    fetch(route("handovers.quick-assign"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        body: JSON.stringify(assignmentData),
                    })
                );
            }

            const results = await Promise.allSettled(assignments);
            
            const successful = [];
            const failed = [];

            for (const result of results) {
                if (result.status === "fulfilled" && result.value.ok) {
                    const data = await result.value.json();
                    if (data.success) {
                        successful.push(data);
                    } else {
                        failed.push({
                            error: data.message || "Assignment failed",
                            equipment: data.equipment
                        });
                    }
                } else if (result.status === "fulfilled" && !result.value.ok) {
                    try {
                        const errorData = await result.value.json();
                        failed.push({
                            error: errorData.message || `HTTP ${result.value.status}`,
                        });
                    } catch (e) {
                        failed.push({
                            error: `HTTP ${result.value.status}`,
                        });
                    }
                } else {
                    failed.push({
                        error: result.reason?.message || "Request failed",
                    });
                }
            }

            if (successful.length > 0) {
                let message = `✅ Successfully assigned ${successful.length} equipment(s) to ${selectedEmployee.name}`;
                
                // Tampilkan equipment yang berhasil diassign
                const successfulEquipment = successful.map(s => 
                    s.handovers?.[0]?.equipment?.type || 'Equipment'
                ).join(', ');
                
                message += `\n\n📦 Equipment assigned: ${successfulEquipment}`;
                
                if (photo) {
                    message += `\n\n📸 Photo uploaded successfully`;
                }

                if (failed.length > 0) {
                    message += `\n\n❌ ${failed.length} assignment(s) failed: ${failed[0].error}`;
                }

                alert(message);
                onClose();
                router.reload();
            } else {
                throw new Error('All assignments failed: ' + (failed[0]?.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("Bulk assign error:", error);
            alert("❌ Assignment failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const goBack = () => {
        if (currentStep === 2) {
            setCurrentStep(1);
        } else if (currentStep === 3) {
            setCurrentStep(2);
        }
    };

    // Hitung jumlah setiap jenis equipment
    const getEquipmentCount = (equipmentId) => {
        return selectedEquipments.filter(eq => eq.id === equipmentId).length;
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {currentStep > 1 && (
                            <button
                                onClick={goBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {currentStep === 1 && "Select Employee"}
                                {currentStep === 2 && "Select Equipment"}
                                {currentStep === 3 && "Select Size"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {currentStep === 1 && "Choose an employee who hasn't received any equipment"}
                                {currentStep === 2 && `Select multiple equipment for ${selectedEmployee?.name} - You can select the same item multiple times`}
                                {currentStep === 3 && `Select size for ${selectedEquipmentForSize?.type}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Employee Selection */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            {employees && employees.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                    {employees.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                            onClick={() => handleEmployeeSelect(employee)}
                                        >
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {employee.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                NIK: {employee.nik}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Department: {employee.department}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    <p>No unassigned employees found</p>
                                    <p className="text-sm mt-1">All employees have already received equipment</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Equipment Selection */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    💡 <strong>New Feature:</strong> You can now select the same equipment multiple times! 
                                    Click on equipment to add, and use the "Add Again" button to add duplicates.
                                </p>
                            </div>

                            {/* Selected Equipment Summary */}
                            {selectedEquipments.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                                            ✅ {selectedEquipments.length} equipment selected for assignment
                                        </p>
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                                            Total: {selectedEquipments.length} items
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {Array.from(new Set(selectedEquipments.map(eq => eq.id))).map(equipmentId => {
                                            const equipment = equipments.find(e => e.id === equipmentId);
                                            const count = getEquipmentCount(equipmentId);
                                            const items = selectedEquipments.filter(eq => eq.id === equipmentId);
                                            
                                            return (
                                                <div key={equipmentId} className="flex justify-between items-center text-sm">
                                                    <span className="text-green-700 dark:text-green-300">
                                                        {equipment.type}
                                                        {items.some(item => equipmentSizes[item.uniqueId]) && 
                                                            ` (Sizes: ${items.map(item => equipmentSizes[item.uniqueId]).filter(Boolean).join(', ')})`
                                                        }
                                                    </span>
                                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                                                        {count}x
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {photo && (
                                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                            📸 Photo will be attached to all assignments
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Photo Upload Section */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    📸 Handover Photo (Optional - will be used for all assignments)
                                </label>

                                {photo ? (
                                    <div className="flex flex-col items-center space-y-4">
                                        <img
                                            src={photo}
                                            alt="Handover preview"
                                            className="w-48 h-48 object-cover rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md"
                                        />
                                        <div className="flex gap-2">
                                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
                                                className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
                                            >
                                                Remove Photo
                                            </button>
                                        </div>
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            ✅ Photo ready for assignment
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                                            No photo uploaded yet
                                        </p>
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
                                    <div className={`mt-3 text-sm font-medium ${
                                        uploadStatus === "success"
                                            ? "text-green-600 dark:text-green-400"
                                            : uploadStatus === "error"
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-blue-600 dark:text-blue-400"
                                    }`}>
                                        {uploadStatus}
                                    </div>
                                )}
                            </div>

                            {/* Equipment Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                {equipments?.map((equipment) => {
                                    const selectedCount = getEquipmentCount(equipment.id);
                                    const isSelected = selectedCount > 0;
                                    
                                    return (
                                        <div
                                            key={equipment.id}
                                            className={`rounded-lg p-4 border transition-all ${
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                    : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                            }`}
                                            onClick={() => !isSelected && toggleEquipmentSelect(equipment)}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {equipment.type}
                                                    </h3>
                                                    {equipment.photo && (
                                                        <img
                                                            src={equipment.photo}
                                                            alt={equipment.type}
                                                            className="w-16 h-16 object-cover rounded-lg mt-2 border border-gray-200 dark:border-gray-600"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            equipment.size || equipment.amount > 0
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                        }`}
                                                    >
                                                        {equipment.size ? "Multiple Sizes" : `${equipment.amount} available`}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                                            {selectedCount} selected
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            {isSelected && (
                                                <div className="flex gap-2 mb-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            duplicateEquipment(equipment);
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Add Again
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Hapus satu item dari equipment ini
                                                            const toRemove = selectedEquipments.find(eq => eq.id === equipment.id);
                                                            if (toRemove) {
                                                                removeEquipment(toRemove.uniqueId);
                                                            }
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                        Remove One
                                                    </button>
                                                </div>
                                            )}

                                            {/* Stock Information */}
                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                {equipment.size ? (
                                                    <div>
                                                        <div className="font-medium mb-1">Available Sizes:</div>
                                                        <div className="space-y-1">
                                                            {equipment.size.split(",").map((sizeItem, idx) => {
                                                                if (!sizeItem || !sizeItem.includes(":")) return null;
                                                                const [sizeName, amount] = sizeItem.split(":");
                                                                const stock = parseInt(amount) || 0;
                                                                return (
                                                                    <div key={idx} className="flex justify-between items-center">
                                                                        <span>Size {sizeName}</span>
                                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                                            stock > 0
                                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                        }`}>
                                                                            {stock} available
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-center">
                                                        <span>Stock:</span>
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            equipment.amount > 0
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                        }`}>
                                                            {equipment.amount} available
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={goBack}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleBulkAssign}
                                    disabled={isSubmitting || selectedEquipments.length === 0}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Assigning...
                                        </>
                                    ) : (
                                        `Assign ${selectedEquipments.length} Items`
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Size Selection */}
                    {currentStep === 3 && selectedEquipmentForSize && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                    Select Size for {selectedEquipmentForSize.type}
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    Please select the appropriate size for this equipment
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedEquipmentForSize.size?.split(',').map((sizeItem, index) => {
                                    if (!sizeItem || !sizeItem.includes(':')) return null;
                                    
                                    const [sizeName, amount] = sizeItem.split(':');
                                    const stock = parseInt(amount) || 0;
                                    
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleSizeSelect(selectedEquipmentForSize.id, sizeName)}
                                            disabled={stock <= 0}
                                            className={`p-6 text-left rounded-lg border-2 transition-all ${
                                                stock > 0
                                                    ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-medium text-lg text-gray-900 dark:text-white">
                                                        Size {sizeName}
                                                    </span>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {selectedEquipmentForSize.type}
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                    stock > 0 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                    {stock > 0 ? `${stock} available` : 'Out of stock'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ show, onClose, handover, onConfirm }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Delete failed: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Delete Assignment
                    </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete the assignment of{" "}
                    <strong>{handover?.equipment?.type}</strong> to{" "}
                    <strong>{handover?.employee?.name}</strong>?
                    This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
    );
}

// Main Component
export default function Assign({ handovers, filters, equipments, employees }) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [groupedHandovers, setGroupedHandovers] = useState({});
    const [expandedEmployees, setExpandedEmployees] = useState(new Set());
    
    // Modal states
    const [showQuickAssign, setShowQuickAssign] = useState(false);
    const [showNewAssign, setShowNewAssign] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [handoverToDelete, setHandoverToDelete] = useState(null);
    const [unassignedEmployees, setUnassignedEmployees] = useState([]);

    // Safe data handling
    const safeHandovers = handovers || {
        data: [],
        total: 0,
        from: 0,
        to: 0,
        last_page: 1,
    };

    // Group handovers by employee
    useEffect(() => {
        const grouped = {};
        safeHandovers.data?.forEach((handover) => {
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
    }, [safeHandovers]);

    // Load unassigned employees
    useEffect(() => {
        if (showNewAssign) {
            loadUnassignedEmployees();
        }
    }, [showNewAssign]);

    const loadUnassignedEmployees = async () => {
        try {
            const response = await fetch(route('handovers.unassigned-employees'));
            const data = await response.json();
            
            if (data.success) {
                setUnassignedEmployees(data.employees);
            } else {
                console.error('Failed to load unassigned employees:', data.message);
                setUnassignedEmployees([]);
            }
        } catch (error) {
            console.error('Error loading unassigned employees:', error);
            setUnassignedEmployees([]);
        }
    };

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
        const employeeAssignments = groupedHandovers[employeeId]?.assignments || [];
        const assignedEquipmentIds = new Set(
            employeeAssignments.map((assignment) => assignment.equipment.id)
        );

        return equipments?.filter(
            (equipment) => !assignedEquipmentIds.has(equipment.id)
        ) || [];
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
            const response = await fetch(route("handovers.destroy", {
                handover: handoverToDelete.id,
            }), {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            const data = await response.json();

            if (data.success) {
                router.reload();
            } else {
                throw new Error(data.error || "Delete failed");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Delete failed: " + error.message);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route("handovers.assign"), { search });
    };

    const clearSearch = () => {
        setSearch("");
        router.get(route("handovers.assign"), { search: "" });
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
                    <div className="flex gap-3">
                        <button
                            onClick={handleNewAssign}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Assign
                        </button>
                        <Link
                            href={route("equipments.index")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl overflow-hidden mb-6">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                        Employee Assignments Overview
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        View and manage equipment assignments for each employee
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                        {Object.keys(groupedHandovers).length} employees
                                    </span>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                                        {safeHandovers.total} total assignments
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                                <div key={group.employee.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                    {/* Employee Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        onClick={() => toggleEmployeeExpansion(group.employee.id)}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                                                    {group.employee.name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {group.employee.name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <span>NIK: {group.employee.nik}</span>
                                                        <span>Assignments: {group.totalAssignments}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdate(group.employee);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Update
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuickAssign(group.employee);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Assign More
                                                </button>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    group.totalAssignments > 0
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                }`}>
                                                    {group.totalAssignments} equipment assigned
                                                </span>
                                                <svg
                                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                                        expandedEmployees.has(group.employee.id) ? "rotate-180" : ""
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
                                    {expandedEmployees.has(group.employee.id) && (
                                        <div className="border-t border-gray-200 dark:border-gray-700">
                                            <div className="p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                                                        Assigned Equipment ({group.assignments.length})
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {group.assignments.map((assignment) => (
                                                        <div key={assignment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <h5 className="font-medium text-gray-900 dark:text-white">
                                                                        {assignment.equipment.type}
                                                                    </h5>
                                                                    {assignment.size && (
                                                                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                                                            Size: {assignment.size}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {assignment.photo ? (
                                                                    <img
                                                                        src={assignment.photo}
                                                                        alt="handover"
                                                                        className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                                    />
                                                                ) : (
                                                                    <span className="text-gray-400 text-xs">No photo</span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                                Assigned: {new Date(assignment.date).toLocaleDateString("id-ID", {
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                })}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => openDeleteModal(assignment)}
                                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    No assignments found
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">
                                    {search ? "Try adjusting your search terms" : "Start by assigning equipment to employees"}
                                </p>
                                {search ? (
                                    <button onClick={clearSearch} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                                        Clear Search
                                    </button>
                                ) : (
                                    <button onClick={handleNewAssign} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                                        New Assign
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {safeHandovers.last_page > 1 && (
                        <div className="mt-8 flex justify-center">
                            <nav className="flex items-center gap-2">
                                {safeHandovers.links?.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? "bg-indigo-600 text-white shadow-md"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                                        } ${
                                            !link.url ? "opacity-50 cursor-not-allowed" : ""
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <QuickAssign
                employee={selectedEmployee}
                show={showQuickAssign}
                onClose={() => setShowQuickAssign(false)}
                equipments={selectedEmployee ? getAvailableEquipmentsForEmployee(selectedEmployee.id) : []}
            />

            <NewAssignModal
                show={showNewAssign}
                onClose={() => setShowNewAssign(false)}
                employees={unassignedEmployees}
                equipments={equipments}
            />

            <UpdateEmployeeModal
                employee={selectedEmployee}
                show={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                equipments={equipments}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                handover={handoverToDelete}
                onConfirm={handleDelete}
            />
        </AuthenticatedLayout>
    );
}