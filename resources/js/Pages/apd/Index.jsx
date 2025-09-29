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

    // Photo upload states
    const [uploadStatus, setUploadStatus] = useState("");
    const [debugInfo, setDebugInfo] = useState({});
    const [showDebug, setShowDebug] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    // Calculate available stock
    const getAvailableStock = () => {
        if (!selectedEquipment) return 0;
        
        if (selectedEquipment.size) {
            const selectedSizeData = selectedEquipment.size.split(',').find(s => {
                const [sizeName] = s.split(':');
                return sizeName === selectedSize;
            });
            if (selectedSizeData) {
                const [, amount] = selectedSizeData.split(':');
                return parseInt(amount);
            }
            return 0;
        } else {
            return parseInt(selectedEquipment.amount);
        }
    };

    // Multiple selection functions
    const handleEmployeeSelect = (employee) => {
        const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
        if (isSelected) {
            setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employee.id));
        } else {
            // Check stock before adding
            const availableStock = getAvailableStock();
            if (selectedEmployees.length >= availableStock) {
                showNotification(`Cannot select more than available stock (${availableStock})!`, 'error');
                return;
            }
            setSelectedEmployees([...selectedEmployees, employee]);
        }
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            setSelectedEmployees([]);
        } else {
            // Only select available employees (not already assigned)
            const availableEmployees = employees.data.filter(emp => 
                !(emp.handovers && emp.handovers.length > 0)
            );
            
            // Check stock limitation
            const availableStock = getAvailableStock();
            const employeesToSelect = availableEmployees.slice(0, availableStock);
            
            if (availableEmployees.length > availableStock) {
                showNotification(`Only ${availableStock} employees selected due to stock limitation`, 'warning');
            }
            
            setSelectedEmployees(employeesToSelect);
        }
        setIsSelectAll(!isSelectAll);
    };

    const handleAssignMultiple = async () => {
        if (!selectedEquipment || selectedEmployees.length === 0) return;

        const availableStock = getAvailableStock();

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

        const isAssigned = employee.handovers && employee.handovers.length > 0;

        if (isAssigned) {
            router.get(route('equipments.assign.page', selectedEquipment.id), {
                size: selectedSize
            });
            setShowAssignModal(false);
            return;
        }

        // Check stock availability before assignment
        const availableStock = getAvailableStock();

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
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Stock Available:</span>
                                                <span className={`font-medium ${
                                                    eq.amount > 0 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {eq.amount} items
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => openAssignModal(eq)}
                                            disabled={eq.size ? false : eq.amount <= 0}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                eq.size || eq.amount > 0
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Assign
                                        </button>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpen(eq)}
                                                className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit Equipment"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this equipment?')) {
                                                        router.delete(route('equipments.destroy', eq.id));
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Equipment"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {equipments.length === 0 && (
                        <div className="text-center py-12">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 max-w-md mx-auto">
                                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Equipment Found</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Get started by adding your first piece of work equipment.
                                </p>
                                <button
                                    onClick={() => handleOpen()}
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
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

            {/* Notification */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-medium ${
                    notification.type === 'error' 
                        ? 'bg-red-500 text-white' 
                        : notification.type === 'warning'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* Add/Edit Equipment Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="2xl">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {editing ? 'Edit Equipment' : 'Add New Equipment'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {editing ? 'Update equipment details' : 'Add new work equipment to the system'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipment Type *
                            </label>
                            <input
                                type="text"
                                required
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., Safety Helmet, Safety Shoes"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Will be automatically converted to uppercase
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="hasSize"
                                checked={hasSize}
                                onChange={(e) => {
                                    setHasSize(e.target.checked);
                                    if (!e.target.checked) {
                                        setForm({ ...form, sizes: [{ size: '', amount: '' }] });
                                    }
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="hasSize" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                This equipment has multiple sizes
                            </label>
                        </div>

                        {hasSize ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Sizes and Quantities *
                                </label>
                                <div className="space-y-3">
                                    {form.sizes.map((size, index) => (
                                        <div key={index} className="flex gap-3 items-start">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    required
                                                    value={size.size}
                                                    onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="Size (e.g., S, M, L, 42)"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Will be automatically converted to uppercase
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    value={size.amount}
                                                    onChange={(e) => handleSizeChange(index, 'amount', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="Quantity"
                                                />
                                            </div>
                                            {form.sizes.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSizeField(index)}
                                                    className="mt-2 px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addSizeField}
                                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Another Size
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total Quantity *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter total quantity"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipment Photo (Optional)
                            </label>
                            {/* FIXED: ImageKit upload with proper authentication */}
                            <IKContext
                                publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                                urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
                                authenticator={async () => {
                                    try {
                                        const response = await fetch(route('imagekit.auth'));
                                        if (!response.ok) {
                                            throw new Error('Failed to authenticate');
                                        }
                                        const data = await response.json();
                                        return data;
                                    } catch (error) {
                                        console.error('ImageKit auth error:', error);
                                        throw error;
                                    }
                                }}
                            >
                                <IKUpload
                                    fileName={`equipment_${Date.now()}.jpg`}
                                    folder="/equipments"
                                    useUniqueFileName={true}
                                    onError={(err) => {
                                        console.error("ImageKit Upload Error:", err);
                                        setUploadStatus("Upload failed");
                                        showNotification('Photo upload failed. Please try again.', 'error');
                                    }}
                                    onSuccess={(res) => {
                                        console.log("ImageKit Upload Success:", res);
                                        setForm({ ...form, photo: res.url });
                                        setUploadStatus("Upload successful!");
                                        showNotification('Photo uploaded successfully!', 'success');
                                    }}
                                    onUploadStart={() => {
                                        setUploadStatus("Uploading...");
                                    }}
                                    validateFile={(file) => {
                                        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                                        const isValidType = validTypes.includes(file.type);
                                        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
                                        
                                        if (!isValidType) {
                                            showNotification('Please select a valid image file (JPEG, PNG, JPG)', 'error');
                                            return false;
                                        }
                                        
                                        if (!isValidSize) {
                                            showNotification('File size must be less than 10MB', 'error');
                                            return false;
                                        }
                                        
                                        return true;
                                    }}
                                    className="hidden"
                                    id="equipment-photo-upload"
                                />
                            </IKContext>
                            <label htmlFor="equipment-photo-upload" className="cursor-pointer block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload photo</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, JPEG up to 10MB</span>
                                </div>
                            </label>
                            {uploadStatus && (
                                <p className={`text-sm mt-2 ${
                                    uploadStatus.includes("failed") ? "text-red-600" : "text-green-600"
                                }`}>
                                    {uploadStatus}
                                </p>
                            )}
                            {form.photo && (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                                    <img src={form.photo} alt="Preview" className="h-20 w-20 object-cover rounded-lg border" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                            >
                                {editing ? 'Update Equipment' : 'Add Equipment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Size Selection Modal */}
            <Modal show={showSizeModal} onClose={() => setShowSizeModal(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Select Size
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Choose the size you want to assign for {selectedEquipment?.type}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedEquipment?.size?.split(',').map((sizeItem, index) => {
                            const [size, amount] = sizeItem.split(':');
                            const stock = parseInt(amount);
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSizeSelect(size)}
                                    disabled={stock <= 0}
                                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                                        stock > 0
                                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-400 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:shadow-md'
                                            : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="font-semibold text-lg">{size}</div>
                                    <div className={`text-sm mt-1 ${
                                        stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {stock > 0 ? `${stock} available` : 'Out of stock'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Assign Equipment Modal */}
            <Modal show={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="6xl">
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Assign Equipment
                            </h2>
                            <div className="space-y-2">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Assigning: <span className="font-semibold text-gray-800 dark:text-white">{selectedEquipment?.type}</span>
                                </p>
                                {selectedSize && (
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Size: <span className="font-semibold text-gray-800 dark:text-white">{selectedSize}</span>
                                    </p>
                                )}
                                <p className={`text-sm font-medium ${
                                    getAvailableStock() > 0 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-red-600 dark:text-red-400'
                                }`}>
                                    Available Stock: {getAvailableStock()} items
                                </p>
                                {selectedEmployees.length > 0 && (
                                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                        Selected: {selectedEmployees.length} employee(s)
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Multiple Assignment Controls */}
                        {selectedEmployees.length > 0 && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleAssignMultiple}
                                    disabled={isSubmitting || getAvailableStock() < selectedEmployees.length}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                        getAvailableStock() >= selectedEmployees.length && !isSubmitting
                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
                                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Assigning...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Assign to {selectedEmployees.length} Selected
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedEmployees([]);
                                        setIsSelectAll(false);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear Selection
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stock Warning */}
                    {getAvailableStock() < selectedEmployees.length && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <p className="text-red-800 dark:text-red-300 font-medium">
                                        Stock Limitation Warning
                                    </p>
                                    <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                                        You have selected {selectedEmployees.length} employees but only {getAvailableStock()} items are available.
                                        Please reduce your selection or cancel some assignments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search and Filter Section */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {/* Search Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Search Employees
                                </label>
                                <input
                                    type="text"
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Search by name or NIK..."
                                />
                            </div>

                            {/* Section Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Section
                                </label>
                                <select
                                    value={filters.section || ''}
                                    onChange={(e) => handleFilterChange('section', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">All Sections</option>
                                    {Object.keys(sections).map((sectionName) => (
                                        <option key={sectionName} value={sectionName}>
                                            {sectionName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subsection Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Subsection
                                </label>
                                <select
                                    value={filters.subsection || ''}
                                    onChange={(e) => handleFilterChange('subsection', e.target.value)}
                                    disabled={!filters.section}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                >
                                    <option value="">All Subsections</option>
                                    {filters.section && sections[filters.section]?.map((subsection, index) => (
                                        <option key={index} value={subsection}>
                                            {subsection}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Clear Filters */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setFilters({ search: '', section: '', subsection: '' });
                                        if (selectedEquipment) {
                                            loadEmployees(selectedEquipment.id, selectedSize, 1, '', '', '');
                                        }
                                    }}
                                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Photo Upload Section */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Assignment Photo (Optional - applies to all selected employees)
                        </label>
                        {/* FIXED: ImageKit upload for assignment photo */}
                        <IKContext
                            publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                            urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
                            authenticator={async () => {
                                try {
                                    const response = await fetch(route('imagekit.auth'));
                                    if (!response.ok) {
                                        throw new Error('Failed to authenticate');
                                    }
                                    const data = await response.json();
                                    return data;
                                } catch (error) {
                                    console.error('ImageKit auth error:', error);
                                    throw error;
                                }
                            }}
                        >
                            <IKUpload
                                fileName={`assignment_${Date.now()}.jpg`}
                                folder="/assignments"
                                useUniqueFileName={true}
                                onError={(err) => {
                                    console.error("ImageKit Upload Error:", err);
                                    setUploadStatus("Upload failed");
                                    showNotification('Photo upload failed. Please try again.', 'error');
                                }}
                                onSuccess={(res) => {
                                    console.log("ImageKit Upload Success:", res);
                                    setAssignPhoto(res.url);
                                    setUploadStatus("Upload successful!");
                                    showNotification('Photo uploaded successfully!', 'success');
                                }}
                                onUploadStart={() => {
                                    setUploadStatus("Uploading...");
                                }}
                                validateFile={(file) => {
                                    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                                    const isValidType = validTypes.includes(file.type);
                                    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
                                    
                                    if (!isValidType) {
                                        showNotification('Please select a valid image file (JPEG, PNG, JPG)', 'error');
                                        return false;
                                    }
                                    
                                    if (!isValidSize) {
                                        showNotification('File size must be less than 10MB', 'error');
                                        return false;
                                    }
                                    
                                    return true;
                                }}
                                className="hidden"
                                id="assignment-photo-upload"
                            />
                        </IKContext>
                        <label htmlFor="assignment-photo-upload" className="cursor-pointer block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center">
                            <div className="flex flex-col items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload assignment photo</span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, JPEG up to 10MB</span>
                            </div>
                        </label>
                        {uploadStatus && (
                            <p className={`text-sm mt-2 ${
                                uploadStatus.includes("failed") ? "text-red-600" : "text-green-600"
                            }`}>
                                {uploadStatus}
                            </p>
                        )}
                        {assignPhoto && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                                <img src={assignPhoto} alt="Assignment Preview" className="h-20 w-20 object-cover rounded-lg border" />
                            </div>
                        )}
                    </div>

                    {/* Employees Table */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Select All
                                                </span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Employee
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            NIK
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Section
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Subsection
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {employees.data && employees.data.length > 0 ? (
                                        employees.data.map((employee) => {
                                            const isAssigned = employee.handovers && employee.handovers.length > 0;
                                            const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
                                            const mainSubSection = employee.sub_sections && employee.sub_sections.length > 0 ? employee.sub_sections[0] : null;
                                            const sectionName = mainSubSection?.section?.name || 'N/A';
                                            const subSectionName = mainSubSection?.name || 'N/A';

                                            return (
                                                <tr 
                                                    key={employee.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleEmployeeSelect(employee)}
                                                            disabled={isAssigned}
                                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                                {employee.name?.charAt(0) || 'E'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">
                                                                    {employee.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {employee.position}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                                                        {employee.nik}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                        {sectionName}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                        {subSectionName}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            isAssigned
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {isAssigned ? 'Assigned' : 'Not Assigned'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleAssignToEmployee(employee)}
                                                            disabled={isAssigned || getAvailableStock() <= 0}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                                isAssigned
                                                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                                                    : getAvailableStock() > 0
                                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                                                    : 'bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {isAssigned ? (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Assigned
                                                                </>
                                                            ) : getAvailableStock() > 0 ? (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                    </svg>
                                                                    Assign
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                    </svg>
                                                                    Out of Stock
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <div className="text-gray-500 dark:text-gray-400">
                                                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                    </svg>
                                                    <p className="text-lg font-medium mb-2">No employees found</p>
                                                    <p className="text-sm">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {employees.data && employees.data.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {employees.from || 0} to {employees.to || 0} of {employees.total || 0} results
                                    </div>
                                    <div className="flex gap-1">
                                        {employees.links && employees.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url && !link.active) {
                                                        const page = new URL(link.url).searchParams.get('page');
                                                        loadEmployees(selectedEquipment.id, selectedSize, page);
                                                    }
                                                }}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                    link.active
                                                        ? 'bg-blue-600 text-white'
                                                        : link.url
                                                        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                            onClick={() => setShowAssignModal(false)}
                            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}