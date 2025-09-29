import React, { useState, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { IKContext, IKUpload } from 'imagekitio-react';

export default function Index() {
    const { equipments } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [hasSize, setHasSize] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    const [form, setForm] = useState({
        type: '',
        sizes: [{ size: '', amount: '' }],
        amount: '',
        photo: '',
    });

    // Assign modal states
    const [employees, setEmployees] = useState({ data: [] });
    const [filters, setFilters] = useState({
        search: '',
        section: '',
        subsection: ''
    });
    const [selectedSize, setSelectedSize] = useState('');
    const [sections, setSections] = useState({});
    const [assignPhoto, setAssignPhoto] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Multiple selection states
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isSelectAll, setIsSelectAll] = useState(false);

    // Photo upload states (same as Assign.jsx)
    const [uploadStatus, setUploadStatus] = useState("");
    const [debugInfo, setDebugInfo] = useState({});
    const [showDebug, setShowDebug] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    // Multiple selection functions
    const handleEmployeeSelect = (employee) => {
        const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
        if (isSelected) {
            setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employee.id));
        } else {
            setSelectedEmployees([...selectedEmployees, employee]);
        }
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            setSelectedEmployees([]);
        } else {
            // Only select available employees (not already assigned)
            const availableEmployees = employees.data.filter(emp => 
                !(emp.handover !== null && emp.handover !== undefined)
            );
            setSelectedEmployees(availableEmployees);
        }
        setIsSelectAll(!isSelectAll);
    };

    const handleAssignMultiple = async () => {
        if (!selectedEquipment || selectedEmployees.length === 0) return;

        // Check stock availability
        let availableStock = 0;
        if (selectedEquipment.size) {
            const selectedSizeData = selectedEquipment.size.split(',').find(s => {
                const [sizeName] = s.split(':');
                return sizeName === selectedSize;
            });
            if (selectedSizeData) {
                const [, amount] = selectedSizeData.split(':');
                availableStock = parseInt(amount);
            }
        } else {
            availableStock = parseInt(selectedEquipment.amount);
        }

        if (availableStock < selectedEmployees.length) {
            showNotification(`Cannot assign: Only ${availableStock} items available, but ${selectedEmployees.length} employees selected!`, 'error');
            return;
        }

        const isConfirmed = window.confirm(
            `ASSIGN CONFIRMATION:\n\n` +
            `Equipment: ${selectedEquipment.type}\n` +
            `Size: ${selectedSize || 'N/A'}\n` +
            `Selected Employees: ${selectedEmployees.length}\n` +
            `Available Stock: ${availableStock}\n\n` +
            `Proceed with assignment to all selected employees?`
        );

        if (!isConfirmed) return;

        setIsSubmitting(true);

        try {
            const results = await Promise.allSettled(
                selectedEmployees.map(employee => 
                    fetch(route('equipments.assign.store.modal'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            employee_id: employee.id,
                            equipment_id: selectedEquipment.id,
                            size: selectedSize,
                            photo: assignPhoto || ''
                        })
                    })
                )
            );

            const successfulAssignments = results.filter(result => result.status === 'fulfilled' && result.value.ok);
            const failedAssignments = results.filter(result => result.status === 'rejected' || !result.value.ok);

            if (failedAssignments.length === 0) {
                showNotification(`Successfully assigned equipment to ${successfulAssignments.length} employees!`, 'success');
                setSelectedEmployees([]);
                setIsSelectAll(false);
                // Reload the page to reflect updated stock
                window.location.reload();
            } else {
                showNotification(`Assigned to ${successfulAssignments.length} employees, but ${failedAssignments.length} failed.`, 'warning');
                // Still reload to update the view
                window.location.reload();
            }
        } catch (error) {
            console.error('Error assigning equipment to multiple employees:', error);
            showNotification('Error assigning equipment: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // open modal add/edit
    const handleOpen = (equipment = null) => {
        setEditing(equipment);
        if (equipment && equipment.size) {
            const sizesArray = equipment.size.split(',').map(s => {
                const [size, amount] = s.split(':');
                return { size, amount };
            });
            setForm({
                type: equipment.type,
                sizes: sizesArray,
                amount: '',
                photo: equipment.photo || '',
            });
            setHasSize(true);
        } else {
            setForm({
                type: equipment?.type || '',
                sizes: [{ size: '', amount: '' }],
                amount: equipment?.amount || '',
                photo: equipment?.photo || '',
            });
            setHasSize(false);
        }
        setShowModal(true);
    };

    // handle size change in form
    const handleSizeChange = (index, key, value) => {
        const newSizes = [...form.sizes];
        newSizes[index][key] = value;
        setForm({ ...form, sizes: newSizes });
    };

    const addSizeField = () =>
        setForm({ ...form, sizes: [...form.sizes, { size: '', amount: '' }] });

    const removeSizeField = (index) =>
        setForm({
            ...form,
            sizes: form.sizes.filter((_, i) => i !== index),
        });

    const handleSubmit = (e) => {
        e.preventDefault();
        let payload = { 
            type: form.type.toUpperCase(), // Auto-uppercase
            photo: form.photo 
        };
        
        if (hasSize) {
            payload.size = form.sizes
                .map((s) => `${s.size.toUpperCase()}:${s.amount}`) // Auto-uppercase sizes
                .join(',');
            payload.amount = null;
        } else {
            payload.amount = form.amount;
            payload.size = null;
        }

        if (editing) {
            router.put(route('equipments.update', editing.id), payload, {
                onSuccess: () => setShowModal(false),
            });
        } else {
            router.post(route('equipments.store'), payload, {
                onSuccess: () => setShowModal(false),
            });
        }
    };

    // Load employees for assign modal
    const loadEmployees = async (equipmentId, size, page = 1, customSearch = null, customSection = null, customSubsection = null) => {
        try {
            const payload = {
                equipment_id: equipmentId,
                size: size,
                search: customSearch !== undefined ? customSearch : filters.search,
                section: customSection !== undefined ? customSection : filters.section,
                subsection: customSubsection !== undefined ? customSubsection : filters.subsection,
                page: page
            };

            // Remove null/empty values
            Object.keys(payload).forEach(key => {
                if (payload[key] === null || payload[key] === '') {
                    delete payload[key];
                }
            });

            const response = await fetch(route('equipments.assign.employees'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setEmployees(data.employees);
            setSections(data.sections);
            
            // Reset selection when employees change
            setSelectedEmployees([]);
            setIsSelectAll(false);
        } catch (error) {
            console.error('Error loading employees:', error);
            showNotification('Error loading employees: ' + error.message, 'error');
            setEmployees({ data: [] });
            setSections({});
        }
    };

    // Also update the openAssignModal function to ensure equipmentId is passed correctly
    const openAssignModal = (equipment) => {
        setSelectedEquipment(equipment);
        setSelectedEmployees([]);
        setIsSelectAll(false);

        if (equipment.size) {
            setSelectedSize('');
            setShowSizeModal(true);
        } else {
            setSelectedSize(null);

            // Make sure equipment.id is passed correctly
            if (equipment && equipment.id) {
                loadEmployees(equipment.id, null);
                setShowAssignModal(true);
            } else {
                console.error('Equipment ID is missing:', equipment);
                alert('Error: Equipment ID is missing');
            }
        }
    };

    // Handle filter change
    const handleFilterChange = (key, value) => {
        const newFilters = {
            ...filters,
            [key]: value === '' ? null : value
        };

        // If section changes, reset subsection
        if (key === 'section' && value === '') {
            newFilters.subsection = null;
        }

        setFilters(newFilters);

        if (selectedEquipment) {
            loadEmployees(
                selectedEquipment.id,
                selectedSize,
                1,
                newFilters.search,
                newFilters.section,
                newFilters.subsection
            );
        }
    };

    const handleAssignToEmployee = async (employee) => {
        if (!selectedEquipment) return;

        const isAssigned = employee.handover !== null && employee.handover !== undefined;

        if (isAssigned) {
            router.get(route('equipments.assign.page', selectedEquipment.id), {
                size: selectedSize
            });
            setShowAssignModal(false);
            return;
        }

        // Check stock availability before assignment
        let availableStock = 0;

        if (selectedEquipment.size) {
            // Equipment with sizes
            const selectedSizeData = selectedEquipment.size.split(',').find(s => {
                const [sizeName] = s.split(':');
                return sizeName === selectedSize;
            });

            if (selectedSizeData) {
                const [, amount] = selectedSizeData.split(':');
                availableStock = parseInt(amount);
            }
        } else {
            // Equipment without sizes
            availableStock = parseInt(selectedEquipment.amount);
        }

        if (availableStock <= 0) {
            showNotification('Cannot assign equipment: Stock is out of stock!', 'error');
            return;
        }

        const isConfirmed = window.confirm(
            `ASSIGN CONFIRMATION:\n\n` +
            `Equipment: ${selectedEquipment.type}\n` +
            `Size: ${selectedSize || 'N/A'}\n` +
            `Employee: ${employee.name} (${employee.nik})\n` +
            `Available Stock: ${availableStock}\n\n` +
            `Proceed with assignment?`
        );

        if (!isConfirmed) return;

        try {
            const response = await fetch(route('equipments.assign.store.modal'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    employee_id: employee.id,
                    equipment_id: selectedEquipment.id,
                    size: selectedSize,
                    photo: assignPhoto || ''
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Server error');
            }

            if (result.success) {
                // Reload the page to reflect updated stock
                window.location.reload();
                showNotification(`Equipment assigned to ${employee.name}!`, 'success');
                setAssignPhoto('');
            } else {
                showNotification('Failed to assign equipment: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error assigning equipment:', error);
            showNotification('Error assigning equipment: ' + error.message, 'error');
        }
    };

    // Handle size selection for equipment with sizes
    const handleSizeSelect = (size) => {
        setSelectedSize(size);
        setShowSizeModal(false);
        if (selectedEquipment) {
            loadEmployees(selectedEquipment.id, size);
            setShowAssignModal(true);
        }
    };

    // Load employees when assign modal opens
    useEffect(() => {
        if (showAssignModal && selectedEquipment) {
            loadEmployees(selectedEquipment.id, selectedSize);
        }
    }, [showAssignModal, selectedEquipment, selectedSize]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
                            APD / Work Equipment
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage and assign work equipment to employees
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={route("equipments.assign.page")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Update Assignments
                        </Link>
                        <button
                            onClick={() => handleOpen()}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors shadow-md hover:shadow-lg"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Equipment
                        </button>
                    </div>
                </div>
            }
        >
            <div className="py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    {/* Header Card - Improved design like Assign page */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl overflow-hidden mb-6">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                        Equipment Management
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Manage and assign work equipment to employees
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                        {equipments.length} equipment types
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Equipment Cards Grid - Improved design */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {equipments.map((eq, index) => (
                            <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 group">
                                {/* Equipment Image */}
                                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative overflow-hidden">
                                    {eq.photo ? (
                                        <img
                                            src={eq.photo}
                                            alt={eq.type}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="text-gray-400 dark:text-gray-500 text-center p-4">
                                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <p className="text-sm mt-2">No Image</p>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        {eq.size ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                Multiple Sizes
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                {eq.amount} in stock
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Equipment Details */}
                                <div className="p-5">
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-3 line-clamp-2 h-14">
                                        {eq.type}
                                    </h3>

                                    <div className="space-y-3 mb-4">
                                        {eq.size ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Available Sizes:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {eq.size.split(',').map((s, idx) => {
                                                        const [size, amount] = s.split(':');
                                                        const stock = parseInt(amount);
                                                        return (
                                                            <span 
                                                                key={idx} 
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                    stock > 0 
                                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                                }`}
                                                            >
                                                                {size}: {stock}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Total Stock:</span>
                                                <span className={`font-semibold ${
                                                    eq.amount > 0 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {eq.amount} units
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => handleOpen(eq)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openAssignModal(eq)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                            Assign
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {equipments.length === 0 && (
                        <div className="text-center py-12">
                            <div className="max-w-md mx-auto">
                                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No equipment registered</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Get started by adding your first piece of equipment
                                </p>
                                <button
                                    onClick={() => handleOpen()}
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Equipment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Add/Edit Equipment - Updated with photo upload like Assign.jsx */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="lg">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {editing ? 'Edit Equipment' : 'Add New Equipment'}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Equipment Type</label>
                            <input
                                type="text"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                placeholder="Enter equipment type..."
                                required
                            />
                        </div>

                        {/* Photo Upload Section - Same as Assign.jsx */}
                        <div>
                            <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                                Equipment Photo
                            </label>

                            {/* Current Photo */}
                            {form.photo && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current photo:</p>
                                    <img
                                        src={form.photo}
                                        alt="current equipment"
                                        className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                    />
                                </div>
                            )}

                            {/* New Photo Upload */}
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <IKContext
                                    publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                                    urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
                                    authenticator={async () => {
                                        try {
                                            setUploadStatus("authenticating");
                                            
                                            const response = await fetch("/api/imagekit/auth");
                                            
                                            if (!response.ok) {
                                                const errorText = await response.text();
                                                throw new Error(`Auth failed: ${response.status} - ${errorText}`);
                                            }
                                            
                                            const data = await response.json();
                                            
                                            if (!data.token || !data.signature) {
                                                throw new Error('Invalid authentication response');
                                            }
                                            
                                            setUploadStatus("auth-success");
                                            return data;
                                        } catch (error) {
                                            setUploadStatus("auth-error");
                                            setDebugInfo(prev => ({ 
                                                ...prev, 
                                                authError: error.message,
                                                authTimestamp: new Date().toISOString()
                                            }));
                                            console.error("ImageKit Auth Error:", error);
                                            throw error;
                                        }
                                    }}
                                >
                                    <IKUpload
                                        fileName={`equipment_${editing?.id || 'new'}_${Date.now()}.jpg`}
                                        folder="/equipments"
                                        useUniqueFileName={true}
                                        onError={(err) => {
                                            console.error("Upload Error Details:", err);
                                            setUploadStatus("upload-failed");
                                            setDebugInfo(prev => ({ 
                                                ...prev, 
                                                uploadError: err,
                                                uploadTimestamp: new Date().toISOString()
                                            }));
                                            alert('Photo upload failed. Please try again.');
                                        }}
                                        onSuccess={(res) => {
                                            console.log("Upload Success:", res);
                                            setUploadStatus("upload-success");
                                            setForm({ ...form, photo: res.url });
                                            setDebugInfo(prev => ({ 
                                                ...prev, 
                                                uploadSuccess: res,
                                                uploadTimestamp: new Date().toISOString()
                                            }));
                                        }}
                                        onUploadStart={() => {
                                            setUploadStatus("uploading");
                                            console.log("Upload starting...");
                                        }}
                                        validateFile={(file) => {
                                            const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                                            const isValidType = validTypes.includes(file.type);
                                            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
                                            
                                            if (!isValidType) {
                                                alert('Please select a valid image file (JPEG, PNG, JPG)');
                                                return false;
                                            }
                                            
                                            if (!isValidSize) {
                                                alert('File size must be less than 10MB');
                                                return false;
                                            }
                                            
                                            return true;
                                        }}
                                        className="hidden"
                                        id="equipment-photo-upload"
                                    />
                                </IKContext>

                                <label htmlFor="equipment-photo-upload" className="cursor-pointer">
                                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                                        Click to upload equipment photo
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        PNG, JPG, JPEG up to 10MB
                                    </p>
                                    {uploadStatus && (
                                        <p className={`text-xs mt-2 ${
                                            uploadStatus.includes('success') ? 'text-green-600' : 
                                            uploadStatus.includes('fail') || uploadStatus.includes('error') ? 'text-red-600' : 
                                            'text-blue-600'
                                        }`}>
                                            Status: {uploadStatus}
                                        </p>
                                    )}
                                </label>
                            </div>

                            {/* New Photo Preview */}
                            {form.photo && (
                                <div className="mt-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">New photo ready:</p>
                                    <img
                                        src={form.photo}
                                        alt="new equipment preview"
                                        className="w-32 h-32 object-cover rounded-lg border-2 border-green-200 dark:border-green-800"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={hasSize}
                                onChange={(e) => setHasSize(e.target.checked)}
                                id="hasSize"
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="hasSize" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                This equipment has different sizes
                            </label>
                        </div>

                        {hasSize ? (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sizes & Quantities</label>
                                {form.sizes.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <input
                                            type="text"
                                            value={item.size}
                                            onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                            placeholder="Size (e.g., S, M, L)"
                                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                            required
                                        />
                                        <input
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => handleSizeChange(index, 'amount', e.target.value)}
                                            placeholder="Quantity"
                                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                            required
                                        />
                                        {form.sizes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSizeField(index)}
                                                className="px-3 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addSizeField}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Another Size
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                    Total Quantity
                                </label>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    placeholder="Enter total quantity..."
                                    required
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                            >
                                {editing ? 'Update Equipment' : 'Add Equipment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Pilih Size sebelum Assign */}
            <Modal show={showSizeModal} onClose={() => setShowSizeModal(false)} maxWidth="md">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Size</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose the size you want to assign</p>
                    </div>

                    <div className="p-6">
                        {selectedEquipment && selectedEquipment.size ? (
                            <div className="grid grid-cols-2 gap-3">
                                {selectedEquipment.size.split(',').map((s, idx) => {
                                    const [sz, amount] = s.split(':');
                                    const stock = parseInt(amount);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSizeSelect(sz)}
                                            disabled={stock <= 0}
                                            className={`p-4 border rounded-lg text-center transition-all duration-200 hover:shadow-md ${
                                                stock > 0 
                                                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-700 border-blue-100 dark:border-gray-600 cursor-pointer' 
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
                                            }`}
                                        >
                                            <div className={`text-lg font-semibold ${
                                                stock > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                                            }`}>{sz}</div>
                                            <div className={`text-sm mt-1 ${
                                                stock > 0 ? 'text-gray-600 dark:text-gray-400' : 'text-red-400'
                                            }`}>
                                                {stock > 0 ? `Stock: ${stock}` : 'Out of stock'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400">No sizes available</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Assign Equipment */}
            <Modal show={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="7xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Assign Equipment
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {selectedEquipment?.type} {selectedSize ? `- Size: ${selectedSize}` : ''}
                                </p>
                                {selectedEmployees.length > 0 && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                        {selectedEmployees.length} employee(s) selected
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedEmployees.length > 0 && (
                                    <button
                                        onClick={handleAssignMultiple}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Assigning...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                </svg>
                                                Assign to {selectedEmployees.length} Employee(s)
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div className="h-full flex">
                            {/* Employee List */}
                            <div className="flex-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                                <div className="p-6 space-y-4">
                                    {/* Search and Filters */}
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Search by name or NIK..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                        />
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <select
                                                value={filters.section}
                                                onChange={(e) => handleFilterChange('section', e.target.value)}
                                                className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                            >
                                                <option value="">All Sections</option>
                                                {Object.keys(sections).map(section => (
                                                    <option key={section} value={section}>{section}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={filters.subsection}
                                                onChange={(e) => handleFilterChange('subsection', e.target.value)}
                                                className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                            >
                                                <option value="">All Sub-sections</option>
                                                {filters.section && sections[filters.section]?.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Select All Checkbox */}
                                        {employees.data && employees.data.length > 0 && (
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelectAll}
                                                    onChange={handleSelectAll}
                                                    id="selectAll"
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor="selectAll" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Select All Available Employees ({employees.data.filter(emp => !(emp.handover !== null && emp.handover !== undefined)).length} available)
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Employee Cards */}
                                    <div className="space-y-3">
                                        {employees.data && employees.data.length > 0 ? (
                                            employees.data.map(emp => {
                                                const isSelected = selectedEmployees.some(selected => selected.id === emp.id);
                                                const isAssigned = emp.handover !== null && emp.handover !== undefined;
                                                
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                                                            isSelected 
                                                                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800' 
                                                                : isAssigned
                                                                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
                                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                                        } ${isAssigned ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                        onClick={() => !isAssigned && handleEmployeeSelect(emp)}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => !isAssigned && handleEmployeeSelect(emp)}
                                                                    disabled={isAssigned}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <div>
                                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                                        {emp.name}
                                                                    </h3>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                        NIK: {emp.nik} | {emp.section} {emp.subsection ? `- ${emp.subsection}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                {isAssigned ? (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                        Assigned
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                        Available
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-8">
                                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                </svg>
                                                <p className="text-gray-500 dark:text-gray-400">No employees found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Notification */}
            {notification.show && (
                <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
                    notification.type === 'error' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-green-500 text-white'
                }`}>
                    {notification.message}
                </div>
            )}
        </AuthenticatedLayout>
    );
}