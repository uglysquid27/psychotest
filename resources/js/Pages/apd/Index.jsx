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

    // Multiple selection states - PERSISTENT across filters/pagination
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [allSelectedEmployees, setAllSelectedEmployees] = useState(new Map()); // Persistent storage

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

    // Multiple selection functions - PERSISTENT
    const handleEmployeeSelect = (employee) => {
        const employeeId = employee.id;
        const isCurrentlySelected = allSelectedEmployees.has(employeeId);
        
        if (isCurrentlySelected) {
            // Remove from selection
            const newSelection = new Map(allSelectedEmployees);
            newSelection.delete(employeeId);
            setAllSelectedEmployees(newSelection);
            
            // Also update current page selection
            setSelectedEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        } else {
            // Check stock before adding
            const availableStock = getAvailableStock();
            const currentTotalSelected = allSelectedEmployees.size;
            
            if (currentTotalSelected >= availableStock) {
                showNotification(`Cannot select more than available stock (${availableStock})!`, 'error');
                return;
            }
            
            // Add to selection
            const newSelection = new Map(allSelectedEmployees);
            newSelection.set(employeeId, employee);
            setAllSelectedEmployees(newSelection);
            
            // Also update current page selection
            setSelectedEmployees(prev => [...prev, employee]);
        }
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            // Clear all selections
            setAllSelectedEmployees(new Map());
            setSelectedEmployees([]);
        } else {
            // Only select available employees from current page (not already selected)
            const availableEmployees = employees.data.filter(emp => 
                !allSelectedEmployees.has(emp.id)
            );
            
            // Check stock limitation
            const availableStock = getAvailableStock();
            const currentTotalSelected = allSelectedEmployees.size;
            const remainingStock = availableStock - currentTotalSelected;
            
            const employeesToSelect = availableEmployees.slice(0, remainingStock);
            
            if (availableEmployees.length > remainingStock) {
                showNotification(`Only ${remainingStock} additional employees selected due to stock limitation`, 'warning');
            }
            
            // Add to persistent storage
            const newSelection = new Map(allSelectedEmployees);
            employeesToSelect.forEach(emp => {
                newSelection.set(emp.id, emp);
            });
            setAllSelectedEmployees(newSelection);
            
            // Update current page selection
            setSelectedEmployees(employeesToSelect);
        }
        setIsSelectAll(!isSelectAll);
    };

    // Sync current page selections with persistent storage when employees change
    useEffect(() => {
        if (employees.data && employees.data.length > 0) {
            const currentPageSelected = employees.data.filter(emp => 
                allSelectedEmployees.has(emp.id)
            );
            setSelectedEmployees(currentPageSelected);
            
            // Update select all state for current page
            const allCurrentPageSelected = employees.data.every(emp => 
                allSelectedEmployees.has(emp.id)
            );
            setIsSelectAll(allCurrentPageSelected);
        }
    }, [employees.data, allSelectedEmployees]);

    const handleAssignMultiple = async () => {
        if (!selectedEquipment || allSelectedEmployees.size === 0) return;

        const availableStock = getAvailableStock();

        if (availableStock < allSelectedEmployees.size) {
            showNotification(`Cannot assign: Only ${availableStock} items available, but ${allSelectedEmployees.size} employees selected!`, 'error');
            return;
        }

        const isConfirmed = window.confirm(
            `ASSIGN CONFIRMATION:\n\n` +
            `Equipment: ${selectedEquipment.type}\n` +
            `Size: ${selectedSize || 'N/A'}\n` +
            `Selected Employees: ${allSelectedEmployees.size}\n` +
            `Available Stock: ${availableStock}\n\n` +
            `Proceed with assignment to all selected employees?`
        );

        if (!isConfirmed) return;

        setIsSubmitting(true);

        try {
            const results = await Promise.allSettled(
                Array.from(allSelectedEmployees.values()).map(employee => 
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
                // Clear all selections after successful assignment
                setAllSelectedEmployees(new Map());
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
            
            // Don't reset selection when employees change - selections are persistent
            // The useEffect will sync current page selections
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
        // Don't clear selections when opening modal - keep persistent selections
        // setSelectedEmployees([]);
        // setIsSelectAll(false);

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
            // Clear selections when changing size
            setAllSelectedEmployees(new Map());
            setSelectedEmployees([]);
            setIsSelectAll(false);
            
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

    // Clear selections when modal closes
    useEffect(() => {
        if (!showAssignModal) {
            // Optional: Clear selections when modal closes
            // setAllSelectedEmployees(new Map());
            // setSelectedEmployees([]);
            // setIsSelectAll(false);
        }
    }, [showAssignModal]);

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
                                                Single Size
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Equipment Details */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate flex-1 mr-2">
                                            {eq.type}
                                        </h3>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpen(eq)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                title="Edit"
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
                                                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stock Information */}
                                    <div className="space-y-3">
                                        {eq.size ? (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Sizes:</p>
                                                <div className="space-y-1.5">
                                                    {eq.size.split(',').map((sizeItem, idx) => {
                                                        const [sizeName, amount] = sizeItem.split(':');
                                                        const stock = parseInt(amount);
                                                        return (
                                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-600 dark:text-gray-400 font-medium">{sizeName}</span>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    stock > 5 
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : stock > 0
                                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                }`}>
                                                                    {stock} in stock
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock:</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    eq.amount > 5 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : eq.amount > 0
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                    {eq.amount} available
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Assign Button */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => openAssignModal(eq)}
                                            disabled={eq.size ? false : eq.amount <= 0}
                                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                                                eq.size || eq.amount > 0
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Assign Equipment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {equipments.length === 0 && (
                        <div className="text-center py-12">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Equipment Found</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by adding your first work equipment.</p>
                                <button
                                    onClick={() => handleOpen()}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add First Equipment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-medium transition-all duration-300 ${
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
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {editing ? 'Edit Equipment' : 'Add New Equipment'}
                        </h3>
                        <button
                            onClick={() => setShowModal(false)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipment Type
                            </label>
                            <input
                                type="text"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter equipment type"
                                required
                            />
                        </div>

                        {/* Size Toggle */}
                        <div className="flex items-center gap-3">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={hasSize}
                                        onChange={(e) => {
                                            setHasSize(e.target.checked);
                                            if (!e.target.checked) {
                                                setForm({ ...form, sizes: [{ size: '', amount: '' }] });
                                            }
                                        }}
                                        className="sr-only"
                                    />
                                    <div className={`w-12 h-6 rounded-full transition-colors ${
                                        hasSize ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}></div>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                        hasSize ? 'transform translate-x-6' : ''
                                    }`}></div>
                                </div>
                            </label>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Equipment has multiple sizes
                            </span>
                        </div>

                        {/* Size Fields */}
                        {hasSize ? (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Sizes and Quantities
                                </label>
                                {form.sizes.map((size, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={size.size}
                                                onChange={(e) => handleSizeChange(index, 'size', e.target.value.toUpperCase())}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Size (e.g., S, M, L)"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="0"
                                                value={size.amount}
                                                onChange={(e) => handleSizeChange(index, 'amount', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Quantity"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSizeField(index)}
                                            disabled={form.sizes.length === 1}
                                            className={`p-2 rounded-lg transition-colors ${
                                                form.sizes.length === 1
                                                    ? 'text-gray-400 cursor-not-allowed'
                                                    : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addSizeField}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Another Size
                                </button>
                            </div>
                        ) : (
                            /* Single Quantity Field */
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter quantity"
                                    required
                                />
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipment Photo
                            </label>
                            <IKContext
                                publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                               urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
                                authenticationEndpoint={route("imagekit.auth")}
                            >
                                <IKUpload
                                    fileName="equipment-photo.png"
                                    onError={(err) => {
                                        console.error("ImageKit Error:", err);
                                        setUploadStatus("Upload failed");
                                    }}
                                    onSuccess={(res) => {
                                        console.log("ImageKit Success:", res);
                                        setForm({ ...form, photo: res.url });
                                        setUploadStatus("Upload successful!");
                                    }}
                                    onChange={(e) => {
                                        setDebugInfo({
                                            files: e.target.files,
                                            hasFiles: e.target.files.length > 0,
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                />
                            </IKContext>
                            {uploadStatus && (
                                <p className={`mt-2 text-sm ${
                                    uploadStatus.includes("failed") ? "text-red-600" : "text-green-600"
                                }`}>
                                    {uploadStatus}
                                </p>
                            )}
                        </div>

                        {/* Form Actions */}
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
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
                            >
                                {editing ? 'Update Equipment' : 'Create Equipment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Size Selection Modal */}
            <Modal show={showSizeModal} onClose={() => setShowSizeModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Select Size
                        </h3>
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {selectedEquipment?.size.split(',').map((sizeItem, index) => {
                            const [sizeName, amount] = sizeItem.split(':');
                            const stock = parseInt(amount);
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSizeSelect(sizeName)}
                                    disabled={stock <= 0}
                                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                                        stock > 0
                                            ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {sizeName}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            stock > 5 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : stock > 0
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                            {stock > 0 ? `${stock} available` : 'Out of stock'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Assign Modal */}
            <Modal show={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="6xl">
                <div className="p-6 max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Assign Equipment
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Equipment:</span>
                                    <span className="text-gray-900 dark:text-white">{selectedEquipment?.type}</span>
                                </div>
                                {selectedSize && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Size:</span>
                                        <span className="text-gray-900 dark:text-white">{selectedSize}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Available Stock:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        getAvailableStock() > 5 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : getAvailableStock() > 0
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}>
                                        {getAvailableStock()} items
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Selected:</span>
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                        {allSelectedEmployees.size} employees
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAssignModal(false)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors ml-4"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Multiple Assignment Controls */}
                    {allSelectedEmployees.size > 0 && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                            {allSelectedEmployees.size} employees selected
                                        </span>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                            (Stock: {getAvailableStock()} available)
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setAllSelectedEmployees(new Map());
                                            setSelectedEmployees([]);
                                            setIsSelectAll(false);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={handleAssignMultiple}
                                        disabled={isSubmitting || allSelectedEmployees.size === 0 || allSelectedEmployees.size > getAvailableStock()}
                                        className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                                            allSelectedEmployees.size > 0 && allSelectedEmployees.size <= getAvailableStock()
                                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {isSubmitting ? 'Assigning...' : `Assign to ${allSelectedEmployees.size} Employees`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                    placeholder="Search by name or NIK..."
                                />
                            </div>

                            {/* Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Section
                                </label>
                                <select
                                    value={filters.section}
                                    onChange={(e) => handleFilterChange('section', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                >
                                    <option value="">All Sections</option>
                                    {Object.keys(sections).map((section) => (
                                        <option key={section} value={section}>
                                            {section}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subsection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Subsection
                                </label>
                                <select
                                    value={filters.subsection}
                                    onChange={(e) => handleFilterChange('subsection', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                >
                                    <option value="">All Subsections</option>
                                    {filters.section && sections[filters.section]?.map((subsection) => (
                                        <option key={subsection} value={subsection}>
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
                                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Employee List */}
                    <div className="flex-1 overflow-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                                            <input
                                                type="checkbox"
                                                checked={isSelectAll}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Section
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {employees.data && employees.data.length > 0 ? (
                                        employees.data.map((employee) => {
                                            const isSelected = allSelectedEmployees.has(employee.id);
                                            const hasExistingAssignment = employee.handovers && employee.handovers.length > 0;
                                            const existingAssignment = hasExistingAssignment ? employee.handovers[0] : null;

                                            return (
                                                <tr 
                                                    key={employee.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleEmployeeSelect(employee)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                        />
                                                    </td>

                                                    {/* Employee Info */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                                                {employee.name?.charAt(0) || 'E'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">
                                                                    {employee.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {employee.nik}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Section Info */}
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {employee.sub_sections?.[0]?.name || 'N/A'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {employee.sub_sections?.[0]?.section?.name || 'N/A'}
                                                        </div>
                                                    </td>

                                                    {/* Assignment Status */}
                                                    <td className="px-4 py-3">
                                                        {hasExistingAssignment ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                                    Already Assigned
                                                                </span>
                                                                {existingAssignment.size && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        Size: {existingAssignment.size}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                Not Assigned
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAssignToEmployee(employee)}
                                                                disabled={getAvailableStock() <= 0}
                                                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                                                    getAvailableStock() > 0
                                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                                                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                Assign
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                    </svg>
                                                    <p>No employees found matching your criteria.</p>
                                                    <p className="text-sm">Try adjusting your filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {employees.data && employees.meta && employees.meta.last_page > 1 && (
                            <div className="flex justify-between items-center mt-4 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing {employees.data.length} of {employees.meta.total} employees
                                </div>
                                <div className="flex gap-1">
                                    {employees.meta.links.map((link, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                if (link.url && selectedEquipment) {
                                                    const url = new URL(link.url);
                                                    const page = url.searchParams.get('page');
                                                    loadEmployees(
                                                        selectedEquipment.id,
                                                        selectedSize,
                                                        parseInt(page) || 1,
                                                        filters.search,
                                                        filters.section,
                                                        filters.subsection
                                                    );
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={!link.url}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}