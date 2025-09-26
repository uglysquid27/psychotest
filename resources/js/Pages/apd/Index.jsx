import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
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

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
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
        let payload = { type: form.type, photo: form.photo };
        if (hasSize) {
            payload.size = form.sizes
                .map((s) => `${s.size}:${s.amount}`)
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
    const loadEmployees = async (equipmentId, size, page = 1) => {
        try {
            const response = await fetch(route('equipments.assign.employees'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    equipment_id: equipmentId,
                    size: size,
                    search: filters.search,
                    section: filters.section,
                    subsection: filters.subsection,
                    page: page
                })
            });

            // Check if response is OK
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Check if there's an error in the response
            if (data.error) {
                throw new Error(data.error);
            }

            setEmployees(data.employees);
            setSections(data.sections);
        } catch (error) {
            console.error('Error loading employees:', error);
            alert('Error loading employees: ' + error.message);

            // Set empty data to avoid crashes
            setEmployees({ data: [] });
            setSections({});
        }
    };

    // Also update the openAssignModal function to ensure equipmentId is passed correctly
    const openAssignModal = (equipment) => {
        setSelectedEquipment(equipment);

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
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        if (selectedEquipment) {
            loadEmployees(selectedEquipment.id, selectedSize, 1);
        }
    };

    const handleAssignToEmployee = async (employee) => {
        if (!selectedEquipment) return;
        
        const isAssigned = employee.handover !== null && employee.handover !== undefined;
        
        if (isAssigned) {
            // For existing assignments, navigate to the Assign page (update only)
            router.get(route('equipments.assign.page', selectedEquipment.id), {
                size: selectedSize 
            });
            setShowAssignModal(false);
            return;
        }
        
        // For new assignments, use the modal
        const isConfirmed = window.confirm(
            `ASSIGN CONFIRMATION:\n\n` +
            `Equipment: ${selectedEquipment.type}\n` +
            `Size: ${selectedSize || 'N/A'}\n` +
            `Employee: ${employee.name} (${employee.nik})\n\n` +
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
                    photo: assignPhoto || '' // Photo is optional
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Server error');
            }
            
            if (result.success) {
                // Reload employees to update the list
                loadEmployees(selectedEquipment.id, selectedSize);
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
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
                    APD / Work Equipment
                </h2>
            }
        >
            <div className="py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl overflow-hidden mb-6">
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                        Equipment Management
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Manage and assign work equipment to employees
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleOpen()}
                                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-3 rounded-lg font-medium text-white text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add New Equipment
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Equipment Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {equipments.map((eq, index) => (
                            <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700">
                                {/* Equipment Image */}
                                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                                    {eq.photo ? (
                                        <img
                                            src={eq.photo}
                                            alt={eq.type}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-gray-400 dark:text-gray-500">
                                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <p className="text-sm mt-2">No Image</p>
                                        </div>
                                    )}
                                </div>

                                {/* Equipment Details */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-2 truncate">
                                        {eq.type}
                                    </h3>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Type:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{eq.type}</span>
                                        </div>
                                        
                                        {eq.size ? (
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Sizes:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {eq.size.split(',').map((s, idx) => {
                                                        const [size, amount] = s.split(':');
                                                        return (
                                                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                {size}: {amount}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{eq.amount} units</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => handleOpen(eq)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openAssignModal(eq)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                            Beri
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

            {/* Modal Add/Edit Equipment */}
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
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSizeSelect(sz)}
                                            className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-blue-100 dark:border-gray-600 rounded-lg text-center transition-all duration-200 hover:shadow-md"
                                        >
                                            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{sz}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Stock: {amount}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400">No sizes available for this equipment.</p>
                            </div>
                        )}

                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowSizeModal(false)}
                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Assign Equipment to Employees */}
            <Modal show={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="7xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Assign Equipment {selectedSize && `- Size ${selectedSize}`}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Assign {selectedEquipment?.type} to employees
                        </p>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Filters */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            placeholder="Search by name or NIK..."
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Section</label>
                                    <select
                                        value={filters.section}
                                        onChange={(e) => handleFilterChange('section', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    >
                                        <option value="">All Sections</option>
                                        {Object.keys(sections).map(sectionName => (
                                            <option key={sectionName} value={sectionName}>
                                                {sectionName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sub Section</label>
                                    <select
                                        value={filters.subsection}
                                        onChange={(e) => handleFilterChange('subsection', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    >
                                        <option value="">All Sub Sections</option>
                                        {filters.section && sections[filters.section]?.map(sub => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Handover Photo</label>
                                    <div className="flex items-center gap-3">
                                        <IKContext
                                            publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                                            urlEndpoint="https://ik.imagekit.io/arina123"
                                            authenticator={async () => {
                                                const res = await fetch('http://localhost:8000/api/imagekit/auth');
                                                return await res.json();
                                            }}
                                        >
                                            <IKUpload
                                                fileName={`handover_${selectedEquipment?.id}.jpg`}
                                                onError={(err) => console.error('Upload Error:', err)}
                                                onSuccess={(res) => setAssignPhoto(res.url)}
                                            />
                                        </IKContext>
                                        {assignPhoto && (
                                            <img src={assignPhoto} alt="preview" className="w-10 h-10 object-cover rounded border" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Employees Table */}
                        <div className="flex-1 overflow-auto">
                            <div className="min-w-full">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                                        <tr className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Employee</th>
                                            <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">NIK</th>
                                            <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Section</th>
                                            <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Status</th>
                                            <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {employees.data.map((emp, idx) => {
                                            const isAssigned = emp.handover !== null && emp.handover !== undefined;

                                            return (
                                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{emp.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{emp.nik}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <div className="text-gray-900 dark:text-white">{emp.sub_sections?.[0]?.section?.name || '-'}</div>
                                                            <div className="text-gray-500 dark:text-gray-400 text-xs">{emp.sub_sections?.[0]?.name || '-'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isAssigned ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                Assigned
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                                                                Not Assigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleAssignToEmployee(emp)}
                                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                                isAssigned 
                                                                    ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                                                    : 'bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                                                            }`}
                                                        >
                                                            {isAssigned ? (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Update
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                                    </svg>
                                                                    Assign
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {employees.data.length === 0 && (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            Try adjusting your search filters or check if there are employees in the system.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination */}
                        {employees.last_page > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing {employees.from} to {employees.to} of {employees.total} results
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => employees.current_page > 1 && loadEmployees(selectedEquipment.id, selectedSize, employees.current_page - 1)}
                                            disabled={employees.current_page === 1}
                                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => employees.current_page < employees.last_page && loadEmployees(selectedEquipment.id, selectedSize, employees.current_page + 1)}
                                            disabled={employees.current_page === employees.last_page}
                                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Notification Toast */}
            {notification.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
                    notification.type === 'success' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                }`}>
                    <div className="flex items-center gap-3">
                        {notification.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className="font-medium">{notification.message}</span>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}