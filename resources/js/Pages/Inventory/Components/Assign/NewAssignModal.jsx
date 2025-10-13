import React, { useState, useEffect } from "react";
import { useForm, usePage } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import NotificationModal from "./NotificationModal";

// Sub-components for better organization
function PhotoUploadSection({ photo, setPhoto, uploadStatus, setUploadStatus, showNotification }) {
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

            const fileName = `handover_new_${Date.now()}.${file.name
                .split(".")
                .pop()}`;

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
                setUploadStatus("Upload successful!");

                setTimeout(() => {
                    setUploadStatus("");
                }, 2000);
            } else {
                throw new Error(uploadResult.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("Upload failed");

            showNotification(
                "error",
                "Upload Failed",
                "Upload failed: " + error.message
            );
            e.target.value = "";
        }
    };

    return (
        <div className="mb-6">
            <label className="block mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm">
                Handover Photo (Optional)
            </label>

            {photo ? (
                <div className="flex flex-col items-center space-y-4">
                    <img
                        src={photo}
                        alt="Handover photo"
                        className="shadow-md border-2 border-green-200 dark:border-green-800 rounded-lg w-32 h-32 object-cover"
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
                            onClick={() => setPhoto('')}
                            className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 transition-colors"
                        >
                            Remove Photo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-6 border-2 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 border-dashed rounded-lg text-center transition-colors">
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
                        No photo uploaded (optional)
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
                <div className={`mt-3 text-sm font-medium ${
                    uploadStatus.includes('success') || uploadStatus.includes('successful')
                        ? 'text-green-600 dark:text-green-400'
                        : uploadStatus === 'Uploading...'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                }`}>
                    {uploadStatus}
                    {uploadStatus === 'Uploading...' && (
                        <span className="ml-2 inline-block animate-spin">⏳</span>
                    )}
                </div>
            )}
        </div>
    );
}

function EmployeeFilters({ 
    searchTerm, 
    setSearchTerm, 
    selectedSection, 
    setSelectedSection, 
    selectedSubSection, 
    setSelectedSubSection, 
    sections, 
    filteredSubSections, 
    clearFilters,
    setCurrentPage 
}) {
    return (
        <div className='bg-gray-50 dark:bg-gray-700/50 mb-4 p-4 rounded-lg'>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-4'>
                {/* Search */}
                <div className='md:col-span-2'>
                    <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                        Search Employee
                    </label>
                    <input
                        type='text'
                        placeholder='Search by name or NIK...'
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className='dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors'
                    />
                </div>

                {/* Section Filter */}
                <div>
                    <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                        Section
                    </label>
                    <select
                        value={selectedSection}
                        onChange={e => {
                            setSelectedSection(e.target.value);
                            setCurrentPage(1);
                        }}
                        className='dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors'
                    >
                        <option value=''>All Sections</option>
                        {sections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subsection Filter */}
                <div>
                    <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                        Subsection
                    </label>
                    <select
                        value={selectedSubSection}
                        onChange={e => {
                            setSelectedSubSection(e.target.value);
                            setCurrentPage(1);
                        }}
                        disabled={!selectedSection}
                        className='disabled:bg-gray-100 dark:bg-gray-700 dark:disabled:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors disabled:cursor-not-allowed'
                    >
                        <option value=''>All Subsections</option>
                        {filteredSubSections.map(subsection => (
                            <option key={subsection.id} value={subsection.id}>
                                {subsection.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedSection || selectedSubSection) && (
                <div className='flex justify-end mt-3'>
                    <button
                        onClick={clearFilters}
                        className='font-medium text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-400 text-sm'
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}

function EmployeeList({ 
    employees, 
    selectedEmployee, 
    onEmployeeSelect, 
    employeeEquipmentCounts,
    equipments 
}) {
    const getEmployeeEquipmentCount = (employeeId, equipmentType) => {
        if (!employeeEquipmentCounts[employeeId]) return 0;
        const equipmentCount = employeeEquipmentCounts[employeeId].find(
            (item) => item.equipment_type === equipmentType
        );
        return equipmentCount ? equipmentCount.total_count : 0;
    };

    const getTotalEmployeeEquipmentCount = (employeeId) => {
        if (!employeeEquipmentCounts[employeeId]) return 0;
        return employeeEquipmentCounts[employeeId].reduce((total, item) => {
            return total + item.total_count;
        }, 0);
    };

    const getEmployeeSectionInfo = (employee) => {
        if (!employee.sub_sections || employee.sub_sections.length === 0) {
            return "No section";
        }
        const subSection = employee.sub_sections[0];
        return `${subSection.section?.name || "No section"}${
            subSection.name ? ` / ${subSection.name}` : ""
        }`;
    };

    return (
        <div className='flex-1 overflow-y-auto'>
            {employees.map(employee => (
                <div
                    key={employee.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all mb-3 ${
                        selectedEmployee?.id === employee.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                    }`}
                    onClick={() => onEmployeeSelect(employee)}
                >
                    <div className='flex justify-between items-start'>
                        <div className='flex-1'>
                            <h4 className='font-medium text-gray-900 dark:text-white'>
                                {employee.name}
                            </h4>
                            <p className='text-gray-600 dark:text-gray-400 text-sm'>
                                NIK: {employee.nik}
                            </p>
                            <p className='mt-1 text-gray-500 dark:text-gray-500 text-sm'>
                                {getEmployeeSectionInfo(employee)}
                            </p>
                        </div>
                        <div className='ml-4 text-right'>
                            <div className='mb-1 text-gray-500 dark:text-gray-400 text-xs'>
                                Equipment Count: {getTotalEmployeeEquipmentCount(employee.id)}
                            </div>
                            <div className='space-y-1 max-h-20 overflow-y-auto'>
                                {equipments?.map(equipment => {
                                    const count = getEmployeeEquipmentCount(employee.id, equipment.type);
                                    if (count > 0) {
                                        return (
                                            <div key={equipment.id} className='text-xs'>
                                                <span className='text-gray-600 dark:text-gray-400'>
                                                    {equipment.type}:{' '}
                                                </span>
                                                <span className='font-medium text-blue-600 dark:text-blue-400'>
                                                    {count}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                }).filter(Boolean)}
                            </div>
                            {getTotalEmployeeEquipmentCount(employee.id) === 0 && (
                                <span className='text-gray-400 dark:text-gray-500 text-xs'>
                                    No equipment
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {employees.length === 0 && (
                <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                    <svg
                        className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1}
                            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                        />
                    </svg>
                    <p>No employees found</p>
                    <p className='mt-1 text-sm'>
                        Try adjusting your search or filters
                    </p>
                </div>
            )}
        </div>
    );
}

function EquipmentList({ 
    equipments, 
    selectedItems, 
    onAddItem, 
    onRemoveItem, 
    isItemSelected 
}) {
    return (
        <div className='flex-1 min-h-0 overflow-hidden'>
            <div className='h-full overflow-y-auto space-y-4'>
                {equipments?.map(equipment => (
                    <div
                        key={equipment.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                        <div className='flex justify-between items-start mb-3'>
                            <div className='flex items-start gap-3'>
                                {equipment.photo && (
                                    <img
                                        src={equipment.photo}
                                        alt={equipment.type}
                                        className='border border-gray-200 dark:border-gray-600 rounded-lg w-16 h-16 object-cover'
                                    />
                                )}
                                <div>
                                    <h4 className='font-medium text-gray-900 dark:text-white'>
                                        {equipment.type}
                                    </h4>
                                    <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                                        {equipment.description || 'No description'}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    equipment.size || equipment.amount > 0
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}
                            >
                                {equipment.size
                                    ? 'Multiple Sizes'
                                    : `${equipment.amount} available`}
                            </span>
                        </div>

                        {/* Stock Information */}
                        <div className='space-y-2 text-gray-600 dark:text-gray-400 text-sm'>
                            {equipment.size ? (
                                <div>
                                    <div className='mb-2 font-medium'>
                                        Available Sizes:
                                    </div>
                                    <div className='flex flex-wrap gap-2'>
                                        {equipment.size
                                            .split(',')
                                            .map((sizeItem, idx) => {
                                                if (!sizeItem || !sizeItem.includes(':')) return null;
                                                const [sizeName, amount] = sizeItem.split(':');
                                                const stock = parseInt(amount) || 0;
                                                const isSelected = isItemSelected(equipment, sizeName);
                                                
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => onAddItem(equipment, sizeName)}
                                                        disabled={stock <= 0}
                                                        className={`px-3 py-2 rounded-lg border transition-all ${
                                                            isSelected
                                                                ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                                                : stock > 0
                                                                ? 'bg-white border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:bg-blue-900/20'
                                                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{sizeName}</span>
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded-full text-xs ${
                                                                    stock > 0
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                }`}
                                                            >
                                                                {stock}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <span>Stock:</span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${
                                                equipment.amount > 0
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}
                                        >
                                            {equipment.amount} available
                                        </span>
                                        <button
                                            onClick={() => onAddItem(equipment)}
                                            disabled={equipment.amount <= 0}
                                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                isItemSelected(equipment)
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : equipment.amount > 0
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {isItemSelected(equipment) ? 'Remove' : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {(!equipments || equipments.length === 0) && (
                    <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                        <svg
                            className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={1}
                                d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                            />
                        </svg>
                        <p>No equipment available</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function AssignmentSummary({ selectedEmployee, selectedItems, photo, onRemoveItem }) {
    return (
        <div className='bg-blue-50 dark:bg-blue-900/20 mt-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <h4 className='mb-3 font-semibold text-gray-900 dark:text-white text-lg'>
                Assignment Summary
            </h4>
            <div className='space-y-3'>
                {selectedEmployee && (
                    <div className="flex justify-between items-center">
                        <span className='text-gray-600 dark:text-gray-400'>
                            Employee:
                        </span>
                        <span className='font-medium text-gray-900 dark:text-white'>
                            {selectedEmployee.name} (NIK: {selectedEmployee.nik})
                        </span>
                    </div>
                )}
                
                {selectedItems.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className='text-gray-600 dark:text-gray-400'>
                                Selected Items ({selectedItems.length}):
                            </span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {selectedItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border">
                                    <div>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {item.equipment_type}
                                        </span>
                                        {item.size && (
                                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                (Size: {item.size})
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(index)}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {photo && (
                    <div className="flex justify-between items-center">
                        <span className='text-gray-600 dark:text-gray-400'>
                            Photo:
                        </span>
                        <span className='font-medium text-green-600 dark:text-green-400'>
                            Ready to upload
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function NewAssignModal({ show, onClose, employees, equipments, onSuccess, onError }) {
    const { sections, subSections } = usePage().props;
    
    // Use Inertia's useForm hook for proper form handling
    const { data, setData, post, processing, errors } = useForm({
        employee_id: '',
        items: [],
        photo_url: ''
    });

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [employeeEquipmentCounts, setEmployeeEquipmentCounts] = useState({});
    const [photo, setPhoto] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedSubSection, setSelectedSubSection] = useState("");
    const [filteredSubSections, setFilteredSubSections] = useState([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [notification, setNotification] = useState({
        show: false,
        type: "",
        title: "",
        message: "",
    });

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message });
    };

    // Load employee equipment counts
    useEffect(() => {
        if (show) {
            loadEmployeeEquipmentCounts();
        }
    }, [show]);

    const loadEmployeeEquipmentCounts = async () => {
        try {
            const response = await fetch(route("handovers.employee.equipment-counts"));
            const data = await response.json();

            if (data.success) {
                setEmployeeEquipmentCounts(data.counts);
            } else {
                console.error("Failed to load employee equipment counts:", data.message);
            }
        } catch (error) {
            console.error("Error loading employee equipment counts:", error);
        }
    };

    // Reset state when modal opens/closes
    useEffect(() => {
        if (show) {
            setSelectedEmployee(null);
            setSelectedItems([]);
            setSearchTerm("");
            setSelectedSection("");
            setSelectedSubSection("");
            setCurrentPage(1);
            setPhoto("");
            setUploadStatus("");
            
            // Reset form data
            setData({
                employee_id: '',
                items: [],
                photo_url: ''
            });
        }
    }, [show]);

    // Filter subsections based on selected section
    useEffect(() => {
        if (selectedSection) {
            const filtered = subSections.filter((sub) => sub.section_id == selectedSection);
            setFilteredSubSections(filtered);
            if (selectedSubSection && !filtered.some((sub) => sub.id == selectedSubSection)) {
                setSelectedSubSection("");
            }
        } else {
            setFilteredSubSections([]);
            setSelectedSubSection("");
        }
    }, [selectedSection, selectedSubSection, subSections]);

    // Use all employees
    const availableEmployees = employees || [];

    // Filter employees based on search and filters
    const filteredEmployees = availableEmployees?.filter((employee) => {
        const matchesSearch = !searchTerm ||
            employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.nik.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSection = !selectedSection ||
            employee.sub_sections?.some((sub) => sub.section_id == selectedSection);

        const matchesSubSection = !selectedSubSection ||
            employee.sub_sections?.some((sub) => sub.id == selectedSubSection);

        return matchesSearch && matchesSection && matchesSubSection;
    }) || [];

    // Pagination for employees only
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setData('employee_id', employee.id);
        setTimeout(() => {
            const equipmentSection = document.getElementById("equipment-selection");
            if (equipmentSection) {
                equipmentSection.scrollIntoView({ behavior: "smooth" });
            }
        }, 100);
    };

    const handleAddItem = (equipment, size = null) => {
        if (!selectedEmployee) {
            showNotification('warning', 'Select Employee First', 'Please select an employee first');
            return;
        }

        const newItem = {
            equipment_id: equipment.id,
            equipment_type: equipment.type,
            size: size,
            photo: equipment.photo
        };

        // Check if item already exists
        const existingIndex = selectedItems.findIndex(item => 
            item.equipment_id === equipment.id && item.size === size
        );

        let updatedItems;
        if (existingIndex >= 0) {
            // Remove if already selected
            updatedItems = selectedItems.filter((_, index) => index !== existingIndex);
        } else {
            // Add new item
            updatedItems = [...selectedItems, newItem];
        }

        setSelectedItems(updatedItems);
        setData('items', updatedItems);
    };

    const handleRemoveItem = (index) => {
        const updatedItems = selectedItems.filter((_, i) => i !== index);
        setSelectedItems(updatedItems);
        setData('items', updatedItems);
    };

    const isItemSelected = (equipment, size = null) => {
        return selectedItems.some(item => 
            item.equipment_id === equipment.id && item.size === size
        );
    };

    const handleFinalSubmit = () => {
        if (!selectedEmployee) {
            showNotification('warning', 'Employee Required', 'Please select an employee');
            return;
        }

        if (selectedItems.length === 0) {
            showNotification('warning', 'Items Required', 'Please select at least one equipment item');
            return;
        }

        // Update form data with current values
        setData({
            employee_id: selectedEmployee.id,
            items: selectedItems,
            photo_url: photo
        });

        console.log('Submitting bulk assignment:', {
            employee_id: selectedEmployee.id,
            items: selectedItems,
            photo_url: photo
        });

        // Use Inertia's post method
        post(route('handovers.bulk-assign'), {
            onSuccess: () => {
                showNotification('success', 'Assignment Successful', 
                    `Successfully assigned ${selectedItems.length} item(s) to ${selectedEmployee.name}`);
                if (onSuccess) onSuccess();
                onClose();
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors).join(', ') || 'Assignment failed';
                showNotification('error', 'Assignment Failed', errorMessage);
                if (onError) onError(new Error(errorMessage));
            }
        });
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedSection("");
        setSelectedSubSection("");
        setCurrentPage(1);
    };

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth='7xl'>
                <div className='flex flex-col bg-white dark:bg-gray-800 shadow-xl rounded-lg h-[90vh]'>
                    <div className='p-6 border-gray-200 dark:border-gray-700 border-b'>
                        <h2 className='font-semibold text-gray-900 dark:text-white text-xl'>
                            New Assignment
                        </h2>
                        <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            Select employee and equipment to assign
                        </p>
                    </div>

                    <div className='flex-1 overflow-hidden'>
                        <div className='flex flex-col p-6 h-full'>
                            <PhotoUploadSection
                                photo={photo}
                                setPhoto={setPhoto}
                                uploadStatus={uploadStatus}
                                setUploadStatus={setUploadStatus}
                                showNotification={showNotification}
                            />

                            <div className='flex-1 gap-6 grid grid-cols-1 lg:grid-cols-2 overflow-y-auto'>
                                {/* Employee Selection */}
                                <div className='flex flex-col'>
                                    <h3 className='mb-4 font-medium text-gray-900 dark:text-white text-lg'>
                                        Select Employee ({filteredEmployees.length} found)
                                    </h3>

                                    <EmployeeFilters
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        selectedSection={selectedSection}
                                        setSelectedSection={setSelectedSection}
                                        selectedSubSection={selectedSubSection}
                                        setSelectedSubSection={setSelectedSubSection}
                                        sections={sections}
                                        filteredSubSections={filteredSubSections}
                                        clearFilters={clearFilters}
                                        setCurrentPage={setCurrentPage}
                                    />

                                    <div className='flex-1 min-h-0 overflow-hidden flex flex-col'>
                                        <EmployeeList
                                            employees={paginatedEmployees}
                                            selectedEmployee={selectedEmployee}
                                            onEmployeeSelect={handleEmployeeSelect}
                                            employeeEquipmentCounts={employeeEquipmentCounts}
                                            equipments={equipments}
                                        />

                                        {/* Pagination for employees */}
                                        {totalPages > 1 && (
                                            <div className='flex-shrink-0 flex justify-center items-center space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600'>
                                                <button
                                                    onClick={() => goToPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className='disabled:opacity-50 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:cursor-not-allowed'
                                                >
                                                    Previous
                                                </button>
                                                <span className='text-gray-600 dark:text-gray-400 text-sm'>
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => goToPage(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className='disabled:opacity-50 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:cursor-not-allowed'
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Equipment Selection */}
                                <div id='equipment-selection' className='flex flex-col'>
                                    <h3 className='mb-4 font-medium text-gray-900 dark:text-white text-lg'>
                                        Select Equipment ({selectedItems.length} selected)
                                    </h3>
                                    <EquipmentList
                                        equipments={equipments}
                                        selectedItems={selectedItems}
                                        onAddItem={handleAddItem}
                                        onRemoveItem={handleRemoveItem}
                                        isItemSelected={isItemSelected}
                                    />
                                </div>
                            </div>

                            {/* Assignment Summary */}
                            {(selectedEmployee || selectedItems.length > 0) && (
                                <AssignmentSummary
                                    selectedEmployee={selectedEmployee}
                                    selectedItems={selectedItems}
                                    photo={photo}
                                    onRemoveItem={handleRemoveItem}
                                />
                            )}
                        </div>
                    </div>

                    <div className='flex justify-end gap-3 p-6 border-gray-200 dark:border-gray-700 border-t'>
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className='disabled:opacity-50 px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFinalSubmit}
                            disabled={processing || !selectedEmployee || selectedItems.length === 0}
                            className='flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-6 py-2 rounded-lg font-medium text-white transition-colors'
                        >
                            {processing ? (
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
                                    Assigning...
                                </>
                            ) : (
                                `Assign ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`
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